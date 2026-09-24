import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Moon, 
  Sun, 
  Bell, 
  BellRing, 
  Wifi, 
  WifiOff, 
  Sparkles, 
  LogOut, 
  LogIn, 
  GraduationCap,
  CheckCheck,
  Trash2,
  Volume2,
  AlertTriangle,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { InAppNotification, TabType, UserProfile } from '../types';
import { NotificationService } from '../lib/notifications';

interface NavbarProps {
  user: UserProfile;
  isDark: boolean;
  toggleDark: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  pendingHomeworkCount: number;
  onNavigateTab?: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  isDark,
  toggleDark,
  onOpenAuth,
  onLogout,
  pendingHomeworkCount,
  onNavigateTab,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [browserPushEnabled, setBrowserPushEnabled] = useState(false);

  const notifMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Subscribe to in-app notifications
  useEffect(() => {
    setBrowserPushEnabled(NotificationService.isPermissionGranted());
    const unsub = NotificationService.subscribe((list) => {
      setNotifications(list);
    });
    return unsub;
  }, []);

  // Clock and online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotificationMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleTestNotification = () => {
    NotificationService.sendPushNotification(
      '🔔 ทดสอบระบบแจ้งเตือน (StudentHub)',
      pendingHomeworkCount > 0
        ? `คุณมีงานค้างส่งทั้งหมด ${pendingHomeworkCount} งาน อย่าลืมเคลียร์ก่อนเวลานะครับ!`
        : 'ระบบแจ้งเตือนและเสียงเตือนทำงานปกติพร้อมใช้งาน 🎉',
      {
        type: pendingHomeworkCount > 0 ? 'urgent' : 'success',
        linkTab: 'homework',
      }
    );
  };

  const handleRequestBrowserPush = async () => {
    const granted = await NotificationService.requestPermission();
    setBrowserPushEnabled(granted);
    if (granted) {
      NotificationService.sendPushNotification(
        '✅ เปิดการแจ้งเตือนบนเบราว์เซอร์สำเร็จ',
        'StudentHub จะส่งการแจ้งเตือนไปยังหน้าจอของคุณเมื่อมีงานเร่งด่วน',
        { type: 'success' }
      );
    } else {
      NotificationService.sendPushNotification(
        'ℹ️ แจ้งเตือนในแอป (In-App) พร้อมใช้งาน',
        'ระบบจะแจ้งเตือนผ่านเสียง Chime และแถบข้อความ Toast ด้านบนหน้าจอเสมอ',
        { type: 'info' }
      );
    }
  };

  const formatNotifTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md border-b transition-colors duration-200 bg-white/90 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Tag */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer select-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 transform hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                StudentHub
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                Firestore student03
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              ระบบจัดตารางเรียน & การบ้านอัจฉริยะ
            </p>
          </div>
        </div>

        {/* Center: Live Clock & Network */}
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{dateStr}</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{timeStr}</span>
          </div>

          <div 
            title={isOnline ? 'เชื่อมต่อ Firestore แบบเรียลไทม์' : 'โหมดออฟไลน์: ข้อมูลจะถูกบันทึกในเครื่อง'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              isOnline 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Notification Menu Toggle */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => {
                setShowNotificationMenu(!showNotificationMenu);
                setShowUserMenu(false);
              }}
              aria-label="เปิดศูนย์การแจ้งเตือน"
              title="ศูนย์การแจ้งเตือน (Notifications)"
              className={`p-2 rounded-xl border transition-all duration-150 relative cursor-pointer ${
                showNotificationMenu
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-300'
                  : unreadCount > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {unreadCount > 0 ? <BellRing className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <Bell className="w-4 h-4" />}
              
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotificationMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">
                        ศูนย์การแจ้งเตือน
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {unreadCount > 0 ? `ยังไม่อ่าน ${unreadCount} รายการ` : 'อ่านครบทั้งหมดแล้ว'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {notifications.length > 0 && (
                      <>
                        <button
                          onClick={() => NotificationService.markAllAsRead()}
                          title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => NotificationService.clearAll()}
                          title="ล้างการแจ้งเตือนทั้งหมด"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Notification Settings & Test Bar */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={handleTestNotification}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>ทดสอบแจ้งเตือน & เสียง</span>
                  </button>

                  <button
                    onClick={handleRequestBrowserPush}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                      browserPushEnabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {browserPushEnabled ? '✓ เปิดแจ้งเตือนแล้ว' : 'ขอสิทธิ์เบราว์เซอร์'}
                  </button>
                </div>

                {/* Notifications List */}
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-1">
                      <Bell className="w-8 h-8 mx-auto opacity-30" />
                      <p className="text-xs font-semibold">ไม่มีการแจ้งเตือนใหม่</p>
                      <p className="text-[11px]">คุณจัดการตารางเรียนและการบ้านได้เรียบร้อยดีมาก</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isUrgent = n.type === 'urgent';
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            NotificationService.markAsRead(n.id);
                            if (n.linkTab && onNavigateTab) {
                              onNavigateTab(n.linkTab);
                              setShowNotificationMenu(false);
                            }
                          }}
                          className={`p-3 rounded-2xl border transition-all text-xs cursor-pointer ${
                            !n.read
                              ? isUrgent
                                ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                                : 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60'
                              : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 opacity-80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                              {isUrgent ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              ) : n.type === 'success' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              )}
                              <span className="truncate">{n.title}</span>
                            </div>

                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {formatNotifTime(n.timestamp)}
                            </span>
                          </div>

                          <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                            {n.body}
                          </p>

                          {n.linkTab && (
                            <p className="mt-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                              👉 คลิกเพื่อดูรายละเอียดในหน้า{n.linkTab === 'homework' ? 'การบ้าน' : n.linkTab}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle Button */}
          <button
            onClick={toggleDark}
            aria-label={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
            title={isDark ? 'สลับเป็นโหมดสว่าง (Light Mode)' : 'สลับเป็นโหมดมืด (Dark Mode)'}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all duration-150 cursor-pointer group flex items-center justify-center shadow-xs"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 transform group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 transform group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* User Profile Pill */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotificationMenu(false);
              }}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all bg-white dark:bg-slate-800/80 shadow-xs cursor-pointer"
            >
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className="w-7 h-7 rounded-full object-cover border border-indigo-200" 
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center">
                  {user.displayName ? user.displayName[0] : 'S'}
                </div>
              )}
              <div className="text-left hidden sm:block max-w-[110px]">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user.displayName}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize leading-none">
                  {user.provider === 'guest' ? 'บัญชีทดลอง' : user.provider}
                </p>
              </div>
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700/60">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.displayName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email || 'student@school.ac.th'}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    {user.grade || 'มัธยมศึกษาตอนปลาย'} • {user.school || 'โรงเรียนตัวอย่าง'}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenAuth();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-indigo-500" />
                    <span>เข้าสู่ระบบด้วย Gmail / LINE / FB</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ออกจากระบบ / สลับโปรไฟล์</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
