import React, { useState } from 'react';
import {
  Question,
  QuestionTag,
  SubjectId,
  TaggedQuestionEntry,
  ExamPaper,
  DailyRoutineItem,
} from '../types/exam';
import { MathRenderer } from './MathRenderer';
import {
  HelpCircle,
  Flame,
  Zap,
  Star,
  Play,
  Calendar,
  Sparkles,
  Layers,
  Clock,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Filter,
  Check,
  Bot,
  Award,
} from 'lucide-react';

interface RaceQuestionBankProps {
  taggedQuestions: TaggedQuestionEntry[];
  onStartExam: (paper: ExamPaper) => void;
  onRemoveTaggedQuestion: (id: string) => void;
  onUpdateTags: (id: string, tags: QuestionTag[]) => void;
  onScheduleRaceSession: (item: DailyRoutineItem) => void;
  onOpenAIMentorWithPrompt: (prompt: string) => void;
}

export const RaceQuestionBank: React.FC<RaceQuestionBankProps> = ({
  taggedQuestions,
  onStartExam,
  onRemoveTaggedQuestion,
  onUpdateTags,
  onScheduleRaceSession,
  onOpenAIMentorWithPrompt,
}) => {
  const [selectedTagFilter, setSelectedTagFilter] = useState<QuestionTag | 'ALL'>('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<SubjectId | 'ALL'>('ALL');
  const [drillSize, setDrillSize] = useState<number>(15);
  const [drillDuration, setDrillDuration] = useState<number>(30);
  const [bankNotice, setBankNotice] = useState<string>('');

  // Filtered entries
  const filteredEntries = taggedQuestions.filter((item) => {
    const matchesTag =
      selectedTagFilter === 'ALL' ? true : item.tags.includes(selectedTagFilter);
    const matchesSub =
      selectedSubjectFilter === 'ALL' ? true : item.subject === selectedSubjectFilter;
    return matchesTag && matchesSub;
  });

  // Counts by tag
  const totalCount = taggedQuestions.length;
  const doubtCount = taggedQuestions.filter((q) => q.tags.includes('DOUBT')).length;
  const hardCount = taggedQuestions.filter((q) => q.tags.includes('HARD')).length;
  const trickyCount = taggedQuestions.filter((q) => q.tags.includes('TRICKY')).length;
  const starCount = taggedQuestions.filter((q) => q.tags.includes('RACE_STAR')).length;

  // Build a custom CBT Exam Paper from tagged questions for instant timed practice!
  const handleLaunchRaceDrill = () => {
    if (filteredEntries.length === 0) {
      setBankNotice('No tagged questions match your current filter. Tag questions during tests or sprints first!');
      return;
    }

    const questionsToInclude = filteredEntries
      .slice(0, drillSize)
      .map((entry, idx) => ({
        ...entry.question,
        questionNumber: idx + 1,
      }));

    // Group into physics, chemistry, mathematics sections
    const secPhys = questionsToInclude.filter((q) => q.sectionId === 'physics');
    const secChem = questionsToInclude.filter((q) => q.sectionId === 'chemistry');
    const secMath = questionsToInclude.filter((q) => q.sectionId === 'mathematics');

    const sections = [];
    if (secPhys.length) sections.push({ id: 'physics' as SubjectId, name: 'Physics', questions: secPhys });
    if (secChem.length) sections.push({ id: 'chemistry' as SubjectId, name: 'Chemistry', questions: secChem });
    if (secMath.length) sections.push({ id: 'mathematics' as SubjectId, name: 'Mathematics', questions: secMath });

    // Fallback if all in one subject
    if (!sections.length) {
      sections.push({
        id: 'physics' as SubjectId,
        name: 'Mixed RACE Drill',
        questions: questionsToInclude,
      });
    }

    const racePaper: ExamPaper = {
      id: `race-drill-${Date.now()}`,
      title: `Allen RACE Drill: ${selectedTagFilter === 'ALL' ? 'Mixed' : selectedTagFilter} Questions (${questionsToInclude.length} Qs)`,
      pattern: 'JEE_MAIN',
      durationMinutes: drillDuration,
      totalMarks: questionsToInclude.length * 4,
      sections,
    };

    onStartExam(racePaper);
  };

  // Schedule a daily 7-8 PM repetition sprint into the Daily Routine checklist
  const handleScheduleRaceDrill = () => {
    if (filteredEntries.length === 0) {
      setBankNotice('No tagged questions available to schedule. Tag questions during tests first!');
      return;
    }

    const questionsToInclude = filteredEntries
      .slice(0, drillSize)
      .map((entry, idx) => ({
        ...entry.question,
        questionNumber: idx + 1,
      }));

    const racePaper: ExamPaper = {
      id: `race-scheduled-${Date.now()}`,
      title: `RACE Doubt & Repeat Sprint (${questionsToInclude.length} Qs)`,
      pattern: 'JEE_MAIN',
      durationMinutes: drillDuration,
      totalMarks: questionsToInclude.length * 4,
      sections: [
        {
          id: 'physics' as SubjectId,
          name: 'RACE Practice',
          questions: questionsToInclude,
        },
      ],
    };

    const newRoutineItem: DailyRoutineItem = {
      id: `rout-race-${Date.now()}`,
      type: 'MODULE_PRACTICE',
      title: `Allen RACE Drill • ${selectedTagFilter === 'ALL' ? 'Doubts & Star' : selectedTagFilter} Revision`,
      chapterOrTopic: 'Tagged Doubt & RACE Questions',
      subject: 'physics',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledSlot: '19:00 - 20:00',
      durationMinutes: drillDuration,
      questionCount: questionsToInclude.length,
      paperId: racePaper.id,
      paper: racePaper,
      isCompleted: false,
      weekNumber: 1,
      dayName: 'Today',
    };

    onScheduleRaceSession(newRoutineItem);
    setBankNotice("RACE Daily Drill has been scheduled to Today's Live Desk (19:00 - 20:00)!");
  };

  return (
    <div className="space-y-8 text-white">
      {/* 1. HERO BANNER */}
      <div className="bg-zinc-950 text-white rounded-3xl p-6 md:p-8 border-2 border-red-600/80 shadow-[0_0_30px_rgba(220,38,38,0.25)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.5)] text-xs font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5" />
            Allen RACE & Doubt Question Bank
          </div>

          <h2 className="text-xl md:text-3xl font-extrabold font-display text-white">
            Regular Analysis through Continuous Exercises (RACE)
          </h2>

          <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
            Every question you tag as <strong>Doubt, Hard, Tricky, or RACE Star</strong> during test series and module practice sessions is consolidated here. Practice them repeatedly in timed CBT test format so you master derivations, formulas, and tricky problem-solving traps.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleLaunchRaceDrill}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Launch Timed RACE Drill in CBT Mode
            </button>

            <button
              onClick={handleScheduleRaceDrill}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-red-500" />
              Schedule Daily RACE Slot (7–8 PM)
            </button>

            <button
              onClick={() =>
                onOpenAIMentorWithPrompt(
                  `I have ${totalCount} saved questions in my Allen RACE & Doubt Bank (${doubtCount} Doubts, ${hardCount} Hard, ${trickyCount} Tricky). Please construct an authentic 3-hour Sunday test using these exact hard and tricky questions, and arrange 2 daily 45-minute practice sessions this week to resolve the doubts.`
                )
              }
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-red-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Bot className="w-4 h-4 text-red-500" />
              Command inspiro AI to Build Test From These
            </button>
          </div>
        </div>
      </div>

      {bankNotice && (
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-red-500/50 text-white text-xs flex items-center justify-between gap-2.5 shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-500 shrink-0" />
            <span>{bankNotice}</span>
          </div>
          <button
            onClick={() => setBankNotice('')}
            className="text-zinc-400 hover:text-white px-1 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. STAT PILLS & DRILL CONFIGURATOR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedTagFilter('DOUBT')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedTagFilter === 'DOUBT'
              ? 'bg-red-950/40 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)] ring-1 ring-red-600'
              : 'bg-zinc-950 border-zinc-800 hover:border-red-600/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 uppercase">Doubts</span>
            <HelpCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {doubtCount}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Unclear concepts to resolve</div>
        </div>

        <div
          onClick={() => setSelectedTagFilter('HARD')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedTagFilter === 'HARD'
              ? 'bg-red-950/40 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)] ring-1 ring-red-600'
              : 'bg-zinc-950 border-zinc-800 hover:border-red-600/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-500 uppercase">Hard</span>
            <Flame className="w-4 h-4 text-red-500 fill-red-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {hardCount}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">High-difficulty challenges</div>
        </div>

        <div
          onClick={() => setSelectedTagFilter('TRICKY')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedTagFilter === 'TRICKY'
              ? 'bg-red-950/40 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)] ring-1 ring-red-600'
              : 'bg-zinc-950 border-zinc-800 hover:border-red-600/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase">Tricky</span>
            <Zap className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {trickyCount}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Trap mechanisms & catches</div>
        </div>

        <div
          onClick={() => setSelectedTagFilter('RACE_STAR')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedTagFilter === 'RACE_STAR'
              ? 'bg-red-950/40 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)] ring-1 ring-red-600'
              : 'bg-zinc-950 border-zinc-800 hover:border-red-600/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-500 uppercase">RACE Star</span>
            <Star className="w-4 h-4 text-red-500 fill-current" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {starCount}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Must-repeat derivations</div>
        </div>
      </div>

      {/* 3. DRILL CONTROLS & FILTER BAR */}
      <div className="bg-zinc-950 rounded-2xl p-4 md:p-6 border border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-red-500" />
            Tag:
          </span>

          {(['ALL', 'DOUBT', 'HARD', 'TRICKY', 'RACE_STAR'] as const).map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTagFilter(tag)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedTagFilter === tag
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tag === 'ALL'
                ? 'All Tags'
                : tag === 'RACE_STAR'
                ? 'RACE Star'
                : tag}
            </button>
          ))}

          <span className="text-xs font-semibold text-zinc-700 mx-2">|</span>

          {(['ALL', 'physics', 'chemistry', 'mathematics'] as const).map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubjectFilter(sub)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                selectedSubjectFilter === sub
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {sub === 'ALL' ? 'All Subjects' : sub}
            </button>
          ))}
        </div>

        {/* Drill Settings */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium">Questions:</span>
            <select
              value={drillSize}
              onChange={(e) => setDrillSize(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-black text-white font-bold focus:border-red-600 focus:outline-hidden"
            >
              <option value={10}>10 Qs</option>
              <option value={15}>15 Qs</option>
              <option value={20}>20 Qs</option>
              <option value={25}>25 Qs</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 font-medium">Timer:</span>
            <select
              value={drillDuration}
              onChange={(e) => setDrillDuration(parseInt(e.target.value, 10))}
              className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-black text-white font-bold focus:border-red-600 focus:outline-hidden"
            >
              <option value={25}>25 Mins</option>
              <option value={30}>30 Mins</option>
              <option value={45}>45 Mins</option>
              <option value={60}>60 Mins</option>
            </select>
          </div>

          <button
            onClick={handleLaunchRaceDrill}
            disabled={filteredEntries.length === 0}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_12px_rgba(220,38,38,0.4)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start Drill
          </button>
        </div>
      </div>

      {/* 4. QUESTION LIST */}
      {filteredEntries.length === 0 ? (
        <div className="bg-zinc-950 rounded-2xl p-10 border border-zinc-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-red-500 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold font-display text-white">
            No questions tagged in this category yet!
          </h4>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            While taking any practice sprint or CBT mock test, click <strong>Doubt</strong>, <strong>Hard</strong>, <strong>Tricky</strong>, or <strong>RACE Star</strong> on the top bar. They will automatically be stored here for daily repetition.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
            <span>Showing {filteredEntries.length} Tagged Questions:</span>
            <span>Repetition builds speed & accuracy</span>
          </div>

          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-zinc-950 rounded-2xl p-5 md:p-6 border border-zinc-800 shadow-xl space-y-4 hover:border-red-600/50 transition-all"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                      {entry.subject}
                    </span>
                    <span className="text-xs text-zinc-600">•</span>
                    <span className="text-xs text-zinc-400 font-medium">
                      From: {entry.examTitle}
                    </span>
                    <span className="text-xs text-zinc-600">•</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 font-mono text-zinc-300">
                      Q{entry.question.questionNumber} ({entry.question.type})
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-red-950/60 text-red-400 border border-red-800/80"
                      >
                        {tag === 'HARD' && <Flame className="w-3 h-3 fill-current" />}
                        {tag === 'TRICKY' && <Zap className="w-3 h-3" />}
                        {tag === 'RACE_STAR' && <Star className="w-3 h-3 fill-current" />}
                        {tag === 'DOUBT' && <HelpCircle className="w-3 h-3" />}
                        {tag === 'RACE_STAR' ? 'RACE Star' : tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prompt */}
                <div className="text-sm md:text-base leading-relaxed text-white">
                  <MathRenderer content={entry.question.promptLatex} />
                </div>

                {entry.question.imageUrl && (
                  <div className="my-2 p-2 rounded-xl border border-zinc-800 bg-black/50 max-w-sm">
                    <img
                      src={entry.question.imageUrl}
                      alt="Question Diagram"
                      className="max-h-48 w-auto object-contain rounded"
                    />
                  </div>
                )}

                {/* Options if MCQ */}
                {entry.question.options && entry.question.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {entry.question.options.map((opt) => (
                      <div
                        key={opt.id}
                        className="p-2.5 rounded-xl border border-zinc-800 bg-black/60 text-xs flex items-center gap-2 text-zinc-300"
                      >
                        <span className="font-bold text-red-400">{opt.id}.</span>
                        <MathRenderer content={opt.labelLatex} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions & Repetition Counter */}
                <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="font-mono">
                      Repetition Count: <strong className="text-white">{entry.practiceCount || 1}x</strong>
                    </span>
                    {entry.correctAnswer && (
                      <span className="px-2 py-0.5 rounded bg-red-950/50 text-red-300 border border-red-800 font-bold font-mono text-[11px]">
                        Correct: {entry.correctAnswer}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const singlePaper: ExamPaper = {
                          id: `single-resolve-${Date.now()}`,
                          title: `Re-Solving Q${entry.question.questionNumber} (${entry.subject})`,
                          pattern: 'JEE_MAIN',
                          durationMinutes: 5,
                          totalMarks: 4,
                          sections: [
                            {
                              id: entry.subject,
                              name: entry.subject,
                              questions: [{ ...entry.question, questionNumber: 1 }],
                            },
                          ],
                        };
                        onStartExam(singlePaper);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(220,38,38,0.4)]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-solve Now (5m)
                    </button>

                    <button
                      onClick={() => onRemoveTaggedQuestion(entry.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 border border-zinc-800 transition-all flex items-center gap-1"
                      title="Mastered this question (Remove from bank)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Mastered</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
