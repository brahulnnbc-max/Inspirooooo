import React, { useState, useEffect } from 'react';
import {
  ExamPaper,
  StudentAttempt,
  UIMode,
  MistakeEntry,
  MistakeReason,
  Question,
  RemedialPack,
  ScheduledTest,
  DailyRoutineItem,
  TaggedQuestionEntry,
  QuestionTag,
} from './types/exam';
import { SAMPLE_JEE_MAIN_MOCK } from './data/samplePapers';
import {
  SAMPLE_SCHEDULED_TESTS,
  SAMPLE_DAILY_ROUTINE,
  SAMPLE_TAGGED_RACE_QUESTIONS,
} from './data/sampleSchedules';
import { TestHub } from './components/TestHub';
import { ExamInstructions } from './components/ExamInstructions';
import { CBTExamRoom } from './components/CBTExamRoom';
import { PostTestAnalytics } from './components/PostTestAnalytics';
import { RemedialPracticeModal } from './components/RemedialPracticeModal';

type AppView = 'HUB' | 'INSTRUCTIONS' | 'CBT_ROOM' | 'ANALYTICS';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('HUB');
  const [selectedPaper, setSelectedPaper] = useState<ExamPaper | null>(null);
  const [selectedMode, setSelectedMode] = useState<UIMode>('NTA_OFFICIAL');
  const [activeAttempt, setActiveAttempt] = useState<StudentAttempt | null>(null);

  // Persistent custom papers
  const [customPapers, setCustomPapers] = useState<ExamPaper[]>(() => {
    try {
      const stored = localStorage.getItem('jee_custom_papers');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persistent attempts
  const [savedAttempts, setSavedAttempts] = useState<StudentAttempt[]>(() => {
    try {
      const stored = localStorage.getItem('jee_saved_attempts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persistent Mistake Notebook entries
  const [mistakes, setMistakes] = useState<MistakeEntry[]>(() => {
    try {
      const stored = localStorage.getItem('jee_mistakes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persistent Scheduled Tests (3-6 Months Roadmap)
  const [scheduledTests, setScheduledTests] = useState<ScheduledTest[]>(() => {
    try {
      const stored = localStorage.getItem('jee_scheduled_tests');
      return stored ? JSON.parse(stored) : SAMPLE_SCHEDULED_TESTS;
    } catch {
      return SAMPLE_SCHEDULED_TESTS;
    }
  });

  // Persistent Daily Coaching Routine Checklist
  const [routineItems, setRoutineItems] = useState<DailyRoutineItem[]>(() => {
    try {
      const stored = localStorage.getItem('jee_daily_routine');
      return stored ? JSON.parse(stored) : SAMPLE_DAILY_ROUTINE;
    } catch {
      return SAMPLE_DAILY_ROUTINE;
    }
  });

  // Persistent Tagged RACE & Doubt Bank Questions
  const [taggedRaceQuestions, setTaggedRaceQuestions] = useState<TaggedQuestionEntry[]>(() => {
    try {
      const stored = localStorage.getItem('jee_tagged_race_bank');
      return stored ? JSON.parse(stored) : SAMPLE_TAGGED_RACE_QUESTIONS;
    } catch {
      return SAMPLE_TAGGED_RACE_QUESTIONS;
    }
  });

  // Global Remedial Drill Modal State
  const [globalRemedialPack, setGlobalRemedialPack] = useState<RemedialPack | null>(null);
  const [isGlobalLoadingRemedial, setIsGlobalLoadingRemedial] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jee_tagged_race_bank', JSON.stringify(taggedRaceQuestions));
    } catch (e) {
      console.warn('Failed to save tagged race bank', e);
    }
  }, [taggedRaceQuestions]);
  useEffect(() => {
    try {
      localStorage.setItem('jee_daily_routine', JSON.stringify(routineItems));
    } catch (e) {
      console.warn('Failed to save daily routine', e);
    }
  }, [routineItems]);
  useEffect(() => {
    try {
      localStorage.setItem('jee_custom_papers', JSON.stringify(customPapers));
    } catch (e) {
      console.warn('Failed to save custom papers', e);
    }
  }, [customPapers]);

  useEffect(() => {
    try {
      localStorage.setItem('jee_saved_attempts', JSON.stringify(savedAttempts));
    } catch (e) {
      console.warn('Failed to save attempts', e);
    }
  }, [savedAttempts]);

  useEffect(() => {
    try {
      localStorage.setItem('jee_mistakes', JSON.stringify(mistakes));
    } catch (e) {
      console.warn('Failed to save mistakes', e);
    }
  }, [mistakes]);

  useEffect(() => {
    try {
      localStorage.setItem('jee_scheduled_tests', JSON.stringify(scheduledTests));
    } catch (e) {
      console.warn('Failed to save scheduled tests', e);
    }
  }, [scheduledTests]);

  // Handler: Select an exam from the hub -> Go to Instructions
  const handleSelectExam = (paper: ExamPaper) => {
    setSelectedPaper(paper);
    setCurrentView('INSTRUCTIONS');
  };

  // Handler: Start examination after reading instructions
  const handleStartExam = (mode: UIMode) => {
    setSelectedMode(mode);
    setCurrentView('CBT_ROOM');
  };

  // Handler: Submit examination -> Save attempt and view analytics
  const handleSubmitExam = (attempt: StudentAttempt) => {
    setSavedAttempts((prev) => [attempt, ...prev]);
    setActiveAttempt(attempt);

    // If this attempt matches a scheduled test, mark it as COMPLETED
    setScheduledTests((prev) =>
      prev.map((t) => {
        if (t.paperId === attempt.examId || t.title === attempt.examTitle) {
          return { ...t, status: 'COMPLETED', score: attempt.totalMarks };
        }
        return t;
      })
    );

    setCurrentView('ANALYTICS');
  };

  // Handler: View previous attempt analysis
  const handleViewAttempt = (attempt: StudentAttempt, paper: ExamPaper) => {
    setSelectedPaper(paper);
    setActiveAttempt(attempt);
    setCurrentView('ANALYTICS');
  };

  // Handler: Save newly extracted custom paper from PDF
  const handleSaveCustomPaper = (paper: ExamPaper) => {
    setCustomPapers((prev) => [paper, ...prev.filter((p) => p.id !== paper.id)]);
  };

  // Handler: Log a mistake into the Mistake Notebook
  const handleLogMistake = (
    q: Question,
    userAnswer: any,
    correctAnswer: string,
    reason: MistakeReason,
    timeSpent: number
  ) => {
    setMistakes((prev) => {
      const existingIdx = prev.findIndex((m) => m.question.id === q.id);
      const newEntry: MistakeEntry = {
        id: `mistake-${q.id}-${Date.now()}`,
        question: q,
        examTitle: selectedPaper?.title || 'JEE Mock Test',
        userAnswer,
        correctAnswer,
        reason,
        timeSpentSeconds: timeSpent,
        createdAt: Date.now(),
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], reason, timeSpentSeconds: timeSpent };
        return copy;
      }
      return [newEntry, ...prev];
    });
  };

  // Handler: Remove mistake from notebook (when mastered)
  const handleRemoveMistake = (id: string) => {
    setMistakes((prev) => prev.filter((m) => m.id !== id));
  };

  // Handler: Update reason in mistake notebook
  const handleUpdateMistakeReason = (id: string, reason: MistakeReason, notes?: string) => {
    setMistakes((prev) =>
      prev.map((m) => (m.id === id ? { ...m, reason, notes: notes ?? m.notes } : m))
    );
  };

  // Handler: Launch AI Remedial PYQs from the Mistake Notebook
  const handlePracticeSimilarFromNotebook = async (entry: MistakeEntry) => {
    setIsGlobalLoadingRemedial(true);
    setGlobalRemedialPack(null);

    try {
      const response = await fetch('/api/generate-remedial-pyqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptLatex: entry.question.promptLatex,
          sectionId: entry.question.sectionId,
          pattern: selectedPaper?.pattern || 'JEE_MAIN',
          missedReason: entry.reason || 'CONCEPT_GAP',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate remedial questions');
      }

      const resData = await response.json();
      if (resData.success && resData.data) {
        setGlobalRemedialPack(resData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGlobalLoadingRemedial(false);
    }
  };

  // Schedule Handlers
  const handleToggleTopic = (testId: string, topicId: string) => {
    setScheduledTests((prev) =>
      prev.map((test) => {
        if (test.id !== testId) return test;
        return {
          ...test,
          syllabus: test.syllabus.map((top) =>
            top.id === topicId ? { ...top, completed: !top.completed } : top
          ),
        };
      })
    );
  };

  const handleEnterLiveTest = (test: ScheduledTest) => {
    // If paper is attached, use it; otherwise look up in customPapers by paperId or use mock with test's title
    const paperToUse: ExamPaper =
      test.paper ||
      customPapers.find((p) => p.id === test.paperId) || {
        ...SAMPLE_JEE_MAIN_MOCK,
        id: `live-${test.id}`,
        title: test.title,
      };

    setSelectedPaper(paperToUse);
    setCurrentView('INSTRUCTIONS');
  };

  const handleAttachPaper = (testId: string, paper: ExamPaper) => {
    setScheduledTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, paperId: paper.id, paper } : t))
    );
  };

  const handleAddCustomSchedule = (newTests: ScheduledTest[]) => {
    setScheduledTests(newTests);
  };

  const handleDeleteScheduledTest = (testId: string) => {
    setScheduledTests((prev) => prev.filter((t) => t.id !== testId));
  };

  // Routine Handlers
  const handleStartRoutineTask = (item: DailyRoutineItem) => {
    const paperToUse: ExamPaper =
      item.paper ||
      customPapers.find((p) => p.id === item.paperId) || {
        ...SAMPLE_JEE_MAIN_MOCK,
        id: `rout-${item.id}`,
        title: item.title,
        durationMinutes: item.durationMinutes || 50,
      };
    setSelectedPaper(paperToUse);
    setCurrentView('INSTRUCTIONS');
  };

  const handleToggleRoutineComplete = (itemId: string) => {
    setRoutineItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, isCompleted: !it.isCompleted } : it))
    );
  };

  const handleAddCustomRoutine = (newItems: DailyRoutineItem[]) => {
    setRoutineItems((prev) => [...newItems, ...prev]);
  };

  const handleDeleteRoutineItem = (itemId: string) => {
    setRoutineItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // RACE & Doubt Question Bank Handlers
  const handleToggleTagOnQuestion = (question: Question, tag: QuestionTag) => {
    setTaggedRaceQuestions((prev) => {
      const existingIdx = prev.findIndex((entry) => entry.question.id === question.id);
      if (existingIdx >= 0) {
        const entry = prev[existingIdx];
        const updatedTags = entry.tags.includes(tag)
          ? entry.tags.filter((t) => t !== tag)
          : [...entry.tags, tag];

        if (updatedTags.length === 0) {
          return prev.filter((_, idx) => idx !== existingIdx);
        }
        const copy = [...prev];
        copy[existingIdx] = { ...entry, tags: updatedTags };
        return copy;
      } else {
        const newEntry: TaggedQuestionEntry = {
          id: `tag-${question.id}-${Date.now()}`,
          question,
          examId: selectedPaper?.id || 'exam',
          examTitle: selectedPaper?.title || 'JEE Mock / Practice Sprint',
          subject: question.sectionId,
          tags: [tag],
          correctAnswer: question.correctAnswer,
          addedAt: Date.now(),
          practiceCount: 1,
        };
        return [newEntry, ...prev];
      }
    });
  };

  const handleRemoveTaggedQuestion = (id: string) => {
    setTaggedRaceQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleUpdateQuestionTags = (id: string, tags: QuestionTag[]) => {
    setTaggedRaceQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, tags } : q))
    );
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600 selection:text-white">
      {/* 1. TEST HUB */}
      {currentView === 'HUB' && (
        <TestHub
          onSelectExam={handleSelectExam}
          onViewAttempt={handleViewAttempt}
          savedAttempts={savedAttempts}
          savedCustomPapers={customPapers}
          onSaveCustomPaper={handleSaveCustomPaper}
          mistakes={mistakes}
          onRemoveMistake={handleRemoveMistake}
          onUpdateMistakeReason={handleUpdateMistakeReason}
          onPracticeSimilar={handlePracticeSimilarFromNotebook}
          scheduledTests={scheduledTests}
          onToggleTopic={handleToggleTopic}
          onEnterLiveTest={handleEnterLiveTest}
          onAttachPaper={handleAttachPaper}
          onAddCustomSchedule={handleAddCustomSchedule}
          onDeleteScheduledTest={handleDeleteScheduledTest}
          routineItems={routineItems}
          onStartRoutineTask={handleStartRoutineTask}
          onToggleRoutineComplete={handleToggleRoutineComplete}
          onAddCustomRoutine={handleAddCustomRoutine}
          onDeleteRoutineItem={handleDeleteRoutineItem}
          taggedRaceQuestions={taggedRaceQuestions}
          onRemoveTaggedQuestion={handleRemoveTaggedQuestion}
          onUpdateQuestionTags={handleUpdateQuestionTags}
          onToggleTagOnQuestion={handleToggleTagOnQuestion}
        />
      )}

      {/* 2. EXAM INSTRUCTIONS & DECLARATION */}
      {currentView === 'INSTRUCTIONS' && selectedPaper && (
        <ExamInstructions
          paper={selectedPaper}
          onStartExam={handleStartExam}
          onCancel={() => setCurrentView('HUB')}
        />
      )}

      {/* 3. ACTIVE CBT EXAM ROOM */}
      {currentView === 'CBT_ROOM' && selectedPaper && (
        <CBTExamRoom
          paper={selectedPaper}
          initialMode={selectedMode}
          onSubmitExam={handleSubmitExam}
          onExit={() => setCurrentView('HUB')}
          onToggleTag={handleToggleTagOnQuestion}
        />
      )}

      {/* 4. POST-TEST PERFORMANCE ANALYTICS */}
      {currentView === 'ANALYTICS' && selectedPaper && activeAttempt && (
        <PostTestAnalytics
          paper={selectedPaper}
          attempt={activeAttempt}
          onRetake={() => setCurrentView('INSTRUCTIONS')}
          onBackToHub={() => setCurrentView('HUB')}
          onLogMistake={handleLogMistake}
        />
      )}

      {/* Global Remedial PYQs Modal */}
      <RemedialPracticeModal
        pack={globalRemedialPack}
        isLoading={isGlobalLoadingRemedial}
        onClose={() => {
          setGlobalRemedialPack(null);
          setIsGlobalLoadingRemedial(false);
        }}
      />
    </div>
  );
}
