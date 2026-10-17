import React, { useState } from 'react';
import { ExamPaper, UIMode } from '../types/exam';
import { CheckCircle2, AlertCircle, Clock, ShieldCheck, Monitor, Flame } from 'lucide-react';
import { InspiroLogo } from './InspiroLogo';

interface ExamInstructionsProps {
  paper: ExamPaper;
  onStartExam: (selectedMode: UIMode) => void;
  onCancel: () => void;
}

export const ExamInstructions: React.FC<ExamInstructionsProps> = ({
  paper,
  onStartExam,
  onCancel,
}) => {
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState<UIMode>('NTA_OFFICIAL');
  const [language, setLanguage] = useState<'English' | 'Hindi'>('English');

  const totalQuestions = paper.sections.reduce((acc, s) => acc + s.questions.length, 0);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col">
        {/* Header Banner */}
        <div className="bg-black text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 select-none">
              <InspiroLogo size="sm" showText />
              <span className="text-[10px] tracking-wider text-red-400 font-bold uppercase px-2 py-0.5 rounded bg-red-600/10 border border-red-500/20 ml-1">
                {paper.pattern.replace('_', ' ')} CBT
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-bold font-display text-white">
              {paper.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium text-zinc-300">
            <span className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
              <Clock className="w-4 h-4 text-red-500" />
              Duration: {paper.durationMinutes} Minutes
            </span>
            <span className="bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
              Total Marks: {paper.totalMarks}
            </span>
            <span className="bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
              Total Questions: {totalQuestions}
            </span>
          </div>
        </div>

        {/* Instructions Body */}
        <div className="p-6 md:p-8 overflow-y-auto max-h-[65vh] space-y-6 text-sm text-zinc-300 leading-relaxed">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h2 className="text-base font-bold text-white uppercase tracking-wide">
              General Instructions
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400">Choose Default Language:</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-black text-white text-xs px-2.5 py-1 rounded border border-zinc-800 focus:outline-hidden focus:border-red-600"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
          </div>

          <ol className="list-decimal pl-5 space-y-2.5 text-zinc-300">
            <li>
              Total duration of examination is <strong className="text-white">{paper.durationMinutes} minutes (3 Hours)</strong>.
            </li>
            <li>
              The clock will be set at the server. The countdown timer in the top right corner of the screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end automatically.
            </li>
            <li>
              The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:
            </li>
          </ol>

          {/* Authentic Question Palette Legend Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-black rounded-xl border border-zinc-800 text-xs">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center font-bold text-xs nta-shape-not-visited border border-zinc-700 shrink-0">
                1
              </span>
              <span className="text-zinc-300">You have not visited the question yet.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center font-bold text-xs nta-shape-not-answered shrink-0">
                2
              </span>
              <span className="text-zinc-300">You have not answered the question.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center font-bold text-xs nta-shape-answered shrink-0">
                3
              </span>
              <span className="text-zinc-300">You have answered the question.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center font-bold text-xs nta-shape-review shrink-0">
                4
              </span>
              <span className="text-zinc-300">You have NOT answered the question, but marked for review.</span>
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <span className="w-8 h-8 flex items-center justify-center font-bold text-xs nta-shape-answered-review shrink-0 relative">
                5
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white">✓</span>
              </span>
              <span className="text-zinc-300">The question(s) "Answered and Marked for Review" will be considered for evaluation.</span>
            </div>
          </div>

          {/* Section details */}
          <div>
            <h3 className="font-bold text-white mb-2">Subject Breakdown & Marking Scheme:</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-zinc-800 text-left">
                <thead className="bg-zinc-900 font-semibold text-zinc-300 border-b border-zinc-800">
                  <tr>
                    <th className="p-2.5 border-r border-zinc-800">Subject</th>
                    <th className="p-2.5 border-r border-zinc-800">No. of Questions</th>
                    <th className="p-2.5 border-r border-zinc-800">Question Types</th>
                    <th className="p-2.5">Marking Scheme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 font-mono">
                  {paper.sections.map((section) => (
                    <tr key={section.id} className="hover:bg-zinc-900/40">
                      <td className="p-2.5 border-r border-zinc-800 font-sans font-medium text-white">{section.name}</td>
                      <td className="p-2.5 border-r border-zinc-800 text-zinc-300">{section.questions.length}</td>
                      <td className="p-2.5 border-r border-zinc-800 font-sans text-zinc-300">MCQs & Numerical Value</td>
                      <td className="p-2.5 font-sans text-red-400 font-semibold">+4 for Correct, -1 for Incorrect (0 for unattempted)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CBT Interface Preference */}
          <div className="p-4 bg-black rounded-xl border border-zinc-800">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-red-500" />
              Select Your Preferred Exam Interface:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  mode === 'NTA_OFFICIAL'
                    ? 'border-red-600 bg-red-950/20 shadow-[0_0_15px_rgba(220,38,38,0.25)] ring-1 ring-red-600'
                    : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900'
                }`}
              >
                <input
                  type="radio"
                  name="examMode"
                  checked={mode === 'NTA_OFFICIAL'}
                  onChange={() => setMode('NTA_OFFICIAL')}
                  className="mt-1 text-red-600 focus:ring-red-600"
                />
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    Official NTA CBT Mode
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white">
                      Exact Official Replica
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Authentic 1:1 government testing agency interface with official candidate panel, shape-coded palette, and official action buttons.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  mode === 'MATHANGO'
                    ? 'border-red-600 bg-red-950/20 shadow-[0_0_15px_rgba(220,38,38,0.25)] ring-1 ring-red-600'
                    : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900'
                }`}
              >
                <input
                  type="radio"
                  name="examMode"
                  checked={mode === 'MATHANGO'}
                  onChange={() => setMode('MATHANGO')}
                  className="mt-1 text-red-600 focus:ring-red-600"
                />
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    Modern MathonGo / Quizrr Mode
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Streamlined dark-mode UI with distraction-free layout and numerical virtual keypad.
                  </div>
                </div>
              </label>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              *You can also switch themes instantly at any time during the test using the header toggle.
            </p>
          </div>

          {/* Declaration Checkbox */}
          <div className="pt-3 border-t border-zinc-800">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 text-red-600 rounded border-zinc-700 bg-zinc-900 focus:ring-red-600"
              />
              <span className="text-xs text-zinc-300 select-none">
                I have read and understood all instructions. I declare that I will strictly follow all examination rules. I understand that any violation may lead to cancellation of my candidature.
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-black border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>

          <button
            onClick={() => onStartExam(mode)}
            disabled={!agreed}
            className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            I Am Ready To Begin
          </button>
        </div>
      </div>
    </div>
  );
};
