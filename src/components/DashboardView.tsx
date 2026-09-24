import React from 'react';
import confetti from 'canvas-confetti';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Flame, 
  BookOpen, 
  ChevronRight, 
  Play, 
  Target, 
  ArrowUpRight,
  TrendingUp,
  MapPin,
  UserCheck
} from 'lucide-react';
import { DailyGoal, HomeworkItem, TabType, TimetableItem, UserProfile } from '../types';
import { getTodayString, StudentDataService } from '../lib/storage';
import { homeworkToGoogleCalendar } from '../lib/calendar';

interface DashboardViewProps {
  user: UserProfile;
  timetable: TimetableItem[];
  homework: HomeworkItem[];
  dailyGoals: DailyGoal[];
  setActiveTab: (tab: TabType) => void;
  onOpenAddHomework: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  timetable,
  homework,
  dailyGoals,
  setActiveTab,
  onOpenAddHomework,
}) => {
  const todayDateStr = getTodayString();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayOfWeek = dayNames[new Date().getDay()];

  // Today's classes sorted by startTime
  const todayClasses = timetable
    .filter((item) => item.dayOfWeek === currentDayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Determine current class & next class
  const now = new Date();
  const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const currentClass = todayClasses.find(
    (c) => c.startTime <= currentHourMin && currentHourMin <= c.endTime
  );
  const nextClass = todayClasses.find((c) => c.startTime > currentHourMin);

  // Homework stats
  const pendingHomework = homework.filter((h) => h.status !== 'completed');
  const completedHomework = homework.filter((h) => h.status === 'completed');
  
  // Urgent / Overdue homework
  const urgentHomework = pendingHomework
    .sort((a, b) => {
      // Sort by dueDate then priority
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 4);

  // Goals for today
  const todayGoals = dailyGoals.filter((g) => g.date === todayDateStr);
  const completedGoals = todayGoals.filter((g) => g.isCompleted);
  const goalPercentage = todayGoals.length > 0 
    ? Math.round((completedGoals.length / todayGoals.length) * 100) 
    : 0;

  const totalFocusTarget = todayGoals.reduce((sum, g) => sum + (g.targetMinutes || 0), 0);
  const totalFocusDone = todayGoals.reduce((sum, g) => sum + (g.completedMinutes || 0), 0);

  // Quick complete with celebratory confetti
  const handleQuickComplete = async (item: HomeworkItem) => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#6366f1', '#a855f7', '#ec4899', '#22c55e']
    });

    await StudentDataService.saveHomeworkItem({
      ...item,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    });
  };

  const getGreeting = () => {
    const hr = now.getHours();
    if (hr < 12) return 'อรุณสวัสดิ์ ☀️';
    if (hr < 17) return 'สวัสดีตอนบ่าย 🌤️';
    return 'สวัสดีช่วงค่ำ 🌙';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Hero Student Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl shadow-indigo-500/15">
        <div className="absolute -right-8 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-pink-400/20 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Student Personal Dashboard • student03</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {getGreeting()}, {user.displayName || 'น้องนักเรียน'}!
            </h1>
            <p className="text-white/85 text-xs sm:text-sm max-w-xl">
              วันนี้คุณทำการบ้านสำเร็จแล้ว {completedHomework.length} ชิ้น มีงานที่ต้องส่งเร็วๆ นี้ {pendingHomework.length} ชิ้น ลุยกันเลย! 🚀
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('ai-planner')}
              className="px-4 py-2.5 rounded-2xl bg-white text-indigo-700 hover:bg-white/90 font-bold text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>AI จัดเวลาส่งงาน</span>
            </button>
            <button
              onClick={onOpenAddHomework}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm backdrop-blur-md transition-all flex items-center gap-2"
            >
              <span>+ เพิ่มการบ้าน</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real-Time Snapshot Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Homework */}
        <div 
          onClick={() => setActiveTab('homework')}
          className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-rose-300 dark:hover:border-rose-600/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{pendingHomework.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">การบ้าน & งานค้างส่ง</p>
          </div>
        </div>

        {/* Today's Classes */}
        <div 
          onClick={() => setActiveTab('timetable')}
          className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-sky-300 dark:hover:border-sky-600/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{todayClasses.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">คาบเรียนวันนี้</p>
          </div>
        </div>

        {/* Daily Goal Completion */}
        <div 
          onClick={() => setActiveTab('goals')}
          className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-amber-300 dark:hover:border-amber-600/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{goalPercentage}%</p>
              <span className="text-[11px] text-slate-400">({completedGoals.length}/{todayGoals.length})</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">เป้าหมายประจำวัน</p>
          </div>
        </div>

        {/* Focus Study Time */}
        <div 
          onClick={() => setActiveTab('goals')}
          className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-600/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalFocusDone}</p>
              <span className="text-[11px] text-slate-400">/ {totalFocusTarget || 60} นาที</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">สมาธิการเรียนสะสม</p>
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Current Class & Urgent Backlog */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Today's Real-time Class Tracker (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-500" />
              <span>ตารางเรียนวันนี้ ({currentDayOfWeek})</span>
            </h2>
            <button
              onClick={() => setActiveTab('timetable')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              ดูทั้งสัปดาห์
            </button>
          </div>

          {/* Current / Next Class Highlight */}
          {currentClass ? (
            <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
              <div className="flex items-center justify-between text-xs text-white/80 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-white/20 font-bold uppercase tracking-wider animate-pulse">
                  กำลังเรียนอยู่ขณะนี้ 🔴
                </span>
                <span>{currentClass.startTime} - {currentClass.endTime}</span>
              </div>
              <h3 className="text-lg font-extrabold">{currentClass.subject}</h3>
              <p className="text-xs text-white/85 mt-1">{currentClass.subjectCode}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-white/90">
                {currentClass.room && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {currentClass.room}
                  </span>
                )}
                {currentClass.teacher && (
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    {currentClass.teacher}
                  </span>
                )}
              </div>
            </div>
          ) : nextClass ? (
            <div className="p-4 rounded-3xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
              <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-300 mb-1">
                <span className="font-bold">คาบเรียนถัดไป</span>
                <span className="font-semibold">{nextClass.startTime} - {nextClass.endTime}</span>
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{nextClass.subject}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {nextClass.room ? `ห้อง ${nextClass.room}` : ''} {nextClass.teacher ? `• ${nextClass.teacher}` : ''}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-center py-6">
              <p className="text-2xl mb-1">🎉</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">ไม่มีคาบเรียนแล้ววันนี้</p>
              <p className="text-xs text-slate-400 mt-1">พักผ่อนหรือใช้เวลาเคลียร์การบ้านค้างได้เลย</p>
            </div>
          )}

          {/* Today's Classes mini timeline */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {todayClasses.map((item) => {
              const isPast = item.endTime < currentHourMin;
              const isNow = item.startTime <= currentHourMin && currentHourMin <= item.endTime;
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    isNow
                      ? 'bg-sky-50/80 border-sky-300 dark:bg-sky-950/30 dark:border-sky-700 font-semibold'
                      : isPast
                      ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                      {item.startTime}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.subject}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.room || 'ไม่ระบุห้อง'} {item.teacher ? `• ${item.teacher}` : ''}
                      </p>
                    </div>
                  </div>
                  {isNow && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white">
                      เรียนอยู่
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Urgent Homework & Overdue Backlog (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>การบ้านเร่งด่วน & งานค้างส่ง ({urgentHomework.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAddHomework}
                className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
              >
                + เพิ่มงาน
              </button>
              <button
                onClick={() => setActiveTab('homework')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                ดูทั้งหมด ({pendingHomework.length})
              </button>
            </div>
          </div>

          {urgentHomework.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">ไม่มีงานค้างส่งเลยในตอนนี้!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  ยอดเยี่ยมมาก น้องมีความรับผิดชอบสูงมาก ✨
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {urgentHomework.map((item) => {
                const isOverdue = item.dueDate < todayDateStr;
                const isToday = item.dueDate === todayDateStr;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* Top Status Tags */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {item.subject}
                        </span>
                        
                        {isOverdue ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1 animate-pulse">
                            ⚠️ เลยกำหนด!
                          </span>
                        ) : isToday ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            ⏰ ส่งวันนี้ ({item.dueTime || '23:59'})
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            ส่ง {item.dueDate}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-2">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {item.aiScheduledSlot && (
                        <div className="mt-2 text-[11px] p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                          <span className="truncate">{item.aiScheduledSlot}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between">
                      <a
                        href={homeworkToGoogleCalendar(item)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                        title="เพิ่มลงใน Google Calendar"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>ปฏิทิน</span>
                      </a>

                      <button
                        onClick={() => handleQuickComplete(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>เสร็จแล้ว!</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AI Banner Callout */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800/70 dark:to-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  มีงานค้างเยอะจนจัดเวลาไม่ถูกใช่ไหม?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ให้ AI วิเคราะห์เวลาว่างและช่วยจัดตารางทำการบ้านแบบช็อตต่อช็อต
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('ai-planner')}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 shadow-xs transition-colors"
            >
              จัดตารางด้วย AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
