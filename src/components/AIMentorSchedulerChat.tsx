import React, { useState } from 'react';
import { DailyRoutineItem, RoutineType } from '../types/exam';
import {
  Sparkles,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  Bot,
  User,
  Zap,
  Flame,
  ArrowRight,
  BookOpen,
  Award,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'mentor';
  text: string;
  timestamp: string;
  proposedRoutine?: {
    routineTitle: string;
    summary: string;
    items: DailyRoutineItem[];
  };
}

interface AIMentorSchedulerChatProps {
  onApplyRoutine: (items: DailyRoutineItem[]) => void;
  currentRoutineItems: DailyRoutineItem[];
  initialPrompt?: string;
}

export const AIMentorSchedulerChat: React.FC<AIMentorSchedulerChatProps> = ({
  onApplyRoutine,
  currentRoutineItems,
  initialPrompt = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'mentor',
      text: "Namaste Aspirant! I am your inspiro AI (modeled after Kota's top Allen & MathonGo coaches). Tell me your target exam, upcoming coaching test dates, or the module chapters you are stuck with. You can also command me to create custom tests from your tagged Doubts, Hard & Tricky questions (Allen RACE series)! I will schedule everything into your live checklist so you can just sit down, finish today's work, and relax!",
      timestamp: 'Just now',
    },
  ]);

  const [inputVal, setInputVal] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [practiceSlot, setPracticeSlot] = useState('19:00 - 20:00');
  const [testSlot, setTestSlot] = useState('09:00 - 12:00');
  const [appliedNotice, setAppliedNotice] = useState('');

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputVal;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputVal('');
    setIsLoading(true);

    try {
      let response: Response;
      try {
        response = await fetch('/api/mentor-chat-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: messages.map((m) => ({ role: m.sender, text: m.text })),
            preferredSlot: practiceSlot,
            testSlot: testSlot,
          }),
        });
      } catch (_fetchErr) {
        response = await fetch('/api/ai-academic-mentor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: messages.map((m) => ({ role: m.sender, text: m.text })),
            preferredSlot: practiceSlot,
            testSlot: testSlot,
          }),
        });
      }

      if (!response.ok) {
        // Try fallback endpoint if first returned 404
        if (response.status === 404) {
          response = await fetch('/api/ai-academic-mentor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              history: messages.map((m) => ({ role: m.sender, text: m.text })),
              preferredSlot: practiceSlot,
              testSlot: testSlot,
            }),
          });
        }
      }

      const resData = await response.json().catch(() => ({}));
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Academic Director is temporarily unavailable');
      }

      const mentorReply = resData.data?.reply || resData.data?.replyText || 'I am ready to help you plan your JEE preparation roadmap.';
      const proposed = resData.data?.proposedRoutine;

      const mentorMsg: ChatMessage = {
        id: `mentor-${Date.now()}`,
        sender: 'mentor',
        text: mentorReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposedRoutine: proposed
          ? {
              routineTitle: proposed.title || proposed.routineTitle || 'Personalized Coaching Schedule',
              summary: proposed.summary || '',
              items: (proposed.items || []).map((it: any, idx: number) => ({
                id: `rout-mentor-${Date.now()}-${idx}`,
                type: (it.type as RoutineType) || 'MODULE_PRACTICE',
                title: it.title,
                chapterOrTopic: it.chapterOrTopic || it.title,
                subject: it.subject || 'physics',
                scheduledDate: it.scheduledDate || new Date().toISOString().split('T')[0],
                scheduledSlot: it.scheduledSlot || practiceSlot,
                durationMinutes: it.durationMinutes || 50,
                questionCount: it.questionCount || 25,
                weekNumber: it.weekNumber || 1,
                dayName: it.dayName || 'Day',
                isCompleted: false,
              })),
            }
          : undefined,
      };

      setMessages((prev) => [...prev, mentorMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'mentor',
          text: `⚠️ ${err.message || 'Error formulating schedule. Please try again.'}`,
          timestamp: 'Now',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyProposedSchedule = (items: DailyRoutineItem[]) => {
    onApplyRoutine(items);
    setAppliedNotice(`Successfully applied ${items.length} scheduled practice sessions & tests to your Live Checklist!`);
    setTimeout(() => setAppliedNotice(''), 6000);
  };

  return (
    <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[700px] text-white">
      {/* Mentor Header */}
      <div className="p-4 md:p-6 border-b border-zinc-800 bg-black flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)] shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-display text-white">
                inspiro AI
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live Coach
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Command inspiro AI to arrange your module sprints, create multi-month checklists, and balance tests.
            </p>
          </div>
        </div>

        {/* Slot Controls */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
            <Clock className="w-3.5 h-3.5 text-red-500" />
            <span className="text-zinc-400">Daily Slot:</span>
            <input
              type="text"
              value={practiceSlot}
              onChange={(e) => setPracticeSlot(e.target.value)}
              className="w-24 font-mono font-bold text-white bg-transparent focus:outline-hidden"
              title="Daily practice slot"
            />
          </div>
        </div>
      </div>

      {appliedNotice && (
        <div className="bg-green-950/80 border-b border-green-800 text-green-300 text-xs px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>{appliedNotice}</span>
          </div>
          <button onClick={() => setAppliedNotice('')} className="text-green-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-black/40">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'mentor' && (
              <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-red-500 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs md:text-sm space-y-3 leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.35)]'
                  : 'bg-zinc-900 text-zinc-200 border border-zinc-800'
              }`}
            >
              <div>{m.text}</div>

              {/* Proposed Routine Box */}
              {m.proposedRoutine && Array.isArray(m.proposedRoutine.items) && m.proposedRoutine.items.length > 0 && (
                <div className="bg-black rounded-xl p-4 border border-red-600/70 shadow-[0_0_15px_rgba(220,38,38,0.2)] space-y-3 text-white">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                        Generated Coaching Roadmap
                      </div>
                      <div className="text-sm font-bold font-display text-white">
                        {m.proposedRoutine.routineTitle}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800">
                      {m.proposedRoutine.items.length} Sessions
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400">
                    {m.proposedRoutine.summary}
                  </p>

                  {/* Preview Items */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {m.proposedRoutine.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              it.type === 'REAL_TEST' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-zinc-400'
                            }`}
                          />
                          <span className="font-bold text-white">{it.dayName}:</span>
                          <span className="text-zinc-300 truncate max-w-[200px]">
                            {it.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {it.scheduledSlot}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Apply Button */}
                  <button
                    onClick={() => handleApplyProposedSchedule(m.proposedRoutine!.items)}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black uppercase tracking-wider text-xs transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)] flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    Apply This Routine Directly to My Live Checklist
                  </button>
                </div>
              )}

              <div
                className={`text-[10px] text-right font-mono ${
                  m.sender === 'user' ? 'text-red-200' : 'text-zinc-500'
                }`}
              >
                {m.timestamp}
              </div>
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-zinc-400 italic">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(220,38,38,0.5)]">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <span>inspiro AI is formulating your strategic schedule...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts Suggestions */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-zinc-500 font-medium text-[11px] shrink-0">Suggestions:</span>
        <button
          onClick={() =>
            handleSendMessage(
              "Schedule an Allen Leader 6-Month routine: Mon-Fri daily 1-hour module practice at 7 PM and alternate Sunday 3-hour tests."
            )
          }
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white hover:border-red-600 shrink-0 text-xs transition-colors"
        >
          Kota Leader 6-Month Routine
        </button>
        <button
          onClick={() =>
            handleSendMessage(
              "I have 80 questions in Kinematics and 60 in Mole Concept. Break them into 5 daily 50-minute practice sprints and schedule a test on Sunday."
            )
          }
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white hover:border-red-600 shrink-0 text-xs transition-colors"
        >
          Kinematics + Mole Concept Sprints
        </button>
        <button
          onClick={() =>
            handleSendMessage(
              "Schedule a daily 45-minute Allen RACE test slot at 7 PM for the next 7 days, pulling my tagged Doubt, Hard, and Tricky questions so I can repeat them until 100% mastered."
            )
          }
          className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-300 shrink-0 text-xs font-semibold transition-colors flex items-center gap-1"
        >
          <Award className="w-3.5 h-3.5 text-red-400" />
          Schedule Daily RACE Repeat Tests
        </button>
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-black border-t border-zinc-800 flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Command inspiro AI (e.g. 'Schedule my Allen Physics module for next 2 weeks with a test on Sunday')..."
          disabled={isLoading}
          className="flex-1 px-4 py-3 text-xs md:text-sm rounded-xl border border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-500 focus:outline-hidden focus:border-red-600 focus:ring-1 focus:ring-red-600"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputVal.trim() || isLoading}
          className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black uppercase tracking-wider text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};
