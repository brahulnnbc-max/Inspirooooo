import React, { useState, useMemo } from 'react';
import { DailyRoutineItem, ExamPaper, RoutineType } from '../types/exam';
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Play,
  Flame,
  Award,
  Zap,
  ChevronRight,
  BookOpen,
  Plus,
  Trash2,
  Filter,
  Check,
  Smile,
} from 'lucide-react';

interface DailyRoutineDeskProps {
  routineItems: DailyRoutineItem[];
  onStartRoutineTask: (item: DailyRoutineItem) => void;
  onToggleRoutineComplete: (itemId: string) => void;
  onAddCustomRoutine: (items: DailyRoutineItem[]) => void;
  onDeleteRoutineItem: (itemId: string) => void;
}

export const DailyRoutineDesk: React.FC<DailyRoutineDeskProps> = ({
  routineItems = [],
  onStartRoutineTask,
  onToggleRoutineComplete,
  onAddCustomRoutine,
  onDeleteRoutineItem,
}) => {
  const [selectedWeek, setSelectedWeek] = useState<number | 'ALL'>(1);
  const [commandPrompt, setCommandPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const safeItems = routineItems || [];

  // Find today's scheduled action item (first uncompleted item or today's date item)
  const todayItem: DailyRoutineItem | undefined = useMemo(() => {
    return (
      safeItems.find((item) => !item.isCompleted) ||
      safeItems[0]
    );
  }, [safeItems]);

  // Available weeks list
  const weeksList = useMemo(() => {
    const set = new Set(safeItems.map((item) => item.weekNumber));
    return Array.from(set).sort((a, b) => a - b);
  }, [safeItems]);

  // Filtered items
  const displayItems = useMemo(() => {
    if (selectedWeek === 'ALL') return safeItems;
    return safeItems.filter((item) => item.weekNumber === selectedWeek);
  }, [safeItems, selectedWeek]);

  // Overall checklist progress
  const completedCount = safeItems.filter((i) => i.isCompleted).length;
  const totalCount = safeItems.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Handle AI Command Routine Generation
  const handleGenerateRoutine = async (presetText?: string) => {
    const textToUse = presetText || commandPrompt;
    if (!textToUse.trim()) return;

    setIsGenerating(true);
    setGenError('');

    try {
      const response = await fetch('/api/generate-full-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: textToUse,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to generate inspiro AI routine');
      }

      if (resData.success && resData.data && resData.data.items) {
        const generated: DailyRoutineItem[] = resData.data.items.map(
          (item: any, idx: number) => ({
            id: `gen-rout-${Date.now()}-${idx}`,
            type: item.type as RoutineType,
            title: item.title,
            chapterOrTopic: item.chapterOrTopic,
            subject: item.subject,
            scheduledDate: item.scheduledDate,
            scheduledSlot: item.scheduledSlot,
            durationMinutes: item.durationMinutes || 50,
            questionCount: item.questionCount || 25,
            weekNumber: item.weekNumber || 1,
            dayName: item.dayName || 'Day',
            isCompleted: false,
          })
        );

        onAddCustomRoutine(generated);
        setCommandPrompt('');
      }
    } catch (e: any) {
      console.error(e);
      setGenError(e.message || 'Failed to arrange routine with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 text-white">
      {/* 1. TODAY'S LIVE WORK DESK HERO */}
      {todayItem ? (
        <div className="bg-zinc-950 text-white rounded-3xl p-6 md:p-8 border-2 border-red-600/80 shadow-[0_0_30px_rgba(220,38,38,0.25)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.5)] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  Today's Live Scheduled Action
                </span>

                <span className="text-xs text-zinc-400 font-mono">
                  {todayItem.dayName} • Slot: {todayItem.scheduledSlot}
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-bold font-display text-white">
                {todayItem.title}
              </h2>

              <p className="text-xs md:text-sm text-zinc-300 flex items-center gap-2">
                <span className="font-bold text-red-400 uppercase">
                  {todayItem.subject}
                </span>
                <span>•</span>
                <span>{todayItem.chapterOrTopic}</span>
              </p>
            </div>

            {/* Quick Stats Pill & Action Button */}
            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <div className="bg-black/80 px-4 py-2.5 rounded-xl border border-zinc-800 text-center">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                  Format
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  {todayItem.durationMinutes}m • {todayItem.questionCount} Qs
                </div>
              </div>

              {todayItem.isCompleted ? (
                <div className="px-5 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-red-500" />
                  Completed! Sit Back & Relax.
                </div>
              ) : (
                <button
                  onClick={() => onStartRoutineTask(todayItem)}
                  className="px-6 py-3.5 text-xs md:text-sm font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {todayItem.type === 'REAL_TEST'
                    ? 'Enter Live Test Hall'
                    : "Enter Today's Practice Room"}
                </button>
              )}
            </div>
          </div>

          {/* Quick checklist toggle */}
          <div className="relative z-10 mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs">
            <span className="text-zinc-400">
              When done with this session, mark it finished to unlock relaxation mode:
            </span>

            <button
              onClick={() => onToggleRoutineComplete(todayItem.id)}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                todayItem.isCompleted
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {todayItem.isCompleted ? 'Marked as Done' : 'Mark Done'}
            </button>
          </div>
        </div>
      ) : null}

      {/* 2. COMMAND AI: INTEGRATED COACHING ROUTINE BUILDER */}
      <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-red-500" />
              inspiro AI
            </div>
            <h3 className="text-base md:text-lg font-bold font-display text-white mt-0.5">
              Command inspiro AI to Arrange Your Multi-Month Module Practice & Test Schedule
            </h3>
            <p className="text-xs text-zinc-400">
              Tell inspiro AI your daily practice slot (e.g. 7-8 PM) and test frequency to create an integrated weekly checklist.
            </p>
          </div>
        </div>

        {/* Command Box */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={commandPrompt}
            onChange={(e) => setCommandPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateRoutine()}
            placeholder="e.g. Schedule daily 50-minute module practice from Monday to Friday at 7pm, and a full CBT test every alternate Sunday"
            disabled={isGenerating}
            className="flex-1 px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-800 bg-black text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-red-600 focus:ring-1 focus:ring-red-600"
          />
          <button
            onClick={() => handleGenerateRoutine()}
            disabled={!commandPrompt.trim() || isGenerating}
            className="px-6 py-3 text-xs md:text-sm font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-white" />
            {isGenerating ? 'Arranging Routine...' : 'Command inspiro AI to Build'}
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span className="text-zinc-400 font-medium">Quick Presets:</span>
          <button
            onClick={() =>
              handleGenerateRoutine(
                'Create an Allen Leader 6-Month integrated routine: Mon-Fri daily 1-hour module practice at 7pm, and alternate Sunday 3-hour tests covering Class 11 and 12'
              )
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-red-600 transition-colors"
          >
            🎯 Daily Module Sprints + Sunday Tests
          </button>
          <button
            onClick={() =>
              handleGenerateRoutine(
                'Create an Intensive 3-Month Revision Sprint: 4 daily module practice sessions every week and a weekly Sunday CBT mock test'
              )
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-red-600 transition-colors"
          >
            ⚡ 3-Month Daily Sprint
          </button>
        </div>

        {genError && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-xs text-red-300">
            {genError}
          </div>
        )}
      </div>

      {/* 3. WEEKLY CHECKLIST & 3-6 MONTH TIMELINE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base md:text-lg font-bold font-display text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-500" />
              Master Coaching Routine Checklist
            </h3>
            <p className="text-xs text-zinc-400">
              Completed: <span className="text-white font-bold">{completedCount}</span> / {totalCount} Sessions ({progressPercent}%)
            </p>
          </div>

          {/* Week Selector Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedWeek('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 transition-colors ${
                selectedWeek === 'ALL'
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              All Weeks
            </button>
            {weeksList.map((w) => (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 transition-colors ${
                  selectedWeek === w
                    ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                Week {w}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-red-600 h-full shadow-[0_0_10px_#dc2626] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Routine Cards List */}
        <div className="space-y-3">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 md:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.isCompleted
                  ? 'bg-zinc-950/80 border-zinc-800 opacity-60'
                  : item.type === 'REAL_TEST'
                  ? 'bg-zinc-950 border-red-600/70 shadow-[0_0_15px_rgba(220,38,38,0.15)]'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Left Details */}
              <div className="flex items-start gap-3.5">
                {/* Complete Checkbox */}
                <button
                  onClick={() => onToggleRoutineComplete(item.id)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border mt-0.5 shrink-0 transition-all ${
                    item.isCompleted
                      ? 'bg-red-600 border-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.6)]'
                      : 'border-zinc-700 bg-black hover:border-red-500'
                  }`}
                  title={item.isCompleted ? 'Mark as pending' : 'Mark as completed'}
                >
                  {item.isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                </button>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        item.type === 'REAL_TEST'
                          ? 'bg-red-950/60 text-red-300 border border-red-700/80'
                          : 'bg-zinc-900 text-zinc-300 border border-zinc-700'
                      }`}
                    >
                      {item.type === 'REAL_TEST' ? '🏆 Real CBT Test' : '⚡ Module Practice Sprint'}
                    </span>

                    <span className="text-xs text-zinc-400 font-mono">
                      Week {item.weekNumber} • {item.dayName} ({item.scheduledDate})
                    </span>

                    <span className="text-xs text-zinc-400 font-mono">
                      Slot: {item.scheduledSlot}
                    </span>
                  </div>

                  <h4
                    className={`font-bold text-sm md:text-base ${
                      item.isCompleted
                        ? 'line-through text-zinc-500'
                        : 'text-white'
                    }`}
                  >
                    {item.title}
                  </h4>

                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <span className="capitalize font-semibold text-red-400">
                      {item.subject}
                    </span>
                    <span>•</span>
                    <span>{item.chapterOrTopic}</span>
                    <span>•</span>
                    <span className="font-mono">{item.questionCount} Questions</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => onStartRoutineTask(item)}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg shadow-[0_0_12px_rgba(220,38,38,0.4)] transition-all flex items-center gap-1.5 active:scale-95 bg-red-600 hover:bg-red-500 text-white"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {item.type === 'REAL_TEST' ? 'Enter Test Hall' : 'Start Practice Sprint'}
                </button>

                <button
                  onClick={() => onDeleteRoutineItem(item.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-900 transition-colors"
                  title="Remove from routine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
