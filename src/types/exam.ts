export type ExamPattern = 'JEE_MAIN' | 'JEE_ADVANCED';

export type QuestionType =
  | 'SINGLE_CORRECT'
  | 'MULTIPLE_CORRECT'
  | 'NUMERICAL'
  | 'MATRIX_MATCH';

export type QuestionStatus =
  | 'NOT_VISITED'
  | 'NOT_ANSWERED'
  | 'ANSWERED'
  | 'MARKED_FOR_REVIEW'
  | 'ANSWERED_AND_MARKED_FOR_REVIEW';

export type SubjectId = 'physics' | 'chemistry' | 'mathematics';

export interface QuestionOption {
  id: string; // 'A', 'B', 'C', 'D'
  labelLatex: string;
}

export interface Question {
  id: string;
  sectionId: SubjectId;
  questionNumber: number;
  type: QuestionType;
  promptLatex: string;
  diagramDescription?: string;
  imageUrl?: string;
  options?: QuestionOption[];
  correctAnswer?: string; // 'A', 'B', 'C', 'D' or '25' or 'A,C'
  explanationLatex?: string;
  positiveMarks: number;
  negativeMarks: number;
}

export interface ExamSection {
  id: SubjectId;
  name: string;
  questions: Question[];
}

export interface ExamPaper {
  id: string;
  title: string;
  pattern: ExamPattern;
  durationMinutes: number;
  totalMarks: number;
  sections: ExamSection[];
  createdAt?: string;
}

export type QuestionTag = 'DOUBT' | 'HARD' | 'TRICKY' | 'RACE_STAR';

export interface TaggedQuestionEntry {
  id: string; // e.g. `tag-${question.id}`
  question: Question;
  examId: string;
  examTitle: string;
  subject: SubjectId;
  tags: QuestionTag[];
  userAnswer?: any;
  correctAnswer?: string;
  addedAt: number;
  lastPracticedAt?: number;
  practiceCount: number;
  notes?: string;
}

export interface StudentAttempt {
  id: string;
  examId: string;
  examTitle: string;
  pattern: ExamPattern;
  totalMarks: number;
  startedAt: number;
  submittedAt: number;
  timeSpentSeconds: Record<string, number>; // questionId -> seconds
  answers: Record<string, any>; // questionId -> 'A' | '12.5' | ['A','B']
  statuses: Record<string, QuestionStatus>;
  questionTags?: Record<string, QuestionTag[]>; // questionId -> tags
}

export type UIMode = 'NTA_OFFICIAL' | 'MATHANGO';

export type MistakeReason =
  | 'CALCULATION_ERROR'
  | 'CONCEPT_GAP'
  | 'MISREAD_QUESTION'
  | 'TIME_PRESSURE'
  | 'GUESS';

export interface MistakeEntry {
  id: string;
  question: Question;
  examTitle: string;
  userAnswer: any;
  correctAnswer: string;
  reason?: MistakeReason;
  notes?: string;
  timeSpentSeconds: number;
  createdAt: number;
}

export interface RemedialQuestion {
  id: string;
  type: 'SINGLE_CORRECT' | 'NUMERICAL';
  historicalTag: string; // e.g. "JEE Main 2023 Shift 1 Variant"
  promptLatex: string;
  options?: { id: string; labelLatex: string }[];
  correctAnswer: string;
  solutionLatex: string;
}

export interface RemedialPack {
  topicName: string;
  conceptSummary: string;
  remedialQuestions: RemedialQuestion[];
}

export interface SyllabusTopic {
  id: string;
  subject: SubjectId;
  name: string;
  completed: boolean;
}

export type LiveWindowStatus =
  | 'UPCOMING_LOCKED'
  | 'LIVE_NOW'
  | 'MISSED_PRACTICE'
  | 'COMPLETED';

export interface ScheduledTest {
  id: string;
  title: string;
  pattern: ExamPattern;
  scheduledDate: string; // "YYYY-MM-DD"
  startTime: string; // "09:00"
  endTime: string; // "12:00"
  durationMinutes: number;
  totalMarks: number;
  syllabus: SyllabusTopic[];
  paperId?: string;
  paper?: ExamPaper;
  status: LiveWindowStatus;
  score?: number;
}

export type RoutineType = 'MODULE_PRACTICE' | 'REAL_TEST';

export interface DailyRoutineItem {
  id: string;
  type: RoutineType;
  title: string;
  chapterOrTopic: string;
  subject: SubjectId;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledSlot: string; // e.g. "19:00 - 20:00"
  durationMinutes: number;
  questionCount: number;
  paperId?: string;
  paper?: ExamPaper;
  isCompleted: boolean;
  score?: number;
  accuracy?: number;
  weekNumber: number;
  dayName: string; // "Monday", "Tuesday", etc.
}

