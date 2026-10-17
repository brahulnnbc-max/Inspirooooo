import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// 1. CORS & Preflight headers for cross-origin or Vercel routing
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 2. High limit body parsers with guard against Vercel pre-parsed bodies (prevents hanging stream reads)
const jsonParser = express.json({ limit: '50mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '50mb' });

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    return next();
  }
  jsonParser(req, res, next);
});

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    return next();
  }
  urlencodedParser(req, res, next);
});

function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_KEY
  );
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

import { parsePastedQuestionsInstant } from './utils/instantQuestionParser.ts';

// Resilient multi-model fallback: prioritized high-speed stable models (gemini-2.5-flash, gemini-3.8-flash, gemini-2.0-flash)
async function generateContentWithFallback(options: {
  contents: any;
  config?: any;
  timeoutMs?: number;
}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in your server environment variables or .env file.');
  }

  const ai = getGeminiClient();
  // High-availability models for fast multimodal STEM, LaTeX, and vision tasks
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ];
  let lastError: any = null;
  const isVercel = Boolean(process.env.VERCEL);
  const perModelTimeout = isVercel ? 12000 : (options.timeoutMs ? Math.min(options.timeoutMs, 25000) : 25000);

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    try {
      console.log(`[inspiro AI] Requesting model ${model} (timeout ${perModelTimeout}ms)...`);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout waiting for model ${model} (${perModelTimeout}ms)`)), perModelTimeout)
      );
      const callPromise = ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      const response: any = await Promise.race([callPromise, timeoutPromise]);
      console.log(`[inspiro AI] Model ${model} succeeded!`);
      return response;
    } catch (err: any) {
      const errStr = String(err?.message || err || '');
      console.warn(`[inspiro AI] Model ${model} failed: ${errStr}`);
      lastError = err;

      // On 503 UNAVAILABLE or 429 rate limit, immediately switch to the next candidate model
      // without stalling Vercel serverless execution limits
      const isTransient =
        errStr.includes('UNAVAILABLE') ||
        errStr.includes('503') ||
        errStr.includes('429') ||
        errStr.includes('ResourceExhausted') ||
        errStr.includes('overloaded') ||
        errStr.includes('try again later');

      if (isTransient) {
        console.log(`[inspiro AI] Transient spike on ${model}. Fast-switching to next candidate model...`);
      }
    }
  }

  throw new Error(
    lastError?.message ||
    'AI service is temporarily experiencing high demand across candidate models. Please try again or use the Instant Deterministic Text Parser.'
  );
}

// Stack-based auto-closer for truncated JSON responses from LLM token cutoffs
function autoCloseTruncatedJSON(str: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}' && stack[stack.length - 1] === '{') {
        stack.pop();
      } else if (ch === ']' && stack[stack.length - 1] === '[') {
        stack.pop();
      }
    }
  }

  let result = str;
  if (inString) {
    result += '"';
  }

  // Remove trailing comma or dangling colon before closing
  result = result.replace(/,\s*$/, '');
  result = result.replace(/:\s*$/, ': null');
  result = result.replace(/,\s*([}\]])/g, '$1');

  // Close remaining open brackets and braces in LIFO order
  while (stack.length > 0) {
    const open = stack.pop();
    result = result.replace(/,\s*$/, '');
    if (open === '{') result += '}';
    if (open === '[') result += ']';
  }

  return result;
}

// Ultra-robust JSON parser with automatic fence removal, LaTeX backslash repair, and truncated JSON completion
function cleanAndParseJSON(rawText: string | undefined): any {
  if (!rawText || !rawText.trim()) throw new Error('Empty response from model');
  let clean = rawText.trim();

  // Strip markdown fences
  clean = clean
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(clean);
  } catch (_err1) {
    // Proceed to repair pipeline
  }

  // Step 1: Find outermost JSON boundary
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  let startIdx = 0;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }
  clean = clean.slice(startIdx);

  // Step 2: Protect LaTeX keywords that collide with JSON escapes (\frac, \beta, \theta, \nabla, \right, \times, \tan, \tau)
  // so that \frac doesn't turn into form-feed + rac, \beta doesn't turn into backspace + eta, etc.
  let preprocessed = clean.replace(/\\([bfnrt][a-zA-Z])/g, '\\\\$1');

  // Step 3: Double-escape unescaped LaTeX backslashes inside JSON string literals
  const repaired = preprocessed.replace(
    /"((?:[^"\\]|\\.)*)"/gs,
    (match) => match.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\')
  );

  // Step 4: Remove problematic unescaped ASCII control codes inside strings (except newlines/tabs outside quotes)
  const sanitized = repaired
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, ' ')
    .replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(sanitized);
  } catch (_err2) {
    // Step 5: Auto-close truncated JSON (e.g. if tokens ended mid-question)
    try {
      const closed = autoCloseTruncatedJSON(sanitized);
      return JSON.parse(closed);
    } catch (err3: any) {
      console.warn('[cleanAndParseJSON] Repair pipeline failed. Attempting structural recovery:', err3.message);
      const lastValidBrace = sanitized.lastIndexOf('}');
      if (lastValidBrace > 0) {
        try {
          const cut = sanitized.slice(0, lastValidBrace + 1);
          return JSON.parse(autoCloseTruncatedJSON(cut));
        } catch {}
      }
      throw err3;
    }
  }
}

// Root & API status endpoint
app.get('/api', (req, res) => {
  const apiKey = getGeminiApiKey();
  res.json({
    status: 'ok',
    appName: 'inspiro LIVE • JEE Test & Module Practice',
    hasGeminiKey: Boolean(apiKey),
    aiEngine: 'inspiro AI Flash Vision & STEM Reasoner',
    serverTime: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/parse-exam-pdf',
      '/api/generate-remedial-pyqs',
      '/api/generate-test-schedule',
      '/api/generate-full-routine',
      '/api/ai-academic-mentor',
    ],
  });
});

// Health check endpoint (both /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  const apiKey = getGeminiApiKey();
  res.json({
    status: 'ok',
    appName: 'inspiro LIVE • JEE Test & Module Practice',
    hasGeminiKey: Boolean(apiKey),
    aiEngine: 'inspiro AI 3.8 Flash Vision & STEM Reasoner',
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    platform: process.env.VERCEL ? 'vercel' : 'node',
  });
});

// Advanced Question Paper & Module PDF Extraction Endpoint
app.all(['/api/parse-exam-pdf', '/parse-exam-pdf', '/api/parse-exam-pdf/'], async (req, res) => {
  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: 'inspiro AI Question Paper & Module PDF Extraction Engine is operational.',
    });
  }
  try {
    const rawFileBase64 =
      req.body.fileBase64 || req.body.pdfBase64 || req.body.questionFileBase64;
    const textQuestions =
      req.body.textQuestions || req.body.textContent || req.body.rawText || '';
    const images: any[] = Array.isArray(req.body.images) ? req.body.images : [];
    const rawSolutionBase64 =
      req.body.solutionFileBase64 || req.body.solutionBase64;
    const mimeType =
      req.body.mimeType || req.body.pdfMimeType || 'application/pdf';
    const examTitle =
      req.body.examTitle ||
      req.body.customTitle ||
      req.body.title ||
      'JEE CBT Mock Test';
    const pattern = req.body.pattern || 'JEE_MAIN';
    const userCommand = req.body.userCommand || '';
    const customDurationMinutes =
      req.body.customDurationMinutes || req.body.customDuration;
    const defaultPositiveMarks = req.body.defaultPositiveMarks ?? 4;
    const defaultNegativeMarks = req.body.defaultNegativeMarks ?? 1;

    const hasAnyContent = Boolean(
      rawFileBase64 || textQuestions.trim() || images.length > 0
    );

    if (!hasAnyContent) {
      return res.status(400).json({
        error: 'Please paste question text or upload/paste question images/PDF.',
      });
    }

    const apiKey = getGeminiApiKey();

    // 1. Instant Mode or Keyless Text Mode (if no key and text is present)
    if (req.body.instantMode === true || (!apiKey && textQuestions.trim() && images.length === 0)) {
      console.log('[inspiro Engine] Instant deterministic parser invoked for pasted question text.');
      const instantRes = parsePastedQuestionsInstant(
        textQuestions,
        examTitle,
        pattern,
        customDurationMinutes || 180
      );
      if (instantRes.success && instantRes.paper) {
        return res.json({
          success: true,
          mode: 'INSTANT_DETERMINISTIC',
          examPaper: instantRes.paper,
          data: instantRes.paper,
        });
      }
    }

    if (!apiKey) {
      // If text exists, fall back to instant deterministic parser rather than erroring out
      if (textQuestions.trim()) {
        const instantRes = parsePastedQuestionsInstant(
          textQuestions,
          examTitle,
          pattern,
          customDurationMinutes || 180
        );
        if (instantRes.success && instantRes.paper) {
          return res.json({
            success: true,
            mode: 'INSTANT_KEYLESS_FALLBACK',
            note: 'Server is running without GEMINI_API_KEY. Converted using Instant Deterministic Parser.',
            examPaper: instantRes.paper,
            data: instantRes.paper,
          });
        }
      }
      return res.status(500).json({
        error:
          'GEMINI_API_KEY is not configured on this server. Please add GEMINI_API_KEY in your hosting environment variables (Vercel / Render / .env), or paste question text with numbers for instant keyless conversion.',
      });
    }

    const systemInstruction = `You are a high-speed JEE Question Paper & Module Extraction Engine.
Your core mission:
1. FAITHFULLY EXTRACT EVERY QUESTION from the provided text and/or images into standard CBT question objects.
2. PRESERVE MATHEMATICS, PHYSICS, AND CHEMISTRY with LaTeX syntax:
   - Inline math: $formula$, e.g. $E = mc^2$, $\\vec{F} = m\\vec{a}$, $\\alpha, \\beta, \\theta$.
   - Block equations: $$display formula$$.
3. DIAGRAM & IMAGE LINKING:
   - If a question corresponds to one of the attached images (circuit, graph, pulley, chemical structure, geometry):
     Set "imageIndex": <0-based index of the attached image this question corresponds to>, e.g. 0 for Image 1, 1 for Image 2.
     If a question does NOT use an attached image, set "imageIndex": -1.
   - Also describe it concisely in [Diagram: ...] within promptLatex.
4. QUESTION TYPES & OPTIONS:
   - "SINGLE_CORRECT": 4 distinct options (A, B, C, D).
   - "NUMERICAL": Integer or decimal answer (e.g., 5, 25, 0.75). No options required.
   - "MULTIPLE_CORRECT": 1 or more correct options (e.g. A, C).
5. LIGHTWEIGHT SPEED DIRECTIVE:
   - Keep explanationLatex concise (1-2 sentences of formula/concept) so extraction finishes rapidly without server timeouts.
6. SECTION ORGANIZATION:
   - Assign sectionId: "physics", "chemistry", or "mathematics". If unspecified, default to "physics".`;

    const parts: any[] = [];

    // Add attached/pasted multiple images with labeled indices
    if (images.length > 0) {
      images.forEach((img: any, idx: number) => {
        let b64 = '';
        let mType = 'image/jpeg';
        if (typeof img === 'string') {
          const match = img.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mType = match[1];
            b64 = match[2];
          } else {
            b64 = img.replace(/^data:[^;]+;base64,/, '');
          }
        } else if (img && typeof img === 'object') {
          b64 = (img.base64 || img.data || img.dataUrl || '').replace(/^data:[^;]+;base64,/, '');
          mType = img.mimeType || 'image/jpeg';
        }
        if (b64) {
          parts.push({
            text: `[Attached Image ${idx + 1} (imageIndex: ${idx}, label: "${img.name || `Image_${idx + 1}`}")]`,
          });
          parts.push({
            inlineData: {
              mimeType: mType,
              data: b64,
            },
          });
        }
      });
    }

    // Add legacy single file if present
    if (rawFileBase64) {
      const cleanBase64 = rawFileBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      });
    }

    // Add pasted text if present
    if (textQuestions.trim()) {
      parts.push({
        text: `Here is the question paper text content:\n\n${textQuestions.trim()}`,
      });
    }

    if (rawSolutionBase64) {
      const cleanSolBase64 = rawSolutionBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanSolBase64,
        },
      });
      parts.push({
        text: 'Cross-reference this solution/answer key to set correct answers.',
      });
    }

    let promptText = `Extract questions from the provided text and/or images into a structured Computer-Based Test (CBT) paper.
Session Title: "${examTitle}"
Exam Pattern: ${pattern}
Target Duration: ${customDurationMinutes || 180} minutes
`;

    if (userCommand && userCommand.trim()) {
      promptText += `\n\n🚨 USER CUSTOM INSTRUCTION:
"""
${userCommand.trim()}
"""`;
    }

    promptText += `\n\nEnsure ALL questions from the text and images are extracted with proper LaTeX formatting and options A, B, C, D (or numerical). If an attached image belongs to a question, set its imageIndex accordingly.`;

    parts.push({ text: promptText });

    let parsedData: any = null;

    try {
      const response = await generateContentWithFallback({
        contents: { parts },
        timeoutMs: 25000,
        config: {
          systemInstruction,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              pattern: { type: Type.STRING },
              durationMinutes: { type: Type.INTEGER },
              totalMarks: { type: Type.INTEGER },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          questionNumber: { type: Type.INTEGER },
                          sectionId: { type: Type.STRING },
                          type: { type: Type.STRING },
                          promptLatex: { type: Type.STRING },
                          diagramDescription: { type: Type.STRING },
                          imageIndex: { type: Type.INTEGER, description: "0-based index of attached image, or -1" },
                          options: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                id: { type: Type.STRING },
                                labelLatex: { type: Type.STRING },
                              },
                              required: ['id', 'labelLatex'],
                            },
                          },
                          correctAnswer: { type: Type.STRING },
                          explanationLatex: { type: Type.STRING },
                          positiveMarks: { type: Type.NUMBER },
                          negativeMarks: { type: Type.NUMBER },
                        },
                        required: ['id', 'questionNumber', 'sectionId', 'type', 'promptLatex', 'correctAnswer'],
                      },
                    },
                  },
                  required: ['id', 'name', 'questions'],
                },
              },
            },
            required: ['title', 'pattern', 'durationMinutes', 'sections'],
          },
        },
      });

      parsedData = cleanAndParseJSON(response.text);
    } catch (aiError: any) {
      console.warn('[inspiro AI] Primary AI generation caught error:', aiError?.message);
      // Auto fallback if multi-question text was provided
      if (textQuestions && textQuestions.trim()) {
        console.log('[inspiro AI] Auto-falling back to deterministic parser for text input...');
        const fallbackRes = parsePastedQuestionsInstant(
          textQuestions,
          examTitle,
          pattern,
          customDurationMinutes || 180,
          images
        );
        if (fallbackRes.success && fallbackRes.paper) {
          return res.json({
            success: true,
            mode: 'FALLBACK_INSTANT_PARSER',
            note: 'Converted seamlessly via Instant Parser (AI request was busy or timed out)',
            examPaper: fallbackRes.paper,
            data: fallbackRes.paper,
          });
        }
      }
      throw aiError;
    }

    // Post-processing & Sanitization: Ensure sections and question numbering are robust
    if (!parsedData.sections || !Array.isArray(parsedData.sections) || parsedData.sections.length === 0) {
      parsedData.sections = [
        {
          id: 'physics',
          name: 'PHYSICS',
          questions: Array.isArray(parsedData.questions) ? parsedData.questions : [],
        },
      ];
    }

    let globalQuestionIndex = 1;
    let calculatedTotalMarks = 0;

    parsedData.sections.forEach((sec: any) => {
      const normId = String(sec.id || '').toLowerCase();
      if (normId.includes('chem')) sec.id = 'chemistry';
      else if (normId.includes('math')) sec.id = 'mathematics';
      else if (normId.includes('phys')) sec.id = 'physics';
      else if (!sec.id) sec.id = 'physics';

      if (!sec.name) sec.name = String(sec.id).toUpperCase();

      if (Array.isArray(sec.questions)) {
        sec.questions.forEach((q: any, qIdx: number) => {
          if (!q.id) q.id = `q-${globalQuestionIndex}`;
          q.questionNumber = globalQuestionIndex;
          q.sectionId = sec.id;

          // Normalize Options
          if (Array.isArray(q.options) && q.options.length > 0) {
            q.options = q.options.map((opt: any, optIdx: number) => {
              const defaultId = ['A', 'B', 'C', 'D'][optIdx] || String.fromCharCode(65 + optIdx);
              if (typeof opt === 'string') {
                return { id: defaultId, labelLatex: opt };
              }
              let optId = String(opt.id || defaultId).toUpperCase().trim();
              if (optId === '1') optId = 'A';
              else if (optId === '2') optId = 'B';
              else if (optId === '3') optId = 'C';
              else if (optId === '4') optId = 'D';
              return {
                id: optId,
                labelLatex: String(opt.labelLatex || opt.text || opt.label || '').trim(),
              };
            });
            if (!q.type || q.type === 'NUMERICAL') {
              q.type = 'SINGLE_CORRECT';
            }
          } else {
            // Attempt to extract options if embedded in prompt text
            const optMatches = [...(q.promptLatex || '').matchAll(/(?:\(([A-D1-4])\)|([A-D1-4])[\.\)\:\-])\s*([^\n\(\)]+)/gi)];
            if (optMatches.length >= 2) {
              q.options = optMatches.slice(0, 4).map((m: any, mIdx: number) => {
                let optId = (m[1] || m[2]).toUpperCase();
                if (optId === '1') optId = 'A';
                else if (optId === '2') optId = 'B';
                else if (optId === '3') optId = 'C';
                else if (optId === '4') optId = 'D';
                return { id: optId, labelLatex: m[3].trim() };
              });
              q.type = 'SINGLE_CORRECT';
            } else {
              q.type = 'NUMERICAL';
            }
          }

          // Normalize Correct Answer
          if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
            let ca = String(q.correctAnswer).trim().toUpperCase();
            if (ca === '1') ca = 'A';
            else if (ca === '2') ca = 'B';
            else if (ca === '3') ca = 'C';
            else if (ca === '4') ca = 'D';
            q.correctAnswer = ca;
          } else {
            q.correctAnswer = q.type === 'NUMERICAL' ? '0' : 'A';
          }

          if (q.positiveMarks === undefined) q.positiveMarks = defaultPositiveMarks;
          if (q.negativeMarks === undefined) {
            q.negativeMarks = q.type === 'NUMERICAL' && pattern === 'JEE_MAIN' ? 0 : defaultNegativeMarks;
          }

          if (!q.explanationLatex) {
            q.explanationLatex = `Step-by-step solution for Question ${globalQuestionIndex}. Correct Answer: ${q.correctAnswer}.`;
          }

          // Attach Diagram / Image URL if matched with uploaded/pasted images
          let matchedImg: any = undefined;
          if (typeof q.imageIndex === 'number' && q.imageIndex >= 0 && q.imageIndex < images.length) {
            matchedImg = images[q.imageIndex];
          } else if (images.length === 1) {
            // If single image and either single question or prompt mentions diagram/figure
            if (sec.questions.length === 1 || /diagram|figure|graph|circuit|shown|image/i.test(q.promptLatex || '') || globalQuestionIndex === 1) {
              matchedImg = images[0];
            }
          } else if (images.length > 0 && qIdx < images.length && sec.questions.length <= images.length) {
            matchedImg = images[qIdx];
          }

          if (matchedImg) {
            const b64 = (typeof matchedImg === 'string' ? matchedImg : matchedImg.base64 || matchedImg.data || matchedImg.dataUrl || '').replace(/^data:[^;]+;base64,/, '');
            const mType = (typeof matchedImg === 'object' && matchedImg.mimeType) || 'image/jpeg';
            if (b64) {
              q.imageUrl = `data:${mType};base64,${b64}`;
            }
          }

          calculatedTotalMarks += q.positiveMarks;
          globalQuestionIndex++;
        });
      }
    });

    parsedData.id = parsedData.id || `custom-paper-${Date.now()}`;
    parsedData.title = parsedData.title || examTitle;
    parsedData.pattern = parsedData.pattern || pattern;
    parsedData.durationMinutes = parsedData.durationMinutes || customDurationMinutes || 180;
    parsedData.totalMarks = calculatedTotalMarks > 0 ? calculatedTotalMarks : (pattern === 'JEE_MAIN' ? 300 : 180);

    res.json({
      success: true,
      examPaper: parsedData,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error parsing exam PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process question paper with Advanced AI Engine',
    });
  }
});

// Generate genuine JEE Main & Advanced PYQ-level Remedial Questions based on a student mistake
app.all(['/api/generate-remedial-pyqs', '/generate-remedial-pyqs', '/api/generate-remedial-pyqs/'], async (req, res) => {
  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: 'inspiro AI Remedial Questions Generator is operational.',
    });
  }
  try {
    const promptLatex = req.body?.promptLatex || req.query?.promptLatex || '';
    const sectionId = req.body?.sectionId || req.query?.sectionId || 'physics';
    const pattern = req.body?.pattern || req.query?.pattern || 'JEE_MAIN';
    const missedReason = req.body?.missedReason || req.query?.missedReason || 'Conceptual gap';

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.',
      });
    }

    const systemInstruction = `You are a premier senior JEE physics, chemistry, and mathematics master faculty member with 20+ years of experience training top 100 AIR rankers for JEE Main and JEE Advanced.
The student made a mistake or struggled with the following JEE question:
"${promptLatex}"
Subject: ${sectionId}
Target Exam: ${pattern}
Identified reason: ${missedReason}

Your task is to generate 3 high-yield, genuine JEE PYQ-level (or exact isomorphic PYQ variants from actual recent JEE Main 2019-2024 / JEE Advanced papers) practice questions that rigorously test the exact same concept, trick, or mathematical mechanism.
Do NOT generate trivial or generic textbook questions. These MUST be authentic, multi-step, rigorous JEE questions with tricky traps, proper standard units, and realistic numerical calculations.
For each question:
1. Provide the complete question text with authentic LaTeX formulas ($...$ for inline, $$...$$ for display).
2. For MCQs, provide 4 distinct plausible options (A, B, C, D) with LaTeX labels.
3. For Numerical, set type to "NUMERICAL" and provide the exact integer/decimal answer.
4. Specify the exact historical context or tag (e.g. "Similar to JEE Main 2023 29 Jan Shift 1" or "JEE Advanced Core Concept").
5. Provide a rigorous, step-by-step masterclass solution with LaTeX equations explaining the concept and the common pitfall to avoid.`;

    const promptText = `Generate 3 authentic, challenging JEE PYQ-level practice questions to remediate this student's mistake.`;

    const response = await generateContentWithFallback({
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topicName: { type: Type.STRING },
            conceptSummary: { type: Type.STRING },
            remedialQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, description: "'SINGLE_CORRECT' or 'NUMERICAL'" },
                  historicalTag: { type: Type.STRING, description: "e.g. 'JEE Main 2023 Shift 1 Variant' or 'JEE Advanced Model'" },
                  promptLatex: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        labelLatex: { type: Type.STRING },
                      },
                      required: ['id', 'labelLatex'],
                    },
                  },
                  correctAnswer: { type: Type.STRING },
                  solutionLatex: { type: Type.STRING },
                },
                required: ['id', 'type', 'historicalTag', 'promptLatex', 'correctAnswer', 'solutionLatex'],
              },
            },
          },
          required: ['topicName', 'conceptSummary', 'remedialQuestions'],
        },
      },
    });

    const parsedData = cleanAndParseJSON(response.text);

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error generating remedial PYQs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate remedial questions',
    });
  }
});

function generateFallbackTestSchedule(prompt: string, pattern: string, numberOfTests: number) {
  const today = new Date();
  const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
  const tests = [];
  const syllabi = [
    [
      { subject: 'physics', name: 'Units & Dimensions, Kinematics 1D & 2D' },
      { subject: 'chemistry', name: 'Some Basic Concepts of Chemistry, Atomic Structure' },
      { subject: 'mathematics', name: 'Sets, Relations, Functions & Quadratic Equations' },
    ],
    [
      { subject: 'physics', name: 'Laws of Motion & Work, Power and Energy' },
      { subject: 'chemistry', name: 'Periodic Table & Chemical Bonding' },
      { subject: 'mathematics', name: 'Sequences & Series, Complex Numbers' },
    ],
    [
      { subject: 'physics', name: 'Rotational Motion & Gravitation' },
      { subject: 'chemistry', name: 'Thermodynamics & Chemical Equilibrium' },
      { subject: 'mathematics', name: 'Permutations & Combinations, Binomial Theorem' },
    ],
    [
      { subject: 'physics', name: 'Mechanical Properties of Solids & Fluids, Thermal Physics' },
      { subject: 'chemistry', name: 'Ionic Equilibrium, Redox Reactions & Organic GOC' },
      { subject: 'mathematics', name: 'Straight Lines, Circles & Conic Sections' },
    ],
    [
      { subject: 'physics', name: 'Electrostatics & Current Electricity' },
      { subject: 'chemistry', name: 'Solutions & Electrochemistry' },
      { subject: 'mathematics', name: 'Limits, Continuity & Differentiability' },
    ],
    [
      { subject: 'physics', name: 'Magnetic Effects of Current & EMI/AC' },
      { subject: 'chemistry', name: 'Chemical Kinetics & Coordination Compounds' },
      { subject: 'mathematics', name: 'Application of Derivatives & Indefinite Integrals' },
    ],
    [
      { subject: 'physics', name: 'Ray & Wave Optics, Modern Physics' },
      { subject: 'chemistry', name: 'Haloalkanes, Alcohols, Aldehydes & Ketones' },
      { subject: 'mathematics', name: 'Definite Integrals, Differential Equations, Vectors & 3D' },
    ],
    [
      { subject: 'physics', name: 'Full Syllabus Complete Physics NTA Model' },
      { subject: 'chemistry', name: 'Full Syllabus Complete Chemistry NTA Model' },
      { subject: 'mathematics', name: 'Full Syllabus Complete Mathematics NTA Model' },
    ],
  ];

  const count = Math.min(Math.max(numberOfTests || 8, 4), 12);
  for (let i = 0; i < count; i++) {
    const testDate = new Date(today.getTime() + (daysUntilSunday + i * 14) * 86400000);
    const dateStr = testDate.toISOString().split('T')[0];
    const isMajor = i >= count - 2;
    const testNum = i + 1;
    tests.push({
      id: `sched-test-${Date.now()}-${i}`,
      title: isMajor
        ? `Allen Leader Major Test 0${testNum - (count - 2)} (Full Syllabus CBT)`
        : `Allen Leader Minor Test 0${testNum} (Periodic Revision)`,
      scheduledDate: dateStr,
      startTime: '09:00',
      endTime: '12:00',
      pattern: pattern || 'JEE_MAIN',
      syllabus: syllabi[i % syllabi.length],
    });
  }

  return {
    seriesTitle: `Allen Leader 6-Month Periodic CBT Test Series (${pattern || 'JEE_MAIN'})`,
    description: `Structured fortnightly test series organized according to Kota coaching curriculum for ${prompt || 'JEE Aspirants'}.`,
    tests,
  };
}

function generateFallbackFullRoutine(commandPrompt: string, practiceSlot: string, testSlot: string) {
  const today = new Date();
  const items = [];
  const chapters = [
    { sub: 'physics', name: 'Kinematics & NLM Module Exercise 1' },
    { sub: 'chemistry', name: 'Atomic Structure & Periodic Trends Drill' },
    { sub: 'mathematics', name: 'Quadratic Equations & Functions Sprint' },
    { sub: 'physics', name: 'Work Energy Power & Circular Motion' },
    { sub: 'chemistry', name: 'Chemical Bonding & GOC Revision' },
  ];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let i = 0; i < 5; i++) {
    const d = new Date(today.getTime() + (i + 1) * 86400000);
    items.push({
      id: `rout-item-${Date.now()}-${i}`,
      type: 'MODULE_PRACTICE',
      title: `${chapters[i].name} (25 Questions)`,
      chapterOrTopic: chapters[i].name,
      subject: chapters[i].sub,
      scheduledDate: d.toISOString().split('T')[0],
      scheduledSlot: practiceSlot || '19:00 - 20:00',
      durationMinutes: 50,
      questionCount: 25,
      weekNumber: 1,
      dayName: dayNames[d.getDay()],
    });
  }

  const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
  const sunday = new Date(today.getTime() + daysUntilSunday * 86400000);
  items.push({
    id: `rout-item-${Date.now()}-mock`,
    type: 'REAL_TEST',
    title: 'Weekend Fortnightly Real Test (300 Marks CBT)',
    chapterOrTopic: 'Full Syllabus Covered During Fortnight',
    subject: 'physics',
    scheduledDate: sunday.toISOString().split('T')[0],
    scheduledSlot: testSlot || '09:00 - 12:00',
    durationMinutes: 180,
    questionCount: 75,
    weekNumber: 1,
    dayName: 'Sunday',
  });

  return {
    routineTitle: 'Allen Kota Leader Daily Practice + Weekend Test Routine',
    summary: 'Mon-Fri 50-minute module practice sprints (19:00-20:00) + Sunday full CBT mock test',
    items,
  };
}

// AI-Powered Long-Term Test Series Scheduler & Syllabus Checklist Generator
app.all(['/api/generate-test-schedule', '/generate-test-schedule', '/api/generate-roadmap-schedule', '/api/generate-test-schedule/'], async (req, res) => {
  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: 'inspiro AI Test Roadmap & Series Generator is operational.',
    });
  }
  try {
    const prompt = req.body?.prompt || req.body?.command || req.query?.prompt || 'Create an Allen Leader 6-month test schedule with 8 periodic tests on Sundays';
    const pattern = req.body?.pattern || req.query?.pattern || 'JEE_MAIN';
    const numberOfTests = req.body?.numberOfTests || req.query?.numberOfTests || 8;

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.log('[inspiro Scheduler] No API key present. Serving deterministic Kota coaching schedule.');
      const fallbackData = generateFallbackTestSchedule(prompt, pattern, Number(numberOfTests));
      return res.json({
        success: true,
        data: fallbackData,
        mode: 'DETERMINISTIC_COACHING_SCHEDULE',
      });
    }

    const today = new Date();
    const currentIso = today.toISOString().split('T')[0];
    const currentYear = today.getFullYear();
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    const nextSunday = new Date(today.getTime() + daysUntilSunday * 86400000).toISOString().split('T')[0];

    const systemInstruction = `You are the Master Academic Director for premier JEE coaching institutes (Allen Career Institute, FIITJEE, MathonGo).
Your job is to generate a comprehensive, realistic, and highly organized 3 to 6 month Computer-Based Test (CBT) schedule for JEE Main / Advanced aspirants.
Follow strict coaching norms:
1. Space tests regularly (e.g. alternate Sundays or every 2-3 weeks).
2. Distribute the syllabus systematically from Class 11th fundamentals to advanced Class 12th topics, concluding with Full Syllabus / All India Mocks.
3. CRITICAL CALENDAR REQUIREMENT:
   - Today's date is ${currentIso} (${currentYear}).
   - The upcoming Sunday is ${nextSunday}.
   - Every single test scheduledDate MUST be on or after ${nextSunday} in the year ${currentYear} (e.g. consecutive alternate Sundays).
   - NEVER generate stale past dates from 2023 or 2024!
4. For EVERY scheduled test:
   - Provide an authentic coaching title (e.g. "Allen Leader Minor Test 01 - Mechanics & Physical Chem").
   - Set standard NTA live test time windows: "09:00" to "12:00" (Morning Shift) or "14:00" to "17:00" (Afternoon Shift).
   - For EACH of the 3 subjects (Physics, Chemistry, Mathematics), provide specific chapter & topic checklists so the student can track their revision before the test!
5. COACHING MATERIAL PARSING DIRECTIVE:
   - If the user has pasted a table of contents, syllabus index, or chapters list from their coaching modules (e.g. Allen, FIITJEE, Resonance, MathonGo):
   - Faithfully distribute all provided chapters across the tests systematically from basic to advanced.
   - Group them into progressive Minor Tests (every 2 weeks) and culminating Revision / Major Mocks.
   - Keep syllabus topic names concise and clean so generation finishes rapidly without timeouts.`;

    try {
      const response = await generateContentWithFallback({
        contents: `Generate a structured test series schedule based on user instructions: "${prompt}". Number of tests: ${numberOfTests}. Pattern: ${pattern}. Current date is ${currentIso} (${currentYear}).`,
        timeoutMs: 20000,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              seriesTitle: { type: Type.STRING },
              description: { type: Type.STRING },
              tests: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    scheduledDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
                    startTime: { type: Type.STRING, description: "HH:MM format, e.g. 09:00 or 14:00" },
                    endTime: { type: Type.STRING, description: "HH:MM format, e.g. 12:00 or 17:00" },
                    pattern: { type: Type.STRING },
                    syllabus: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          subject: { type: Type.STRING, description: "'physics', 'chemistry', or 'mathematics'" },
                          name: { type: Type.STRING, description: "Specific chapter or topics, e.g. 'Kinematics & NLM' or 'Thermodynamics'" },
                        },
                        required: ['subject', 'name'],
                      },
                    },
                  },
                  required: ['id', 'title', 'scheduledDate', 'startTime', 'endTime', 'syllabus'],
                },
              },
            },
            required: ['seriesTitle', 'description', 'tests'],
          },
        },
      });

      const parsedData = cleanAndParseJSON(response.text);

      // Post-processing safety: Verify dates are strictly present and in current or future calendar
      if (parsedData.tests && Array.isArray(parsedData.tests)) {
        parsedData.tests.forEach((t: any, idx: number) => {
          const isStale =
            !t.scheduledDate ||
            t.scheduledDate < currentIso ||
            t.scheduledDate.startsWith('2023') ||
            t.scheduledDate.startsWith('2024') ||
            t.scheduledDate.startsWith('2025');

          if (isStale) {
            const testDate = new Date(today.getTime() + (daysUntilSunday + idx * 14) * 86400000);
            t.scheduledDate = testDate.toISOString().split('T')[0];
          }
        });
      }

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (aiErr: any) {
      console.warn('[inspiro Scheduler] AI schedule failed, using fallback coaching schedule:', aiErr.message);
      const fallbackData = generateFallbackTestSchedule(prompt, pattern, Number(numberOfTests));
      return res.json({
        success: true,
        data: fallbackData,
        mode: 'FALLBACK_COACHING_SCHEDULE',
      });
    }
  } catch (error: any) {
    console.error('Error generating test schedule:', error);
    const fallbackData = generateFallbackTestSchedule('JEE Periodic Tests', 'JEE_MAIN', 8);
    res.json({
      success: true,
      data: fallbackData,
      mode: 'EMERGENCY_FALLBACK_SCHEDULE',
    });
  }
});

// AI-Powered Master Coaching Routine (Daily Module Practice Sprints + Weekend Real Tests)
app.all(['/api/generate-full-routine', '/generate-full-routine', '/api/generate-full-routine/'], async (req, res) => {
  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: 'inspiro AI Daily Module Practice Routine Generator is operational.',
    });
  }
  try {
    const commandPrompt = req.body?.commandPrompt || req.query?.commandPrompt || 'Create an Allen Leader daily module practice routine (Mon-Fri 7-8pm) and alternate Sunday real tests';
    const targetExam = req.body?.targetExam || req.query?.targetExam || 'JEE_MAIN';
    const practiceSlot = req.body?.practiceSlot || req.query?.practiceSlot || '19:00 - 20:00';
    const testSlot = req.body?.testSlot || req.query?.testSlot || '09:00 - 12:00';

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      console.log('[inspiro Routine] No API key present. Serving deterministic Kota module routine.');
      const fallbackRoutine = generateFallbackFullRoutine(commandPrompt, practiceSlot, testSlot);
      return res.json({
        success: true,
        data: fallbackRoutine,
        mode: 'DETERMINISTIC_ROUTINE_FALLBACK',
      });
    }

    const systemInstruction = `You are the Chief Academic Director at a premier JEE coaching institute (Allen Career Institute, Kota).
Your task is to design an integrated Daily Coaching Study & Test Schedule for a JEE aspirant based on their command.
Follow the proven Kota coaching methodology:
1. Monday through Friday: Daily "Module Practice Sprints" (20-30 questions, 45-60 minutes).
   - Alternate between Physics, Chemistry, and Mathematics (e.g. Mon: Physics Module Ex 1, Tue: Chemistry Module Ex 1, Wed: Math Module Ex 1, Thu: Physics Ex 2, Fri: Chem/Math Revision Drill).
2. Weekend (Saturday or Sunday): A "Real Test" (180 minutes, 300 marks, authentic CBT format) testing the exact chapters practiced during that week or fortnight.
3. Distribute topics systematically starting from current date onwards for 6-12 weeks.
4. Each item must have:
   - "type": "MODULE_PRACTICE" or "REAL_TEST"
   - "title": e.g. "Kinematics Module Exercise 1 Sprint" or "Allen Leader Minor Test 01"
   - "chapterOrTopic": e.g. "Kinematics 1D & 2D"
   - "subject": "physics", "chemistry", or "mathematics"
   - "scheduledDate": YYYY-MM-DD
   - "scheduledSlot": e.g. "19:00 - 20:00" for practice, "09:00 - 12:00" for test
   - "durationMinutes": 45-60 for practice, 180 for real test
   - "questionCount": 20-30 for practice, 75 for real test
   - "weekNumber": integer 1, 2, 3...
   - "dayName": "Monday", "Tuesday", etc.`;

    try {
      const response = await generateContentWithFallback({
        contents: `Generate a structured daily practice + real test routine based on command: "${commandPrompt}". Practice slot: ${practiceSlot}. Test slot: ${testSlot}.`,
        timeoutMs: 20000,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              routineTitle: { type: Type.STRING },
              summary: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, description: "'MODULE_PRACTICE' or 'REAL_TEST'" },
                    title: { type: Type.STRING },
                    chapterOrTopic: { type: Type.STRING },
                    subject: { type: Type.STRING, description: "'physics', 'chemistry', or 'mathematics'" },
                    scheduledDate: { type: Type.STRING },
                    scheduledSlot: { type: Type.STRING },
                    durationMinutes: { type: Type.INTEGER },
                    questionCount: { type: Type.INTEGER },
                    weekNumber: { type: Type.INTEGER },
                    dayName: { type: Type.STRING },
                  },
                  required: [
                    'id',
                    'type',
                    'title',
                    'chapterOrTopic',
                    'subject',
                    'scheduledDate',
                    'scheduledSlot',
                    'durationMinutes',
                    'questionCount',
                    'weekNumber',
                    'dayName',
                  ],
                },
              },
            },
            required: ['routineTitle', 'summary', 'items'],
          },
        },
      });

      const parsedData = cleanAndParseJSON(response.text);

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (aiErr: any) {
      console.warn('[inspiro Routine] AI routine generation failed, using fallback routine:', aiErr.message);
      const fallbackRoutine = generateFallbackFullRoutine(commandPrompt, practiceSlot, testSlot);
      return res.json({
        success: true,
        data: fallbackRoutine,
        mode: 'FALLBACK_ROUTINE',
      });
    }
  } catch (error: any) {
    console.error('Error generating full routine:', error);
    const fallbackRoutine = generateFallbackFullRoutine('Kota Module Practice', '19:00 - 20:00', '09:00 - 12:00');
    res.json({
      success: true,
      data: fallbackRoutine,
      mode: 'EMERGENCY_ROUTINE_FALLBACK',
    });
  }
});

// Interactive AI Academic Mentor Chat & Dynamic Scheduler
// Interactive AI Academic Mentor Chat & Dynamic Scheduler
app.all(
  [
    '/api/ai-academic-mentor',
    '/api/ai-academic-mentor/',
    '/ai-academic-mentor',
    '/api/mentor-chat-schedule',
    '/api/mentor-chat-schedule/',
    '/mentor-chat-schedule',
  ],
  async (req, res) => {
    try {
      const message = String(req.body?.message || req.query?.message || '');
      const practiceSlot = String(
        req.body?.practiceSlot ||
          req.body?.preferredSlot ||
          req.query?.practiceSlot ||
          req.query?.preferredSlot ||
          '19:00 - 20:00'
      );
      const testSlot = String(req.body?.testSlot || req.query?.testSlot || '09:00 - 12:00');

      if (!message.trim()) {
        return res.json({
          success: true,
          data: {
            reply:
              'Namaste Aspirant! I am your inspiro AI Academic Director. Tell me what topics, modules, or test dates you want to schedule, and I will prepare a plan for your checklist.',
            replyText:
              'Namaste Aspirant! I am your inspiro AI Academic Director. Tell me what topics, modules, or test dates you want to schedule, and I will prepare a plan for your checklist.',
          },
        });
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        // Fallback response if API key is missing
        return res.json({
          success: true,
          data: {
            reply: `Here is a tailored Kota coaching strategy for "${message}": Break down this unit into daily 50-minute sprints solving 25 high-yield problems each day in your ${practiceSlot} slot. On the weekend, sit for a 3-hour timed CBT mock in your ${testSlot} slot to master speed and accuracy.`,
            replyText: `Here is a tailored Kota coaching strategy for "${message}": Break down this unit into daily 50-minute sprints solving 25 high-yield problems each day in your ${practiceSlot} slot. On the weekend, sit for a 3-hour timed CBT mock in your ${testSlot} slot to master speed and accuracy.`,
            proposedRoutine: {
              routineTitle: `${message.slice(0, 30)} Focused Sprints`,
              summary: 'Daily 25-question timed problem-solving sprints + weekend CBT test',
              items: [
                {
                  id: `rout-mentor-${Date.now()}-1`,
                  type: 'MODULE_PRACTICE',
                  title: `${message.slice(0, 25)}: High-Yield Sprint 01`,
                  chapterOrTopic: message,
                  subject: 'physics',
                  scheduledDate: new Date().toISOString().split('T')[0],
                  scheduledSlot: practiceSlot,
                  durationMinutes: 50,
                  questionCount: 25,
                  weekNumber: 1,
                  dayName: 'Today',
                },
                {
                  id: `rout-mentor-${Date.now()}-2`,
                  type: 'MODULE_PRACTICE',
                  title: `${message.slice(0, 25)}: High-Yield Sprint 02`,
                  chapterOrTopic: message,
                  subject: 'chemistry',
                  scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                  scheduledSlot: practiceSlot,
                  durationMinutes: 50,
                  questionCount: 25,
                  weekNumber: 1,
                  dayName: 'Tomorrow',
                },
                {
                  id: `rout-mentor-${Date.now()}-3`,
                  type: 'REAL_TEST',
                  title: `${message.slice(0, 25)}: Comprehensive Mock Test`,
                  chapterOrTopic: message,
                  subject: 'mathematics',
                  scheduledDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
                  scheduledSlot: testSlot,
                  durationMinutes: 180,
                  questionCount: 75,
                  weekNumber: 1,
                  dayName: 'Weekend',
                },
              ],
            },
          },
        });
      }

      const systemInstruction = `You are the Master JEE Academic Director & Personal Coach at Allen Career Institute Kota and MathonGo.
You help JEE Main & Advanced aspirants manage their huge module workloads, arrange timed CBT practice sprints, and organize live test series roadmaps.
Speak with the warmth, discipline, and strategic clarity of an elite Kota mentor.
When the user asks you to schedule, arrange, or plan module practice sessions and tests:
1. Provide an encouraging, tactical response explaining the reasoning (e.g. why solving 25 questions under a 50-minute timer prevents negative marking and builds exam speed).
2. You MUST also generate a structured list of actionable items (routine items) in the "proposedRoutine" field whenever the student is discussing scheduling or planning their work!
Each proposed routine item should alternate module practice sprints on weekdays and real CBT tests on weekends.`;

      const promptText = `Student message: "${message}". Practice time slot: "${practiceSlot}". Test time slot: "${testSlot}".
Respond thoughtfully as their JEE Academic Director. If this involves scheduling or planning modules/tests, provide the structured "proposedRoutine" items list so the student can apply it to their live checklist.`;

      let parsedData: any = {};
      try {
        const response = await generateContentWithFallback({
          contents: promptText,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                replyText: { type: Type.STRING },
                proposedRoutine: {
                  type: Type.OBJECT,
                  properties: {
                    routineTitle: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          type: { type: Type.STRING, description: "'MODULE_PRACTICE' or 'REAL_TEST'" },
                          title: { type: Type.STRING },
                          chapterOrTopic: { type: Type.STRING },
                          subject: { type: Type.STRING, description: "'physics', 'chemistry', or 'mathematics'" },
                          scheduledDate: { type: Type.STRING },
                          scheduledSlot: { type: Type.STRING },
                          durationMinutes: { type: Type.INTEGER },
                          questionCount: { type: Type.INTEGER },
                          weekNumber: { type: Type.INTEGER },
                          dayName: { type: Type.STRING },
                        },
                        required: [
                          'id',
                          'type',
                          'title',
                          'chapterOrTopic',
                          'subject',
                          'scheduledDate',
                          'scheduledSlot',
                          'durationMinutes',
                          'questionCount',
                          'weekNumber',
                          'dayName',
                        ],
                      },
                    },
                    required: ['routineTitle', 'summary', 'items'],
                  },
                },
              },
              required: ['replyText', 'proposedRoutine'],
            },
          },
        });

        parsedData = cleanAndParseJSON(response.text);
      } catch (genErr: any) {
        console.warn('AI generation had an issue, falling back to structured mentor plan:', genErr.message);
        const today = new Date();
        const currentIso = today.toISOString().split('T')[0];
        const tomorrowIso = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
        const nextSunday = new Date(today.getTime() + ((7 - today.getDay()) % 7 || 7) * 86400000).toISOString().split('T')[0];

        parsedData = {
          replyText: `Great target! For "${message}", I recommend focusing on 25-question timed sprints in your ${practiceSlot} slot. Testing yourself under time constraints is what separates top rankers from the rest. Here is your structured study plan:`,
          proposedRoutine: {
            routineTitle: `${message.slice(0, 30)} Sprint Plan`,
            summary: `Daily targeted practice in ${practiceSlot} and comprehensive testing in ${testSlot}`,
            items: [
              {
                id: `rout-mentor-${Date.now()}-1`,
                type: 'MODULE_PRACTICE',
                title: `${message.slice(0, 25)}: Core Concepts Drill`,
                chapterOrTopic: message,
                subject: 'physics',
                scheduledDate: currentIso,
                scheduledSlot: practiceSlot,
                durationMinutes: 50,
                questionCount: 25,
                weekNumber: 1,
                dayName: 'Today',
              },
              {
                id: `rout-mentor-${Date.now()}-2`,
                type: 'MODULE_PRACTICE',
                title: `${message.slice(0, 25)}: Advanced Problem Sprint`,
                chapterOrTopic: message,
                subject: 'chemistry',
                scheduledDate: tomorrowIso,
                scheduledSlot: practiceSlot,
                durationMinutes: 50,
                questionCount: 25,
                weekNumber: 1,
                dayName: 'Tomorrow',
              },
              {
                id: `rout-mentor-${Date.now()}-3`,
                type: 'REAL_TEST',
                title: `${message.slice(0, 25)}: Comprehensive Mock Test`,
                chapterOrTopic: message,
                subject: 'mathematics',
                scheduledDate: nextSunday,
                scheduledSlot: testSlot,
                durationMinutes: 180,
                questionCount: 75,
                weekNumber: 1,
                dayName: 'Sunday Mock',
              },
            ],
          },
        };
      }

      // Safeguard: Ensure proposedRoutine and items are ALWAYS defined and non-empty
      if (!parsedData.proposedRoutine) {
        parsedData.proposedRoutine = {
          routineTitle: `${message.slice(0, 30)} Strategic Plan`,
          summary: `Daily targeted practice in ${practiceSlot} and comprehensive testing in ${testSlot}`,
          items: [],
        };
      }
      if (!Array.isArray(parsedData.proposedRoutine.items) || parsedData.proposedRoutine.items.length === 0) {
        const today = new Date();
        const currentIso = today.toISOString().split('T')[0];
        const tomorrowIso = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
        const nextSunday = new Date(today.getTime() + ((7 - today.getDay()) % 7 || 7) * 86400000).toISOString().split('T')[0];

        parsedData.proposedRoutine.items = [
          {
            id: `rout-mentor-${Date.now()}-1`,
            type: 'MODULE_PRACTICE',
            title: `${message.slice(0, 25)}: Daily Module Sprint 01`,
            chapterOrTopic: message,
            subject: 'physics',
            scheduledDate: currentIso,
            scheduledSlot: practiceSlot,
            durationMinutes: 50,
            questionCount: 25,
            weekNumber: 1,
            dayName: 'Today',
          },
          {
            id: `rout-mentor-${Date.now()}-2`,
            type: 'MODULE_PRACTICE',
            title: `${message.slice(0, 25)}: Daily Module Sprint 02`,
            chapterOrTopic: message,
            subject: 'chemistry',
            scheduledDate: tomorrowIso,
            scheduledSlot: practiceSlot,
            durationMinutes: 50,
            questionCount: 25,
            weekNumber: 1,
            dayName: 'Tomorrow',
          },
          {
            id: `rout-mentor-${Date.now()}-3`,
            type: 'REAL_TEST',
            title: `${message.slice(0, 25)}: Weekend Real Test`,
            chapterOrTopic: message,
            subject: 'mathematics',
            scheduledDate: nextSunday,
            scheduledSlot: testSlot,
            durationMinutes: 180,
            questionCount: 75,
            weekNumber: 1,
            dayName: 'Weekend',
          },
        ];
      }

      res.json({
        success: true,
        data: {
          ...parsedData,
          reply: parsedData.reply || parsedData.replyText,
          replyText: parsedData.replyText || parsedData.reply,
        },
      });
    } catch (error: any) {
      console.error('Error in AI Academic Mentor:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to consult AI Academic Mentor',
      });
    }
  }
);

// 404 Handler for API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl || req.url}`,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]', err);
  if (res.headersSent) {
    return next(err);
  }
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      error: 'Payload too large. On Vercel, requests are limited to 4.5MB. Please upload a smaller or compressed PDF.',
    });
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

export default app;
