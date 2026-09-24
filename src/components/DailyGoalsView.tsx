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
  Coffee
} from 'lucide-react';
import { DailyGoal, HomeworkItem, UserProfile } from '../types';
import { getTodayString, StudentDataService } from '../lib/storage';

interface DailyGoalsViewProps {
  user: UserProfile;
  dailyGoals: DailyGoal[];
  homework: HomeworkItem[];
  onSelectHomeworkForTimer?: (title: string) => void;
}

export const DailyGoalsView: React.FC<DailyGoalsViewProps> = ({
  user,
  dailyGoals,
  homework,
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
      // Play ding sound
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
      await StudentDataService.saveDailyGoal({
        ...firstIncomplete,
        completedMinutes: (firstIncomplete.completedMinutes || 0) + minutes,
        isCompleted: (firstIncomplete.completedMinutes || 0) + minutes >= firstIncomplete.targetMinutes,
      });
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

    await StudentDataService.saveDailyGoal(itemToSave);
    setNewGoalTitle('');
  };

  const handleToggleGoal = async (goal: DailyGoal) => {
    const nextState = !goal.isCompleted;
    if (nextState) {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      });
    }
    await StudentDataService.saveDailyGoal({
      ...goal,
      isCompleted: nextState,
      completedMinutes: nextState ? goal.targetMinutes : goal.completedMinutes,
    });
  };

  const handleDeleteGoal = async (id: string) => {
    await StudentDataService.deleteDailyGoal(id, user.uid);
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
            <span>เป้าหมายรายวัน & โฟกัส (Pomodoro)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            จัดตารางเป้าหมายของวันนั้นๆ เพื่อเคลียร์งานค้างได้อย่างมีประสิทธิภาพ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs focus:outline-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Pomodoro Focus Timer (1 col) */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-xl shadow-indigo-950/30 border border-indigo-800/40 relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Mode Selectors */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/10 backdrop-blur-md mb-6 text-xs font-bold">
              <button
                onClick={() => switchTimerMode('study')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timerMode === 'study' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                โฟกัส (25 นาที)
              </button>
              <button
                onClick={() => switchTimerMode('shortBreak')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timerMode === 'shortBreak' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                พักสั้น (5 น.)
              </button>
              <button
                onClick={() => switchTimerMode('longBreak')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
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
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 ${
                  isTimerRunning
                    ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                    : 'bg-indigo-500 text-white hover:bg-indigo-400'
                }`}
              >
                {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                <span>{isTimerRunning ? 'หยุดชั่วคราว' : 'เริ่มจับเวลา'}</span>
              </button>

              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  if (timerMode === 'study') setTimerSecondsLeft(25 * 60);
                  if (timerMode === 'shortBreak') setTimerSecondsLeft(5 * 60);
                  if (timerMode === 'longBreak') setTimerSecondsLeft(15 * 60);
                }}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
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
                      onClick={() => {
                        setActiveTaskTitle(hw.title);
                        switchTimerMode('study');
                        setIsTimerRunning(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px] shrink-0 hover:bg-indigo-700"
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
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  {selectedDate === todayStr ? 'เป้าหมายวันนี้' : `เป้าหมายวันที่ ${selectedDate}`}
                </span>
                <span className="text-xs text-slate-400">
                  (สำเร็จ {completedGoalsCount} จาก {dateGoals.length} ข้อ)
                </span>
              </div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                รายการสิ่งที่ตั้งใจจะทำให้เสร็จ
              </h2>
            </div>

            {/* Progress Bar */}
            <div className="w-full sm:w-48 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>ความคืบหน้า</span>
                <span>
                  {dateGoals.length > 0 ? Math.round((completedGoalsCount / dateGoals.length) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                  style={{
                    width: `${dateGoals.length > 0 ? (completedGoalsCount / dateGoals.length) * 100 : 0}%`,
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
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300"
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
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่ม</span>
            </button>
          </form>

          {/* Goal Checklist Items */}
          {dateGoals.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center text-slate-400 space-y-2">
              <p className="text-xl">🎯</p>
              <p className="text-xs">ยังไม่มีเป้าหมายสำหรับวันนี้ เขียนรายการเป้าหมายเพื่อเริ่มจัดการงานได้เลย</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dateGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                    goal.isCompleted
                      ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-70'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/90 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <button
                      onClick={() => handleToggleGoal(goal)}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        goal.isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 hover:border-amber-500 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
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
                        onClick={() => {
                          setActiveTaskTitle(goal.title);
                          switchTimerMode('study');
                          setIsTimerRunning(true);
                        }}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold flex items-center gap-1"
                        title="เริ่มจับเวลา 25 นาทีสำหรับเป้าหมายนี้"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden sm:inline">จับเวลา</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
