import React, { useState, useEffect, useMemo } from 'react';
import {
  ExamPaper,
  Question,
  QuestionStatus,
  StudentAttempt,
  SubjectId,
  UIMode,
  QuestionTag,
} from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { NumericalKeypad } from './NumericalKeypad';
import { ScratchpadModal } from './ScratchpadModal';
import { InspiroLogo } from './InspiroLogo';
import {
  Clock,
  User,
  Monitor,
  FileText,
  HelpCircle,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Menu,
  X,
  Grid,
  Star,
  Zap,
  Flame,
  ZoomIn,
} from 'lucide-react';

interface CBTExamRoomProps {
  paper: ExamPaper;
  initialMode?: UIMode;
  onSubmitExam: (attempt: StudentAttempt) => void;
  onExit: () => void;
  onToggleTag?: (question: Question, tag: QuestionTag) => void;
}

export const CBTExamRoom: React.FC<CBTExamRoomProps> = ({
  paper,
  initialMode = 'NTA_OFFICIAL',
  onSubmitExam,
  onExit,
  onToggleTag,
}) => {
  // Mode toggle: Official NTA vs Modern MathonGo
  const [uiMode, setUiMode] = useState<UIMode>(initialMode);
  // Default to day mode (false) in NTA Official for authentic government exam terminal appearance, toggleable to dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(initialMode === 'MATHANGO');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Active section & question indices
  const [activeSectionId, setActiveSectionId] = useState<SubjectId>(
    paper.sections[0]?.id || 'physics'
  );
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Examination state
  const [secondsRemaining, setSecondsRemaining] = useState(
    paper.durationMinutes * 60
  );
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({});
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [startedAt] = useState<number>(Date.now());
  const [questionTags, setQuestionTags] = useState<Record<string, QuestionTag[]>>({});

  const handleToggleTag = (tag: QuestionTag) => {
    if (!currentQuestion) return;
    setQuestionTags((prev) => {
      const currentTags = prev[currentQuestion.id] || [];
      const updated = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];
      return { ...prev, [currentQuestion.id]: updated };
    });
    if (onToggleTag && currentQuestion) {
      onToggleTag(currentQuestion, tag);
    }
  };

  // UI modals & Mobile Drawer
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isQuestionPaperModalOpen, setIsQuestionPaperModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Active section reference
  const currentSection = useMemo(() => {
    return (
      paper.sections.find((s) => s.id === activeSectionId) ||
      paper.sections[0]
    );
  }, [paper.sections, activeSectionId]);

  // Active question reference
  const currentQuestion: Question | undefined = useMemo(() => {
    return currentSection?.questions[activeQuestionIndex];
  }, [currentSection, activeQuestionIndex]);

  // Section A (MCQ) vs Section B (Numerical) Filter for authentic NTA CBT
  const [activeSubSection, setActiveSubSection] = useState<'ALL' | 'SECTION_A' | 'SECTION_B'>('ALL');

  // Filter questions for the question palette based on active subsection
  const displayedQuestions = useMemo(() => {
    if (!currentSection) return [];
    return currentSection.questions.map((q, idx) => ({ ...q, originalIdx: idx })).filter((q) => {
      if (activeSubSection === 'SECTION_A') return q.type !== 'NUMERICAL';
      if (activeSubSection === 'SECTION_B') return q.type === 'NUMERICAL';
      return true;
    });
  }, [currentSection, activeSubSection]);

  // Initialize questions as NOT_VISITED except the initial one (NOT_ANSWERED)
  useEffect(() => {
    const initialStatuses: Record<string, QuestionStatus> = {};
    paper.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        initialStatuses[q.id] = 'NOT_VISITED';
      });
    });

    const firstQ = paper.sections[0]?.questions[0];
    if (firstQ) {
      initialStatuses[firstQ.id] = 'NOT_ANSWERED';
    }
    setStatuses(initialStatuses);
  }, [paper]);

  // Track time spent per active question & overall countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });

      if (currentQuestion) {
        setTimeSpent((prev) => ({
          ...prev,
          [currentQuestion.id]: (prev[currentQuestion.id] || 0) + 1,
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion]);

  // Format seconds into HH:MM:SS
  const formattedTimer = useMemo(() => {
    const hrs = Math.floor(secondsRemaining / 3600);
    const mins = Math.floor((secondsRemaining % 3600) / 60);
    const secs = secondsRemaining % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [secondsRemaining]);

  // Move to a question and update visited status
  const navigateToQuestion = (secId: SubjectId, qIndex: number) => {
    const targetSection = paper.sections.find((s) => s.id === secId);
    if (!targetSection) return;
    const targetQ = targetSection.questions[qIndex];
    if (!targetQ) return;

    setActiveSectionId(secId);
    setActiveQuestionIndex(qIndex);
    setIsMobilePaletteOpen(false); // Close mobile drawer when selecting

    // If currently NOT_VISITED, change to NOT_ANSWERED
    setStatuses((prev) => {
      if (!prev[targetQ.id] || prev[targetQ.id] === 'NOT_VISITED') {
        return { ...prev, [targetQ.id]: 'NOT_ANSWERED' };
      }
      return prev;
    });
  };

  // Action: Save & Next
  const handleSaveAndNext = () => {
    if (!currentQuestion) return;
    const hasAnswer =
      answers[currentQuestion.id] !== undefined &&
      answers[currentQuestion.id] !== '';

    setStatuses((prev) => ({
      ...prev,
      [currentQuestion.id]: hasAnswer ? 'ANSWERED' : 'NOT_ANSWERED',
    }));

    goToNextQuestion();
  };

  // Action: Save & Mark for Review
  const handleSaveAndMarkForReview = () => {
    if (!currentQuestion) return;
    const hasAnswer =
      answers[currentQuestion.id] !== undefined &&
      answers[currentQuestion.id] !== '';

    setStatuses((prev) => ({
      ...prev,
      [currentQuestion.id]: hasAnswer
        ? 'ANSWERED_AND_MARKED_FOR_REVIEW'
        : 'MARKED_FOR_REVIEW',
    }));

    goToNextQuestion();
  };

  // Action: Mark for Review & Next
  const handleMarkForReviewAndNext = () => {
    if (!currentQuestion) return;

    setStatuses((prev) => ({
      ...prev,
      [currentQuestion.id]: 'MARKED_FOR_REVIEW',
    }));

    goToNextQuestion();
  };

  // Action: Clear Response
  const handleClearResponse = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[currentQuestion.id];
      return updated;
    });

    setStatuses((prev) => ({
      ...prev,
      [currentQuestion.id]: 'NOT_ANSWERED',
    }));
  };

  // Advance to next question in current section or jump to next section
  const goToNextQuestion = () => {
    if (activeQuestionIndex < currentSection.questions.length - 1) {
      navigateToQuestion(activeSectionId, activeQuestionIndex + 1);
    } else {
      const currSecIdx = paper.sections.findIndex((s) => s.id === activeSectionId);
      if (currSecIdx < paper.sections.length - 1) {
        navigateToQuestion(paper.sections[currSecIdx + 1].id, 0);
      }
    }
  };

  const goToPreviousQuestion = () => {
    if (activeQuestionIndex > 0) {
      navigateToQuestion(activeSectionId, activeQuestionIndex - 1);
    } else {
      const currSecIdx = paper.sections.findIndex((s) => s.id === activeSectionId);
      if (currSecIdx > 0) {
        const prevSec = paper.sections[currSecIdx - 1];
        navigateToQuestion(prevSec.id, prevSec.questions.length - 1);
      }
    }
  };

  // Handle final submission
  const handleFinalSubmit = () => {
    const attempt: StudentAttempt = {
      id: `attempt-${Date.now()}`,
      examId: paper.id,
      examTitle: paper.title,
      pattern: paper.pattern,
      totalMarks: paper.totalMarks,
      startedAt,
      submittedAt: Date.now(),
      timeSpentSeconds: timeSpent,
      answers,
      statuses,
      questionTags,
    };
    setIsSubmitModalOpen(false);
    onSubmitExam(attempt);
  };

  // Status Counts across entire paper
  const overallCounts = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let notVisited = 0;
    let markedReview = 0;
    let answeredMarkedReview = 0;

    paper.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        const st = statuses[q.id] || 'NOT_VISITED';
        if (st === 'ANSWERED') answered++;
        else if (st === 'NOT_ANSWERED') notAnswered++;
        else if (st === 'MARKED_FOR_REVIEW') markedReview++;
        else if (st === 'ANSWERED_AND_MARKED_FOR_REVIEW') answeredMarkedReview++;
        else notVisited++;
      });
    });

    return {
      answered,
      notAnswered,
      notVisited,
      markedReview,
      answeredMarkedReview,
      total:
        answered + notAnswered + notVisited + markedReview + answeredMarkedReview,
    };
  }, [paper, statuses]);

  // Helper to render question palette button for NTA vs MathonGo
  const renderPaletteButton = (q: Question, idx: number) => {
    const st = statuses[q.id] || 'NOT_VISITED';
    const isCurrent = currentQuestion?.id === q.id;

    const qTags = questionTags[q.id] || [];

    if (uiMode === 'NTA_OFFICIAL') {
      let shapeClass = 'nta-shape-not-visited border border-slate-300';
      if (st === 'NOT_ANSWERED') shapeClass = 'nta-shape-not-answered';
      else if (st === 'ANSWERED') shapeClass = 'nta-shape-answered';
      else if (st === 'MARKED_FOR_REVIEW') shapeClass = 'nta-shape-review';
      else if (st === 'ANSWERED_AND_MARKED_FOR_REVIEW')
        shapeClass = 'nta-shape-answered-review';

      return (
        <button
          key={q.id}
          onClick={() => navigateToQuestion(q.sectionId, idx)}
          className={`w-9 h-9 min-w-[36px] text-xs font-bold flex items-center justify-center relative transition-transform active:scale-95 ${shapeClass} ${
            isCurrent ? 'ring-2 ring-blue-600 ring-offset-2' : ''
          }`}
          title={`Question ${q.questionNumber}: ${st.replace(/_/g, ' ')}${qTags.length ? ` [Tags: ${qTags.join(', ')}]` : ''}`}
        >
          {q.questionNumber}
          {st === 'ANSWERED_AND_MARKED_FOR_REVIEW' && (
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[7px] text-white">
              ✓
            </span>
          )}
          {qTags.length > 0 && (
            <span
              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${
                qTags.includes('HARD')
                  ? 'bg-rose-500'
                  : qTags.includes('TRICKY')
                  ? 'bg-purple-500'
                  : qTags.includes('RACE_STAR')
                  ? 'bg-emerald-500'
                  : 'bg-amber-400'
              }`}
            />
          )}
        </button>
      );
    }

    // Modern MathonGo / Quizrr Palette
    let bgBadge =
      'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (st === 'ANSWERED') {
      bgBadge = 'bg-emerald-600 text-white font-bold shadow-xs border-emerald-600';
    } else if (st === 'NOT_ANSWERED') {
      bgBadge = 'bg-rose-500 text-white font-bold shadow-xs border-rose-500';
    } else if (st === 'MARKED_FOR_REVIEW') {
      bgBadge = 'bg-purple-600 text-white font-bold border-purple-600';
    } else if (st === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
      bgBadge =
        'bg-purple-700 text-white ring-2 ring-emerald-400 font-bold border-purple-700';
    }

    return (
      <button
        key={q.id}
        onClick={() => navigateToQuestion(q.sectionId, idx)}
        className={`w-9 h-9 min-w-[36px] rounded-lg text-xs font-medium border flex items-center justify-center relative transition-all active:scale-95 ${bgBadge} ${
          isCurrent
            ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105'
            : ''
        }`}
        title={`Question ${q.questionNumber}: ${st.replace(/_/g, ' ')}${qTags.length ? ` [Tags: ${qTags.join(', ')}]` : ''}`}
      >
        {q.questionNumber}
        {qTags.length > 0 && (
          <span
            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${
              qTags.includes('HARD')
                ? 'bg-rose-500'
                : qTags.includes('TRICKY')
                ? 'bg-purple-500'
                : qTags.includes('RACE_STAR')
                ? 'bg-emerald-500'
                : 'bg-amber-400'
            }`}
          />
        )}
      </button>
    );
  };

  // Palette View component (rendered in sidebar on desktop, inside drawer on mobile)
  const PaletteContent = (
    <div
      className={`flex flex-col justify-between h-full p-3.5 space-y-3 ${
        uiMode === 'NTA_OFFICIAL' && !isDarkMode
          ? 'bg-[#eef2f5] text-slate-800'
          : 'bg-zinc-950 text-zinc-100'
      }`}
    >
      <div className="space-y-3">
        {/* Candidate Profile Box (Authentic NTA Exam Hall Box) */}
        <div
          className={`p-2.5 rounded-md border flex items-center gap-3 ${
            uiMode === 'NTA_OFFICIAL' && !isDarkMode
              ? 'bg-white border-slate-300 shadow-xs'
              : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <div className="w-12 h-14 rounded border border-slate-400 bg-slate-200 dark:bg-zinc-800 flex flex-col items-center justify-center shrink-0 overflow-hidden text-slate-500">
            <User className="w-7 h-7 text-slate-600 dark:text-zinc-400" />
            <span className="text-[7px] font-mono font-bold mt-0.5 uppercase tracking-tighter">Candidate</span>
          </div>
          <div className="text-[11px] leading-tight space-y-1 overflow-hidden">
            <div className="truncate">
              <strong className={!isDarkMode ? 'text-slate-900' : 'text-white'}>Candidate Name:</strong> JEE Aspirant
            </div>
            <div className="truncate font-mono">
              <strong className={!isDarkMode ? 'text-slate-900' : 'text-white'}>Roll No.:</strong> 250310084920
            </div>
            <div className="truncate">
              <strong className={!isDarkMode ? 'text-slate-900' : 'text-white'}>Subject:</strong> {currentSection.name.toUpperCase()}
            </div>
            <div className="truncate text-slate-500 font-mono text-[10px]">
              <strong>System:</strong> C001
            </div>
          </div>
        </div>

        {/* Legend counts */}
        <div
          className={`p-2.5 rounded-md border text-[11px] space-y-2 ${
            uiMode === 'NTA_OFFICIAL' && !isDarkMode
              ? 'bg-white border-slate-300 shadow-xs'
              : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 flex items-center justify-center font-bold text-[11px] nta-shape-answered shrink-0">
                {overallCounts.answered}
              </span>
              <span className="truncate">Answered</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 flex items-center justify-center font-bold text-[11px] nta-shape-not-answered shrink-0">
                {overallCounts.notAnswered}
              </span>
              <span className="truncate">Not Answered</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 flex items-center justify-center font-bold text-[11px] nta-shape-not-visited shrink-0">
                {overallCounts.notVisited}
              </span>
              <span className="truncate">Not Visited</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 flex items-center justify-center font-bold text-[11px] nta-shape-review shrink-0">
                {overallCounts.markedReview}
              </span>
              <span className="truncate">Marked Review</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200 dark:border-zinc-800">
            <span className="w-6 h-6 flex items-center justify-center font-bold text-[11px] nta-shape-answered-review shrink-0 relative">
              {overallCounts.answeredMarkedReview}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border border-white" />
            </span>
            <span className="truncate text-[10px]">Ans & Marked for Review (Evaluated)</span>
          </div>
        </div>

        {/* Question Grid with Section A / Section B tabs */}
        <div>
          <div
            className={`text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
              uiMode === 'NTA_OFFICIAL' && !isDarkMode ? 'text-[#1f4e79]' : 'text-zinc-400'
            }`}
          >
            <span>{currentSection.name} Questions:</span>
            <span className="font-mono text-[11px]">{currentSection.questions.length} Total</span>
          </div>

          {/* Sub-section palette filter tabs for NTA mode */}
          {uiMode === 'NTA_OFFICIAL' && (
            <div className="flex items-center gap-1 mb-2">
              <button
                type="button"
                onClick={() => setActiveSubSection('ALL')}
                className={`flex-1 py-1 text-[10px] font-bold rounded border transition-colors ${
                  activeSubSection === 'ALL'
                    ? 'bg-[#337ab7] text-white border-[#204d74]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                All ({currentSection.questions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubSection('SECTION_A')}
                className={`flex-1 py-1 text-[10px] font-bold rounded border transition-colors ${
                  activeSubSection === 'SECTION_A'
                    ? 'bg-[#337ab7] text-white border-[#204d74]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Sec A ({currentSection.questions.filter((q) => q.type !== 'NUMERICAL').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubSection('SECTION_B')}
                className={`flex-1 py-1 text-[10px] font-bold rounded border transition-colors ${
                  activeSubSection === 'SECTION_B'
                    ? 'bg-[#337ab7] text-white border-[#204d74]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Sec B ({currentSection.questions.filter((q) => q.type === 'NUMERICAL').length})
              </button>
            </div>
          )}

          <div
            className={`grid grid-cols-5 gap-1.5 max-h-[40vh] overflow-y-auto p-1.5 rounded border ${
              uiMode === 'NTA_OFFICIAL' && !isDarkMode
                ? 'bg-white border-slate-300'
                : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            {displayedQuestions.map((q) =>
              renderPaletteButton(q, q.originalIdx)
            )}
          </div>
        </div>
      </div>

      <div
        className={`space-y-1.5 pt-2 border-t ${
          uiMode === 'NTA_OFFICIAL' && !isDarkMode ? 'border-slate-300' : 'border-zinc-800'
        }`}
      >
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setIsQuestionPaperModalOpen(true)}
            className={`py-2 text-xs font-bold rounded flex items-center justify-center gap-1 border transition-colors ${
              uiMode === 'NTA_OFFICIAL' && !isDarkMode
                ? 'bg-white hover:bg-slate-100 text-[#337ab7] border-[#337ab7]'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Question Paper
          </button>

          <button
            onClick={() => setIsInstructionsModalOpen(true)}
            className={`py-2 text-xs font-bold rounded flex items-center justify-center gap-1 border transition-colors ${
              uiMode === 'NTA_OFFICIAL' && !isDarkMode
                ? 'bg-white hover:bg-slate-100 text-[#337ab7] border-[#337ab7]'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Instructions
          </button>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className={`w-full py-2.5 text-xs font-black rounded uppercase tracking-wider transition-colors shadow-xs ${
            uiMode === 'NTA_OFFICIAL' && !isDarkMode
              ? 'bg-[#28a745] hover:bg-[#218838] text-white border border-[#1e7e34]'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
          }`}
        >
          Submit Examination
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen flex flex-col select-none font-sans ${
        uiMode === 'NTA_OFFICIAL' && !isDarkMode
          ? 'bg-[#f4f6f9] text-slate-900'
          : 'bg-black text-zinc-100'
      }`}
    >
      {/* 1. TOP BAR */}
      <header
        className={`px-3 md:px-5 py-2 md:py-2.5 flex items-center justify-between border-b ${
          uiMode === 'NTA_OFFICIAL' && !isDarkMode
            ? 'bg-white text-slate-800 border-slate-300 shadow-2xs'
            : 'bg-zinc-950 text-white border-zinc-800'
        }`}
      >
        {/* Left: Branding with official NTA & inspiro badge */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1.5 select-none shrink-0">
            <InspiroLogo size="sm" variant={uiMode === 'NTA_OFFICIAL' && !isDarkMode ? 'light' : 'dark'} />
            <div>
              <div className="flex items-center gap-1 font-bold text-xs md:text-sm">
                <span className={uiMode === 'NTA_OFFICIAL' && !isDarkMode ? 'text-[#1f4e79]' : 'text-white'}>
                  JEE (Main) — CBT PORTAL
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase bg-emerald-600 text-white">
                  Official Replica
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px] sm:max-w-xs">
                {paper.title}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Live Timer Box (Exact NTA Digital Display) */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1 rounded border font-mono font-bold text-xs md:text-base shrink-0 shadow-xs ${
            uiMode === 'NTA_OFFICIAL' && !isDarkMode
              ? 'bg-[#337ab7] text-white border-[#204d74]'
              : secondsRemaining < 300
              ? 'bg-red-600/30 text-red-300 border-red-500 animate-pulse'
              : 'bg-zinc-900 border-zinc-800 text-white'
          }`}
        >
          <span className="text-[11px] font-sans font-semibold uppercase tracking-wider hidden sm:inline opacity-90">
            Time Left :
          </span>
          <Clock className="w-4 h-4 text-amber-300" />
          <span className="tabular-nums tracking-wider">{formattedTimer}</span>
        </div>

        {/* Right: Quick Tools & Mode/DayNight Toggle */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Day / Night Mode Switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-1.5 md:px-2.5 md:py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors border ${
              uiMode === 'NTA_OFFICIAL' && !isDarkMode
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title={isDarkMode ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {isDarkMode ? (
              <Sun className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-600" />
            )}
            <span className="hidden sm:inline">{isDarkMode ? 'Day Mode' : 'Night Mode'}</span>
          </button>

          {/* Theme switcher */}
          <button
            onClick={() =>
              setUiMode(uiMode === 'NTA_OFFICIAL' ? 'MATHANGO' : 'NTA_OFFICIAL')
            }
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors border ${
              uiMode === 'NTA_OFFICIAL' && !isDarkMode
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title="Toggle between NTA Official & MathonGo modern interface"
          >
            <Monitor className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden md:inline">
              {uiMode === 'NTA_OFFICIAL' ? 'Switch: MathonGo' : 'Switch: NTA CBT'}
            </span>
          </button>

          {/* Rough sheet scratchpad */}
          <button
            onClick={() => setIsScratchpadOpen(true)}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors border ${
              uiMode === 'NTA_OFFICIAL' && !isDarkMode
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title="Open virtual scratchpad for rough work"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Rough Sheet</span>
          </button>

          {/* Mobile Question Palette Drawer Button */}
          <button
            onClick={() => setIsMobilePaletteOpen(true)}
            className="lg:hidden p-1.5 bg-emerald-600 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
            title="Open Question Palette"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. SUBJECT TABS & CANDIDATE STRIP */}
      <div
        className={`px-3 md:px-5 py-2 flex flex-wrap items-center justify-between gap-2 border-b ${
          uiMode === 'NTA_OFFICIAL' && !isDarkMode
            ? 'bg-[#eef2f5] border-slate-300'
            : 'bg-zinc-900 border-zinc-800'
        }`}
      >
        {/* Subject Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full">
          <span className={`text-[11px] font-bold uppercase tracking-wider mr-1 hidden sm:inline ${
            !isDarkMode ? 'text-slate-600' : 'text-slate-400'
          }`}>
            Sections:
          </span>
          {paper.sections.map((section) => {
            const isActive = section.id === activeSectionId;
            const answeredInSec = section.questions.filter(
              (q) =>
                statuses[q.id] === 'ANSWERED' ||
                statuses[q.id] === 'ANSWERED_AND_MARKED_FOR_REVIEW'
            ).length;

            return (
              <button
                key={section.id}
                onClick={() => navigateToQuestion(section.id, 0)}
                className={`px-4 py-1.5 text-xs font-bold rounded-t transition-all flex items-center gap-2 shrink-0 border ${
                  uiMode === 'NTA_OFFICIAL' && !isDarkMode
                    ? isActive
                      ? 'bg-[#285e8e] text-white border-[#1c4466] shadow-xs'
                      : 'bg-[#e6e6e6] hover:bg-[#dcdcdc] text-slate-800 border-slate-300'
                    : isActive
                    ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.45)] border-red-500'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-800'
                }`}
              >
                <span>{section.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-black/30 text-white' : 'bg-slate-300 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}>
                  {answeredInSec}/{section.questions.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Candidate Identifier badge */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <div className="w-6 h-6 rounded-full bg-[#337ab7]/20 border border-[#337ab7]/40 flex items-center justify-center font-bold text-[#337ab7]">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden sm:block leading-tight text-right">
            <div className={`font-bold ${!isDarkMode ? 'text-slate-900' : 'text-white'}`}>
              JEE Aspirant
            </div>
            <div className={`text-[10px] font-mono ${!isDarkMode ? 'text-slate-500' : 'text-zinc-500'}`}>
              Roll: 250310084920
            </div>
          </div>
        </div>
      </div>

      {/* NTA Official Section A (MCQs) & Section B (Numerical) Sub-bar */}
      {uiMode === 'NTA_OFFICIAL' && (
        <div
          className={`px-3 md:px-5 py-1.5 flex flex-wrap items-center justify-between text-xs border-b ${
            !isDarkMode ? 'bg-[#d9edf7] border-[#bce8f1] text-[#31708f]' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[11px]">Sub Sections:</span>
            <button
              type="button"
              onClick={() => {
                setActiveSubSection('SECTION_A');
                const firstA = currentSection.questions.findIndex((q) => q.type !== 'NUMERICAL');
                if (firstA !== -1) navigateToQuestion(currentSection.id, firstA);
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeSubSection === 'SECTION_A' || (activeSubSection === 'ALL' && currentQuestion?.type !== 'NUMERICAL')
                  ? 'bg-[#337ab7] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
              }`}
            >
              Section A (MCQ)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubSection('SECTION_B');
                const firstB = currentSection.questions.findIndex((q) => q.type === 'NUMERICAL');
                if (firstB !== -1) navigateToQuestion(currentSection.id, firstB);
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                activeSubSection === 'SECTION_B' || (activeSubSection === 'ALL' && currentQuestion?.type === 'NUMERICAL')
                  ? 'bg-[#337ab7] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
              }`}
            >
              Section B (Numerical)
            </button>
          </div>

          <div className="text-[11px] font-medium hidden sm:block">
            {currentQuestion?.type === 'NUMERICAL' ? (
              <span>
                <strong>Section B:</strong> Numerical Value | Correct: <span className="font-bold text-emerald-700 dark:text-emerald-400">+{currentQuestion.positiveMarks || 4}</span> | Negative: <span className="font-bold text-rose-700 dark:text-rose-400">-{currentQuestion.negativeMarks ?? 0}</span>
              </span>
            ) : (
              <span>
                <strong>Section A:</strong> Multiple Choice | Correct: <span className="font-bold text-emerald-700 dark:text-emerald-400">+{currentQuestion?.positiveMarks || 4}</span> | Negative: <span className="font-bold text-rose-700 dark:text-rose-400">-{currentQuestion?.negativeMarks ?? 1}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Question & Response Controls */}
        <div
          className={`flex-1 flex flex-col justify-between overflow-y-auto p-3 md:p-5 ${
            uiMode === 'NTA_OFFICIAL' && !isDarkMode
              ? 'bg-[#f4f6f9]'
              : 'bg-zinc-950'
          }`}
        >
          {currentQuestion ? (
            <div className="max-w-4xl w-full mx-auto space-y-4">
              {/* Question Subheader: NTA Type & Marking scheme */}
              <div
                className={`p-2.5 rounded-t-lg border flex flex-wrap items-center justify-between gap-2 text-xs ${
                  uiMode === 'NTA_OFFICIAL' && !isDarkMode
                    ? 'bg-[#eef2f5] border-slate-300 text-slate-800'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <span className="font-bold">
                    Section :{' '}
                    <span className="font-semibold text-[#1f4e79] dark:text-blue-400">
                      {currentSection.name.toUpperCase()} — {currentQuestion.type === 'NUMERICAL' ? 'Section B' : 'Section A'}
                    </span>
                  </span>
                  <span className="opacity-40 hidden sm:inline">|</span>
                  <span className="font-bold">
                    Question Type :{' '}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {currentQuestion.type === 'NUMERICAL'
                        ? 'Numerical Value Question'
                        : currentQuestion.type === 'MULTIPLE_CORRECT'
                        ? 'Multiple Correct Options'
                        : 'Multiple Choice Question (Single Correct)'}
                    </span>
                  </span>
                  <span className="opacity-40 hidden sm:inline">|</span>
                  <span className="font-medium">
                    Marks: <strong className="text-emerald-600 font-mono">+{currentQuestion.positiveMarks || 4}</strong> | Negative: <strong className="text-rose-600 font-mono">-{currentQuestion.negativeMarks ?? (currentQuestion.type === 'NUMERICAL' ? 0 : 1)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px] font-medium">
                    <span>View in:</span>
                    <select className="bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 px-2 py-0.5 rounded text-xs">
                      <option>English</option>
                      <option>Hindi</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Main Question Card */}
              <div
                className={`p-4 md:p-6 rounded-b-lg border border-t-0 space-y-4 ${
                  uiMode === 'NTA_OFFICIAL' && !isDarkMode
                    ? 'bg-white border-slate-300 text-slate-900 shadow-xs'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-100'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                  <span className={`font-bold text-sm md:text-base ${
                    uiMode === 'NTA_OFFICIAL' && !isDarkMode ? 'text-[#1f4e79]' : 'text-red-500'
                  }`}>
                    Question No. {currentQuestion.questionNumber}
                  </span>

                  {/* Question Tagging Pill */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleTag('DOUBT')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        (questionTags[currentQuestion.id] || []).includes('DOUBT')
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700'
                      }`}
                    >
                      Doubt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleTag('HARD')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        (questionTags[currentQuestion.id] || []).includes('HARD')
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700'
                      }`}
                    >
                      Hard
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleTag('RACE_STAR')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        (questionTags[currentQuestion.id] || []).includes('RACE_STAR')
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700'
                      }`}
                    >
                      RACE Star
                    </button>
                  </div>
                </div>

                {/* Question Prompt with KaTeX */}
                <div className="text-sm md:text-base leading-relaxed">
                  <MathRenderer content={currentQuestion.promptLatex} />
                </div>

                {currentQuestion.imageUrl && (
                  <div className="my-3 p-2.5 rounded-xl border border-zinc-700/60 bg-black/40 dark:bg-black/60 flex flex-col items-center group max-w-lg mx-auto shadow-sm">
                    <img
                      src={currentQuestion.imageUrl}
                      alt={`Diagram for Question ${currentQuestion.questionNumber}`}
                      className="max-h-80 w-auto object-contain rounded-lg cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.02]"
                      onClick={() => setZoomedImageUrl(currentQuestion.imageUrl || null)}
                    />
                    <button
                      type="button"
                      onClick={() => setZoomedImageUrl(currentQuestion.imageUrl || null)}
                      className="mt-2 text-[11px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-red-600 transition-colors shadow-xs"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-red-500" />
                      <span>Click to Enlarge / Fullscreen</span>
                    </button>
                  </div>
                )}

                {currentQuestion.diagramDescription && !currentQuestion.imageUrl && (
                  <div className="p-3 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs text-indigo-900 dark:text-indigo-200">
                    <strong>[Figure / Diagram]:</strong>{' '}
                    {currentQuestion.diagramDescription}
                  </div>
                )}

                {/* Response Input Area */}
                <div
                  className={`pt-4 border-t ${
                    !isDarkMode ? 'border-slate-200' : 'border-zinc-800'
                  }`}
                >
                  {currentQuestion.type === 'NUMERICAL' ? (
                    <div className="py-2">
                      <div className="text-xs font-semibold uppercase text-slate-500 mb-2">
                        Enter Your Numerical Value (Use Keyboard or Keypad):
                      </div>
                      <NumericalKeypad
                        value={answers[currentQuestion.id] || ''}
                        onChange={(val) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: val,
                          }))
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {currentQuestion.type === 'MULTIPLE_CORRECT'
                          ? 'Select One or More Option(s):'
                          : 'Choose One Correct Option:'}
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {currentQuestion.options?.map((option, optIdx) => {
                          const isSelected =
                            currentQuestion.type === 'MULTIPLE_CORRECT'
                              ? Array.isArray(answers[currentQuestion.id]) &&
                                answers[currentQuestion.id].includes(option.id)
                              : answers[currentQuestion.id] === option.id;

                          const handleSelect = () => {
                            if (currentQuestion.type === 'MULTIPLE_CORRECT') {
                              const cur = Array.isArray(answers[currentQuestion.id])
                                ? [...answers[currentQuestion.id]]
                                : [];
                              const next = cur.includes(option.id)
                                ? cur.filter((x) => x !== option.id)
                                : [...cur, option.id];
                              setAnswers((prev) => ({
                                ...prev,
                                [currentQuestion.id]: next,
                              }));
                            } else {
                              setAnswers((prev) => ({
                                ...prev,
                                [currentQuestion.id]: option.id,
                              }));
                            }
                          };

                          const optionNum = optIdx + 1;

                          return (
                            <div
                              key={option.id}
                              onClick={handleSelect}
                              className={`p-3 md:p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                                uiMode === 'NTA_OFFICIAL' && !isDarkMode
                                  ? isSelected
                                    ? 'bg-[#e8f4fc] border-[#337ab7] text-slate-900 ring-2 ring-[#337ab7]/30 shadow-xs'
                                    : 'bg-white hover:bg-[#f0f8ff] border-slate-300 text-slate-800 shadow-2xs'
                                  : isSelected
                                  ? 'bg-red-950/30 border-red-600 text-white ring-1 ring-red-600 shadow-[0_0_12px_rgba(220,38,38,0.2)]'
                                  : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 text-zinc-200'
                              }`}
                            >
                              {/* Authentic NTA Radio Button */}
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? 'border-[#337ab7] bg-[#337ab7] text-white'
                                    : 'border-slate-400 bg-white text-slate-600'
                                }`}
                              >
                                {isSelected ? (
                                  <div className="w-2 h-2 rounded-full bg-white" />
                                ) : null}
                              </div>
                              <span className="font-bold text-xs pt-0.5 text-slate-500 shrink-0">
                                ({optionNum})
                              </span>
                              <div className="flex-1 text-xs md:text-sm pt-0.5">
                                <MathRenderer content={option.labelLatex} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-400">
              Select a question to begin.
            </div>
          )}

          {/* Action Footer Navigation Strip (Exact Official NTA Actions) */}
          <div
            className={`mt-4 pt-3 border-t -mx-3 -mb-3 md:-mx-5 md:-mb-5 p-3.5 flex flex-wrap items-center justify-between gap-2 ${
              uiMode === 'NTA_OFFICIAL' && !isDarkMode
                ? 'bg-[#f5f5f5] border-slate-300 shadow-xs'
                : 'bg-zinc-950 border-zinc-800'
            }`}
          >
            {/* Primary actions */}
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <button
                onClick={handleSaveAndNext}
                className={`px-4 py-2 text-xs font-bold active:scale-95 rounded transition-all uppercase tracking-wider ${
                  uiMode === 'NTA_OFFICIAL' && !isDarkMode
                    ? 'bg-[#28a745] hover:bg-[#218838] text-white border border-[#1e7e34] shadow-xs'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                }`}
              >
                Save & Next
              </button>

              <button
                onClick={handleSaveAndMarkForReview}
                className={`px-3.5 md:px-4 py-2 text-xs font-bold active:scale-95 rounded transition-all uppercase tracking-wider ${
                  uiMode === 'NTA_OFFICIAL' && !isDarkMode
                    ? 'bg-[#f0ad4e] hover:bg-[#ec971f] text-white border border-[#eea236] shadow-xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                }`}
              >
                Save & Mark for Review
              </button>

              <button
                onClick={handleClearResponse}
                className={`px-3.5 py-2 text-xs font-semibold active:scale-95 rounded transition-all uppercase tracking-wider ${
                  uiMode === 'NTA_OFFICIAL' && !isDarkMode
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-400 shadow-xs'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                Clear Response
              </button>

              <button
                onClick={handleMarkForReviewAndNext}
                className={`px-3.5 py-2 text-xs font-bold active:scale-95 rounded transition-all uppercase tracking-wider ${
                  uiMode === 'NTA_OFFICIAL' && !isDarkMode
                    ? 'bg-[#337ab7] hover:bg-[#286090] text-white border border-[#204d74] shadow-xs'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                Mark for Review & Next
              </button>
            </div>

            {/* Stepper & Submit */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                onClick={goToPreviousQuestion}
                disabled={activeQuestionIndex === 0 && paper.sections[0].id === activeSectionId}
                className={`px-3.5 py-2 text-xs font-semibold rounded disabled:opacity-40 transition-all flex items-center gap-1 ${
                  uiMode === 'NTA_OFFICIAL' && !isDarkMode
                    ? 'bg-[#e6e6e6] hover:bg-[#d4d4d4] text-slate-800 border border-slate-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                onClick={goToNextQuestion}
                className={`px-3.5 py-2 text-xs font-semibold rounded transition-all flex items-center gap-1 ${
                  uiMode === 'NTA_OFFICIAL' && !isDarkMode
                    ? 'bg-[#e6e6e6] hover:bg-[#d4d4d4] text-slate-800 border border-slate-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className={`ml-1 px-5 md:px-6 py-2 text-xs font-black rounded uppercase tracking-wider transition-all active:scale-95 shadow-xs ${
                  uiMode === 'NTA_OFFICIAL' && !isDarkMode
                    ? 'bg-[#28a745] hover:bg-[#218838] text-white border border-[#1e7e34]'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Palette (Right Column) */}
        <div
          className={`hidden lg:block w-80 border-l overflow-y-auto ${
            uiMode === 'NTA_OFFICIAL' && !isDarkMode
              ? 'bg-[#eef2f5] border-slate-300'
              : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          {PaletteContent}
        </div>

        {/* Mobile Slide-Over Question Palette Drawer */}
        {isMobilePaletteOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              onClick={() => setIsMobilePaletteOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            />
            {/* Drawer */}
            <div
              className={`relative ml-auto w-80 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 ${
                isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
              }`}
            >
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-sm">Question Navigation</span>
                <button
                  onClick={() => setIsMobilePaletteOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{PaletteContent}</div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <ScratchpadModal
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
      />

      {/* Full Question Paper Overview Modal */}
      {isQuestionPaperModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 md:p-6">
          <div className="w-full max-w-4xl max-h-[90vh] bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 flex flex-col overflow-hidden text-white">
            <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-sm md:text-base text-white">
                  Question Paper — {paper.title}
                </h3>
              </div>
              <button
                onClick={() => setIsQuestionPaperModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {paper.sections.map((section) => (
                <div key={section.id} className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <span className="w-3 h-3 rounded-full bg-red-600" />
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-zinc-200">
                      {section.name} ({section.questions.length} Questions)
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {section.questions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-red-400">
                            Question {q.questionNumber} ({q.type.replace('_', ' ')})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsQuestionPaperModalOpen(false);
                              navigateToQuestion(section.id, qIdx);
                            }}
                            className="px-3 py-1 rounded text-[11px] font-bold bg-zinc-800 hover:bg-red-600 text-white transition-colors"
                          >
                            Jump to Question
                          </button>
                        </div>

                        <div className="text-xs md:text-sm text-zinc-200 leading-relaxed">
                          <MathRenderer content={q.promptLatex} />
                        </div>

                        {q.imageUrl && (
                          <div className="my-2 max-w-sm rounded-lg overflow-hidden border border-zinc-700 bg-black/60 p-2">
                            <img
                              src={q.imageUrl}
                              alt={`Diagram for Question ${q.questionNumber}`}
                              className="max-h-48 w-auto object-contain rounded"
                            />
                          </div>
                        )}

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-zinc-300">
                            {q.options.map((opt) => (
                              <div
                                key={opt.id}
                                className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center gap-2"
                              >
                                <span className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {opt.id}
                                </span>
                                <MathRenderer content={opt.labelLatex} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <span>Press Esc or click Close to return to the live exam terminal.</span>
              <button
                onClick={() => setIsQuestionPaperModalOpen(false)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-colors"
              >
                Close Question Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Image Zoom Modal */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomedImageUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImageUrl}
              alt="Enlarged Question Diagram"
              className="max-h-[80vh] w-auto object-contain rounded-lg shadow-lg"
            />
            <div className="mt-3 text-xs text-zinc-400 font-medium flex items-center gap-2">
              <span>Zoomed Diagram View</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => setZoomedImageUrl(null)}
                className="text-red-400 hover:text-red-300 font-bold underline"
              >
                Close (or click outside)
              </button>
            </div>
          </div>
        </div>
      )}

      {isInstructionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-zinc-950 rounded-2xl shadow-2xl p-6 border border-zinc-800 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-base text-white">Examination Instructions</h3>
              <button
                onClick={() => setIsInstructionsModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs leading-relaxed text-zinc-300">
              <p>• Correct answer: +4 marks.</p>
              <p>• Incorrect answer in MCQs: -1 mark (or -2 in JEE Advanced multiple correct).</p>
              <p>• Numerical questions: +4 marks, 0 negative marks.</p>
              <p>• To save your answer, click <strong className="text-white">Save & Next</strong>.</p>
              <p>• Questions marked as "Answered and Marked for Review" WILL be considered for evaluation.</p>
            </div>
            <button
              onClick={() => setIsInstructionsModalOpen(false)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            >
              Back To Test
            </button>
          </div>
        </div>
      )}

      {/* Submit Test Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden text-white">
            <div className="px-6 py-4 bg-black text-white font-bold text-sm flex items-center gap-2 border-b border-zinc-800">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Submit Examination Confirmation
            </div>

            <div className="p-6 space-y-4 text-xs text-zinc-300">
              <p className="font-bold text-sm text-white">
                Exam Summary Before Final Submission:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border border-zinc-800 text-center">
                  <thead className="bg-zinc-900 font-semibold text-zinc-300">
                    <tr>
                      <th className="p-2 border-b border-zinc-800">Section</th>
                      <th className="p-2 border-b border-zinc-800">Total</th>
                      <th className="p-2 border-b border-zinc-800 text-white">Answered</th>
                      <th className="p-2 border-b border-zinc-800 text-red-400">Not Answered</th>
                      <th className="p-2 border-b border-zinc-800 text-zinc-400">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 font-mono">
                    {paper.sections.map((sec) => {
                      const totalSec = sec.questions.length;
                      const ansSec = sec.questions.filter(
                        (q) =>
                          statuses[q.id] === 'ANSWERED' ||
                          statuses[q.id] === 'ANSWERED_AND_MARKED_FOR_REVIEW'
                      ).length;
                      const notAnsSec = sec.questions.filter(
                        (q) => statuses[q.id] === 'NOT_ANSWERED'
                      ).length;
                      const revSec = sec.questions.filter(
                        (q) =>
                          statuses[q.id] === 'MARKED_FOR_REVIEW' ||
                          statuses[q.id] === 'ANSWERED_AND_MARKED_FOR_REVIEW'
                      ).length;

                      return (
                        <tr key={sec.id} className="hover:bg-zinc-900/40">
                          <td className="p-2 text-left font-sans font-medium text-white">{sec.name}</td>
                          <td className="p-2 text-zinc-300">{totalSec}</td>
                          <td className="p-2 text-white font-bold">{ansSec}</td>
                          <td className="p-2 text-red-400 font-bold">{notAnsSec}</td>
                          <td className="p-2 text-zinc-400">{revSec}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200">
                Are you sure you want to submit? You will not be able to change your responses once submitted.
              </div>
            </div>

            <div className="px-6 py-4 bg-black border-t border-zinc-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
              >
                Resume Test
              </button>
              <button
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all active:scale-95"
              >
                Yes, Submit Final
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
