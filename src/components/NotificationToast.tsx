import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  X, 
  ArrowRight 
} from 'lucide-react';
import { InAppNotification, TabType } from '../types';
import { NotificationService } from '../lib/notifications';

interface NotificationToastProps {
  onNavigateTab?: (tab: TabType) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ onNavigateTab }) => {
  const [activeToast, setActiveToast] = useState<InAppNotification | null>(null);

  useEffect(() => {
    const unsub = NotificationService.onToast((notif) => {
      setActiveToast(notif);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [activeToast]);

  if (!activeToast) return null;

  const getIcon = () => {
    switch (activeToast.type) {
      case 'urgent':
        return <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-indigo-500 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (activeToast.type) {
      case 'urgent':
        return 'border-rose-500/50 bg-rose-50/95 dark:bg-slate-900/95 shadow-rose-500/10';
      case 'warning':
        return 'border-amber-500/50 bg-amber-50/95 dark:bg-slate-900/95 shadow-amber-500/10';
      case 'success':
        return 'border-emerald-500/50 bg-emerald-50/95 dark:bg-slate-900/95 shadow-emerald-500/10';
      default:
        return 'border-indigo-500/50 bg-white/95 dark:bg-slate-900/95 shadow-indigo-500/10';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] animate-in slide-in-from-top-3 fade-in duration-200">
      <div className={`p-4 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 ${getBorderColor()}`}>
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {activeToast.title}
            </h4>
            <span className="text-[10px] text-slate-400 font-mono shrink-0">
              เมื่อสักครู่
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-2">
            {activeToast.body}
          </p>

          {activeToast.linkTab && onNavigateTab && (
            <button
              onClick={() => {
                onNavigateTab(activeToast.linkTab!);
                setActiveToast(null);
              }}
              className="mt-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>ไปที่หน้านี้</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          onClick={() => setActiveToast(null)}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
