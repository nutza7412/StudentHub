import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Flame, 
  AlertTriangle, 
  Sparkles, 
  BookOpen,
  Coffee,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { DailyGoal, HomeworkItem, UserProfile } from '../types';
import { getTodayString, StudentDataService } from '../lib/storage';

interface DailyGoalsViewProps {
  user: UserProfile;
  dailyGoals: DailyGoal[];
  homework: HomeworkItem[];
  onSelectHomeworkForTimer?: (title: string) => void;
  onUpdateDailyGoals?: React.Dispatch<React.SetStateAction<DailyGoal[]>>;
}

export const DailyGoalsView: React.FC<DailyGoalsViewProps> = ({
  user,
  dailyGoals,
  homework,
  onUpdateDailyGoals,
}) => {
  const todayStr = getTodayString();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // New goal form
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<'Homework' | 'Review' | 'Exam Prep' | 'Project' | 'Other'>('Homework');
  const [newGoalTargetMin, setNewGoalTargetMin] = useState(45);

  // Pomodoro Timer States
  const [timerMode, setTimerMode] = useState<'study' | 'shortBreak' | 'longBreak'>('study');
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeTaskTitle, setActiveTaskTitle] = useState('อ่านหนังสือ & เคลียร์การบ้าน');

  // Filter goals for selected date
  const dateGoals = dailyGoals.filter((g) => g.date === selectedDate);
  const completedGoalsCount = dateGoals.filter((g) => g.isCompleted).length;
  const progressPercent = dateGoals.length > 0 ? Math.round((completedGoalsCount / dateGoals.length) * 100) : 0;

  // Uncompleted goals from earlier dates (rollover opportunity)
  const pastUncompletedGoals = dailyGoals.filter(
    (g) => g.date < todayStr && !g.isCompleted
  );

  // Urgent backlog
  const overdueOrTodayHomework = homework.filter(
    (h) => h.status !== 'completed' && h.dueDate <= todayStr
  );

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (timerSecondsLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playChime();

      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });

      // If finished a study session, log 25 minutes to today's goals
      if (timerMode === 'study') {
        logTimerMinutes(25);
      }
    }

    return () => clearInterval(interval);
  }, [isTimerRunning, timerSecondsLeft, timerMode]);

  const switchTimerMode = (mode: 'study' | 'shortBreak' | 'longBreak') => {
    setIsTimerRunning(false);
    setTimerMode(mode);
    if (mode === 'study') setTimerSecondsLeft(25 * 60);
    if (mode === 'shortBreak') setTimerSecondsLeft(5 * 60);
    if (mode === 'longBreak') setTimerSecondsLeft(15 * 60);
  };

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {
      // AudioContext might be blocked until user gesture
    }
  };

  const logTimerMinutes = async (minutes: number) => {
    if (dateGoals.length > 0) {
      const firstIncomplete = dateGoals.find((g) => !g.isCompleted) || dateGoals[0];
      const newMinutes = (firstIncomplete.completedMinutes || 0) + minutes;
      const isDone = newMinutes >= firstIncomplete.targetMinutes;

      const updatedGoal: DailyGoal = {
        ...firstIncomplete,
        completedMinutes: newMinutes,
        isCompleted: isDone,
      };

      if (onUpdateDailyGoals) {
        onUpdateDailyGoals((prev) =>
          prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
        );
      }

      await StudentDataService.saveDailyGoal(updatedGoal);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const id = 'goal_' + Math.random().toString(36).substring(2, 9);
    const itemToSave: DailyGoal = {
      id,
      userId: user.uid,
      date: selectedDate,
      title: newGoalTitle.trim(),
      category: newGoalCategory,
      targetMinutes: Number(newGoalTargetMin) || 30,
      completedMinutes: 0,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    if (onUpdateDailyGoals) {
      onUpdateDailyGoals((prev) => [...prev, itemToSave]);
    }

    await StudentDataService.saveDailyGoal(itemToSave);
    setNewGoalTitle('');
  };

  const handleToggleGoal = async (goal: DailyGoal) => {
    const nextState = !goal.isCompleted;
    if (nextState) {
      confetti({
        particleCount: 55,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#6366f1', '#f59e0b', '#ec4899'],
      });
    }

    const nextCompletedMinutes = nextState ? goal.targetMinutes : 0;

    // Instant optimistic update for parent
    if (onUpdateDailyGoals) {
      onUpdateDailyGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id
            ? { ...g, isCompleted: nextState, completedMinutes: nextCompletedMinutes }
            : g
        )
      );
    }

    await StudentDataService.saveDailyGoal({
      ...goal,
      isCompleted: nextState,
      completedMinutes: nextCompletedMinutes,
    });
  };

  const handleDeleteGoal = async (id: string) => {
    if (onUpdateDailyGoals) {
      onUpdateDailyGoals((prev) => prev.filter((g) => g.id !== id));
    }
    await StudentDataService.deleteDailyGoal(id, user.uid);
  };

  // Rollover incomplete goals from past days to today
  const handleRolloverPastGoals = async () => {
    if (pastUncompletedGoals.length === 0) return;

    const rolledOver = pastUncompletedGoals.map((g) => ({
      ...g,
      date: todayStr,
    }));

    if (onUpdateDailyGoals) {
      onUpdateDailyGoals((prev) =>
        prev.map((g) => {
          const match = rolledOver.find((r) => r.id === g.id);
          return match ? match : g;
        })
      );
    }

    for (const g of rolledOver) {
      await StudentDataService.saveDailyGoal(g);
    }

    setSelectedDate(todayStr);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-6 h-6 text-amber-500" />
            <span>เป้าหมายรายวัน & โฟกัส (Daily Goals & Pomodoro)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            จัดตารางเป้าหมายของวันเพื่อเคลียร์งานอย่างมีทิศทาง ติ๊กถูกเพื่ออัปเดตความคืบหน้าแบบเรียลไทม์
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs focus:outline-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Past Incomplete Goals Notice Banner */}
      {selectedDate === todayStr && pastUncompletedGoals.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>มีเป้าหมายค้างจากวันก่อนหน้าที่ยังไม่ได้ทำ {pastUncompletedGoals.length} ข้อ</span>
          </div>
          <button
            type="button"
            onClick={handleRolloverPastGoals}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>ยกยอดมาทำวันนี้</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Pomodoro Focus Timer (1 col) */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-xl shadow-indigo-950/30 border border-indigo-800/40 relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Mode Selectors */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/10 backdrop-blur-md mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => switchTimerMode('study')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  timerMode === 'study' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                โฟกัส (25 น.)
              </button>
              <button
                type="button"
                onClick={() => switchTimerMode('shortBreak')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  timerMode === 'shortBreak' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                พักสั้น (5 น.)
              </button>
              <button
                type="button"
                onClick={() => switchTimerMode('longBreak')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  timerMode === 'longBreak' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                พักยาว (15 น.)
              </button>
            </div>

            {/* Active Task Tag */}
            <p className="text-xs text-indigo-300 truncate max-w-[220px] mb-2 font-medium">
              🎯 {activeTaskTitle}
            </p>

            {/* Big Timer Digits */}
            <div className="text-6xl sm:text-7xl font-mono font-black tracking-tight text-white my-4 drop-shadow-md">
              {formatTimer(timerSecondsLeft)}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 cursor-pointer ${
                  isTimerRunning
                    ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                    : 'bg-indigo-500 text-white hover:bg-indigo-400'
                }`}
              >
                {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                <span>{isTimerRunning ? 'หยุดชั่วคราว' : 'เริ่มจับเวลา'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  if (timerMode === 'study') setTimerSecondsLeft(25 * 60);
                  if (timerMode === 'shortBreak') setTimerSecondsLeft(5 * 60);
                  if (timerMode === 'longBreak') setTimerSecondsLeft(15 * 60);
                }}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="รีเซ็ตเวลา"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-6">
              เมื่อครบ 25 นาที ระบบจะเพิ่มเวลาสมาธิลงในเป้าหมายวันนี้อัตโนมัติ 💡
            </p>
          </div>

          {/* Quick Backlog Checklist for Focus */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>งานค้างด่วนที่ควรทำตอนนี้ ({overdueOrTodayHomework.length})</span>
            </h3>

            {overdueOrTodayHomework.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">ไม่มีงานค้างด่วนในวันนี้ เยี่ยมมาก!</p>
            ) : (
              <div className="space-y-2">
                {overdueOrTodayHomework.slice(0, 3).map((hw) => (
                  <div
                    key={hw.id}
                    className="p-2.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/50 flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{hw.title}</p>
                      <p className="text-[10px] text-rose-600 dark:text-rose-400">{hw.subject} • ส่ง {hw.dueDate}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTaskTitle(hw.title);
                        switchTimerMode('study');
                        setIsTimerRunning(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px] shrink-0 hover:bg-indigo-700 cursor-pointer"
                    >
                      เริ่มทำ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Daily Targets & Checklist (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Progress Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  {selectedDate === todayStr ? 'เป้าหมายวันนี้' : `เป้าหมายวันที่ ${selectedDate}`}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  (สำเร็จ {completedGoalsCount} จาก {dateGoals.length} ข้อ)
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>รายการสิ่งที่ตั้งใจจะทำให้เสร็จ</span>
                {progressPercent === 100 && dateGoals.length > 0 && (
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 animate-bounce">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>สำเร็จครบ 100%! 🎉</span>
                  </span>
                )}
              </h2>
            </div>

            {/* Progress Bar with smooth percentage indicator */}
            <div className="w-full sm:w-56 space-y-1.5">
              <div className="flex justify-between text-xs font-extrabold">
                <span className="text-slate-600 dark:text-slate-300">ความคืบหน้า</span>
                <span className={`${progressPercent > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-700/80 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 transition-all duration-500 ease-out shadow-xs"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Add Goal Input Form */}
          <form onSubmit={handleAddGoal} className="p-4 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              required
              placeholder="เพิ่มเป้าหมายของวัน เช่น ทำแบบฝึกหัด 10 ข้อ, อ่านชีววิทยา..."
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              className="flex-1 w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-indigo-500"
            />

            <select
              value={newGoalCategory}
              onChange={(e) => setNewGoalCategory(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="Homework">การบ้าน</option>
              <option value="Review">ทบทวนบทเรียน</option>
              <option value="Exam Prep">เตรียมสอบ</option>
              <option value="Project">โครงงาน</option>
              <option value="Other">อื่นๆ</option>
            </select>

            <div className="flex items-center gap-1">
              <input
                type="number"
                min="5"
                step="5"
                value={newGoalTargetMin}
                onChange={(e) => setNewGoalTargetMin(Number(e.target.value))}
                className="w-16 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-center"
              />
              <span className="text-xs text-slate-400">นาที</span>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มเป้าหมาย</span>
            </button>
          </form>

          {/* Goal Checklist Items */}
          {dateGoals.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center text-slate-400 space-y-2">
              <p className="text-2xl">🎯</p>
              <p className="text-xs font-medium">ยังไม่มีเป้าหมายสำหรับวันที่เลือก เขียนรายการเป้าหมายเพื่อเริ่มจัดการงานได้เลย</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dateGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                    goal.isCompleted
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    {/* Checkbox button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleGoal(goal);
                      }}
                      aria-label={goal.isCompleted ? 'ยกเลิกการติ๊กเสร็จ' : 'ติ๊กถูกเป้าหมายนี้'}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer transform active:scale-90 shrink-0 ${
                        goal.isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                          : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-transparent hover:text-emerald-500/40 bg-slate-50 dark:bg-slate-900'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    </button>

                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleToggleGoal(goal)}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {goal.category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {goal.completedMinutes} / {goal.targetMinutes} นาที
                        </span>
                      </div>
                      <p
                        className={`text-xs sm:text-sm font-bold mt-0.5 truncate ${
                          goal.isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {goal.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!goal.isCompleted && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTaskTitle(goal.title);
                          switchTimerMode('study');
                          setIsTimerRunning(true);
                        }}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="เริ่มจับเวลา 25 นาทีสำหรับเป้าหมายนี้"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden sm:inline">จับเวลา</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="ลบเป้าหมาย"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
