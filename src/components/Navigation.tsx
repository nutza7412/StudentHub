import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  CheckSquare, 
  Target, 
  Sparkles, 
  BookOpenCheck, 
  TrendingUp,
  Clock
} from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingHomeworkCount: number;
}

export const navItems: { id: TabType; label: string; icon: any; badge?: boolean; color: string }[] = [
  { id: 'dashboard', label: 'แดชบอร์ดหลัก', icon: LayoutDashboard, color: 'text-indigo-500' },
  { id: 'timetable', label: 'ตารางเรียน', icon: CalendarDays, color: 'text-sky-500' },
  { id: 'homework', label: 'การบ้าน & งานค้าง', icon: CheckSquare, badge: true, color: 'text-rose-500' },
  { id: 'goals', label: 'เป้าหมาย & Focus', icon: Target, color: 'text-amber-500' },
  { id: 'ai-planner', label: 'AI จัดเวลาส่งงาน', icon: Sparkles, color: 'text-purple-500' },
  { id: 'ai-quiz', label: 'สรุปบทเรียน & ข้อสอบ', icon: BookOpenCheck, color: 'text-emerald-500' },
  { id: 'analytics', label: 'วิเคราะห์จุดอ่อน', icon: TrendingUp, color: 'text-blue-500' },
];

export const Sidebar: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  pendingHomeworkCount,
}) => {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 p-4 space-y-6">
      {/* Student Greeting card */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/50 dark:border-indigo-800/40 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">✨</span>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Student Space
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          เรียนรู้อย่างมีความสุข
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          จัดการงานค้างตรงเวลาทุกวัน
        </p>
      </div>

      {/* Nav List */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && pendingHomeworkCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white text-indigo-700'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                  }`}
                >
                  {pendingHomeworkCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mini Motivational Note */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-bold">เคล็ดลับวันนี้</p>
          <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
            แบ่งทำการบ้าน 25 นาที แล้วพัก 5 นาที ช่วยให้สมองจำแม่นขึ้น 2 เท่า!
          </p>
        </div>
      </div>
    </aside>
  );
};

export const MobileNav: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  pendingHomeworkCount,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around shadow-2xl safe-bottom">
      {navItems.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all relative min-w-[56px] ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 truncate max-w-[62px]">
              {item.label.split(' ')[0]}
            </span>
            {item.badge && pendingHomeworkCount > 0 && (
              <span className="absolute top-0 right-2 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {pendingHomeworkCount}
              </span>
            )}
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-0.5" />
            )}
          </button>
        );
      })}

      {/* Extra menu popover trigger for remaining items */}
      <button
        onClick={() => {
          if (activeTab === 'ai-quiz') {
            setActiveTab('analytics');
          } else {
            setActiveTab('ai-quiz');
          }
        }}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all relative min-w-[56px] ${
          activeTab === 'ai-quiz' || activeTab === 'analytics'
            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
        }`}
      >
        <BookOpenCheck className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">
          {activeTab === 'analytics' ? 'วิเคราะห์' : 'ทบทวน'}
        </span>
      </button>
    </div>
  );
};
