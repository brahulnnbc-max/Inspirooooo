import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ScheduledTest,
  SyllabusTopic,
  ExamPaper,
  SubjectId,
} from '../types/exam';
import { SAMPLE_JEE_MAIN_MOCK, SAMPLE_JEE_ADVANCED_MOCK } from '../data/samplePapers';
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Lock,
  Unlock,
  Play,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Flame,
  Award,
  Paperclip,
  X,
  FileText,
} from 'lucide-react';

interface SchedulePlannerProps {
  scheduledTests: ScheduledTest[];
  onToggleTopic: (testId: string, topicId: string) => void;
  onEnterLiveTest: (test: ScheduledTest) => void;
  onAttachPaper: (testId: string, paper: ExamPaper) => void;
  onAddCustomSchedule: (newTests: ScheduledTest[]) => void;
  onDeleteTest: (testId: string) => void;
  onSelectExamDirectly: (paper: ExamPaper) => void;
  savedCustomPapers?: ExamPaper[];
  onSaveCustomPaper?: (paper: ExamPaper) => void;
}

export const SchedulePlanner: React.FC<SchedulePlannerProps> = ({
  scheduledTests,
  onToggleTopic,
  onEnterLiveTest,
  onAttachPaper,
  onAddCustomSchedule,
  onDeleteTest,
  onSelectExamDirectly,
  savedCustomPapers = [],
  onSaveCustomPaper,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED'>('ALL');
  const [commandText, setCommandText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [expandedTestIds, setExpandedTestIds] = useState<Record<string, boolean>>({});
  const [earlyUnlockOverrides, setEarlyUnlockOverrides] = useState<Record<string, boolean>>({});

  // Coaching material multi-month scheduler state
  const [scheduleInputMode, setScheduleInputMode] = useState<'MATERIAL' | 'COMMAND'>('MATERIAL');
  const [coachingMaterialText, setCoachingMaterialText] = useState('');
  const [selectedHorizonMonths, setSelectedHorizonMonths] = useState<3 | 6>(6);
  const [testCount, setTestCount] = useState<number>(8);

  const handleLoadSampleCoachingMaterial = () => {
    setCoachingMaterialText(`ALLEN LEADER KOTA - CLASS 11 & 12 COMPLETE SYLLABUS:

PHYSICS:
1. Physical World, Units & Dimensions, Vectors
2. Kinematics 1D & 2D (Projectile Motion)
3. Newton's Laws of Motion & Friction
4. Work, Energy & Power, Circular Motion
5. Center of Mass, Momentum & Collisions
6. Rotational Motion & Moment of Inertia
7. Gravitation & Fluid Mechanics
8. Thermodynamics, Calorimetry & Heat Transfer
9. SHM & Mechanical Waves
10. Electrostatics & Current Electricity
11. Magnetism & Magnetic Effects of Current
12. Electromagnetic Induction (EMI) & AC
13. Ray & Wave Optics
14. Modern Physics, Atoms, Nuclei & Semiconductors

CHEMISTRY:
1. Mole Concept & Atomic Structure
2. Periodic Properties & Chemical Bonding
3. Chemical & Ionic Equilibrium
4. Chemical Thermodynamics & Redox
5. Electrochemistry & Chemical Kinetics
6. Solutions & Colligative Properties
7. Coordination Compounds & d-Block
8. General Organic Chemistry (GOC) & Isomerism
9. Hydrocarbons & Haloalkanes
10. Oxygen Containing Organic (Alcohols, Aldehydes, Ketones, Acids)
11. Nitrogen Compounds, Biomolecules & Polymers

MATHEMATICS:
1. Sets, Relations, Functions & Quadratic Equations
2. Complex Numbers & Sequences and Series
3. Permutations, Combinations & Binomial Theorem
4. Matrices & Determinants
5. Straight Lines, Circles & Conic Sections
6. Limits, Continuity, Differentiability & AOD
7. Indefinite & Definite Integrals
8. Differential Equations & Area Under Curves
9. Vectors & 3D Geometry
10. Probability & Statistics`);
  };

  // Attach paper modal state
  const [attachingTestId, setAttachingTestId] = useState<string | null>(null);
  const [isModalUploading, setIsModalUploading] = useState(false);
  const [modalUploadError, setModalUploadError] = useState('');
  const [modalUploadProgress, setModalUploadProgress] = useState('');
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleModalUploadPaper = async (file: File) => {
    if (!attachingTestId) return;
    setIsModalUploading(true);
    setModalUploadError('');
    setModalUploadProgress('Reading & encoding test paper...');

    try {
      const readBase64 = (f: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });

      const base64 = await readBase64(file);
      setModalUploadProgress('Gemini 3.8 Flash Vision is extracting questions with LaTeX...');

      const targetTest = scheduledTests.find((t) => t.id === attachingTestId);
      const title = targetTest?.title || file.name.replace(/\.[^/.]+$/, '');

      const response = await fetch('/api/parse-exam-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: file.type || 'application/pdf',
          examTitle: title,
          pattern: targetTest?.pattern || 'JEE_MAIN',
          customDurationMinutes: targetTest?.durationMinutes || 180,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.examPaper) {
        throw new Error(data.error || 'Failed to extract questions from PDF');
      }

      const generatedPaper: ExamPaper = {
        id: `custom-paper-${Date.now()}`,
        title: data.examPaper.title || title,
        pattern: data.examPaper.pattern || 'JEE_MAIN',
        durationMinutes: data.examPaper.durationMinutes || 180,
        totalMarks: data.examPaper.totalMarks || 300,
        sections: data.examPaper.sections || [],
        createdAt: new Date().toISOString(),
      };

      onSaveCustomPaper?.(generatedPaper);
      onAttachPaper(attachingTestId, generatedPaper);
      setAttachingTestId(null);
    } catch (err: any) {
      console.error(err);
      setModalUploadError(err.message || 'Failed to process PDF.');
    } finally {
      setIsModalUploading(false);
      setModalUploadProgress('');
    }
  };

  // Active target test (the first upcoming or live test)
  const nextTargetTest = useMemo(() => {
    return (
      scheduledTests.find((t) => t.status === 'LIVE_NOW') ||
      scheduledTests.find((t) => t.status === 'UPCOMING_LOCKED') ||
      scheduledTests[0]
    );
  }, [scheduledTests]);

  // Calculate countdown to next scheduled date
  const getCountdownString = (dateStr: string, timeStr: string) => {
    try {
      const targetTime = new Date(`${dateStr}T${timeStr}:00`).getTime();
      const now = Date.now();
      const diffMs = targetTime - now;

      if (diffMs <= 0) return 'Window Open / Today';

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );

      if (diffDays > 0) {
        return `Opens in ${diffDays}d ${diffHours}h`;
      }
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `Opens in ${diffHours}h ${diffMins}m`;
    } catch {
      return 'Scheduled Soon';
    }
  };

  // Natural Language AI Command Schedule Generation
  const handleGenerateSchedule = async (presetCommand?: string) => {
    let textToUse = presetCommand;
    let countToUse = testCount;
    if (!textToUse) {
      if (scheduleInputMode === 'MATERIAL') {
        textToUse = coachingMaterialText.trim()
          ? `Convert the following coaching material chapters into a ${selectedHorizonMonths}-month periodic test series with ${testCount} tests on alternate Sundays: \n\n${coachingMaterialText.trim()}`
          : '';
        countToUse = testCount;
      } else {
        textToUse = commandText.trim();
      }
    }
    if (!textToUse || !textToUse.trim()) return;

    setIsGenerating(true);
    setGenError('');

    try {
      const response = await fetch('/api/generate-roadmap-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: textToUse,
          numberOfTests: countToUse,
          currentDate: new Date().toISOString().split('T')[0],
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to arrange schedule');
      }

      if (resData.success && resData.data && resData.data.tests) {
        const generatedTests: ScheduledTest[] = resData.data.tests.map(
          (t: any, idx: number) => ({
            id: `gen-test-${Date.now()}-${idx}`,
            title: t.title,
            pattern: 'JEE_MAIN',
            scheduledDate: t.scheduledDate,
            startTime: t.startTime || '09:00',
            endTime: t.endTime || '12:00',
            durationMinutes: 180,
            status: idx === 0 ? 'LIVE_NOW' : 'UPCOMING_LOCKED',
            syllabus: (t.syllabus || []).map((s: any, sIdx: number) => ({
              id: `top-${idx}-${sIdx}`,
              subject: s.subject || 'physics',
              name: s.name || s,
              completed: false,
            })),
          })
        );

        onAddCustomSchedule(generatedTests);
        setCommandText('');
      }
    } catch (e: any) {
      console.error(e);
      setGenError(e.message || 'Failed to arrange schedule with inspiro AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTestIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleUnlockOverride = (id: string) => {
    setEarlyUnlockOverrides((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTests = useMemo(() => {
    if (filter === 'ALL') return scheduledTests;
    return scheduledTests.filter((t) => t.status === filter);
  }, [scheduledTests, filter]);

  return (
    <div className="space-y-8 text-white">
      {/* 1. AI ROADMAP BUILDER: CONVERT COACHING MATERIAL INTO MULTI-MONTH TEST SERIES */}
      <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-red-500" />
              inspiro AI Test Roadmap Builder
            </div>
            <h2 className="text-lg md:text-xl font-bold font-display text-white mt-0.5">
              Convert Coaching Material & Syllabus into a Multi-Month Test Series
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Paste your Allen, FIITJEE, Resonance, or MathonGo chapter list. AI organizes it into periodic Minor & Major tests with checklists.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-black rounded-xl border border-zinc-800 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setScheduleInputMode('MATERIAL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                scheduleInputMode === 'MATERIAL'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Paste Coaching Material
            </button>
            <button
              type="button"
              onClick={() => setScheduleInputMode('COMMAND')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                scheduleInputMode === 'COMMAND'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quick Command
            </button>
          </div>
        </div>

        {/* Mode A: Paste Coaching Material */}
        {scheduleInputMode === 'MATERIAL' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-semibold">Schedule Horizon:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHorizonMonths(3);
                    setTestCount(6);
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                    selectedHorizonMonths === 3
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  ⚡ 3 Months (6 Periodic Tests)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHorizonMonths(6);
                    setTestCount(8);
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all ${
                    selectedHorizonMonths === 6
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  🎯 6 Months (8 Periodic Tests)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleLoadSampleCoachingMaterial}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all font-semibold"
                >
                  💡 Load Kota Syllabus Sample
                </button>
                {coachingMaterialText && (
                  <button
                    type="button"
                    onClick={() => setCoachingMaterialText('')}
                    className="px-2 py-1 text-zinc-500 hover:text-red-400 transition-all font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={6}
              value={coachingMaterialText}
              onChange={(e) => setCoachingMaterialText(e.target.value)}
              placeholder="Paste your coaching material chapters, module index, or syllabus roadmap here... e.g.:
PHYSICS: Kinematics, Newton's Laws, Work Energy Power, Rotational Motion, Gravitation, Thermodynamics, Electrostatics, Optics...
CHEMISTRY: Mole Concept, Atomic Structure, Periodic Table, Chemical Bonding, Equilibrium, GOC, Coordination Chemistry...
MATHEMATICS: Quadratic Equations, Complex Numbers, Sequences, Binomial Theorem, Calculus, Vectors & 3D..."
              className="w-full px-4 py-3 text-xs md:text-sm font-mono rounded-xl border border-zinc-800 bg-black text-white placeholder:text-zinc-600 focus:outline-hidden focus:border-red-600 focus:ring-1 focus:ring-red-600"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-zinc-400">
                AI distributes all pasted chapters across alternate Sundays with chapter checklists & CBT exam links.
              </span>
              <button
                type="button"
                onClick={() => handleGenerateSchedule()}
                disabled={!coachingMaterialText.trim() || isGenerating}
                className="px-6 py-3 text-xs md:text-sm font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
              >
                <Sparkles className="w-4 h-4 text-white" />
                {isGenerating
                  ? `Arranging ${selectedHorizonMonths}-Month Roadmap...`
                  : `Convert to ${selectedHorizonMonths}-Month Test Series`}
              </button>
            </div>
          </div>
        ) : (
          /* Mode B: Quick Natural Language Command */
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateSchedule()}
                placeholder="e.g. Schedule 8 Allen Leader periodic tests on alternate Sundays covering 11th then 12th syllabus with live 9am windows"
                disabled={isGenerating}
                className="flex-1 px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-800 bg-black text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
              <button
                onClick={() => handleGenerateSchedule()}
                disabled={!commandText.trim() || isGenerating}
                className="px-6 py-3 text-xs md:text-sm font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
              >
                <Sparkles className="w-4 h-4 text-white" />
                {isGenerating ? 'Arranging Schedule...' : 'Build Test Series'}
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-zinc-400 font-medium">Quick Presets:</span>
              <button
                onClick={() =>
                  handleGenerateSchedule(
                    'Create an Allen Leader 6-Month Test Series with 8 tests on alternate Sundays, covering class 11th and 12th physics, chemistry, and math syllabus progressively'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-red-600 transition-colors"
              >
                🎯 Allen Leader 6-Month (8 Tests)
              </button>
              <button
                onClick={() =>
                  handleGenerateSchedule(
                    'Create a 3-Month JEE Intensive Booster Series with 6 tests every 2 weeks, focusing on high-weightage chapters in mechanics, calculus, and physical chemistry'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-red-600 transition-colors"
              >
                ⚡ 3-Month High-Yield (6 Tests)
              </button>
              <button
                onClick={() =>
                  handleGenerateSchedule(
                    'Create an All India Open Mock Test Series with 6 Full Syllabus tests scheduled on consecutive Sundays'
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-red-600 transition-colors"
              >
                🏆 Full Syllabus Ranker Mocks (6 Tests)
              </button>
            </div>
          </div>
        )}

        {genError && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{genError}</span>
          </div>
        )}
      </div>

      {/* 2. NEXT LIVE TEST TARGET & INTERACTIVE SYLLABUS CHECKLIST */}
      {nextTargetTest && (
        <div className="bg-zinc-950 text-white rounded-2xl p-6 md:p-8 border-2 border-red-600/80 shadow-[0_0_30px_rgba(220,38,38,0.25)] space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Target Header */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-red-400 uppercase">
                <Flame className="w-4 h-4 text-red-500 fill-red-500" />
                Immediate Target • Next Live Test
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-display mt-1 text-white">
                {nextTargetTest.title}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                {nextTargetTest.scheduledDate} • Shift: {nextTargetTest.startTime} to{' '}
                {nextTargetTest.endTime} (IST)
              </p>
            </div>

            {/* Countdown / Live Indicator Pill */}
            <div className="bg-black/80 px-5 py-3 rounded-xl border border-zinc-800 text-center shrink-0">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                {nextTargetTest.status === 'LIVE_NOW' ? 'Current Status' : 'Live Window Countdown'}
              </div>
              <div
                className={`text-lg md:text-xl font-mono font-extrabold mt-0.5 ${
                  nextTargetTest.status === 'LIVE_NOW'
                    ? 'text-red-500 animate-pulse'
                    : 'text-white'
                }`}
              >
                {nextTargetTest.status === 'LIVE_NOW'
                  ? '● LIVE NOW'
                  : getCountdownString(nextTargetTest.scheduledDate, nextTargetTest.startTime)}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Duration: {nextTargetTest.durationMinutes} Mins (3 Hours)
              </div>
            </div>
          </div>

          {/* Syllabus Revision Checklist for this target test */}
          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-500" />
                <span className="font-bold text-sm text-white">
                  Pre-Test Syllabus Checklist (Revision Tracker):
                </span>
              </div>

              {/* Progress counter */}
              {nextTargetTest.syllabus.length > 0 && (
                <div className="text-xs text-zinc-300 font-mono">
                  Prepared:{' '}
                  <strong className="text-red-400">
                    {
                      nextTargetTest.syllabus.filter((t) => t.completed).length
                    }{' '}
                    / {nextTargetTest.syllabus.length} Topics
                  </strong>{' '}
                  (
                  {Math.round(
                    (nextTargetTest.syllabus.filter((t) => t.completed).length /
                      nextTargetTest.syllabus.length) *
                      100
                  )}
                  %)
                </div>
              )}
            </div>

            {/* Progress bar */}
            {nextTargetTest.syllabus.length > 0 && (
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div
                  className="bg-red-600 h-full shadow-[0_0_8px_#dc2626] transition-all duration-300"
                  style={{
                    width: `${
                      (nextTargetTest.syllabus.filter((t) => t.completed).length /
                        nextTargetTest.syllabus.length) *
                      100
                    }%`,
                  }}
                />
              </div>
            )}

            {/* Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {nextTargetTest.syllabus.map((topic) => (
                <label
                  key={topic.id}
                  onClick={() => onToggleTopic(nextTargetTest.id, topic.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    topic.completed
                      ? 'bg-red-950/40 border-red-600/80 text-white shadow-xs'
                      : 'bg-black/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={topic.completed}
                    onChange={() => {}}
                    className="mt-0.5 w-4 h-4 text-red-600 rounded border-zinc-700 bg-zinc-900 focus:ring-red-600"
                  />
                  <div className="text-xs leading-snug">
                    <span className="font-bold uppercase text-[10px] text-red-400 block mb-0.5">
                      {topic.subject}
                    </span>
                    <span className={topic.completed ? 'line-through text-zinc-400' : ''}>
                      {topic.name}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="relative z-10 pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              {nextTargetTest.paper ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-red-400 font-medium">
                    <FileCheck className="w-4 h-4 text-red-500" />
                    Paper: {nextTargetTest.paper.title}
                  </span>
                  <button
                    onClick={() => setAttachingTestId(nextTargetTest.id)}
                    className="text-[11px] text-zinc-400 hover:text-white underline flex items-center gap-1"
                  >
                    <Paperclip className="w-3 h-3 text-red-400" />
                    Change Paper
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    No custom paper attached
                  </span>
                  <button
                    onClick={() => setAttachingTestId(nextTargetTest.id)}
                    className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-red-400" />
                    Attach PDF Paper
                  </button>
                </div>
              )}

              {/* Early access unlock toggle */}
              <button
                onClick={() => toggleUnlockOverride(nextTargetTest.id)}
                className="text-[11px] text-zinc-400 hover:text-white underline ml-2 flex items-center gap-1"
              >
                {earlyUnlockOverrides[nextTargetTest.id] ? (
                  <>
                    <Unlock className="w-3 h-3 text-red-400" />
                    Early Access Unlocked
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    Preview / Unlock Early
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onEnterLiveTest(nextTargetTest)}
                disabled={
                  nextTargetTest.status !== 'LIVE_NOW' &&
                  !earlyUnlockOverrides[nextTargetTest.id]
                }
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                {nextTargetTest.status === 'LIVE_NOW'
                  ? 'Enter Live CBT Examination Room'
                  : earlyUnlockOverrides[nextTargetTest.id]
                  ? 'Start Test (Early Access)'
                  : 'Test Locked Until Scheduled Window'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SCHEDULED TIMELINE ROADMAP (3 TO 6 MONTHS) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base md:text-lg font-bold font-display text-white">
              Full 3–6 Month Test Series Roadmap
            </h3>
            <p className="text-xs text-zinc-400">
              {scheduledTests.length} tests scheduled with NTA live windows & chapter checklists.
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'ALL'
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Tests ({scheduledTests.length})
            </button>
            <button
              onClick={() => setFilter('LIVE')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'LIVE'
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Live Now
            </button>
            <button
              onClick={() => setFilter('UPCOMING')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'UPCOMING'
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Upcoming
            </button>
          </div>
        </div>

        {/* Test Cards List */}
        <div className="space-y-4">
          {filteredTests.map((test, index) => {
            const isExpanded = !!expandedTestIds[test.id];
            const isUnlocked =
              test.status === 'LIVE_NOW' || !!earlyUnlockOverrides[test.id];
            const completedTopics = test.syllabus.filter((t) => t.completed).length;

            return (
              <div
                key={test.id}
                className="bg-zinc-950 rounded-xl border border-zinc-800 p-5 md:p-6 shadow-xl space-y-4 hover:border-zinc-700 transition-all"
              >
                {/* Test summary header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 uppercase">
                        Test #{index + 1}
                      </span>
                      {test.status === 'LIVE_NOW' ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.6)] animate-pulse">
                          ● LIVE WINDOW
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Locked
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-base text-white">
                      {test.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-mono">
                      <span>Date: {test.scheduledDate}</span>
                      <span>Window: {test.startTime} - {test.endTime}</span>
                      <span>
                        Syllabus: {completedTopics}/{test.syllabus.length} Revised
                      </span>
                    </div>

                    <div className="pt-1 flex items-center gap-2 text-xs">
                      {test.paper ? (
                        <span className="text-red-400 font-semibold flex items-center gap-1">
                          <FileCheck className="w-3.5 h-3.5" />
                          {test.paper.title}
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">No paper attached</span>
                      )}
                      <button
                        onClick={() => setAttachingTestId(test.id)}
                        className="text-[11px] text-zinc-400 hover:text-white underline flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3 text-red-400" />
                        {test.paper ? 'Change Paper' : 'Attach PDF Paper'}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 md:pt-0">
                    <button
                      onClick={() => toggleExpand(test.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <span>Syllabus Checklist</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => onEnterLiveTest(test)}
                      disabled={!isUnlocked}
                      className="px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-lg shadow-[0_0_12px_rgba(220,38,38,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {test.status === 'LIVE_NOW'
                        ? 'Take Live Test'
                        : isUnlocked
                        ? 'Take Test'
                        : 'Locked'}
                    </button>

                    <button
                      onClick={() => onDeleteTest(test.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-900 transition-colors"
                      title="Remove from schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expandable Syllabus Checklist */}
                {isExpanded && (
                  <div className="pt-3 border-t border-zinc-800 space-y-3">
                    <div className="text-xs font-semibold text-zinc-400">
                      Topics covered in this exam:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {test.syllabus.map((topic) => (
                        <label
                          key={topic.id}
                          onClick={() => onToggleTopic(test.id, topic.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2.5 transition-colors ${
                            topic.completed
                              ? 'bg-red-950/40 border-red-800 text-white'
                              : 'bg-black/60 border-zinc-800 text-zinc-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={topic.completed}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 text-red-600 rounded bg-zinc-900 border-zinc-700"
                          />
                          <span className={topic.completed ? 'line-through text-zinc-400' : ''}>
                            {topic.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. ATTACH PAPER MODAL */}
      {attachingTestId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-red-500" />
                  Attach Question Paper to Test
                </h3>
                <p className="text-xs text-zinc-400">
                  {scheduledTests.find((t) => t.id === attachingTestId)?.title}
                </p>
              </div>
              <button
                onClick={() => setAttachingTestId(null)}
                className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Upload PDF right inside modal */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-red-500" />
                  Upload & Extract New PDF for this Test
                </span>
                <span className="text-[10px] text-zinc-400">Gemini 3.8 Flash</span>
              </div>
              <input
                ref={modalFileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleModalUploadPaper(e.target.files[0]);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => modalFileInputRef.current?.click()}
                disabled={isModalUploading}
                className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-zinc-800 hover:border-red-600 bg-black text-center text-xs font-semibold text-zinc-300 hover:text-white transition-all flex flex-col items-center justify-center gap-1"
              >
                <FileText className="w-5 h-5 text-red-400" />
                <span>Select Question Paper PDF or Image</span>
                <span className="text-[10px] text-zinc-500">Auto-extracts questions & verified answers</span>
              </button>

              {isModalUploading && (
                <div className="flex items-center gap-2 text-xs text-red-400 font-semibold animate-pulse">
                  <div className="w-4 h-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                  <span>{modalUploadProgress || 'Processing PDF...'}</span>
                </div>
              )}

              {modalUploadError && (
                <div className="p-2 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300">
                  {modalUploadError}
                </div>
              )}
            </div>

            {/* Previously Extracted Custom Papers */}
            {savedCustomPapers.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Your Uploaded / Extracted Papers ({savedCustomPapers.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {savedCustomPapers.map((paper) => {
                    const qCount = paper.sections.reduce((acc, s) => acc + s.questions.length, 0);
                    return (
                      <div
                        key={paper.id}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-600 flex items-center justify-between text-xs transition-all"
                      >
                        <div>
                          <div className="font-bold text-white">{paper.title}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            {qCount} Questions • {paper.durationMinutes} Mins • {paper.pattern}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (attachingTestId) {
                              onAttachPaper(attachingTestId, paper);
                              setAttachingTestId(null);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                        >
                          Attach
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard Preset Sample Papers */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Or Use Verified Practice Mocks
              </div>
              <div className="space-y-2">
                {[SAMPLE_JEE_MAIN_MOCK, SAMPLE_JEE_ADVANCED_MOCK].map((sample) => (
                  <div
                    key={sample.id}
                    className="p-3 rounded-xl bg-black border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{sample.title}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {sample.sections.reduce((acc, s) => acc + s.questions.length, 0)} Questions • {sample.pattern}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (attachingTestId) {
                          onAttachPaper(attachingTestId, sample);
                          setAttachingTestId(null);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
                    >
                      Attach
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
