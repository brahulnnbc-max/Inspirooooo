import React, { useState, useRef, useEffect } from 'react';
import {
  ExamPaper,
  ExamPattern,
  StudentAttempt,
  MistakeEntry,
  ScheduledTest,
  DailyRoutineItem,
  TaggedQuestionEntry,
  QuestionTag,
  Question,
} from '../types/exam';
import { SAMPLE_JEE_MAIN_MOCK, SAMPLE_JEE_ADVANCED_MOCK } from '../data/samplePapers';
import { MistakeNotebook } from './MistakeNotebook';
import { SchedulePlanner } from './SchedulePlanner';
import { DailyRoutineDesk } from './DailyRoutineDesk';
import { ModulePracticeSection } from './ModulePracticeSection';
import { AIMentorSchedulerChat } from './AIMentorSchedulerChat';
import { RaceQuestionBank } from './RaceQuestionBank';
import { MathRenderer } from './MathRenderer';
import { parsePastedQuestionsInstant } from '../utils/instantQuestionParser';
import { InspiroLogo } from './InspiroLogo';
import { DiagnosisWorkbench } from './DiagnosisWorkbench';
import { compressImageFile, CompressedImage } from '../utils/imageCompressor';
import {
  UploadCloud,
  FileText,
  Play,
  Clock,
  Sparkles,
  AlertCircle,
  History,
  Activity,
  BookOpen,
  Calendar,
  Sun,
  Moon,
  Plus,
  FileCheck,
  Zap,
  Flame,
  Bot,
  Layers,
  Award,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Eye,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Image as ImageIcon,
  Paperclip,
  X,
} from 'lucide-react';

interface TestHubProps {
  onSelectExam: (paper: ExamPaper) => void;
  onViewAttempt: (attempt: StudentAttempt, paper: ExamPaper) => void;
  savedAttempts: StudentAttempt[];
  savedCustomPapers: ExamPaper[];
  onSaveCustomPaper: (paper: ExamPaper) => void;
  mistakes: MistakeEntry[];
  onRemoveMistake: (id: string) => void;
  onUpdateMistakeReason: (id: string, reason: any, notes?: string) => void;
  onPracticeSimilar: (entry: MistakeEntry) => void;
  scheduledTests: ScheduledTest[];
  onToggleTopic: (testId: string, topicId: string) => void;
  onEnterLiveTest: (test: ScheduledTest) => void;
  onAttachPaper: (testId: string, paper: ExamPaper) => void;
  onAddCustomSchedule: (newTests: ScheduledTest[]) => void;
  onDeleteScheduledTest: (testId: string) => void;
  routineItems: DailyRoutineItem[];
  onStartRoutineTask: (item: DailyRoutineItem) => void;
  onToggleRoutineComplete: (itemId: string) => void;
  onAddCustomRoutine: (items: DailyRoutineItem[]) => void;
  onDeleteRoutineItem: (itemId: string) => void;
  taggedRaceQuestions?: TaggedQuestionEntry[];
  onRemoveTaggedQuestion?: (id: string) => void;
  onUpdateQuestionTags?: (id: string, tags: QuestionTag[]) => void;
  onToggleTagOnQuestion?: (question: Question, tag: QuestionTag) => void;
}

export const TestHub: React.FC<TestHubProps> = ({
  onSelectExam,
  onViewAttempt,
  savedAttempts,
  savedCustomPapers,
  onSaveCustomPaper,
  mistakes,
  onRemoveMistake,
  onUpdateMistakeReason,
  onPracticeSimilar,
  scheduledTests,
  onToggleTopic,
  onEnterLiveTest,
  onAttachPaper,
  onAddCustomSchedule,
  onDeleteScheduledTest,
  routineItems = [],
  onStartRoutineTask = () => {},
  onToggleRoutineComplete = () => {},
  onAddCustomRoutine = () => {},
  onDeleteRoutineItem = () => {},
  taggedRaceQuestions = [],
  onRemoveTaggedQuestion = () => {},
  onUpdateQuestionTags = () => {},
  onToggleTagOnQuestion = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<
    'DIAGNOSIS' | 'ROUTINE' | 'MODULES' | 'RACE' | 'SCHEDULE' | 'MENTOR' | 'TESTS' | 'MISTAKES'
  >('DIAGNOSIS');
  const [mentorInitialPrompt, setMentorInitialPrompt] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Upload & Advanced AI Extraction State
  const [ingestionType, setIngestionType] = useState<'FILE' | 'TEXT'>('FILE');
  const [pastedQuestionText, setPastedQuestionText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedPattern, setSelectedPattern] = useState<ExamPattern>('JEE_MAIN');
  const [customTitle, setCustomTitle] = useState('');
  const [userCommand, setUserCommand] = useState<string>('');
  const [customDuration, setCustomDuration] = useState<number>(180);
  const [extractedPaperResult, setExtractedPaperResult] = useState<ExamPaper | null>(null);
  const [showPreviewQuestions, setShowPreviewQuestions] = useState<boolean>(false);
  const [showAttachToScheduleModal, setShowAttachToScheduleModal] = useState(false);
  const [paperScheduledNotice, setPaperScheduledNotice] = useState('');

  // Real-time AI engine connectivity state
  const [aiStatus, setAiStatus] = useState<{
    checked: boolean;
    hasKey: boolean;
    engine?: string;
  }>({ checked: false, hasKey: false });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setAiStatus({
          checked: true,
          hasKey: Boolean(data.hasGeminiKey),
          engine: data.aiEngine || 'Gemini 3.8 Flash Vision',
        });
      })
      .catch(() => {
        setAiStatus({ checked: true, hasKey: false });
      });
  }, []);

  // Dual file refs & states
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const qFileInputRef = useRef<HTMLInputElement | null>(null);
  const solFileInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Attached question photos & screenshots
  const [attachedImages, setAttachedImages] = useState<CompressedImage[]>([]);
  const [isCompressingImages, setIsCompressingImages] = useState(false);
  const [pastedNotification, setPastedNotification] = useState('');
  const imgInputRef = useRef<HTMLInputElement | null>(null);

  const handleAttachImageFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setIsCompressingImages(true);
    try {
      const compressedList = await Promise.all(
        list.map((f) => compressImageFile(f, f.name))
      );
      setAttachedImages((prev) => [...prev, ...compressedList]);
    } catch (err: any) {
      console.error('Image compression error:', err);
    } finally {
      setIsCompressingImages(false);
    }
  };

  const handleRemoveImage = (id: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handlePasteOnTextarea = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      setIsCompressingImages(true);
      try {
        const compressedList = await Promise.all(
          imageFiles.map((f, idx) =>
            compressImageFile(f, `Screenshot_${Date.now()}_${idx + 1}.jpg`)
          )
        );
        setAttachedImages((prev) => [...prev, ...compressedList]);
        setPastedNotification(`Attached ${imageFiles.length} screenshot(s) from clipboard!`);
        setTimeout(() => setPastedNotification(''), 4000);
      } catch (err) {
        console.error('Clipboard paste compression error:', err);
      } finally {
        setIsCompressingImages(false);
      }
    }
  };

  // 1-Click prompt copy for ChatGPT / Claude / DeepSeek
  const handleCopyExtractionPrompt = () => {
    const prompt = `Please extract all questions from this document into clean, structured text in this exact format so I can paste it into my JEE CBT simulator:

1. [Question text with standard LaTeX math equations, e.g. $E = mc^2$, $\\frac{a}{b}$, or vectors $\\vec{F}$]
(A) [Option A text]
(B) [Option B text]
(C) [Option C text]
(D) [Option D text]
Answer: [Correct Option, e.g. A, B, C, or D, or integer/decimal for numericals]
Solution: [Step-by-step masterclass solution]

2. [Next question in the same format...]`;

    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  // 1-Click fill high-yield sample questions to test immediately
  const handleFillSampleQuestions = () => {
    setPastedQuestionText(`1. A particle of mass $m$ moves along the x-axis under the action of a restoring force $F = -kx$. If its displacement is $x(t) = A \\cos(\\omega t + \\phi)$, what is the time period of oscillation?
(A) $2\\pi \\sqrt{\\frac{m}{k}}$
(B) $\\pi \\sqrt{\\frac{m}{k}}$
(C) $2\\pi \\sqrt{\\frac{k}{m}}$
(D) $\\frac{1}{2\\pi} \\sqrt{\\frac{k}{m}}$
Answer: (A)
Solution: Standard simple harmonic motion equation gives $\\omega = \\sqrt{k/m}$, hence $T = \\frac{2\\pi}{\\omega} = 2\\pi \\sqrt{\\frac{m}{k}}$.

2. Which of the following molecules has a non-zero dipole moment?
(A) $CO_2$
(B) $BF_3$
(C) $NH_3$
(D) $CH_4$
Answer: (C)
Solution: In $NH_3$, the molecule is trigonal pyramidal and the lone pair dipole reinforces the bond dipoles. In $CO_2$ (linear), $BF_3$ (trigonal planar), and $CH_4$ (tetrahedral), the bond moments cancel by molecular symmetry.

3. Calculate the definite integral: $\\int_0^1 (3x^2 + 2x) dx$.
Answer: 2
Solution: $\\int_0^1 (3x^2 + 2x) dx = [x^3 + x^2]_0^1 = (1 + 1) - 0 = 2$.`);
  };

  // Instant Deterministic Parser (0.05s, 100% offline, zero API / rate limit dependencies)
  const handleInstantConvert = () => {
    if (!pastedQuestionText.trim()) {
      setErrorMsg('Please paste your questions in the text box first');
      return;
    }
    setErrorMsg('');
    const examTitle =
      customTitle.trim() || 'Instant CBT Practice Test';
    const result = parsePastedQuestionsInstant(
      pastedQuestionText,
      examTitle,
      selectedPattern,
      customDuration,
      attachedImages
    );
    if (!result.success || !result.paper) {
      setErrorMsg(
        result.error ||
          'Could not identify question numbers. Ensure questions start with numbers like "1. ", "Q1.", or "(A)" options.'
      );
      return;
    }
    onSaveCustomPaper(result.paper);
    setExtractedPaperResult(result.paper);
  };

  // Convert files using High-Speed Gemini Vision Engine
  const handleStartConversion = async () => {
    const hasInput =
      (ingestionType === 'FILE' && questionFile) ||
      (ingestionType === 'TEXT' && (pastedQuestionText.trim() || attachedImages.length > 0));

    if (!hasInput) {
      setErrorMsg('Please paste question text or attach question photos/screenshots.');
      return;
    }

    const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    const totalBytes =
      (questionFile ? questionFile.size : 0) +
      (solutionFile ? solutionFile.size : 0) +
      attachedImages.reduce((sum, img) => sum + img.compressedSize, 0);
    const maxLimit = isVercel ? 4 * 1024 * 1024 : 28 * 1024 * 1024;
    if (ingestionType === 'FILE' && totalBytes > maxLimit) {
      setErrorMsg(
        isVercel
          ? `Selected PDF size (${(totalBytes / (1024 * 1024)).toFixed(1)}MB) exceeds Vercel's 4.5MB serverless limit. Please compress your PDF or upload 5–20 page sections.`
          : `Selected file size (${(totalBytes / (1024 * 1024)).toFixed(1)}MB) exceeds the 28MB limit. Please upload a smaller excerpt.`
      );
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setExtractedPaperResult(null);
    setActiveStageIndex(0);
    setUploadProgress(
      attachedImages.length > 0
        ? `Preparing ${attachedImages.length} compressed question image(s) & text...`
        : ingestionType === 'FILE'
        ? 'Reading & encoding PDF documents with OCR pre-processor...'
        : 'Parsing and structuring pasted question paper text...'
    );

    try {
      const readBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      let fileBase64 = '';
      if (ingestionType === 'FILE' && questionFile) {
        fileBase64 = await readBase64(questionFile);
      }
      let solutionFileBase64 = '';
      if (solutionFile) {
        setUploadProgress('Reading Solution / Answer Key PDF...');
        solutionFileBase64 = await readBase64(solutionFile);
      }

      setActiveStageIndex(1);
      setUploadProgress(
        solutionFile
          ? 'Gemini 2.5 Flash is cross-referencing Question Paper & Solutions with LaTeX...'
          : attachedImages.length > 0
          ? `Gemini 2.5 Flash is extracting questions from text & ${attachedImages.length} attached image(s)...`
          : 'Gemini 2.5 Flash is deep-scanning questions, diagrams, and formulas...'
      );

      const examTitle =
        customTitle.trim() ||
        (questionFile ? questionFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : '') ||
        'Custom Module Practice Sprint';

      const response = await fetch('/api/parse-exam-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: fileBase64 || undefined,
          textQuestions: ingestionType === 'TEXT' ? pastedQuestionText.trim() : undefined,
          images: attachedImages.map((img) => ({
            base64: img.base64,
            mimeType: img.mimeType,
            name: img.name,
          })),
          solutionFileBase64: solutionFileBase64 || undefined,
          mimeType: questionFile?.type || 'application/pdf',
          examTitle,
          pattern: selectedPattern,
          userCommand: userCommand.trim() || undefined,
          customDurationMinutes: customDuration,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server status ${response.status}`);
      }

      setActiveStageIndex(2);
      setUploadProgress('Matching answer keys and formatting LaTeX equations & diagrams...');
      const data = await response.json();

      if (!data.success || !data.examPaper) {
        throw new Error(data.error || 'Failed to parse exam questions');
      }

      setActiveStageIndex(3);
      setUploadProgress('Assembling CBT examination palette & verified solutions...');

      const generatedPaper: ExamPaper = {
        id: `custom-paper-${Date.now()}`,
        title: data.examPaper.title || examTitle,
        pattern: (data.examPaper.pattern as ExamPattern) || selectedPattern,
        durationMinutes: data.examPaper.durationMinutes || customDuration || 180,
        totalMarks:
          data.examPaper.totalMarks ||
          (selectedPattern === 'JEE_MAIN' ? 300 : 180),
        sections: data.examPaper.sections || [],
        createdAt: new Date().toISOString(),
      };

      onSaveCustomPaper(generatedPaper);
      setExtractedPaperResult(generatedPaper);
    } catch (err: any) {
      console.error('Error during PDF conversion:', err);
      // Auto-fallback for text input: parse immediately with deterministic parser!
      if (ingestionType === 'TEXT' && pastedQuestionText.trim()) {
        const examTitle =
          customTitle.trim() || 'Instant CBT Practice Test';
        const instantResult = parsePastedQuestionsInstant(
          pastedQuestionText,
          examTitle,
          selectedPattern,
          customDuration,
          attachedImages
        );
        if (instantResult.success && instantResult.paper) {
          onSaveCustomPaper(instantResult.paper);
          setExtractedPaperResult(instantResult.paper);
          setIsUploading(false);
          setUploadProgress('');
          return;
        }
      }

      const msg = err.message || '';
      if (msg.includes('413') || msg.toLowerCase().includes('payload') || msg.toLowerCase().includes('too large')) {
        setErrorMsg('The uploaded PDF exceeds Vercel\'s 4.5MB serverless payload limit. Please compress the file or upload 5–20 page sections, or paste questions into "Paste Question Paper Text".');
      } else if (msg.includes('503') || msg.toLowerCase().includes('high demand') || msg.toLowerCase().includes('unavailable')) {
        setErrorMsg('Google Gemini experienced a temporary high-demand spike. Tip: Switch to "Paste Question Paper Text" and click "⚡ Instant CBT Convert" for 0-second offline conversion!');
      } else if (msg.includes('504') || msg.toLowerCase().includes('timeout')) {
        setErrorMsg('The inspiro AI processing timed out on Vercel. Try uploading a shorter PDF (5–15 pages) or paste questions into the text tab.');
      } else {
        setErrorMsg(
          msg ||
            'Failed to convert PDF. Ensure GEMINI_API_KEY is configured in your Vercel Project Settings > Environment Variables, or paste questions directly.'
        );
      }
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const allAvailablePapers = [
    SAMPLE_JEE_MAIN_MOCK,
    SAMPLE_JEE_ADVANCED_MOCK,
    ...savedCustomPapers,
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-black text-zinc-100 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* inspiro LIVE Brand App Header */}
        <header className="border-b border-zinc-800/80 pb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <InspiroLogo size="md" showText />
            <div className="hidden sm:block h-4 w-px bg-zinc-800" />
            <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider text-zinc-400">
              JEE Practice & CBT Test Hub
            </span>
          </div>

          {/* Right Status Badges */}
          <div className="flex items-center gap-2">
            {/* Real-time AI Status Indicator */}
            {aiStatus.checked && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                  aiStatus.hasKey
                    ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
                title={
                  aiStatus.hasKey
                    ? 'Gemini AI Engine is connected and ready for PDF question paper extraction, remedial PYQs, and academic mentor.'
                    : 'GEMINI_API_KEY is not detected. Configure GEMINI_API_KEY in your server or .env for custom PDF extraction.'
                }
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    aiStatus.hasKey
                      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="hidden md:inline">
                  {aiStatus.hasKey ? 'Gemini AI Connected' : 'Gemini AI: Add Key'}
                </span>
                <span className="md:hidden">
                  {aiStatus.hasKey ? 'AI Ready' : 'No Key'}
                </span>
              </span>
            )}

            <button
              onClick={() => setActiveTab('DIAGNOSIS')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-950/60 border border-red-600/50 text-red-300 hover:bg-red-900/60 transition-all cursor-pointer shadow-[0_0_10px_rgba(220,38,38,0.3)]"
            >
              <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span>🩺 Render Diagnosis</span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
              <span className="text-white">NTA & MathonGo</span>
              <span className="text-red-500 font-extrabold">CBT</span>
            </span>
          </div>
        </header>

        {/* Primary Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('DIAGNOSIS')}
            className={`px-3.5 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'DIAGNOSIS'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'text-red-300 hover:text-white hover:bg-zinc-900 border border-red-900/50'
            }`}
          >
            <Activity className="w-4 h-4 text-red-400 animate-pulse" />
            🩺 Root-Cause Diagnosis
          </button>

          <button
            onClick={() => setActiveTab('ROUTINE')}
            className={`px-3.5 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'ROUTINE'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Zap className="w-4 h-4 fill-current text-amber-400" />
            Today's Live Desk
          </button>

          <button
            onClick={() => setActiveTab('MODULES')}
            className={`px-3.5 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'MODULES'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Layers className="w-4 h-4 text-zinc-300" />
            Module Practice Sessions
          </button>

          <button
            onClick={() => setActiveTab('RACE')}
            className={`px-3.5 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 relative ${
              activeTab === 'RACE'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Award className="w-4 h-4 text-red-400" />
            Allen RACE & Doubt Bank
            {taggedRaceQuestions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white text-black text-[10px] font-mono flex items-center justify-center font-black">
                {taggedRaceQuestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('SCHEDULE')}
            className={`px-3.5 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'SCHEDULE'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            3–6M Test Series Roadmap
            {scheduledTests.some((t) => t.status === 'LIVE_NOW') && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('MENTOR')}
            className={`px-3.5 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'MENTOR'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Bot className="w-4 h-4 text-red-400" />
            inspiro AI
          </button>

          <button
            onClick={() => setActiveTab('TESTS')}
            className={`px-3.5 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'TESTS'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            Mock Papers & PDF Ingest
          </button>

          <button
            onClick={() => setActiveTab('MISTAKES')}
            className={`px-3.5 py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 relative ${
              activeTab === 'MISTAKES'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Mistake Notebook
            {mistakes.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-mono flex items-center justify-center font-black">
                {mistakes.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 0: ROOT-CAUSE DIAGNOSIS WORKBENCH */}
        {activeTab === 'DIAGNOSIS' && (
          <DiagnosisWorkbench
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onLaunchSampleTest={() => onSelectExam(SAMPLE_JEE_MAIN_MOCK)}
          />
        )}

        {/* TAB 1: TODAY'S LIVE DESK & MASTER COACHING ROUTINE */}
        {activeTab === 'ROUTINE' && (
          <DailyRoutineDesk
            routineItems={routineItems}
            onStartRoutineTask={onStartRoutineTask}
            onToggleRoutineComplete={onToggleRoutineComplete}
            onAddCustomRoutine={onAddCustomRoutine}
            onDeleteRoutineItem={onDeleteRoutineItem}
          />
        )}

        {/* TAB 2: DEDICATED MODULE PRACTICE SESSIONS */}
        {activeTab === 'MODULES' && (
          <ModulePracticeSection
            onStartExam={onSelectExam}
            onAddCustomPaper={onSaveCustomPaper}
            onAddRoutineItems={onAddCustomRoutine}
            savedCustomPapers={savedCustomPapers}
          />
        )}

        {/* TAB 3: ALLEN RACE & DOUBT QUESTION BANK */}
        {activeTab === 'RACE' && (
          <RaceQuestionBank
            taggedQuestions={taggedRaceQuestions}
            onStartExam={onSelectExam}
            onRemoveTaggedQuestion={onRemoveTaggedQuestion}
            onUpdateTags={onUpdateQuestionTags}
            onScheduleRaceSession={(item) => onAddCustomRoutine([item])}
            onOpenAIMentorWithPrompt={(prompt) => {
              setMentorInitialPrompt(prompt);
              setActiveTab('MENTOR');
            }}
          />
        )}

        {/* TAB 4: LIVE TEST SCHEDULE & SYLLABUS ROADMAP (3-6 MONTHS) */}
        {activeTab === 'SCHEDULE' && (
          <SchedulePlanner
            scheduledTests={scheduledTests}
            onToggleTopic={onToggleTopic}
            onEnterLiveTest={onEnterLiveTest}
            onAttachPaper={onAttachPaper}
            onAddCustomSchedule={onAddCustomSchedule}
            onDeleteTest={onDeleteScheduledTest}
            onSelectExamDirectly={onSelectExam}
            savedCustomPapers={savedCustomPapers}
            onSaveCustomPaper={onSaveCustomPaper}
          />
        )}

        {/* TAB 5: AI ACADEMIC MENTOR & CONVERSATIONAL SCHEDULER */}
        {activeTab === 'MENTOR' && (
          <AIMentorSchedulerChat
            onApplyRoutine={onAddCustomRoutine}
            currentRoutineItems={routineItems}
            initialPrompt={mentorInitialPrompt}
          />
        )}

        {/* TAB 3: MOCK TESTS & MODULE PDF UPLOADER */}
        {activeTab === 'TESTS' && (
          <div className="space-y-8">
            {/* DUAL PDF UPLOAD CARD */}
            <div className="bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-base md:text-lg font-bold font-display text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-500" />
                    Convert Question PDF / Coaching Module into Timed CBT
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Upload Allen modules (Exercise 1/2) or Test Papers to automatically build a timed computer-based practice room.
                  </p>
                </div>

                {/* Pattern selector */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-400 font-medium">Format:</span>
                  <div className="flex items-center p-1 bg-zinc-900 rounded-lg text-xs font-semibold border border-zinc-800">
                    <button
                      onClick={() => setSelectedPattern('JEE_MAIN')}
                      className={`px-3 py-1.5 rounded-md transition-all ${
                        selectedPattern === 'JEE_MAIN'
                          ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      JEE Main
                    </button>
                    <button
                      onClick={() => setSelectedPattern('JEE_ADVANCED')}
                      className={`px-3 py-1.5 rounded-md transition-all ${
                        selectedPattern === 'JEE_ADVANCED'
                          ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      JEE Advanced
                    </button>
                  </div>
                </div>
              </div>

              {/* Title & Duration Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Session Title (Optional):
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Kinematics Module Ex 1 / Allen Leader Test 05"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-800 bg-black text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Test Duration:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[30, 45, 60, 90, 180].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setCustomDuration(mins)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          customDuration === mins
                            ? 'bg-red-600 text-white border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        {mins === 180 ? '3 Hours (NTA Mock)' : `${mins} Mins`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced AI Director Command & Custom Instructions Console */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        inspiro AI Command Console
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                          Gemini 3.8 Flash Vision
                        </span>
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Give any specific instruction to inspiro AI
                  </span>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={userCommand}
                    onChange={(e) => setUserCommand(e.target.value)}
                    placeholder='Type any custom directive, e.g.: "Extract all 30 questions without skipping. The answer key is in the table on the last page. Format all equations in LaTeX and provide step-by-step solutions."'
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-800 bg-black text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />

                  {/* 1-Click Command Preset Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Quick Commands:
                    </span>
                    {[
                      {
                        label: '⚡ Extract ALL Questions',
                        cmd: 'Extract every single question found in this document from start to finish without skipping or stopping early.',
                      },
                      {
                        label: '🎯 Auto-Detect Answer Key & Solutions',
                        cmd: 'Cross-reference the answer key table in the paper or solutions file, and synthesize step-by-step masterclass solutions for all questions.',
                      },
                      {
                        label: '⏱️ 45-Min Module Practice Sprint',
                        cmd: 'Configure this as a 45-minute high-speed module practice sprint with 25 questions and +4/-1 marking scheme.',
                      },
                      {
                        label: '🔢 Numerical Section B with Working',
                        cmd: 'Ensure all non-MCQ numerical integer/decimal questions in Section B are extracted with exact calculation steps.',
                      },
                      {
                        label: '📚 Group Physics, Chemistry & Maths',
                        cmd: 'Organize extracted questions into separate Physics, Chemistry, and Mathematics sections sequentially.',
                      },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setUserCommand((prev) =>
                            prev ? `${prev}\n${preset.cmd}` : preset.cmd
                          )
                        }
                        className="text-[10px] font-semibold px-2 py-1 rounded-md bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-red-600 hover:text-white transition-all active:scale-95"
                      >
                        {preset.label}
                      </button>
                    ))}
                    {userCommand && (
                      <button
                        type="button"
                        onClick={() => setUserCommand('')}
                        className="text-[10px] text-red-500 hover:underline px-1 font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Ingestion Mode Selector */}
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <span className="text-xs font-semibold text-zinc-400">Ingestion Mode:</span>
                <button
                  type="button"
                  onClick={() => setIngestionType('FILE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    ingestionType === 'FILE'
                      ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload PDF / Images
                </button>
                <button
                  type="button"
                  onClick={() => setIngestionType('TEXT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    ingestionType === 'TEXT'
                      ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Paste Question Paper Text
                </button>
              </div>

              {/* Ingestion Type: FILE (Dual File Picker Grid) */}
              {ingestionType === 'FILE' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Question Paper / Module PDF Picker */}
                  <div
                    onClick={() => qFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      questionFile
                        ? 'border-red-600 bg-red-950/20 text-white'
                        : 'border-zinc-800 hover:border-red-600/70 hover:bg-zinc-900/60 bg-zinc-900/30'
                    }`}
                  >
                    <input
                      ref={qFileInputRef}
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setQuestionFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 border border-red-600/30 flex items-center justify-center mx-auto shadow-xs">
                        {questionFile ? (
                          <FileCheck className="w-5 h-5 text-red-400" />
                        ) : (
                          <UploadCloud className="w-5 h-5" />
                        )}
                      </div>
                      <div className="font-semibold text-xs text-white">
                        {questionFile
                          ? questionFile.name
                          : 'Select Question Paper PDF or Image (Required)'}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {questionFile
                          ? `${(questionFile.size / (1024 * 1024)).toFixed(1)} MB • Click to replace`
                          : 'PDF, PNG, JPG, or WebP of test paper / coaching module'}
                      </div>
                    </div>
                  </div>

                  {/* 2. Optional Solution / Answer Key PDF Picker */}
                  <div
                    onClick={() => solFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      solutionFile
                        ? 'border-red-600 bg-red-950/20 text-white'
                        : 'border-zinc-800 hover:border-red-600/70 hover:bg-zinc-900/60 bg-zinc-900/30'
                    }`}
                  >
                    <input
                      ref={solFileInputRef}
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSolutionFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center mx-auto shadow-xs">
                        {solutionFile ? (
                          <FileCheck className="w-5 h-5 text-red-400" />
                        ) : (
                          <Plus className="w-5 h-5" />
                        )}
                      </div>
                      <div className="font-semibold text-xs text-white">
                        {solutionFile
                          ? solutionFile.name
                          : 'Attach Answer Key / Solution PDF (Optional)'}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {solutionFile
                          ? `${(solutionFile.size / (1024 * 1024)).toFixed(1)} MB • Click to replace`
                          : 'If omitted, Gemini 3.8 Flash solves questions automatically'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Ingestion Type: TEXT (Direct Question Paste & Snap Mode) */
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span>Paste Questions & Attach Photos / Screenshots:</span>
                    </label>

                    {/* Quick Helper Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input
                        ref={imgInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleAttachImageFiles(e.target.files);
                            e.target.value = '';
                          }
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => imgInputRef.current?.click()}
                        disabled={isCompressingImages}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-700/60 text-red-300 hover:text-white hover:bg-red-900 transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-red-400" />
                        <span>{isCompressingImages ? 'Compressing...' : '+ Attach Question Photos'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyExtractionPrompt}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                          copiedPrompt
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white hover:border-red-500'
                        }`}
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>Prompt Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-red-400" />
                            <span>Copy Prompt for AI</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleFillSampleQuestions}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                      >
                        💡 Load Sample
                      </button>

                      {(pastedQuestionText || attachedImages.length > 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPastedQuestionText('');
                            setAttachedImages([]);
                          }}
                          className="text-[11px] font-semibold px-2 py-1 text-zinc-500 hover:text-red-400 transition-all"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  {pastedNotification && (
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{pastedNotification}</span>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      rows={6}
                      value={pastedQuestionText}
                      onChange={(e) => setPastedQuestionText(e.target.value)}
                      onPaste={handlePasteOnTextarea}
                      placeholder="Paste question text here, or press Ctrl+V to paste screenshot photos directly from your clipboard... e.g.:
1. A particle of mass m moves under restoring force F = -kx. Time period is:
(A) 2\pi \sqrt{m/k}
(B) \pi \sqrt{m/k}
(C) 2\pi \sqrt{k/m}
(D) \sqrt{k/m}
Answer: (A)"
                      className="w-full px-4 py-3 text-xs font-mono rounded-xl border border-zinc-800 bg-black text-white placeholder:text-zinc-600 focus:outline-hidden focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    />
                    <div className="absolute right-3 bottom-3 text-[10px] text-zinc-500 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800 pointer-events-none select-none">
                      Tip: Ctrl+V pastes images
                    </div>
                  </div>

                  {/* Attached Images Thumbnails Row */}
                  {attachedImages.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-zinc-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-red-500" />
                          Attached Photos & Diagrams ({attachedImages.length}):
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Auto-compressed for ultra-fast Gemini Vision processing
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {attachedImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative group bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex items-center gap-2 overflow-hidden hover:border-zinc-700 transition-all"
                          >
                            <img
                              src={img.dataUrl}
                              alt={img.name}
                              className="w-10 h-10 object-cover rounded-lg bg-black border border-zinc-800 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-zinc-200 truncate">
                                {img.name}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                {(img.compressedSize / 1024).toFixed(0)} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(img.id)}
                              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                              title="Remove image"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pro-Tip banner */}
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-2.5 text-[11px] text-zinc-400">
                    <Sparkles className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-zinc-200">Multimodal Input Ready:</span> You can paste text formulas AND attach screenshots of diagrams or question photos. Gemini 2.5 Flash will assemble them into complete Computer-Based Test questions in seconds!
                    </div>
                  </div>
                </div>
              )}

              {/* Start Conversion Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-zinc-400">
                  {ingestionType === 'FILE' ? (
                    questionFile ? (
                      <span className="text-red-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-red-500" />
                        Ready to execute with Gemini Vision Engine
                      </span>
                    ) : (
                      <span>Select your PDF or Image file above to begin</span>
                    )
                  ) : (pastedQuestionText.trim() || attachedImages.length > 0) ? (
                    <span className="text-red-400 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-red-500" />
                      Ready to convert{' '}
                      {pastedQuestionText.trim() ? `${pastedQuestionText.split('\n').length} lines of text` : ''}
                      {pastedQuestionText.trim() && attachedImages.length > 0 ? ' and ' : ''}
                      {attachedImages.length > 0 ? `${attachedImages.length} attached photo(s)` : ''}
                    </span>
                  ) : (
                    <span>Paste question text or attach photos above to begin</span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {(questionFile || solutionFile || pastedQuestionText || attachedImages.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuestionFile(null);
                        setSolutionFile(null);
                        setPastedQuestionText('');
                        setAttachedImages([]);
                        setExtractedPaperResult(null);
                      }}
                      className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all"
                    >
                      Reset
                    </button>
                  )}

                  {/* If in text mode, provide Instant Deterministic Convert */}
                  {ingestionType === 'TEXT' && (
                    <button
                      type="button"
                      onClick={handleInstantConvert}
                      disabled={!pastedQuestionText.trim()}
                      className="px-5 py-2.5 text-xs font-black text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-red-500 active:scale-95 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
                      title="Instant offline parser: 0.05s execution, 100% immune to API timeouts"
                    >
                      <Zap className="w-4 h-4 text-amber-400 fill-current" />
                      Instant CBT Convert (0.05s)
                    </button>
                  )}

                  <button
                    onClick={handleStartConversion}
                    disabled={
                      (ingestionType === 'FILE' && !questionFile) ||
                      (ingestionType === 'TEXT' && !pastedQuestionText.trim() && attachedImages.length === 0) ||
                      isUploading
                    }
                    className="px-6 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.45)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                    {isUploading
                      ? 'Processing Questions...'
                      : attachedImages.length > 0
                      ? `AI Convert (${attachedImages.length} Photo${attachedImages.length > 1 ? 's' : ''} + Text)`
                      : ingestionType === 'TEXT'
                      ? 'AI Convert Text to CBT'
                      : 'Extract PDF & Launch CBT Test'}
                  </button>
                </div>
              </div>

              {/* 4-Stage Visual Progress Tracker */}
              {isUploading && (
                <div className="p-5 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full border-2 border-red-500 border-t-transparent animate-spin shrink-0" />
                      <span className="text-xs font-bold text-white">
                        {uploadProgress}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-red-400 font-bold">
                      Step {activeStageIndex + 1} of 4
                    </span>
                  </div>

                  {/* Visual Stepper */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                    {[
                      { title: '1. Read & OCR PDF', desc: 'Pre-processing pages' },
                      { title: '2. Gemini 3.8 Flash', desc: 'LaTeX math scanning' },
                      { title: '3. Answer Key & Logic', desc: 'Step-by-step solving' },
                      { title: '4. CBT Engine Ready', desc: 'NTA & MathonGo setup' },
                    ].map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl text-center border transition-all ${
                          idx < activeStageIndex
                            ? 'bg-red-950/30 border-red-800/80 text-red-300 font-semibold'
                            : idx === activeStageIndex
                            ? 'bg-zinc-950 border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.3)] text-white font-bold'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{step.title}</div>
                        <div className="text-[10px] opacity-75">{step.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{errorMsg}</p>
                    <p className="text-[11px] opacity-90">
                      Tip: If deploying to Vercel, make sure GEMINI_API_KEY is configured in your Vercel Environment Variables.
                    </p>
                  </div>
                </div>
              )}

              {/* SUCCESSFUL EXTRACTION LAUNCHPAD */}
              {extractedPaperResult && (
                <div className="p-5 rounded-2xl bg-zinc-950 border-2 border-red-600 shadow-[0_0_25px_rgba(220,38,38,0.25)] space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-full bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm md:text-base font-bold font-display text-white">
                          🎉 {extractedPaperResult.title} Extracted Successfully!
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-300">
                        All questions, options, LaTeX mathematical formulas, and verified solutions have been structured into the CBT engine.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onSelectExam(extractedPaperResult)}
                        className="px-4 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        Launch CBT Test Room
                      </button>

                      <button
                        onClick={() => setShowAttachToScheduleModal(true)}
                        className="px-3.5 py-2.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <Calendar className="w-4 h-4 text-red-500" />
                        Attach to Roadmap Test
                      </button>

                      <button
                        onClick={() => {
                          const newRoutineItem: DailyRoutineItem = {
                            id: `rout-extracted-${Date.now()}`,
                            type: 'REAL_TEST',
                            title: extractedPaperResult.title,
                            chapterOrTopic: extractedPaperResult.title,
                            subject: 'physics',
                            scheduledDate: new Date().toISOString().split('T')[0],
                            scheduledSlot: '19:00 - 22:00',
                            durationMinutes: extractedPaperResult.durationMinutes,
                            questionCount: extractedPaperResult.sections.reduce((acc, s) => acc + s.questions.length, 0),
                            paperId: extractedPaperResult.id,
                            paper: extractedPaperResult,
                            isCompleted: false,
                            weekNumber: 1,
                            dayName: 'Today',
                          };
                          onAddCustomRoutine([newRoutineItem]);
                          setPaperScheduledNotice(`"${extractedPaperResult.title}" has been scheduled into Today's Live Desk!`);
                          setTimeout(() => setPaperScheduledNotice(''), 6000);
                        }}
                        className="px-3.5 py-2.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <Zap className="w-4 h-4 text-amber-400" />
                        Schedule on Today's Desk
                      </button>
                    </div>
                  </div>

                  {paperScheduledNotice && (
                    <div className="p-3 rounded-xl bg-green-950/50 border border-green-800 text-green-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      <span>{paperScheduledNotice}</span>
                    </div>
                  )}

                  {/* Extracted Stats Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-black border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Total Questions</div>
                      <div className="text-lg font-black text-white">
                        {extractedPaperResult.sections.reduce((acc, s) => acc + s.questions.length, 0)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Duration</div>
                      <div className="text-lg font-black text-red-500">
                        {extractedPaperResult.durationMinutes} Mins
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Sections</div>
                      <div className="text-lg font-black text-white">
                        {extractedPaperResult.sections.length} ({extractedPaperResult.sections.map((s) => s.name).join(', ')})
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black border border-zinc-800 text-center">
                      <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Total Marks</div>
                      <div className="text-lg font-black text-red-500">
                        {extractedPaperResult.totalMarks}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Preview Accordion */}
                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowPreviewQuestions(!showPreviewQuestions)}
                      className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {showPreviewQuestions ? 'Hide Extracted Questions' : 'Preview Extracted Questions with LaTeX'}
                      {showPreviewQuestions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setExtractedPaperResult(null);
                        setQuestionFile(null);
                        setSolutionFile(null);
                      }}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Convert Another PDF
                    </button>
                  </div>

                  {/* Preview Question List */}
                  {showPreviewQuestions && (
                    <div className="max-h-96 overflow-y-auto space-y-3 p-3 bg-black rounded-xl border border-zinc-800">
                      {extractedPaperResult.sections.flatMap((s) => s.questions).map((q, idx) => (
                        <div
                          key={q.id || idx}
                          className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/60 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-red-500">
                              Question {q.questionNumber || idx + 1} ({q.sectionId?.toUpperCase() || 'SECTION'})
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                              {q.type} • +{q.positiveMarks}/-{q.negativeMarks}
                            </span>
                          </div>

                          <div className="text-white font-serif leading-relaxed">
                            <MathRenderer content={q.promptLatex} />
                          </div>

                          {q.diagramDescription && (
                            <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                              {q.diagramDescription}
                            </div>
                          )}

                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {q.options.map((opt) => (
                                <div
                                  key={opt.id}
                                  className={`p-2 rounded border text-[11px] flex items-center gap-2 ${
                                    opt.id === q.correctAnswer
                                      ? 'border-red-600 bg-red-950/30 text-white font-semibold'
                                      : 'border-zinc-800 text-zinc-300 bg-zinc-950'
                                  }`}
                                >
                                  <span className="font-bold shrink-0">{opt.id}.</span>
                                  <MathRenderer content={opt.labelLatex} />
                                </div>
                              ))}
                            </div>
                          )}

                          {q.explanationLatex && (
                            <div className="pt-2 text-[11px] text-zinc-400 border-t border-zinc-800">
                              <span className="font-bold text-red-400">Solution: </span>
                              <MathRenderer content={q.explanationLatex} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PRE-LOADED MOCKS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-bold font-display text-white">
                  Available Mock Tests
                </h2>
                <span className="text-xs text-zinc-400">
                  {allAvailablePapers.length} tests ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allAvailablePapers.map((paper) => {
                  const questionCount = paper.sections.reduce(
                    (sum, s) => sum + s.questions.length,
                    0
                  );

                  return (
                    <div
                      key={paper.id}
                      className="bg-zinc-950 rounded-xl p-5 md:p-6 border border-zinc-800 hover:border-red-600/60 shadow-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.2)] transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] md:text-[11px] font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 uppercase">
                            {paper.pattern.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-red-400" />
                            {paper.durationMinutes} Mins
                          </span>
                        </div>

                        <h3 className="font-bold text-sm md:text-base text-white leading-snug">
                          {paper.title}
                        </h3>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {paper.sections.map((sec) => (
                            <span
                              key={sec.id}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                            >
                              {sec.name} ({sec.questions.length}Q)
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                        <div className="text-xs text-zinc-400 font-medium">
                          {paper.totalMarks} Marks • {questionCount} Qs
                        </div>

                        <button
                          onClick={() => onSelectExam(paper)}
                          className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-lg shadow-[0_0_12px_rgba(220,38,38,0.35)] transition-all flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Take Test
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TEST HISTORY */}
            {savedAttempts.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h2 className="text-base md:text-lg font-bold font-display text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-red-500" />
                  Your Past Test Attempts
                </h2>

                <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-900 font-semibold text-zinc-300 border-b border-zinc-800">
                        <tr>
                          <th className="p-3">Test Name</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Score</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-mono">
                        {savedAttempts.map((att) => {
                          const matchedPaper = allAvailablePapers.find(
                            (p) => p.id === att.examId
                          );

                          return (
                            <tr
                              key={att.id}
                              className="hover:bg-zinc-900/60 transition-colors"
                            >
                              <td className="p-3 font-sans font-medium text-white">
                                {att.examTitle}
                              </td>
                              <td className="p-3 text-zinc-400">
                                {new Date(att.submittedAt).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-red-400 font-bold">
                                Completed
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    if (matchedPaper) {
                                      onViewAttempt(att, matchedPaper);
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-white hover:bg-red-600/20 rounded transition-colors"
                                >
                                  View Analysis
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MISTAKE NOTEBOOK (ERROR BOOK) */}
        {activeTab === 'MISTAKES' && (
          <MistakeNotebook
            mistakes={mistakes}
            onRemoveMistake={onRemoveMistake}
            onUpdateMistakeReason={onUpdateMistakeReason}
            onPracticeSimilar={onPracticeSimilar}
          />
        )}

        {/* Attach Extracted Paper to Scheduled Test Modal */}
        {showAttachToScheduleModal && extractedPaperResult && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-500" />
                    Attach Paper to Test Roadmap
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Select a scheduled test to assign "{extractedPaperResult.title}" to:
                  </p>
                </div>
                <button
                  onClick={() => setShowAttachToScheduleModal(false)}
                  className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {scheduledTests.map((test, idx) => (
                  <div
                    key={test.id}
                    className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-600 flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-xs text-white">{test.title}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        Date: {test.scheduledDate} • Shift: {test.startTime}-{test.endTime}
                      </div>
                      {test.paper && (
                        <div className="text-[10px] text-red-400 mt-0.5 font-medium">
                          Currently: {test.paper.title}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        onAttachPaper(test.id, extractedPaperResult);
                        setShowAttachToScheduleModal(false);
                        setPaperScheduledNotice(`"${extractedPaperResult.title}" attached to "${test.title}"!`);
                        setTimeout(() => setPaperScheduledNotice(''), 6000);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shrink-0 shadow-xs active:scale-95 transition-all"
                    >
                      {test.paper ? 'Replace' : 'Attach'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
