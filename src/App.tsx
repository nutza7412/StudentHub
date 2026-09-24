/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  DailyGoal, 
  HomeworkItem, 
  QuizResult, 
  StudySummary, 
  TabType, 
  TimetableItem, 
  UserProfile 
} from './types';
import { Navbar } from './components/Navbar';
import { Sidebar, MobileNav } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { TimetableEditor } from './components/TimetableEditor';
import { HomeworkView } from './components/HomeworkView';
import { DailyGoalsView } from './components/DailyGoalsView';
import { AiPlannerView } from './components/AiPlannerView';
import { AiSummaryQuizView } from './components/AiSummaryQuizView';
import { WeaknessAnalysisView } from './components/WeaknessAnalysisView';
import { AuthModal } from './components/AuthModal';
import { 
  INITIAL_DAILY_GOALS, 
  INITIAL_HOMEWORK, 
  INITIAL_TIMETABLE, 
  LocalStorage, 
  StudentDataService 
} from './lib/storage';
import { NotificationService } from './lib/notifications';
import { NotificationToast } from './components/NotificationToast';

const DEFAULT_USER: UserProfile = {
  uid: 'guest_student_demo',
  displayName: 'พิมพิศา วงศ์สวัสดิ์',
  email: 'pimpisa.student@demo.ac.th',
  photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  grade: 'มัธยมศึกษาปีที่ 5/2 (วิทย์-คณิต)',
  school: 'โรงเรียนสตรีวิทยา',
  provider: 'guest',
  createdAt: new Date().toISOString(),
};

export default function App() {
  // Dark Mode
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = LocalStorage.get('studenthub_dark_mode', false);
    if (saved) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return saved;
  });

  // User Profile
  const [user, setUser] = useState<UserProfile>(() => {
    return LocalStorage.get('studenthub_user_profile', DEFAULT_USER);
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Core Data States
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [studySummaries, setStudySummaries] = useState<StudySummary[]>([]);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddHomeworkOpen, setIsAddHomeworkOpen] = useState(false);

  // Sync Dark mode with DOM
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    LocalStorage.set('studenthub_dark_mode', isDark);
  }, [isDark]);

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      LocalStorage.set('studenthub_dark_mode', next);
      return next;
    });
  };

  // Initialize Data and Firestore Subscriptions
  useEffect(() => {
    // 1. Seed initial data if empty locally
    const existingTimetable = LocalStorage.get<TimetableItem[]>('studenthub_timetable', []);
    if (existingTimetable.length === 0) {
      const seededTT = INITIAL_TIMETABLE.map((t, idx) => ({
        ...t,
        id: 'tt_' + idx,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      }));
      LocalStorage.set('studenthub_timetable', seededTT);
      setTimetable(seededTT);
    } else {
      setTimetable(existingTimetable);
    }

    const existingHomework = LocalStorage.get<HomeworkItem[]>('studenthub_homework', []);
    if (existingHomework.length === 0) {
      const seededHW = INITIAL_HOMEWORK.map((h, idx) => ({
        ...h,
        id: 'hw_' + idx,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      }));
      LocalStorage.set('studenthub_homework', seededHW);
      setHomework(seededHW);
    } else {
      setHomework(existingHomework);
    }

    const existingGoals = LocalStorage.get<DailyGoal[]>('studenthub_goals', []);
    if (existingGoals.length === 0) {
      const seededG = INITIAL_DAILY_GOALS.map((g, idx) => ({
        ...g,
        id: 'goal_' + idx,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      }));
      LocalStorage.set('studenthub_goals', seededG);
      setDailyGoals(seededG);
    } else {
      setDailyGoals(existingGoals);
    }

    // 2. Subscribe to Firestore (student03)
    const unsubTimetable = StudentDataService.subscribeTimetable(user.uid, (items) => {
      if (items.length > 0) setTimetable(items);
    });

    const unsubHomework = StudentDataService.subscribeHomework(user.uid, (items) => {
      if (items.length > 0) {
        setHomework(items);
        // Check for urgent / overdue alerts
        NotificationService.checkAndAlertPendingHomework(items);
      }
    });

    const unsubGoals = StudentDataService.subscribeDailyGoals(user.uid, (items) => {
      if (items.length > 0) setDailyGoals(items);
    });

    const unsubQuiz = StudentDataService.subscribeQuizResults(user.uid, (items) => {
      setQuizResults(items);
    });

    const unsubSummaries = StudentDataService.subscribeStudySummaries(user.uid, (items) => {
      setStudySummaries(items);
    });

    // Check remote seeding if online
    StudentDataService.seedDefaultDataIfEmpty(user.uid);

    return () => {
      unsubTimetable();
      unsubHomework();
      unsubGoals();
      unsubQuiz();
      unsubSummaries();
    };
  }, [user.uid]);

  const handleLoginSuccess = (newProfile: UserProfile) => {
    setUser(newProfile);
    LocalStorage.set('studenthub_user_profile', newProfile);
  };

  const handleLogout = () => {
    setUser(DEFAULT_USER);
    LocalStorage.set('studenthub_user_profile', DEFAULT_USER);
    setIsAuthModalOpen(true);
  };

  const pendingHomeworkCount = homework.filter((h) => h.status !== 'completed').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        isDark={isDark}
        toggleDark={toggleDark}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        pendingHomeworkCount={pendingHomeworkCount}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Floating In-App Toast Notification */}
      <NotificationToast onNavigateTab={(tab) => setActiveTab(tab)} />

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-20 lg:pb-8">
        
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingHomeworkCount={pendingHomeworkCount}
        />

        {/* Dynamic View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              user={user}
              timetable={timetable}
              homework={homework}
              dailyGoals={dailyGoals}
              setActiveTab={setActiveTab}
              onOpenAddHomework={() => setIsAddHomeworkOpen(true)}
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableEditor
              user={user}
              timetable={timetable}
            />
          )}

          {activeTab === 'homework' && (
            <HomeworkView
              user={user}
              homework={homework}
              isAddModalOpen={isAddHomeworkOpen}
              setIsAddModalOpen={setIsAddHomeworkOpen}
              onOpenAiPlanner={() => setActiveTab('ai-planner')}
            />
          )}

          {activeTab === 'goals' && (
            <DailyGoalsView
              user={user}
              dailyGoals={dailyGoals}
              homework={homework}
            />
          )}

          {activeTab === 'ai-planner' && (
            <AiPlannerView
              user={user}
              homework={homework}
              timetable={timetable}
            />
          )}

          {activeTab === 'ai-quiz' && (
            <AiSummaryQuizView
              user={user}
              studySummaries={studySummaries}
              quizResults={quizResults}
              onNavigateToAnalytics={() => setActiveTab('analytics')}
            />
          )}

          {activeTab === 'analytics' && (
            <WeaknessAnalysisView
              user={user}
              quizResults={quizResults}
              homework={homework}
              timetable={timetable}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingHomeworkCount={pendingHomeworkCount}
      />

      {/* Auth Modal (Gmail, LINE, Facebook, Demo) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
