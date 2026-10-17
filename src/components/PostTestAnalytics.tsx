import React, { useState, useMemo, useEffect } from 'react';
import {
  ExamPaper,
  StudentAttempt,
  Question,
  MistakeReason,
  RemedialPack,
} from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { RemedialPracticeModal } from './RemedialPracticeModal';
import { InspiroLogo } from './InspiroLogo';
import {
  estimateMathonGoPercentile,
  ShiftDifficulty,
  PercentileReport,
} from '../utils/mathongoPercentileEstimator';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
  ArrowLeft,
  Flame,
  AlertTriangle,
  Sparkles,
  BookmarkPlus,
  Zap,
  Target,
  Sliders,
  Award,
  ZoomIn,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PostTestAnalyticsProps {
  paper: ExamPaper;
  attempt: StudentAttempt;
  onRetake: () => void;
  onBackToHub: () => void;
  onLogMistake: (
    q: Question,
    userAnswer: any,
    correctAnswer: string,
    reason: MistakeReason,
    timeSpent: number
  ) => void;
}

export const PostTestAnalytics: React.FC<PostTestAnalyticsProps> = ({
  paper,
  attempt,
  onRetake,
  onBackToHub,
  onLogMistake,
}) => {
  const [filter, setFilter] = useState<
    'ALL' | 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED'
  >('ALL');
  const [expandedQuestions, setExpandedQuestions] = useState<
    Record<string, boolean>
  >({});
  const [selectedReasons, setSelectedReasons] = useState<
    Record<string, MistakeReason>
  >({});
  const [shiftDifficulty, setShiftDifficulty] = useState<ShiftDifficulty>('MODERATE');

  // Remedial PYQ practice modal state
  const [remedialPack, setRemedialPack] = useState<RemedialPack | null>(null);
  const [isLoadingRemedial, setIsLoadingRemedial] = useState(false);
  const [zoomedImg, setZoomedImg] = useState<string | null>(null);

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  }, []);

  // Compute detailed analytics & time management radar
  const analytics = useMemo(() => {
    let totalScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let totalAttempted = 0;

    const timeTraps: Array<{ q: Question; timeSpent: number; reason: string }> = [];
    const rushedErrors: Array<{ q: Question; timeSpent: number }> = [];

    const subjectBreakdown: Record<
      string,
      {
        name: string;
        score: number;
        maxMarks: number;
        correct: number;
        incorrect: number;
        unattempted: number;
        timeSpent: number;
      }
    > = {};

    paper.sections.forEach((sec) => {
      subjectBreakdown[sec.id] = {
        name: sec.name,
        score: 0,
        maxMarks: sec.questions.length * 4,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        timeSpent: 0,
      };

      sec.questions.forEach((q) => {
        const userAnswer = attempt.answers[q.id];
        const hasAnswer = userAnswer !== undefined && userAnswer !== '';
        const qTime = attempt.timeSpentSeconds[q.id] || 0;
        subjectBreakdown[sec.id].timeSpent += qTime;

        if (!hasAnswer) {
          unattemptedCount++;
          subjectBreakdown[sec.id].unattempted++;
          if (qTime > 180) {
            timeTraps.push({
              q,
              timeSpent: qTime,
              reason: 'Spent >3 mins but left unattempted (Time Trap)',
            });
          }
          return;
        }

        totalAttempted++;

        // Evaluation
        let isCorrect = false;
        if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
          const strCorrect = String(q.correctAnswer).trim();
          const strUser = userAnswer !== undefined && userAnswer !== null ? String(userAnswer).trim() : '';

          if (q.type === 'MULTIPLE_CORRECT') {
            const correctSet = strCorrect
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .sort();
            const userSet = Array.isArray(userAnswer)
              ? [...userAnswer].map((s) => String(s).trim().toUpperCase()).sort()
              : strUser
              ? strUser.split(',').map((s) => s.trim().toUpperCase()).sort()
              : [];
            isCorrect = JSON.stringify(correctSet) === JSON.stringify(userSet);
          } else if (q.type === 'NUMERICAL') {
            const userNum = parseFloat(strUser);
            const correctNum = parseFloat(strCorrect);
            if (!isNaN(userNum) && !isNaN(correctNum)) {
              isCorrect = Math.abs(userNum - correctNum) < 0.05;
            } else {
              isCorrect = strUser === strCorrect;
            }
          } else {
            isCorrect = strUser.toUpperCase() === strCorrect.toUpperCase();
          }
        }

        if (isCorrect) {
          totalScore += q.positiveMarks;
          correctCount++;
          subjectBreakdown[sec.id].score += q.positiveMarks;
          subjectBreakdown[sec.id].correct++;
        } else {
          totalScore -= q.negativeMarks;
          incorrectCount++;
          subjectBreakdown[sec.id].score -= q.negativeMarks;
          subjectBreakdown[sec.id].incorrect++;

          if (qTime > 210) {
            timeTraps.push({
              q,
              timeSpent: qTime,
              reason: 'Spent >3.5 mins and received -1 mark (Severe Time Trap)',
            });
          } else if (qTime < 35) {
            rushedErrors.push({ q, timeSpent: qTime });
          }
        }
      });
    });

    const accuracy =
      totalAttempted > 0
        ? Math.round((correctCount / totalAttempted) * 100)
        : 0;

    // MathonGo-calibrated realistic percentile & rank evaluation
    const percentileReport = estimateMathonGoPercentile(
      totalScore,
      paper.totalMarks,
      paper.pattern,
      shiftDifficulty
    );

    // Subject-wise percentiles
    const subjectPercentiles: Record<string, string> = {};
    Object.keys(subjectBreakdown).forEach((secId) => {
      const secData = subjectBreakdown[secId];
      const secReport = estimateMathonGoPercentile(
        secData.score,
        secData.maxMarks,
        'JEE_MAIN',
        shiftDifficulty
      );
      subjectPercentiles[secId] = secReport.percentileString;
    });

    const totalTimeSeconds = Object.values(attempt.timeSpentSeconds).reduce(
      (a, b) => a + b,
      0
    );
    const timeSpentMins = Math.round(totalTimeSeconds / 60);

    return {
      totalScore,
      correctCount,
      incorrectCount,
      unattemptedCount,
      totalAttempted,
      accuracy,
      estimatedPercentile: percentileReport.percentileString,
      percentileReport,
      subjectPercentiles,
      timeSpentMins,
      subjectBreakdown,
      timeTraps,
      rushedErrors,
    };
  }, [paper, attempt, shiftDifficulty]);

  // Evaluated question list
  const evaluatedQuestions = useMemo(() => {
    const list: Array<{
      question: Question;
      userAnswer: any;
      isCorrect: boolean;
      status: 'CORRECT' | 'INCORRECT' | 'UNATTEMPTED';
      timeSpent: number;
    }> = [];

    paper.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        const userAnswer = attempt.answers[q.id];
        const hasAnswer = userAnswer !== undefined && userAnswer !== '';
        const timeSpent = attempt.timeSpentSeconds[q.id] || 0;

        let isCorrect = false;
        if (hasAnswer && q.correctAnswer) {
          if (q.type === 'MULTIPLE_CORRECT') {
            const correctSet = q.correctAnswer
              .split(',')
              .map((s) => s.trim())
              .sort();
            const userSet = Array.isArray(userAnswer)
              ? [...userAnswer].sort()
              : [userAnswer];
            isCorrect = JSON.stringify(correctSet) === JSON.stringify(userSet);
          } else if (q.type === 'NUMERICAL') {
            const userNum = parseFloat(userAnswer);
            const correctNum = parseFloat(q.correctAnswer);
            if (!isNaN(userNum) && !isNaN(correctNum)) {
              isCorrect = Math.abs(userNum - correctNum) < 0.05;
            } else {
              isCorrect = userAnswer.toString().trim() === q.correctAnswer.trim();
            }
          } else {
            isCorrect =
              userAnswer.toString().trim().toUpperCase() ===
              q.correctAnswer.trim().toUpperCase();
          }
        }

        const status = !hasAnswer
          ? 'UNATTEMPTED'
          : isCorrect
          ? 'CORRECT'
          : 'INCORRECT';

        list.push({
          question: q,
          userAnswer,
          isCorrect,
          status,
          timeSpent,
        });
      });
    });

    return list;
  }, [paper, attempt]);

  const filteredQuestions = useMemo(() => {
    if (filter === 'ALL') return evaluatedQuestions;
    return evaluatedQuestions.filter((item) => item.status === filter);
  }, [evaluatedQuestions, filter]);

  const toggleQuestionExpand = (qId: string) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  // Trigger Remedial PYQ generation from server
  const handleLaunchRemedialDrill = async (
    q: Question,
    userAnswer: any,
    reason: MistakeReason = 'CONCEPT_GAP'
  ) => {
    setIsLoadingRemedial(true);
    setRemedialPack(null);

    try {
      const response = await fetch('/api/generate-remedial-pyqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptLatex: q.promptLatex,
          sectionId: q.sectionId,
          pattern: paper.pattern,
          missedReason: reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate remedial questions');
      }

      const resData = await response.json();
      if (resData.success && resData.data) {
        setRemedialPack(resData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRemedial(false);
    }
  };

  // Classify mistake handler
  const handleTagMistake = (
    q: Question,
    userAnswer: any,
    reason: MistakeReason,
    timeSpent: number
  ) => {
    setSelectedReasons((prev) => ({ ...prev, [q.id]: reason }));
    onLogMistake(q, userAnswer, q.correctAnswer || '', reason, timeSpent);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToHub}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Test Hub
          </button>

          <button
            onClick={onRetake}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-attempt Test
          </button>
        </div>

        {/* 1. HERO ANALYTICS SCORECARD */}
        <div className="bg-zinc-950 text-white rounded-2xl p-6 md:p-8 shadow-2xl border border-zinc-800 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 select-none mb-1">
                <InspiroLogo size="sm" showText />
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider px-2 py-0.5 rounded bg-red-600/10 border border-red-500/20 ml-1">
                  Performance Analysis
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-display mt-1 text-white">
                {paper.title}
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Submitted on {new Date(attempt.submittedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-black/90 px-6 py-4 rounded-xl border border-zinc-800 text-center shrink-0 shadow-lg min-w-[220px]">
              <div className="text-xs text-zinc-400 uppercase font-medium tracking-wider">
                Total Score
              </div>
              <div className="text-3xl md:text-4xl font-black font-mono text-white mt-0.5">
                <span className="text-red-500 font-black">{analytics.totalScore}</span>{' '}
                <span className="text-lg font-normal text-zinc-500">
                  / {paper.totalMarks}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold font-mono mt-2">
                <span>{analytics.percentileReport.percentileString}</span>
                <span className="text-[10px] text-zinc-400 font-sans font-normal">• MathonGo Shift Model</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-1">
                {analytics.percentileReport.rankRange}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-zinc-800 text-xs">
            <div>
              <span className="text-zinc-400 block">Accuracy</span>
              <span className="text-xl font-bold font-mono text-white">
                {analytics.accuracy}%
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block">Questions Attempted</span>
              <span className="text-xl font-bold font-mono text-white">
                {analytics.totalAttempted} / {evaluatedQuestions.length}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block">Correct / Incorrect</span>
              <span className="text-xl font-bold font-mono text-white">
                <span className="text-white font-black">{analytics.correctCount}</span> /{' '}
                <span className="text-red-500 font-black">{analytics.incorrectCount}</span>
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block">Total Time Spent</span>
              <span className="text-xl font-bold font-mono text-white">
                {analytics.timeSpentMins}m / {paper.durationMinutes}m
              </span>
            </div>
          </div>
        </div>

        {/* MATHONGO CALIBRATED REALISTIC PERCENTILE & AIR RANK PREDICTOR */}
        <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-2xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                  MathonGo Calibrated
                </span>
                <span className="text-xs text-zinc-400">
                  {paper.pattern === 'JEE_ADVANCED' ? 'JEE Advanced Rank Matrix' : 'NTA JEE Main Normalization Model'}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold font-display text-white mt-1 flex items-center gap-2">
                <Award className="w-5 h-5 text-red-500" />
                Realistic Marks vs Percentile & AIR Console
              </h2>
            </div>

            {/* Shift Difficulty Selector (MathonGo Signature Feature) */}
            {paper.pattern !== 'JEE_ADVANCED' && (
              <div className="flex items-center gap-1.5 p-1 bg-black rounded-xl border border-zinc-800 text-xs">
                <span className="text-[11px] font-semibold text-zinc-500 px-2 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  Shift:
                </span>
                {(
                  [
                    { id: 'TOUGH', label: '🔥 Tough Shift' },
                    { id: 'MODERATE', label: '⚖️ Moderate Shift' },
                    { id: 'EASY', label: '⚡ Easy Shift' },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setShiftDifficulty(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      shiftDifficulty === s.id
                        ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3-Column MathonGo Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Percentile & AIR */}
            <div className="p-5 rounded-xl bg-black border border-zinc-800/80 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                  {paper.pattern === 'JEE_ADVANCED' ? 'Predicted IIT Rank' : 'Estimated NTA Percentile'}
                </span>
                <div className="text-3xl font-black font-mono text-white mt-1 flex items-baseline gap-2">
                  <span className="text-red-500 font-black">{analytics.percentileReport.percentileString}</span>
                </div>
                <div className="text-xs text-zinc-400 font-mono mt-1">
                  Confidence Band: <strong className="text-white">{analytics.percentileReport.percentileRange}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-900 space-y-1">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>Predicted All India Rank (AIR):</span>
                  <span className="font-mono text-red-400">~{analytics.percentileReport.estimatedRank.toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  {analytics.percentileReport.rankRange}
                </div>
              </div>
            </div>

            {/* Card 2: College Admission & Branch Predictor */}
            <div className="p-5 rounded-xl bg-black border border-zinc-800/80 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
                  College Admission Probability
                </span>
                <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{analytics.percentileReport.categoryCutoffStatus}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Eligible Institutes & Branches:</span>
                {analytics.percentileReport.targetColleges.map((col, idx) => (
                  <div key={idx} className="text-xs text-zinc-300 flex items-start gap-1.5">
                    <span className="text-red-500 shrink-0">•</span>
                    <span>{col}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Next Score Milestone (Targeting +1%ile) */}
            <div className="p-5 rounded-xl bg-black border border-zinc-800/80 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-red-400" />
                  Next Rank Milestone (+{analytics.percentileReport.nextMilestone.marksNeeded} Marks)
                </span>
                <div className="text-sm font-bold text-white mt-1">
                  Target: Reach <span className="text-red-400 font-mono">{analytics.percentileReport.nextMilestone.targetPercentile}%ile</span>
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Jump approximately <strong className="text-white font-mono">+{analytics.percentileReport.nextMilestone.rankJump.toLocaleString()}</strong> AIR ranks.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-300 leading-relaxed">
                💡 <strong className="text-white">Kota Faculty Advice:</strong> {analytics.percentileReport.nextMilestone.advice}
              </div>
            </div>
          </div>
        </div>

        {/* 2. TIME TRAP & NEGATIVE MARKING RADAR */}
        {(analytics.timeTraps.length > 0 || analytics.rushedErrors.length > 0) && (
          <div className="bg-zinc-950 border border-red-900/60 rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <Zap className="w-4 h-4 text-red-500" />
              Exam Temperament & Time Trap Radar:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Severe Time Sinks */}
              {analytics.timeTraps.length > 0 && (
                <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2">
                  <span className="font-bold text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Time Sinks ({analytics.timeTraps.length} Questions)
                  </span>
                  <p className="text-zinc-300">
                    Questions where you spent more than 3.5 minutes and either received -1 or left them unattempted:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {analytics.timeTraps.map((tt) => (
                      <span
                        key={tt.q.id}
                        className="px-2.5 py-1 rounded-md bg-red-950/60 text-red-300 font-mono text-[11px] border border-red-800/80"
                      >
                        Q.{tt.q.questionNumber} ({Math.round(tt.timeSpent / 60)}m {tt.timeSpent % 60}s)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rushed Errors */}
              {analytics.rushedErrors.length > 0 && (
                <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-red-500" />
                    Rushed Silly Mistakes ({analytics.rushedErrors.length} Questions)
                  </span>
                  <p className="text-zinc-300">
                    Questions answered in less than 35 seconds and gotten wrong. Slowing down by 15s could have saved +5 marks (+4 instead of -1):
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {analytics.rushedErrors.map((re) => (
                      <span
                        key={re.q.id}
                        className="px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-300 font-mono text-[11px] border border-zinc-800"
                      >
                        Q.{re.q.questionNumber} ({re.timeSpent}s)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. SUBJECT-WISE SCORE CARD */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.7)]" />
            <h2 className="text-lg font-bold font-display text-white">
              Subject-Wise Score Card
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(analytics.subjectBreakdown).map(([secId, secData]) => {
              const secAccuracy =
                secData.correct + secData.incorrect > 0
                  ? Math.round(
                      (secData.correct / (secData.correct + secData.incorrect)) * 100
                    )
                  : 0;

              return (
                <div
                  key={secId}
                  className="bg-zinc-950 rounded-2xl p-5 border border-zinc-800 shadow-xl flex flex-col justify-between hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {secData.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black font-mono text-red-500">
                        {secData.score} <span className="text-xs text-zinc-500 font-normal">/ {secData.maxMarks}</span>
                      </span>
                      {analytics.subjectPercentiles[secId] && (
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-red-950/60 border border-red-800/80 text-red-300">
                          {analytics.subjectPercentiles[secId]}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs my-4 py-2.5 bg-black rounded-xl border border-zinc-900">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Correct</span>
                      <span className="font-bold text-white text-base">
                        {secData.correct}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Wrong</span>
                      <span className="font-bold text-red-500 text-base">
                        {secData.incorrect}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Left</span>
                      <span className="font-bold text-zinc-400 text-base">
                        {secData.unattempted}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/80">
                    <span>Accuracy: <strong className="text-white">{secAccuracy}%</strong></span>
                    <span>Time: <strong className="text-white">{Math.round(secData.timeSpent / 60)}m</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. QUESTION-BY-QUESTION DETAILED REVIEW */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.7)]" />
              <h2 className="text-lg font-bold font-display text-white">
                Question-by-Question Detailed Review
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filter === 'ALL'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({evaluatedQuestions.length})
              </button>
              <button
                onClick={() => setFilter('CORRECT')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filter === 'CORRECT'
                    ? 'bg-white text-black font-bold shadow-xs'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Correct ({analytics.correctCount})
              </button>
              <button
                onClick={() => setFilter('INCORRECT')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filter === 'INCORRECT'
                    ? 'bg-red-600 text-white font-bold shadow-[0_0_12px_rgba(220,38,38,0.5)]'
                    : 'text-red-400 hover:bg-red-950/40'
                }`}
              >
                Incorrect ({analytics.incorrectCount})
              </button>
              <button
                onClick={() => setFilter('UNATTEMPTED')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filter === 'UNATTEMPTED'
                    ? 'bg-zinc-800 text-zinc-300 shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Unattempted ({analytics.unattemptedCount})
              </button>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {filteredQuestions.map(
              ({ question: q, userAnswer, isCorrect, status, timeSpent }) => {
                const isExpanded = !!expandedQuestions[q.id];
                const selectedReason = selectedReasons[q.id];

                return (
                  <div
                    key={q.id}
                    className={`bg-zinc-950 rounded-2xl border transition-all ${
                      status === 'CORRECT'
                        ? 'border-zinc-800 hover:border-zinc-700'
                        : status === 'INCORRECT'
                        ? 'border-red-900/60 shadow-[0_0_15px_rgba(220,38,38,0.1)]'
                        : 'border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    {/* Summary Bar */}
                    <div
                      onClick={() => toggleQuestionExpand(q.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            status === 'CORRECT'
                              ? 'bg-white text-black font-black'
                              : status === 'INCORRECT'
                              ? 'bg-red-600 text-white font-black shadow-[0_0_8px_rgba(220,38,38,0.5)]'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {q.questionNumber}
                        </span>

                        <div>
                          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                            {q.sectionId} • {q.type.replace('_', ' ')}
                          </div>
                          <div className="text-xs font-medium text-zinc-300 line-clamp-1 mt-0.5">
                            {q.promptLatex.slice(0, 100)}...
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 md:gap-4 text-xs font-mono">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          {timeSpent}s
                        </span>

                        <span
                          className={`px-2.5 py-1 rounded-md font-bold uppercase text-[10px] tracking-wider ${
                            status === 'CORRECT'
                              ? 'bg-zinc-800 text-white border border-zinc-700'
                              : status === 'INCORRECT'
                              ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                          }`}
                        >
                          {status}
                        </span>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="p-5 border-t border-zinc-800 space-y-4 text-sm bg-black/60 rounded-b-2xl">
                        {/* Prompt */}
                        <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-200">
                          <MathRenderer content={q.promptLatex} />
                        </div>

                        {q.imageUrl && (
                          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col items-center">
                            <img
                              src={q.imageUrl}
                              alt={`Diagram for Question ${q.questionNumber}`}
                              className="max-h-72 w-auto object-contain rounded-lg cursor-zoom-in"
                              onClick={() => setZoomedImg(q.imageUrl || null)}
                            />
                            <button
                              type="button"
                              onClick={() => setZoomedImg(q.imageUrl || null)}
                              className="mt-2 text-[11px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-red-600 transition-colors shadow-xs"
                            >
                              <ZoomIn className="w-3.5 h-3.5 text-red-500" />
                              <span>Inspect Diagram Fullscreen</span>
                            </button>
                          </div>
                        )}

                        {/* Options */}
                        {q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {q.options.map((opt) => {
                              const isUserChoice =
                                Array.isArray(userAnswer)
                                  ? userAnswer.includes(opt.id)
                                  : userAnswer === opt.id;
                              const isCorrectChoice =
                                q.correctAnswer !== undefined &&
                                q.correctAnswer !== null &&
                                String(q.correctAnswer)
                                  .split(',')
                                  .map((s) => s.trim().toUpperCase())
                                  .includes(opt.id);

                              return (
                                <div
                                  key={opt.id}
                                  className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                                    isCorrectChoice
                                      ? 'bg-zinc-900 border-white text-white font-bold ring-1 ring-white/20'
                                      : isUserChoice
                                      ? 'bg-red-950/40 border-red-600 text-red-300 font-semibold'
                                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                    isCorrectChoice ? 'bg-white text-black' : isUserChoice ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400'
                                  }`}>{opt.id}</span>
                                  <MathRenderer content={opt.labelLatex} />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Comparison */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                          <div>
                            <span className="text-zinc-500">Your Answer: </span>
                            <strong
                              className={
                                isCorrect ? 'text-white' : 'text-red-400'
                              }
                            >
                              {userAnswer
                                ? JSON.stringify(userAnswer)
                                : 'Not Attempted'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-zinc-500">Correct: </span>
                            <strong className="text-white">
                              {q.correctAnswer || 'Not Specified'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-zinc-500">Marks: </span>
                            <strong className="text-white">
                              {status === 'CORRECT'
                                ? `+${q.positiveMarks}`
                                : status === 'INCORRECT'
                                ? `-${q.negativeMarks}`
                                : '0'}
                            </strong>
                          </div>
                        </div>

                        {/* Step-by-Step Solution */}
                        {q.explanationLatex && (
                          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                            <div className="font-bold text-red-400 mb-1.5 flex items-center gap-1.5">
                              <Flame className="w-3.5 h-3.5 text-red-500 fill-current" />
                              Official Step-by-Step Solution:
                            </div>
                            <div className="leading-relaxed text-zinc-300">
                              <MathRenderer content={q.explanationLatex} />
                            </div>
                          </div>
                        )}

                        {/* Root-Cause Classification & AI Remedial Practice */}
                        {status !== 'CORRECT' && (
                          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                                <BookmarkPlus className="w-3.5 h-3.5 text-red-500" />
                                Add to Mistake Book (Select Root Cause):
                              </div>

                              <button
                                onClick={() =>
                                  handleLaunchRemedialDrill(
                                    q,
                                    userAnswer,
                                    selectedReason || 'CONCEPT_GAP'
                                  )
                                }
                                className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-lg shadow-[0_0_12px_rgba(220,38,38,0.4)] transition-all flex items-center gap-1.5 uppercase tracking-wider"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                                Practice 3 Similar JEE PYQs (inspiro AI Drill)
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <button
                                onClick={() =>
                                  handleTagMistake(
                                    q,
                                    userAnswer,
                                    'CALCULATION_ERROR',
                                    timeSpent
                                  )
                                }
                                className={`p-2 text-xs font-medium rounded-lg border text-left transition-all ${
                                  selectedReason === 'CALCULATION_ERROR'
                                    ? 'bg-red-600 text-white font-bold border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
                                    : 'bg-black text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                }`}
                              >
                                🔴 Silly / Calc Error
                              </button>

                              <button
                                onClick={() =>
                                  handleTagMistake(
                                    q,
                                    userAnswer,
                                    'CONCEPT_GAP',
                                    timeSpent
                                  )
                                }
                                className={`p-2 text-xs font-medium rounded-lg border text-left transition-all ${
                                  selectedReason === 'CONCEPT_GAP'
                                    ? 'bg-red-600 text-white font-bold border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
                                    : 'bg-black text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                }`}
                              >
                                🟡 Concept Gap / Formula
                              </button>

                              <button
                                onClick={() =>
                                  handleTagMistake(
                                    q,
                                    userAnswer,
                                    'MISREAD_QUESTION',
                                    timeSpent
                                  )
                                }
                                className={`p-2 text-xs font-medium rounded-lg border text-left transition-all ${
                                  selectedReason === 'MISREAD_QUESTION'
                                    ? 'bg-red-600 text-white font-bold border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
                                    : 'bg-black text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                }`}
                              >
                                🟣 Misread Question
                              </button>

                              <button
                                onClick={() =>
                                  handleTagMistake(
                                    q,
                                    userAnswer,
                                    'TIME_PRESSURE',
                                    timeSpent
                                  )
                                }
                                className={`p-2 text-xs font-medium rounded-lg border text-left transition-all ${
                                  selectedReason === 'TIME_PRESSURE'
                                    ? 'bg-red-600 text-white font-bold border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
                                    : 'bg-black text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                }`}
                              >
                                🔵 Time Pressure / Guess
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Remedial Practice Modal */}
      <RemedialPracticeModal
        pack={remedialPack}
        isLoading={isLoadingRemedial}
        onClose={() => {
          setRemedialPack(null);
          setIsLoadingRemedial(false);
        }}
      />

      {/* Lightbox Image Zoom Modal */}
      {zoomedImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 cursor-zoom-out"
          onClick={() => setZoomedImg(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomedImg(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImg}
              alt="Enlarged Question Diagram"
              className="max-h-[80vh] w-auto object-contain rounded-lg shadow-lg"
            />
            <div className="mt-3 text-xs text-zinc-400 font-medium flex items-center gap-2">
              <span>Question Diagram Inspection</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => setZoomedImg(null)}
                className="text-red-400 hover:text-red-300 font-bold underline"
              >
                Close (or click outside)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

