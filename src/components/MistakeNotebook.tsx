import React, { useState, useMemo } from 'react';
import { MistakeEntry, MistakeReason, SubjectId } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import {
  BookOpen,
  Sparkles,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  Flame,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface MistakeNotebookProps {
  mistakes: MistakeEntry[];
  onRemoveMistake: (id: string) => void;
  onUpdateMistakeReason: (id: string, reason: MistakeReason, notes?: string) => void;
  onPracticeSimilar: (entry: MistakeEntry) => void;
}

const REASON_LABELS: Record<MistakeReason, { label: string; badge: string }> = {
  CALCULATION_ERROR: {
    label: 'Calculation / Silly Mistake',
    badge: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  },
  CONCEPT_GAP: {
    label: 'Conceptual Gap / Formula Forgotten',
    badge: 'bg-red-950/80 text-red-400 border-red-800',
  },
  MISREAD_QUESTION: {
    label: 'Misread Question / Trap',
    badge: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  },
  TIME_PRESSURE: {
    label: 'Rushed / Time Pressure',
    badge: 'bg-red-950/80 text-red-400 border-red-800',
  },
  GUESS: {
    label: 'Blind Guess',
    badge: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  },
};

export const MistakeNotebook: React.FC<MistakeNotebookProps> = ({
  mistakes,
  onRemoveMistake,
  onUpdateMistakeReason,
  onPracticeSimilar,
}) => {
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectId>('ALL');
  const [reasonFilter, setReasonFilter] = useState<'ALL' | MistakeReason>('ALL');

  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      const matchSubject =
        subjectFilter === 'ALL' || m.question.sectionId === subjectFilter;
      const matchReason =
        reasonFilter === 'ALL' || m.reason === reasonFilter;
      return matchSubject && matchReason;
    });
  }, [mistakes, subjectFilter, reasonFilter]);

  // Breakdown statistics
  const stats = useMemo(() => {
    let calc = 0;
    let concept = 0;
    let misread = 0;
    let time = 0;

    mistakes.forEach((m) => {
      if (m.reason === 'CALCULATION_ERROR') calc++;
      else if (m.reason === 'CONCEPT_GAP') concept++;
      else if (m.reason === 'MISREAD_QUESTION') misread++;
      else if (m.reason === 'TIME_PRESSURE') time++;
    });

    return { calc, concept, misread, time, total: mistakes.length };
  }, [mistakes]);

  return (
    <div className="space-y-6 text-white">
      {/* Overview Cards */}
      <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              Digital Mistake Notebook (Error Book)
            </div>
            <h2 className="text-xl font-bold font-display text-white mt-0.5">
              Targeted Root-Cause Analysis
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Every incorrect question across your tests is cataloged here so you never repeat the same error in the final exam.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3.5 py-1.5 rounded-lg bg-red-950/60 text-red-400 font-bold border border-red-800/80">
              Total Logged: {mistakes.length} Errors
            </span>
          </div>
        </div>

        {/* Quick diagnosis bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-800 text-xs">
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block font-medium">
              Silly / Calc Errors
            </span>
            <span className="text-xl font-bold font-mono text-white">
              {stats.calc}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-[11px] text-red-400 block font-medium">
              Concept Gaps
            </span>
            <span className="text-xl font-bold font-mono text-red-500">
              {stats.concept}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block font-medium">
              Misread Questions
            </span>
            <span className="text-xl font-bold font-mono text-white">
              {stats.misread}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-[11px] text-red-400 block font-medium">
              Time Pressure / Rushed
            </span>
            <span className="text-xl font-bold font-mono text-red-500">
              {stats.time}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setSubjectFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-colors ${
                subjectFilter === 'ALL'
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Subjects
            </button>
            <button
              onClick={() => setSubjectFilter('physics')}
              className={`px-3 py-1 rounded-md transition-colors ${
                subjectFilter === 'physics'
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Physics
            </button>
            <button
              onClick={() => setSubjectFilter('chemistry')}
              className={`px-3 py-1 rounded-md transition-colors ${
                subjectFilter === 'chemistry'
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Chemistry
            </button>
            <button
              onClick={() => setSubjectFilter('mathematics')}
              className={`px-3 py-1 rounded-md transition-colors ${
                subjectFilter === 'mathematics'
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Mathematics
            </button>
          </div>
        </div>
      </div>

      {/* Mistake Entries List */}
      {filteredMistakes.length === 0 ? (
        <div className="p-12 text-center bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 text-red-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="font-bold text-sm text-white">
            No mistakes found in this category!
          </p>
          <p className="text-xs text-zinc-400">
            Complete mock tests to automatically log and review missed questions here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMistakes.map((entry) => {
            const reasonData = entry.reason ? REASON_LABELS[entry.reason] : null;

            return (
              <div
                key={entry.id}
                className="bg-zinc-950 rounded-xl border border-zinc-800 p-5 space-y-4 shadow-xl hover:border-zinc-700 transition-all"
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                      Q.{entry.question.questionNumber}
                    </span>
                    <span className="font-semibold text-xs text-zinc-300 capitalize">
                      {entry.question.sectionId} • {entry.examTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Reason Tag */}
                    {reasonData && (
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${reasonData.badge}`}
                      >
                        {reasonData.label}
                      </span>
                    )}

                    <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      {entry.timeSpentSeconds}s
                    </span>

                    <button
                      onClick={() => onRemoveMistake(entry.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-900 transition-colors"
                      title="Remove from mistake notebook (Mastered)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="text-sm leading-relaxed p-3.5 bg-black/60 rounded-lg border border-zinc-800 text-white">
                  <MathRenderer content={entry.question.promptLatex} />
                </div>

                {entry.question.imageUrl && (
                  <div className="my-2 p-2 rounded-lg border border-zinc-800 bg-black/60 max-w-sm">
                    <img
                      src={entry.question.imageUrl}
                      alt="Question Diagram"
                      className="max-h-48 w-auto object-contain rounded"
                    />
                  </div>
                )}

                {/* Response Comparison */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                  <div>
                    <span className="text-zinc-400">Your Answer: </span>
                    <strong className="text-red-500 font-bold">
                      {entry.userAnswer ? JSON.stringify(entry.userAnswer) : 'Left Unattempted'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-zinc-400">Correct Answer: </span>
                    <strong className="text-white font-bold">
                      {entry.correctAnswer || 'N/A'}
                    </strong>
                  </div>
                </div>

                {/* Step-by-step solution */}
                {entry.question.explanationLatex && (
                  <div className="p-3.5 rounded-lg bg-black border border-zinc-800 text-xs text-zinc-300">
                    <strong className="text-red-400 block mb-1">
                      Official Method:
                    </strong>
                    <MathRenderer content={entry.question.explanationLatex} />
                  </div>
                )}

                {/* Action footer: AI Remedial Practice */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  {/* Quick Reason Selector */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-zinc-400 font-medium">Tag Cause:</span>
                    <select
                      value={entry.reason || 'CONCEPT_GAP'}
                      onChange={(e) =>
                        onUpdateMistakeReason(entry.id, e.target.value as MistakeReason)
                      }
                      className="bg-black text-white text-xs px-2.5 py-1 rounded border border-zinc-800 focus:border-red-600 focus:outline-hidden"
                    >
                      <option value="CALCULATION_ERROR">Silly / Calculation Mistake</option>
                      <option value="CONCEPT_GAP">Concept Gap / Formula</option>
                      <option value="MISREAD_QUESTION">Misread Question / Trap</option>
                      <option value="TIME_PRESSURE">Time Pressure / Rushed</option>
                      <option value="GUESS">Blind Guess</option>
                    </select>
                  </div>

                  {/* Remedial Drill Trigger */}
                  <button
                    onClick={() => onPracticeSimilar(entry)}
                    className="px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-lg shadow-[0_0_12px_rgba(220,38,38,0.4)] transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    Practice 3 Similar JEE PYQs (inspiro AI Drill)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
