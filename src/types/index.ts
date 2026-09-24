export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider: 'google' | 'line' | 'facebook' | 'guest';
  school?: string;
  grade?: string;
  themePreference?: 'light' | 'dark' | 'system';
  createdAt?: string;
  updatedAt?: string;
}

export interface TimetableItem {
  id: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  subject: string;
  subjectCode?: string;
  room?: string;
  teacher?: string;
  startTime: string; // "08:30"
  endTime: string;   // "09:20"
  color: string;     // color identifier or hex
  notes?: string;
  createdAt: string;
}

export type HomeworkPriority = 'urgent' | 'high' | 'medium' | 'low';
export type HomeworkStatus = 'pending' | 'in_progress' | 'completed';

export interface HomeworkItem {
  id: string;
  userId: string;
  title: string;
  subject: string;
  description?: string;
  dueDate: string; // "YYYY-MM-DD"
  dueTime: string; // "HH:mm"
  priority: HomeworkPriority;
  status: HomeworkStatus;
  estimatedMinutes?: number;
  aiScheduledSlot?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DailyGoal {
  id: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  isCompleted: boolean;
  targetMinutes: number;
  completedMinutes: number;
  category: 'Homework' | 'Review' | 'Exam Prep' | 'Project' | 'Other';
  createdAt: string;
}

export interface StudySummary {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  originalNotes: string;
  summary: string;
  keyFormulas?: string;
  flashcards?: { front: string; back: string }[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizResult {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  score: number;
  totalQuestions: number;
  weaknessAnalysis: string;
  date: string;
  createdAt: string;
}

export interface WeaknessAnalysis {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  errorRate: number;
  advice: string;
  studyPlan: string;
  updatedAt: string;
}

export type TabType = 'dashboard' | 'timetable' | 'homework' | 'goals' | 'ai-planner' | 'ai-quiz' | 'analytics';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  timestamp: string;
  read: boolean;
  linkTab?: TabType;
}
