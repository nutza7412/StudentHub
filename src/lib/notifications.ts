import { HomeworkItem, InAppNotification, TabType } from '../types';

type NotificationListener = (notifications: InAppNotification[]) => void;
type ToastListener = (notification: InAppNotification) => void;

const STORAGE_KEY = 'studenthub_in_app_notifications';

export class NotificationService {
  private static notificationListeners: Set<NotificationListener> = new Set();
  private static toastListeners: Set<ToastListener> = new Set();
  private static audioCtx: AudioContext | null = null;

  // Web Audio API chime sound generator (works in any browser, zero external assets)
  static playChime(type: 'urgent' | 'warning' | 'info' | 'success' = 'info') {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'suspended') {
        this.audioCtx = new AudioCtxClass();
      }

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      if (type === 'urgent') {
        osc1.frequency.setValueAtTime(880, now); // A5
        osc2.frequency.setValueAtTime(740, now); 
        osc1.frequency.exponentialRampToValueAtTime(520, now + 0.35);
      } else if (type === 'success') {
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc1.frequency.setValueAtTime(783.99, now + 0.2); // G5
      } else {
        osc1.frequency.setValueAtTime(659.25, now); // E5
        osc2.frequency.setValueAtTime(880, now + 0.12); // A5
      }

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now + 0.1);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch (e) {
      console.debug('Audio chime unable to play in current context', e);
    }
  }

  static getNotifications(): InAppNotification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to load notifications from localStorage', e);
    }
    return [
      {
        id: 'init_welcome',
        title: '🎉 ยินดีต้อนรับสู่ StudentHub!',
        body: 'ระบบจัดตารางเรียนและการบ้านอัจฉริยะ พร้อมผู้ช่วย AI เชื่อมต่อ Firestore student03',
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false,
        linkTab: 'dashboard',
      },
    ];
  }

  static saveNotifications(notifications: InAppNotification[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      this.notificationListeners.forEach((fn) => fn(notifications));
    } catch (e) {
      console.warn('Failed to save notifications', e);
    }
  }

  static subscribe(fn: NotificationListener) {
    this.notificationListeners.add(fn);
    fn(this.getNotifications());
    return () => {
      this.notificationListeners.delete(fn);
    };
  }

  static onToast(fn: ToastListener) {
    this.toastListeners.add(fn);
    return () => {
      this.toastListeners.delete(fn);
    };
  }

  static async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch (err) {
      console.warn('Notification permission request not permitted (e.g. cross-origin iframe):', err);
      return false;
    }
  }

  static isPermissionGranted(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      return Notification.permission === 'granted';
    } catch {
      return false;
    }
  }

  static addNotification(item: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) {
    const list = this.getNotifications();
    const newNotif: InAppNotification = {
      ...item,
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updated = [newNotif, ...list].slice(0, 30);
    this.saveNotifications(updated);

    // Trigger toast listener & sound
    this.toastListeners.forEach((fn) => fn(newNotif));
    this.playChime(newNotif.type);

    return newNotif;
  }

  static markAsRead(id: string) {
    const list = this.getNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.saveNotifications(updated);
  }

  static markAllAsRead() {
    const list = this.getNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    this.saveNotifications(updated);
  }

  static clearAll() {
    this.saveNotifications([]);
  }

  static sendPushNotification(
    title: string,
    body: string,
    options?: {
      type?: 'urgent' | 'warning' | 'info' | 'success';
      linkTab?: TabType;
      playSound?: boolean;
    }
  ) {
    const type = options?.type || 'info';

    // 1. Always record in-app notification & show toast + chime
    this.addNotification({
      title,
      body,
      type,
      linkTab: options?.linkTab,
    });

    // 2. Try desktop browser notification if permitted
    if (this.isPermissionGranted()) {
      try {
        new Notification(title, {
          body,
          icon: 'https://api.iconify.design/fluent-emoji:books.svg',
          badge: 'https://api.iconify.design/fluent-emoji:bell.svg',
          tag: 'student-dashboard-alert',
        });
      } catch (err) {
        console.debug('Browser native notification skipped:', err);
      }
    }
  }

  static checkAndAlertPendingHomework(homeworkList: HomeworkItem[]) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const urgentItems = homeworkList.filter((item) => {
      if (item.status === 'completed') return false;
      if (item.dueDate <= todayStr) return true;
      return false;
    });

    if (urgentItems.length > 0) {
      const overdueCount = urgentItems.filter((i) => i.dueDate < todayStr).length;
      const todayCount = urgentItems.filter((i) => i.dueDate === todayStr).length;

      let msg = '';
      if (overdueCount > 0) {
        msg += `มีงานเลยกำหนดส่ง ${overdueCount} รายการ! `;
      }
      if (todayCount > 0) {
        msg += `ต้องส่งวันนี้ ${todayCount} รายการ: "${urgentItems[0]?.title}"`;
      }

      // Check if we already sent a recent notification for this today
      const list = this.getNotifications();
      const alreadyNotified = list.some(
        (n) =>
          n.title.includes('แจ้งเตือนการบ้าน') &&
          n.timestamp.startsWith(todayStr) &&
          Date.now() - new Date(n.timestamp).getTime() < 3600000 // within 1 hour
      );

      if (!alreadyNotified) {
        this.sendPushNotification('🚨 แจ้งเตือนการบ้านค้างส่ง (StudentHub)', msg, {
          type: 'urgent',
          linkTab: 'homework',
        });
      }
    }
  }
}
