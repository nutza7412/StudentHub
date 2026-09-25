import { collection, doc, getDocs, setDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { DailyGoal, HomeworkItem, QuizResult, StudySummary, TimetableItem } from '../types';

const STORAGE_KEYS = {
  PROFILE: 'studenthub_profile',
  TIMETABLE: 'studenthub_timetable',
  HOMEWORK: 'studenthub_homework',
  GOALS: 'studenthub_goals',
  SUMMARIES: 'studenthub_summaries',
  QUIZ_RESULTS: 'studenthub_quiz_results',
  OFFLINE_QUEUE: 'studenthub_offline_queue',
};

// Date utilities using local time (avoids UTC timezone shift issues)
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRelativeDayString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initial starter data for students
export const INITIAL_TIMETABLE: Omit<TimetableItem, 'id' | 'userId' | 'createdAt'>[] = [
  // Monday
  { dayOfWeek: 'Monday', subject: 'คณิตศาสตร์เพิ่มเติม', subjectCode: 'ค31201', startTime: '08:30', endTime: '09:20', room: 'ห้อง 421', teacher: 'ครูสมศรี', color: 'amber', notes: 'นำสมุดกราฟมาด้วย' },
  { dayOfWeek: 'Monday', subject: 'ฟิสิกส์ 1', subjectCode: 'ว30201', startTime: '09:30', endTime: '10:20', room: 'แล็บฟิสิกส์ 2', teacher: 'อ.วิชัย', color: 'sky', notes: 'มีทดลองเรื่องการเคลื่อนที่' },
  { dayOfWeek: 'Monday', subject: 'ภาษาอังกฤษเพื่อการสื่อสาร', subjectCode: 'อ31101', startTime: '10:30', endTime: '11:20', room: 'ห้อง 214', teacher: 'Teacher John', color: 'rose', notes: 'เตรียมบทพูด Presentation' },
  { dayOfWeek: 'Monday', subject: 'ภาษาไทย', subjectCode: 'ท31101', startTime: '13:00', endTime: '13:50', room: 'ห้อง 312', teacher: 'ครูวรรณา', color: 'emerald', notes: 'อ่านวรรณคดีบทที่ 3' },
  { dayOfWeek: 'Monday', subject: 'วิทยาการคำนวณ', subjectCode: 'ว30118', startTime: '14:00', endTime: '14:50', room: 'ห้องคอม 3', teacher: 'ครูเกรียงศักดิ์', color: 'indigo', notes: 'ส่งโค้ดโปรเจกต์ Python' },

  // Tuesday
  { dayOfWeek: 'Tuesday', subject: 'เคมีพื้นฐาน', subjectCode: 'ว30221', startTime: '08:30', endTime: '09:20', room: 'แล็บเคมี 1', teacher: 'ดร.อรทัย', color: 'purple', notes: 'ใส่เสื้อกาวน์เข้าแล็บ' },
  { dayOfWeek: 'Tuesday', subject: 'เคมีพื้นฐาน (ปฏิบัติการ)', subjectCode: 'ว30221', startTime: '09:30', endTime: '10:20', room: 'แล็บเคมี 1', teacher: 'ดร.อรทัย', color: 'purple' },
  { dayOfWeek: 'Tuesday', subject: 'สังคมศึกษาและประวัติศาสตร์', subjectCode: 'ส31101', startTime: '10:30', endTime: '11:20', room: 'ห้อง 501', teacher: 'ครูประภาส', color: 'amber' },
  { dayOfWeek: 'Tuesday', subject: 'คณิตศาสตร์พื้นฐาน', subjectCode: 'ค31101', startTime: '13:00', endTime: '13:50', room: 'ห้อง 423', teacher: 'ครูมานพ', color: 'blue' },

  // Wednesday
  { dayOfWeek: 'Wednesday', subject: 'ชีววิทยา 1', subjectCode: 'ว30241', startTime: '08:30', endTime: '10:20', room: 'แล็บชีววิทยา', teacher: 'ครูรัตนา', color: 'teal', notes: 'ส่องกล้องจุลทรรศน์เซลล์พืช' },
  { dayOfWeek: 'Wednesday', subject: 'ภาษาอังกฤษรอบรู้', subjectCode: 'อ31201', startTime: '10:30', endTime: '11:20', room: 'ห้อง 215', teacher: 'Teacher Sarah', color: 'rose' },
  { dayOfWeek: 'Wednesday', subject: 'แนะแนวและพัฒนาตนเอง', subjectCode: 'ก31901', startTime: '13:00', endTime: '13:50', room: 'หอประชุม 2', teacher: 'ครูที่ปรึกษา', color: 'indigo' },

  // Thursday
  { dayOfWeek: 'Thursday', subject: 'คณิตศาสตร์เพิ่มเติม', subjectCode: 'ค31201', startTime: '08:30', endTime: '09:20', room: 'ห้อง 421', teacher: 'ครูสมศรี', color: 'amber' },
  { dayOfWeek: 'Thursday', subject: 'ฟิสิกส์ 1 (โจทย์ประยุกต์)', subjectCode: 'ว30201', startTime: '09:30', endTime: '10:20', room: 'ห้อง 415', teacher: 'อ.วิชัย', color: 'sky' },
  { dayOfWeek: 'Thursday', subject: 'สุขศึกษาและพลศึกษา', subjectCode: 'พ31101', startTime: '10:30', endTime: '11:20', room: 'โรงยิม 1', teacher: 'ครูคมสันต์', color: 'emerald' },
  { dayOfWeek: 'Thursday', subject: 'ศิลปะและการออกแบบ', subjectCode: 'ศ31101', startTime: '13:00', endTime: '14:50', room: 'ห้องศิลปะ', teacher: 'ครูประดิษฐ์', color: 'orange' },

  // Friday
  { dayOfWeek: 'Friday', subject: 'โครงงานวิทยาศาสตร์', subjectCode: 'ว30291', startTime: '08:30', endTime: '10:20', room: 'ศูนย์การเรียนรู้', teacher: 'ดร.อรทัย', color: 'teal', notes: 'นำเสนอความก้าวหน้าโครงงาน' },
  { dayOfWeek: 'Friday', subject: 'ภาษาไทยเชิงวิเคราะห์', subjectCode: 'ท31101', startTime: '10:30', endTime: '11:20', room: 'ห้อง 312', teacher: 'ครูวรรณา', color: 'emerald' },
  { dayOfWeek: 'Friday', subject: 'กิจกรรมชุมนุม Coding & AI', subjectCode: 'ก31902', startTime: '13:00', endTime: '14:50', room: 'ห้องคอม 1', teacher: 'ครูเกรียงศักดิ์', color: 'indigo' },
];

export const INITIAL_HOMEWORK: Omit<HomeworkItem, 'id' | 'userId' | 'createdAt'>[] = [
  {
    title: 'แก้โจทย์ฟังก์ชันตรีโกณมิติ ข้อ 1-15',
    subject: 'คณิตศาสตร์เพิ่มเติม',
    description: 'ทำลงในสมุดแบบฝึกหัด หน้า 45-48 พร้อมแสดงวิธีทำอย่างละเอียด',
    dueDate: getTodayString(),
    dueTime: '23:59',
    priority: 'urgent',
    status: 'in_progress',
    estimatedMinutes: 60,
    aiScheduledSlot: 'วันนี้ 19:30 - 20:30 น. (ช่วงหัวค่ำสมาธิดี)',
  },
  {
    title: 'ส่งสรุปผลการทดลองการเคลื่อนที่แนวตรง (Lab Report)',
    subject: 'ฟิสิกส์ 1',
    description: 'เขียนรายงานการทดลอง ใส่ตารางบันทึกค่า กราฟ s-t และสรุปความสัมพันธ์',
    dueDate: getTomorrowString(),
    dueTime: '08:30',
    priority: 'high',
    status: 'pending',
    estimatedMinutes: 45,
    aiScheduledSlot: 'วันนี้ 20:45 - 21:30 น.',
  },
  {
    title: 'อัดคลิปวิดีโอแนะนำตนเองเป็นภาษาอังกฤษ 2 นาที',
    subject: 'ภาษาอังกฤษเพื่อการสื่อสาร',
    description: 'อัดคลิปแนวนอน พูดถึงเป้าหมายการเรียนในอนาคต ส่งผ่าน Google Classroom',
    dueDate: getRelativeDayString(3),
    dueTime: '17:00',
    priority: 'medium',
    status: 'pending',
    estimatedMinutes: 40,
    aiScheduledSlot: 'วันพรุ่งนี้ 17:00 - 17:40 น.',
  },
  {
    title: 'ทำสไลด์นำเสนอโครงงานวิทยาศาสตร์ บทที่ 1-2',
    subject: 'โครงงานวิทยาศาสตร์',
    description: 'สไลด์ 8-10 หน้า รวมที่มาและความสำคัญ วัตถุประสงค์ และขอบเขตการศึกษา',
    dueDate: getRelativeDayString(5),
    dueTime: '12:00',
    priority: 'high',
    status: 'pending',
    estimatedMinutes: 90,
  },
];

export const INITIAL_DAILY_GOALS: Omit<DailyGoal, 'id' | 'userId' | 'createdAt'>[] = [
  {
    date: getTodayString(),
    title: 'ทบทวนสูตรตรีโกณมิติและทำการบ้านเลข 15 ข้อ',
    isCompleted: false,
    targetMinutes: 60,
    completedMinutes: 35,
    category: 'Homework',
  },
  {
    date: getTodayString(),
    title: 'เขียน Lab Report วิชาฟิสิกส์ให้เสร็จส่งพรุ่งนี้',
    isCompleted: false,
    targetMinutes: 45,
    completedMinutes: 0,
    category: 'Homework',
  },
  {
    date: getTodayString(),
    title: 'ท่องคำศัพท์ภาษาอังกฤษ 20 คำ (หมวด Science & Tech)',
    isCompleted: true,
    targetMinutes: 20,
    completedMinutes: 20,
    category: 'Review',
  },
  {
    date: getTodayString(),
    title: 'ทำข้อสอบจำลองเคมี 1 ชุด (AI Quiz)',
    isCompleted: false,
    targetMinutes: 30,
    completedMinutes: 10,
    category: 'Exam Prep',
  },
];

// Offline & Local Storage Utilities
export const LocalStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage quota exceeded or unavailable', e);
    }
  },
};

// Reactive pub-sub store: guarantees that state changes (e.g. checkbox toggles)
// instantly notify all mounted components and triggers reactive re-renders
type Listener<T> = (items: T[]) => void;

class ReactiveStore {
  private static goalsListeners = new Set<Listener<DailyGoal>>();
  private static homeworkListeners = new Set<Listener<HomeworkItem>>();
  private static timetableListeners = new Set<Listener<TimetableItem>>();
  private static quizListeners = new Set<Listener<QuizResult>>();
  private static summaryListeners = new Set<Listener<StudySummary>>();

  static subscribeGoals(cb: Listener<DailyGoal>) {
    this.goalsListeners.add(cb);
    return () => {
      this.goalsListeners.delete(cb);
    };
  }
  static notifyGoals(items: DailyGoal[]) {
    this.goalsListeners.forEach((cb) => {
      try { cb(items); } catch (e) { console.error('Goals listener error:', e); }
    });
  }

  static subscribeHomework(cb: Listener<HomeworkItem>) {
    this.homeworkListeners.add(cb);
    return () => {
      this.homeworkListeners.delete(cb);
    };
  }
  static notifyHomework(items: HomeworkItem[]) {
    this.homeworkListeners.forEach((cb) => {
      try { cb(items); } catch (e) { console.error('Homework listener error:', e); }
    });
  }

  static subscribeTimetable(cb: Listener<TimetableItem>) {
    this.timetableListeners.add(cb);
    return () => {
      this.timetableListeners.delete(cb);
    };
  }
  static notifyTimetable(items: TimetableItem[]) {
    this.timetableListeners.forEach((cb) => {
      try { cb(items); } catch (e) { console.error('Timetable listener error:', e); }
    });
  }

  static subscribeQuiz(cb: Listener<QuizResult>) {
    this.quizListeners.add(cb);
    return () => {
      this.quizListeners.delete(cb);
    };
  }
  static notifyQuiz(items: QuizResult[]) {
    this.quizListeners.forEach((cb) => {
      try { cb(items); } catch (e) { console.error('Quiz listener error:', e); }
    });
  }

  static subscribeSummaries(cb: Listener<StudySummary>) {
    this.summaryListeners.add(cb);
    return () => {
      this.summaryListeners.delete(cb);
    };
  }
  static notifySummaries(items: StudySummary[]) {
    this.summaryListeners.forEach((cb) => {
      try { cb(items); } catch (e) { console.error('Summaries listener error:', e); }
    });
  }
}

// Firestore Sync & Mutation Service
export class StudentDataService {
  /**
   * Initialize default student data if none exists
   */
  static async seedDefaultDataIfEmpty(userId: string) {
    try {
      const timetableRef = collection(db, 'timetable');
      const q = query(timetableRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Seed timetable
        for (const item of INITIAL_TIMETABLE) {
          const id = 'tt_' + Math.random().toString(36).substring(2, 9);
          const fullItem: TimetableItem = {
            ...item,
            id,
            userId,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'timetable', id), fullItem);
        }

        // Seed homework
        for (const item of INITIAL_HOMEWORK) {
          const id = 'hw_' + Math.random().toString(36).substring(2, 9);
          const fullItem: HomeworkItem = {
            ...item,
            id,
            userId,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'homework', id), fullItem);
        }

        // Seed goals
        for (const item of INITIAL_DAILY_GOALS) {
          const id = 'goal_' + Math.random().toString(36).substring(2, 9);
          const fullItem: DailyGoal = {
            ...item,
            id,
            userId,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'dailyGoals', id), fullItem);
        }
      }
    } catch (error) {
      console.warn('Firestore seeding skipped or offline:', error);
    }
  }

  // ================= TIMETABLE =================
  static subscribeTimetable(userId: string, onUpdate: (items: TimetableItem[]) => void) {
    const cached = LocalStorage.get<TimetableItem[]>(STORAGE_KEYS.TIMETABLE, []);
    onUpdate(cached);

    const unsubReactive = ReactiveStore.subscribeTimetable(onUpdate);

    let unsubFirestore = () => {};
    if (userId && !userId.startsWith('guest_')) {
      try {
        const path = 'timetable';
        const q = query(collection(db, path), where('userId', '==', userId));
        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            const items: TimetableItem[] = [];
            snapshot.forEach((docSnap) => items.push(docSnap.data() as TimetableItem));
            if (items.length > 0) {
              LocalStorage.set(STORAGE_KEYS.TIMETABLE, items);
              onUpdate(items);
            }
          },
          (error) => {
            console.warn('Timetable snapshot warning:', error);
          }
        );
      } catch (err) {
        console.warn('Timetable query init warning:', err);
      }
    }

    return () => {
      unsubReactive();
      unsubFirestore();
    };
  }

  static async saveTimetableItem(item: TimetableItem) {
    const current = LocalStorage.get<TimetableItem[]>(STORAGE_KEYS.TIMETABLE, []);
    const existingIndex = current.findIndex((x) => x.id === item.id);
    const updated = existingIndex >= 0
      ? current.map((x) => (x.id === item.id ? item : x))
      : [...current, item];
    LocalStorage.set(STORAGE_KEYS.TIMETABLE, updated);
    ReactiveStore.notifyTimetable(updated);

    if (item.userId && !item.userId.startsWith('guest_')) {
      try {
        await setDoc(doc(db, 'timetable', item.id), item);
      } catch (error) {
        console.warn('Failed to sync timetable to Firestore:', error);
      }
    }
  }

  static async deleteTimetableItem(id: string, userId: string) {
    const current = LocalStorage.get<TimetableItem[]>(STORAGE_KEYS.TIMETABLE, []);
    const updated = current.filter((x) => x.id !== id);
    LocalStorage.set(STORAGE_KEYS.TIMETABLE, updated);
    ReactiveStore.notifyTimetable(updated);

    if (userId && !userId.startsWith('guest_')) {
      try {
        await deleteDoc(doc(db, 'timetable', id));
      } catch (error) {
        console.warn('Failed to delete timetable item from Firestore:', error);
      }
    }
  }

  // ================= HOMEWORK =================
  static subscribeHomework(userId: string, onUpdate: (items: HomeworkItem[]) => void) {
    const cached = LocalStorage.get<HomeworkItem[]>(STORAGE_KEYS.HOMEWORK, []);
    onUpdate(cached);

    const unsubReactive = ReactiveStore.subscribeHomework(onUpdate);

    let unsubFirestore = () => {};
    if (userId && !userId.startsWith('guest_')) {
      try {
        const path = 'homework';
        const q = query(collection(db, path), where('userId', '==', userId));
        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            const items: HomeworkItem[] = [];
            snapshot.forEach((docSnap) => items.push(docSnap.data() as HomeworkItem));
            if (items.length > 0) {
              LocalStorage.set(STORAGE_KEYS.HOMEWORK, items);
              onUpdate(items);
            }
          },
          (error) => {
            console.warn('Homework snapshot warning:', error);
          }
        );
      } catch (err) {
        console.warn('Homework query init warning:', err);
      }
    }

    return () => {
      unsubReactive();
      unsubFirestore();
    };
  }

  static async saveHomeworkItem(item: HomeworkItem) {
    const current = LocalStorage.get<HomeworkItem[]>(STORAGE_KEYS.HOMEWORK, []);
    const existingIndex = current.findIndex((x) => x.id === item.id);
    const updated = existingIndex >= 0
      ? current.map((x) => (x.id === item.id ? item : x))
      : [...current, item];
    LocalStorage.set(STORAGE_KEYS.HOMEWORK, updated);
    ReactiveStore.notifyHomework(updated);

    if (item.userId && !item.userId.startsWith('guest_')) {
      try {
        await setDoc(doc(db, 'homework', item.id), item);
      } catch (error) {
        console.warn('Failed to sync homework to Firestore:', error);
      }
    }
  }

  static async deleteHomeworkItem(id: string, userId: string) {
    const current = LocalStorage.get<HomeworkItem[]>(STORAGE_KEYS.HOMEWORK, []);
    const updated = current.filter((x) => x.id !== id);
    LocalStorage.set(STORAGE_KEYS.HOMEWORK, updated);
    ReactiveStore.notifyHomework(updated);

    if (userId && !userId.startsWith('guest_')) {
      try {
        await deleteDoc(doc(db, 'homework', id));
      } catch (error) {
        console.warn('Failed to delete homework item from Firestore:', error);
      }
    }
  }

  // ================= DAILY GOALS =================
  static subscribeDailyGoals(userId: string, onUpdate: (items: DailyGoal[]) => void) {
    const cached = LocalStorage.get<DailyGoal[]>(STORAGE_KEYS.GOALS, []);
    onUpdate(cached);

    const unsubReactive = ReactiveStore.subscribeGoals(onUpdate);

    let unsubFirestore = () => {};
    if (userId && !userId.startsWith('guest_')) {
      try {
        const path = 'dailyGoals';
        const q = query(collection(db, path), where('userId', '==', userId));
        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            const items: DailyGoal[] = [];
            snapshot.forEach((docSnap) => items.push(docSnap.data() as DailyGoal));
            if (items.length > 0) {
              LocalStorage.set(STORAGE_KEYS.GOALS, items);
              onUpdate(items);
            }
          },
          (error) => {
            console.warn('Daily goals snapshot warning:', error);
          }
        );
      } catch (err) {
        console.warn('Daily goals query init warning:', err);
      }
    }

    return () => {
      unsubReactive();
      unsubFirestore();
    };
  }

  static async saveDailyGoal(item: DailyGoal) {
    const current = LocalStorage.get<DailyGoal[]>(STORAGE_KEYS.GOALS, []);
    const existingIndex = current.findIndex((x) => x.id === item.id);
    const updated = existingIndex >= 0
      ? current.map((x) => (x.id === item.id ? item : x))
      : [...current, item];
    LocalStorage.set(STORAGE_KEYS.GOALS, updated);
    ReactiveStore.notifyGoals(updated);

    if (item.userId && !item.userId.startsWith('guest_')) {
      try {
        await setDoc(doc(db, 'dailyGoals', item.id), item);
      } catch (error) {
        console.warn('Failed to sync daily goal to Firestore:', error);
      }
    }
  }

  static async deleteDailyGoal(id: string, userId: string) {
    const current = LocalStorage.get<DailyGoal[]>(STORAGE_KEYS.GOALS, []);
    const updated = current.filter((x) => x.id !== id);
    LocalStorage.set(STORAGE_KEYS.GOALS, updated);
    ReactiveStore.notifyGoals(updated);

    if (userId && !userId.startsWith('guest_')) {
      try {
        await deleteDoc(doc(db, 'dailyGoals', id));
      } catch (error) {
        console.warn('Failed to delete daily goal from Firestore:', error);
      }
    }
  }

  // ================= QUIZ RESULTS =================
  static subscribeQuizResults(userId: string, onUpdate: (items: QuizResult[]) => void) {
    const cached = LocalStorage.get<QuizResult[]>(STORAGE_KEYS.QUIZ_RESULTS, []);
    onUpdate(cached);

    const unsubReactive = ReactiveStore.subscribeQuiz(onUpdate);

    let unsubFirestore = () => {};
    if (userId && !userId.startsWith('guest_')) {
      try {
        const path = 'quizResults';
        const q = query(collection(db, path), where('userId', '==', userId));
        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            const items: QuizResult[] = [];
            snapshot.forEach((docSnap) => items.push(docSnap.data() as QuizResult));
            if (items.length > 0) {
              LocalStorage.set(STORAGE_KEYS.QUIZ_RESULTS, items);
              onUpdate(items);
            }
          },
          (error) => {
            console.warn('Quiz results snapshot warning:', error);
          }
        );
      } catch (err) {
        console.warn('Quiz query init warning:', err);
      }
    }

    return () => {
      unsubReactive();
      unsubFirestore();
    };
  }

  static async saveQuizResult(item: QuizResult) {
    const current = LocalStorage.get<QuizResult[]>(STORAGE_KEYS.QUIZ_RESULTS, []);
    const updated = [item, ...current.filter((x) => x.id !== item.id)];
    LocalStorage.set(STORAGE_KEYS.QUIZ_RESULTS, updated);
    ReactiveStore.notifyQuiz(updated);

    if (item.userId && !item.userId.startsWith('guest_')) {
      try {
        await setDoc(doc(db, 'quizResults', item.id), item);
      } catch (error) {
        console.warn('Failed to sync quiz result to Firestore:', error);
      }
    }
  }

  // ================= STUDY SUMMARIES =================
  static subscribeStudySummaries(userId: string, onUpdate: (items: StudySummary[]) => void) {
    const cached = LocalStorage.get<StudySummary[]>(STORAGE_KEYS.SUMMARIES, []);
    onUpdate(cached);

    const unsubReactive = ReactiveStore.subscribeSummaries(onUpdate);

    let unsubFirestore = () => {};
    if (userId && !userId.startsWith('guest_')) {
      try {
        const path = 'studySummaries';
        const q = query(collection(db, path), where('userId', '==', userId));
        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            const items: StudySummary[] = [];
            snapshot.forEach((docSnap) => items.push(docSnap.data() as StudySummary));
            if (items.length > 0) {
              LocalStorage.set(STORAGE_KEYS.SUMMARIES, items);
              onUpdate(items);
            }
          },
          (error) => {
            console.warn('Study summaries snapshot warning:', error);
          }
        );
      } catch (err) {
        console.warn('Study summaries query init warning:', err);
      }
    }

    return () => {
      unsubReactive();
      unsubFirestore();
    };
  }

  static async saveStudySummary(item: StudySummary) {
    const current = LocalStorage.get<StudySummary[]>(STORAGE_KEYS.SUMMARIES, []);
    const updated = [item, ...current.filter((x) => x.id !== item.id)];
    LocalStorage.set(STORAGE_KEYS.SUMMARIES, updated);
    ReactiveStore.notifySummaries(updated);

    if (item.userId && !item.userId.startsWith('guest_')) {
      try {
        await setDoc(doc(db, 'studySummaries', item.id), item);
      } catch (error) {
        console.warn('Failed to sync study summary to Firestore:', error);
      }
    }
  }
}
