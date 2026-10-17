import React, { useState } from 'react';
import { RemedialPack, RemedialQuestion } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Flame,
  Lightbulb,
} from 'lucide-react';

interface RemedialPracticeModalProps {
  pack: RemedialPack | null;
  isLoading: boolean;
  onClose: () => void;
}

export const RemedialPracticeModal: React.FC<RemedialPracticeModalProps> = ({
  pack,
  isLoading,
  onClose,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});

  if (!pack && !isLoading) return null;

  const currentQ: RemedialQuestion | undefined = pack?.remedialQuestions[activeIdx];
  const qId = currentQ?.id || '';
  const isChecked = !!revealedSolutions[qId];
  const userAns = userAnswers[qId] || '';

  const isCorrect =
    currentQ &&
    isChecked &&
    userAns.trim().toUpperCase() === currentQ.correctAnswer.trim().toUpperCase();

  const handleSelectOption = (optId: string) => {
    if (isChecked) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: optId }));
  };

  const handleCheckAnswer = () => {
    setRevealedSolutions((prev) => ({ ...prev, [qId]: true }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 md:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col my-auto max-h-[90vh] text-white">
        {/* Header */}
        <div className="px-5 py-4 bg-black text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.5)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                inspiro AI Remedial Practice • Real JEE PYQ Standards
              </div>
              <h2 className="text-base font-bold text-white">
                {isLoading ? 'Researching High-Yield JEE PYQs...' : pack?.topicName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 text-zinc-200">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-red-600 border-t-transparent animate-spin mx-auto shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-white">
                  Searching Authentic JEE Main & Advanced Question Bank...
                </p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Extracting isomorphic multi-step questions matching the exact formula, trap, and concept you missed.
                </p>
              </div>
            </div>
          ) : currentQ ? (
            <div className="space-y-5">
              {/* Concept Masterclass pill */}
              {pack?.conceptSummary && (
                <div className="p-3.5 rounded-xl bg-black border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-400">Core JEE Principle: </span>
                    {pack.conceptSummary}
                  </div>
                </div>
              )}

              {/* Question Meta Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-500">
                    Question {activeIdx + 1} of {pack?.remedialQuestions.length}
                  </span>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-800">
                    {currentQ.historicalTag}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {currentQ.type === 'NUMERICAL' ? 'Numerical Type' : 'Single Correct Option'}
                </span>
              </div>

              {/* Question Text */}
              <div className="p-4 bg-black rounded-xl border border-zinc-800 text-sm text-white leading-relaxed">
                <MathRenderer content={currentQ.promptLatex} />
              </div>

              {/* Options or Numerical input */}
              {currentQ.type === 'NUMERICAL' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400">
                    Enter Numerical Answer:
                  </label>
                  <input
                    type="text"
                    value={userAns}
                    disabled={isChecked}
                    onChange={(e) =>
                      setUserAnswers((prev) => ({
                        ...prev,
                        [qId]: e.target.value,
                      }))
                    }
                    placeholder="Enter value..."
                    className="w-full max-w-xs px-3.5 py-2 text-base font-mono font-bold rounded-lg border border-zinc-800 bg-black text-white focus:outline-hidden focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Select Option:
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {currentQ.options?.map((opt) => {
                      const isSelected = userAns === opt.id;
                      const isCorrectOpt =
                        isChecked && currentQ.correctAnswer === opt.id;
                      const isWrongChoice =
                        isChecked && isSelected && !isCorrectOpt;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                            isCorrectOpt
                              ? 'bg-red-950/40 border-red-500 text-white font-semibold ring-1 ring-red-500 shadow-[0_0_12px_rgba(220,38,38,0.25)]'
                              : isWrongChoice
                              ? 'bg-zinc-900 border-zinc-700 text-zinc-400'
                              : isSelected
                              ? 'bg-red-950/30 border-red-600 text-white ring-1 ring-red-600'
                              : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 text-zinc-200'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                              isCorrectOpt
                                ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.5)]'
                                : isWrongChoice
                                ? 'bg-zinc-800 text-zinc-400'
                                : isSelected
                                ? 'bg-red-600 text-white'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <div className="flex-1 text-sm pt-0.5">
                            <MathRenderer content={opt.labelLatex} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Check Answer Button & Instant Feedback */}
              {!isChecked ? (
                <button
                  onClick={handleCheckAnswer}
                  disabled={!userAns}
                  className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Verify My Answer & See Solution
                </button>
              ) : (
                <div className="space-y-4 pt-2">
                  <div
                    className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
                      isCorrect
                        ? 'bg-zinc-900 border-zinc-700 text-white'
                        : 'bg-red-950/40 border-red-800 text-red-300'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-red-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                    <div>
                      {isCorrect ? (
                        <span>Spot on! You mastered the concept for this question.</span>
                      ) : (
                        <span>
                          Incorrect. Correct answer is{' '}
                          <strong className="underline text-white font-bold">{currentQ.correctAnswer}</strong>.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step-by-Step Rigorous Solution */}
                  <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2 text-xs">
                    <div className="font-bold text-red-500 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <Flame className="w-4 h-4 text-red-500 fill-red-500" />
                      Masterclass Step-by-Step Solution:
                    </div>
                    <div className="leading-relaxed text-zinc-300">
                      <MathRenderer content={currentQ.solutionLatex} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Navigation */}
        {!isLoading && pack && (
          <div className="px-5 py-3.5 bg-black border-t border-zinc-800 flex items-center justify-between text-xs">
            <button
              onClick={() => setActiveIdx((prev) => Math.max(0, prev - 1))}
              disabled={activeIdx === 0}
              className="px-3.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 font-bold disabled:opacity-40 flex items-center gap-1 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous PYQ
            </button>

            <span className="font-mono text-zinc-400">
              {activeIdx + 1} / {pack.remedialQuestions.length}
            </span>

            <button
              onClick={() =>
                setActiveIdx((prev) =>
                  Math.min(pack.remedialQuestions.length - 1, prev + 1)
                )
              }
              disabled={activeIdx === pack.remedialQuestions.length - 1}
              className="px-3.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 font-bold disabled:opacity-40 flex items-center gap-1 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Next PYQ
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
