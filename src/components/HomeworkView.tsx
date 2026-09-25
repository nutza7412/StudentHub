import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Filter, 
  Sparkles, 
  Bell, 
  Download,
  Share2
} from 'lucide-react';
import { HomeworkItem, HomeworkPriority, HomeworkStatus, UserProfile } from '../types';
import { getTodayString, getTomorrowString, StudentDataService } from '../lib/storage';
import { downloadIcsFile, homeworkToGoogleCalendar } from '../lib/calendar';
import { NotificationService } from '../lib/notifications';

interface HomeworkViewProps {
  user: UserProfile;
  homework: HomeworkItem[];
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  onOpenAiPlanner: () => void;
  onUpdateHomework?: React.Dispatch<React.SetStateAction<HomeworkItem[]>>;
}

const PRIORITY_BADGES: Record<HomeworkPriority, { label: string; color: string; badge: string }> = {
  urgent: { label: 'ด่วนมาก', color: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/60' },
  high: { label: 'สำคัญ', color: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800/60' },
  medium: { label: 'ปานกลาง', color: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' },
  low: { label: 'ทั่วไป', color: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' },
};

const STATUS_LABELS: Record<HomeworkStatus, { label: string; color: string }> = {
  pending: { label: 'รอดำเนินการ', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300' },
  in_progress: { label: 'กำลังทำ', color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300' },
  completed: { label: 'ส่งแล้ว', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' },
};

export const HomeworkView: React.FC<HomeworkViewProps> = ({
  user,
  homework,
  isAddModalOpen,
  setIsAddModalOpen,
  onOpenAiPlanner,
  onUpdateHomework,
}) => {
  const todayStr = getTodayString();
  const [statusFilter, setStatusFilter] = useState<'all' | HomeworkStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<HomeworkItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    dueDate: getTomorrowString(),
    dueTime: '23:59',
    priority: 'medium' as HomeworkPriority,
    status: 'pending' as HomeworkStatus,
    estimatedMinutes: 45,
  });

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      subject: '',
      description: '',
      dueDate: getTomorrowString(),
      dueTime: '23:59',
      priority: 'medium',
      status: 'pending',
      estimatedMinutes: 45,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: HomeworkItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      subject: item.subject,
      description: item.description || '',
      dueDate: item.dueDate,
      dueTime: item.dueTime || '23:59',
      priority: item.priority,
      status: item.status,
      estimatedMinutes: item.estimatedMinutes || 45,
    });
    setIsAddModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.subject.trim()) return;

    const id = editingItem ? editingItem.id : 'hw_' + Math.random().toString(36).substring(2, 9);
    const itemToSave: HomeworkItem = {
      id,
      userId: user.uid,
      title: formData.title.trim(),
      subject: formData.subject.trim(),
      description: formData.description.trim(),
      dueDate: formData.dueDate,
      dueTime: formData.dueTime,
      priority: formData.priority,
      status: formData.status,
      estimatedMinutes: Number(formData.estimatedMinutes) || 45,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateHomework) {
      onUpdateHomework((prev) => {
        const idx = prev.findIndex((x) => x.id === itemToSave.id);
        return idx >= 0 ? prev.map((x) => (x.id === itemToSave.id ? itemToSave : x)) : [...prev, itemToSave];
      });
    }

    await StudentDataService.saveHomeworkItem(itemToSave);
    setIsAddModalOpen(false);
  };

  const handleToggleStatus = async (item: HomeworkItem) => {
    const nextStatus: HomeworkStatus = item.status === 'completed' ? 'pending' : 'completed';

    if (nextStatus === 'completed') {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#22c55e'],
      });
    }

    const updatedItem: HomeworkItem = {
      ...item,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateHomework) {
      onUpdateHomework((prev) =>
        prev.map((h) => (h.id === item.id ? updatedItem : h))
      );
    }

    await StudentDataService.saveHomeworkItem(updatedItem);
  };

  const handleDelete = async (id: string) => {
    if (onUpdateHomework) {
      onUpdateHomework((prev) => prev.filter((h) => h.id !== id));
    }
    await StudentDataService.deleteHomeworkItem(id, user.uid);
  };

  const handleTriggerPushAlert = (item: HomeworkItem) => {
    NotificationService.sendPushNotification(
      `🚨 แจ้งเตือนการบ้าน: ${item.subject}`,
      `งาน "${item.title}" กำหนดส่ง ${item.dueDate} เวลา ${item.dueTime}! อย่าลืมส่งตามกำหนดนะครับ`
    );
  };

  // Filter homework
  const filteredList = homework.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubject = item.subject.toLowerCase().includes(q);
      if (!matchTitle && !matchSubject) return false;
    }
    return true;
  });

  // Sort by overdue, due date, then priority
  const sortedList = [...filteredList].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;

    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    const priorityOrder: Record<HomeworkPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-rose-500" />
            <span>การบ้าน & จัดการงานค้าง</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            ติดตามกำหนดส่ง แจ้งเตือนงานค้าง และซิงค์เข้าสู่ปฏิทินส่วนตัว
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAiPlanner}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 hover:opacity-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI ช่วยจัดเวลาส่งงาน</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มการบ้าน</span>
          </button>
        </div>
      </div>

      {/* Homework Overall Progress Bar */}
      {homework.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                ภาพรวมการส่งการบ้าน
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                (ส่งแล้ว {homework.filter((h) => h.status === 'completed').length} จาก {homework.length} ชิ้น)
              </span>
            </div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>ความคืบหน้าการเคลียร์งาน</span>
              {homework.filter((h) => h.status === 'completed').length === homework.length && homework.length > 0 && (
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 animate-bounce">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ส่งครบหมดแล้ว! เยี่ยมมาก 🚀</span>
                </span>
              )}
            </h2>
          </div>

          <div className="w-full sm:w-56 space-y-1.5">
            <div className="flex justify-between text-xs font-extrabold">
              <span className="text-slate-600 dark:text-slate-300">ความคืบหน้า</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {Math.round((homework.filter((h) => h.status === 'completed').length / homework.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-700/80 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500 ease-out shadow-xs"
                style={{
                  width: `${(homework.filter((h) => h.status === 'completed').length / homework.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            ทั้งหมด ({homework.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'pending'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            ค้างส่ง ({homework.filter((h) => h.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'in_progress'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            กำลังทำ ({homework.filter((h) => h.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'completed'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            ส่งแล้ว ({homework.filter((h) => h.status === 'completed').length})
          </button>
        </div>

        <input
          type="text"
          placeholder="ค้นหาชื่อการบ้านหรือวิชา..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 px-3.5 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-indigo-500"
        />
      </div>

      {/* Homework Cards List */}
      {sortedList.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 mx-auto flex items-center justify-center">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">ไม่พบรายการการบ้าน</h3>
            <p className="text-xs text-slate-400 mt-1">กด &ldquo;เพิ่มการบ้าน&rdquo; เพื่อเริ่มบันทึกงานใหม่</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedList.map((item) => {
            const isCompleted = item.status === 'completed';
            const isOverdue = !isCompleted && item.dueDate < todayStr;
            const isToday = !isCompleted && item.dueDate === todayStr;
            const priorityInfo = PRIORITY_BADGES[item.priority];
            const statusInfo = STATUS_LABELS[item.status];
            const googleCalUrl = homeworkToGoogleCalendar(item);

            return (
              <div
                key={item.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between group relative overflow-hidden ${
                  isCompleted
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75'
                    : isOverdue
                    ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-xs'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/90 shadow-xs hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top Bar: Subject, Priority, Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {item.subject}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityInfo.badge}`}>
                        {priorityInfo.label}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(item);
                      }}
                      aria-label={isCompleted ? 'เปลี่ยนเป็นยังไม่เสร็จ' : 'ติ๊กถูกส่งการบ้านนี้'}
                      className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer transform active:scale-90 shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                          : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-transparent hover:text-emerald-500/50 bg-slate-50 dark:bg-slate-900'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    </button>

                    <div className="flex-1 cursor-pointer" onClick={() => handleToggleStatus(item)}>
                      <h3
                        className={`text-sm sm:text-base font-extrabold ${
                          isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* AI Scheduled Slot Tip */}
                  {item.aiScheduledSlot && (
                    <div className="mt-3 p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/40 text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span>{item.aiScheduledSlot}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Due Date & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    {isOverdue ? (
                      <span className="font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" />
                        เลยกำหนดส่งแล้ว ({item.dueDate})
                      </span>
                    ) : isToday ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        ส่งภายในวันนี้ ({item.dueTime || '23:59'})
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        กำหนดส่ง {item.dueDate} ({item.dueTime || '23:59'})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Push Alert trigger */}
                    <button
                      onClick={() => handleTriggerPushAlert(item)}
                      title="ส่ง Push Notification เตือนงานนี้ทันที"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>

                    {/* Google Calendar Link */}
                    <a
                      href={googleCalUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="เพิ่มเข้า Google Calendar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </a>

                    {/* Download ICS */}
                    <button
                      onClick={() =>
                        downloadIcsFile({
                          title: `[การบ้าน] ${item.title} (${item.subject})`,
                          description: item.description,
                          startDate: item.dueDate,
                          startTime: item.dueTime || '18:00',
                        })
                      }
                      title="ดาวน์โหลด .ics เพื่อใส่ปฏิทินในมือถือ/แท็บเล็ต"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(item)}
                      title="แก้ไข"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="ลบ"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Homework Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-500" />
                <span>{editingItem ? 'แก้ไขข้อมูลการบ้าน' : 'เพิ่มการบ้าน / งานที่ต้องส่ง'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หัวข้องาน / ชิ้นงาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ทำแบบฝึกหัดท้ายบทที่ 4 ข้อ 1-10"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  วิชา <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คณิตศาสตร์, ฟิสิกส์, ภาษาอังกฤษ"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่ต้องส่ง (Due Date)
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เวลาที่ต้องส่ง
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ความเร่งด่วน (Priority)
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as HomeworkPriority })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value="urgent">🚨 ด่วนมาก (Urgent)</option>
                    <option value="high">🔥 สำคัญ (High)</option>
                    <option value="medium">⚡ ปานกลาง (Medium)</option>
                    <option value="low">🌱 ทั่วไป (Low)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สถานะงาน (Status)
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as HomeworkStatus })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value="pending">⏳ รอดำเนินการ</option>
                    <option value="in_progress">✍️ กำลังทำ</option>
                    <option value="completed">✅ ส่งแล้ว</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รายละเอียด / คำสั่งเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ทำลงสมุด, ทำสไลด์ 5 หน้า, ส่งใน Google Classroom"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
                >
                  {editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มการบ้าน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
