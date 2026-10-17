# JEE CBT Test Series Simulator (MathonGo & Official NTA Mode)

A dedicated, high-fidelity Computer-Based Test (CBT) platform built specifically for JEE aspirants. Converts any question paper PDF into a full-scale, timed mock examination in one click using Gemini Vision, and renders the test in either the authentic official **NTA CBT Exam Interface** or the modern **MathonGo / Quizrr Exam Suite**, complete with realistic question palettes, numerical virtual keypads, section navigation, and deep post-test analytics.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product requirements and UX decisions were confirmed during Phase 1 clarification:

- **Confirmed Decision 1 (Exam Patterns)**: Support both **JEE Main** (3 sections: Physics, Chemistry, Mathematics with 20 MCQs + 10 Numericals/any 5 selectable) and **JEE Advanced** (Single Correct, One or More Than One Correct, Numerical Value, and Matrix Match). Includes preset templates and custom sectional timer rules.
- **Confirmed Decision 2 (Direct PDF Ingestion & Test Focus)**: Focus squarely on the CBT test-taking experience. The AI extracts questions directly from uploaded PDFs (or image snapshots) into structured interactive questions (including LaTeX math, diagrams, options, and question types). Answer key entry is optional and flexible—students can take tests with or without pre-loaded keys, enter their own keys, or let the AI extract detected keys at the end of the document.
- **Confirmed Decision 3 (Dual Exam Interface Toggle)**:
  - **Official NTA CBT Mode**: Exact 1:1 simulation of the official National Testing Agency console (classic NTA header, candidate roll/photo panel, 5 official question palette states: *Not Visited*, *Not Answered*, *Answered*, *Marked for Review*, *Answered & Marked for Review (will be considered for evaluation)*, Question Paper view, instructions modal).
  - **Modern MathonGo / Quizrr Mode**: Sleek dark/light theme, distraction-free view, collapsible palette drawer, KaTeX mathematical typography, floating scratchpad notes, formula quick-reference, and question zoom.

---

## 1. Overview & Core Concept

- **What It Does**: JEE aspirants can drag & drop any PDF question paper (Allen, FIITJEE, MathonGo, Resonance, or past official JEE papers). Gemini multimodal AI processes the pages, extracts questions with LaTeX math formatting, isolates question figures/diagrams, categorizes sections (Physics, Chemistry, Math), and boots a full-featured real-time CBT exam room with strict timed conditions.
- **Target Audience**: JEE Main & Advanced aspirants training for speed, stamina, and real exam exam-hall psychological conditioning.
- **Key Value**: Eliminates the distraction of practicing from passive PDFs or scrolling through answer sheets; replicates the real exam time pressure, question-switching friction, and post-test analytical debriefing.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌─────────────────────────────────┐
│     1. Test Hub & PDF Upload    │ ───► Drag & drop PDF or choose pre-loaded JEE Mock
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     2. AI Parsing & Review      │ ───► Gemini extracts Physics, Chem, Math questions,
└────────────────┬────────────────┘      figures, and options into structured CBT format
                 │
                 ▼
┌─────────────────────────────────┐
│   3. Exam Instructions & Ready  │ ───► Official candidate declaration, pattern check,
└────────────────┬────────────────┘      and UI mode selection (Official NTA vs MathonGo)
                 │
                 ▼
┌─────────────────────────────────┐
│       4. Active CBT Engine      │ ───► 3-hour live countdown, section tabs, question palette,
└────────────────┬────────────────┘      save & next, mark for review, numerical virtual pad
                 │
                 ▼
┌─────────────────────────────────┐
│   5. Performance & Analytics    │ ───► Score breakdown (+4/-1), accuracy rate, time per
└─────────────────────────────────┘      question, chapter distribution, and review matrix
```

### Visual Identity & Theme

1. **Official NTA Mode**:
   - **Canvas**: Clean neutral desktop gray (`#f4f6f8` / `#e9ecef`) with classic bordered framing.
   - **NTA Question Palette Colors (Standard Official Spec)**:
     - *Not Visited* (Silver/Gray: `#e2e8f0` with dark text)
     - *Not Answered* (Official Red: `#dc2626` / `#e53e3e`)
     - *Answered* (Official Green: `#16a34a` / `#22c55e`)
     - *Marked for Review* (Official Purple: `#7c3aed` / `#9333ea`)
     - *Answered & Marked for Review* (Purple circle with green check badge)
   - **Header**: Roll number, candidate photo badge, official exam title, subject dropdown, language selector, and top countdown clock.

2. **MathonGo / Quizrr Modern Mode**:
   - **Canvas**: Slate/Zinc dark (`#090d16`) and crisp light (`#ffffff`), tailored for intense focus.
   - **Typography**: Display in `Plus Jakarta Sans` with body in `DM Sans` and mathematical formulas rendered via `KaTeX` serif font.
   - **Question Viewer**: High-contrast, balanced line-lengths, auto-zoom on pinch/click for circuit diagrams and graphs.
   - **Numerical Pad**: Responsive virtual on-screen keypad with backspace, clear, and decimal points matching the real TCS iON / NTA engine.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Stack Express Server with Gemini Multimodal PDF Parsing**
  - *Chosen Approach*: Implement an Express backend (`server.ts`) proxying calls to `@google/genai` using model `gemini-3.8-flash`. Accepts PDF files / page image buffers and processes them with structured JSON output schema.
  - *Why*: Direct client-side API keys are strictly forbidden. Server proxy keeps secrets secure, handles large base64 PDF payloads cleanly, and formats questions into strict TypeScript interfaces.
- **Decision 2: Built-in Sample Papers + Custom PDF Uploader**
  - *Chosen Approach*: Provide a rich, instant-start sample paper (Full JEE Main Mock with questions across Physics, Chemistry, and Math) alongside the drag-and-drop PDF ingestion pipeline.
  - *Why*: Allows the student to immediately jump into a test and verify the NTA/MathonGo interface without needing a sample PDF on hand, while supporting any personal test series PDF.
- **Decision 3: KaTeX for Formula & Chemical Equation Rendering**
  - *Chosen Approach*: Lightweight client-side KaTeX rendering for formulas like $\int_0^{\pi/2} \sin^2(x) dx$, $\vec{E} = -\nabla V$, and organic chemistry notation.
  - *Why*: Native crisp vector math rendering at all zoom levels, ensuring formulas look authentic and legible.
- **Decision 4: Local Persistence (`localStorage`) for Test History & In-Progress Tests**
  - *Chosen Approach*: Save test attempts, response state, timer checkpoints, and bookmarked questions in browser storage.
  - *Why*: Real exam safety—if the browser tab is accidentally refreshed or closed during a 3-hour test, the test restores instantly without data loss.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (React 19)                  │
├────────────────────────────────────────────────────────┤
│  • App.tsx (View Router: Hub ↔ Test ↔ Result)         │
│  • TestHub (Upload PDF, preset selection, mock list)   │
│  • CBTExamRoom:                                        │
│    ├── TopBar (Timer, Mode Switch, Section Switcher)   │
│    ├── QuestionViewer (LaTeX / KaTeX, Diagram, Type)   │
│    ├── AnswerArea (Single Choice, Multiple, Numerical) │
│    ├── QuestionPalette (5 NTA States, Grid navigation) │
│    └── ActionFooter (Save & Next, Clear, Mark Review)  │
│  • PostTestAnalytics (Scorecard, Accuracy, Time log)   │
└───────────────────────────┬────────────────────────────┘
                            │ REST /api/parse-pdf
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Backend (Express)                    │
├────────────────────────────────────────────────────────┤
│  • POST /api/parse-exam-pdf                            │
│    ├── Extracts text & figures via Gemini 3.8 Flash    │
│    ├── Structures into Questions, Sections, & Marking  │
│    └── Returns ExamPaper JSON payload                  │
└────────────────────────────────────────────────────────┘
```

### Core Data Models

```typescript
export type ExamPattern = 'JEE_MAIN' | 'JEE_ADVANCED';

export type QuestionType = 
  | 'SINGLE_CORRECT' 
  | 'MULTIPLE_CORRECT' 
  | 'NUMERICAL' 
  | 'MATRIX_MATCH';

export type QuestionStatus = 
  | 'NOT_VISITED' 
  | 'NOT_ANSWERED' 
  | 'ANSWERED' 
  | 'MARKED_FOR_REVIEW' 
  | 'ANSWERED_AND_MARKED_FOR_REVIEW';

export interface Question {
  id: string;
  sectionId: 'physics' | 'chemistry' | 'mathematics';
  questionNumber: number;
  type: QuestionType;
  promptLatex: string;
  diagramUrl?: string;
  options?: { id: string; labelLatex: string }[];
  correctAnswer?: string | string[] | number;
  markingScheme: { positive: number; negative: number };
}

export interface ExamPaper {
  id: string;
  title: string;
  pattern: ExamPattern;
  durationMinutes: number;
  totalMarks: number;
  sections: {
    id: 'physics' | 'chemistry' | 'mathematics';
    name: string;
    questions: Question[];
  }[];
}

export interface StudentAttempt {
  examId: string;
  startTime: number;
  endTime?: number;
  timeSpentSeconds: Record<string, number>;
  answers: Record<string, any>;
  statuses: Record<string, QuestionStatus>;
}
```

---

## 5. Next Steps

Upon approval, implementation will proceed systematically:
1. Configure dependencies (KaTeX for LaTeX formulas, canvas-confetti for results).
2. Set up full-stack Express server with Gemini multimodal PDF extraction endpoint.
3. Build the official NTA CBT and MathonGo dual-mode test room with responsive question palette, timer, and numerical keypads.
4. Implement rich post-test analytics with accuracy breakdowns, speed analysis, and response reviews.
5. Verify and compile the entire build.
