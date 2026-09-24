import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Clock, 
  MapPin, 
  UserCheck, 
  Trash2, 
  Edit3, 
  Download, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { DayOfWeek, TimetableItem, UserProfile } from '../types';
import { StudentDataService } from '../lib/storage';
import { downloadIcsFile, getGoogleCalendarUrl } from '../lib/calendar';

interface TimetableEditorProps {
  user: UserProfile;
  timetable: TimetableItem[];
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DAY_LABELS: Record<DayOfWeek, { th: string; color: string; badge: string }> = {
  Monday: { th: 'วันจันทร์', color: 'bg-amber-500', badge: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
  Tuesday: { th: 'วันอังคาร', color: 'bg-pink-500', badge: 'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 border-pink-200' },
  Wednesday: { th: 'วันพุธ', color: 'bg-emerald-500', badge: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  Thursday: { th: 'วันพฤหัสบดี', color: 'bg-orange-500', badge: 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border-orange-200' },
  Friday: { th: 'วันศุกร์', color: 'bg-sky-500', badge: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border-sky-200' },
  Saturday: { th: 'วันเสาร์', color: 'bg-purple-500', badge: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
  Sunday: { th: 'วันอาทิตย์', color: 'bg-rose-500', badge: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200' },
};

const COLOR_OPTIONS = [
  { id: 'indigo', label: 'คราม', bg: 'bg-indigo-500' },
  { id: 'sky', label: 'ฟ้า', bg: 'bg-sky-500' },
  { id: 'emerald', label: 'เขียว', bg: 'bg-emerald-500' },
  { id: 'amber', label: 'เหลือง/ส้ม', bg: 'bg-amber-500' },
  { id: 'purple', label: 'ม่วง', bg: 'bg-purple-500' },
  { id: 'rose', label: 'ชมพู/แดง', bg: 'bg-rose-500' },
  { id: 'teal', label: 'เขียวทะเล', bg: 'bg-teal-500' },
];

export const TimetableEditor: React.FC<TimetableEditorProps> = ({
  user,
  timetable,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'ALL'>('Monday');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TimetableItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    dayOfWeek: 'Monday' as DayOfWeek,
    subject: '',
    subjectCode: '',
    room: '',
    teacher: '',
    startTime: '08:30',
    endTime: '09:20',
    color: 'indigo',
    notes: '',
  });

  const openAddModal = (day?: DayOfWeek) => {
    setEditingItem(null);
    setFormData({
      dayOfWeek: day || (selectedDay === 'ALL' ? 'Monday' : selectedDay),
      subject: '',
      subjectCode: '',
      room: '',
      teacher: '',
      startTime: '08:30',
      endTime: '09:20',
      color: 'indigo',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (item: TimetableItem) => {
    setEditingItem(item);
    setFormData({
      dayOfWeek: item.dayOfWeek,
      subject: item.subject,
      subjectCode: item.subjectCode || '',
      room: item.room || '',
      teacher: item.teacher || '',
      startTime: item.startTime,
      endTime: item.endTime,
      color: item.color || 'indigo',
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim()) return;

    const id = editingItem ? editingItem.id : 'tt_' + Math.random().toString(36).substring(2, 9);
    const itemToSave: TimetableItem = {
      id,
      userId: user.uid,
      dayOfWeek: formData.dayOfWeek,
      subject: formData.subject.trim(),
      subjectCode: formData.subjectCode.trim(),
      room: formData.room.trim(),
      teacher: formData.teacher.trim(),
      startTime: formData.startTime,
      endTime: formData.endTime,
      color: formData.color,
      notes: formData.notes.trim(),
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    };

    await StudentDataService.saveTimetableItem(itemToSave);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    await StudentDataService.deleteTimetableItem(id, user.uid);
  };

  const handleExportAllIcs = () => {
    // Export selected items as sample calendar
    for (const item of timetable) {
      downloadIcsFile({
        title: `[เรียน] ${item.subject} (${item.room || 'ไม่มีห้อง'})`,
        description: `ครูผู้สอน: ${item.teacher || '-'}\nหมายเหตุ: ${item.notes || '-'}`,
        location: item.room,
        startDate: new Date().toISOString().split('T')[0],
        startTime: item.startTime,
        endTime: item.endTime,
      });
      break; // trigger one sample download
    }
  };

  const displayedDays = selectedDay === 'ALL' ? DAYS : [selectedDay];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-sky-500" />
            <span>ตารางเรียนประจำสัปดาห์</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            จัดตารางเรียน คาบเรียน ห้องเรียน และส่งออกไปยังปฏิทินส่วนตัว
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAllIcs}
            title="ดาวน์โหลดไฟล์ .ics สำหรับเปิดใน Google Calendar / Apple Calendar"
            className="px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลด .ics</span>
          </button>

          <button
            onClick={() => openAddModal()}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all transform hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มคาบเรียน</span>
          </button>
        </div>
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedDay('ALL')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedDay === 'ALL'
              ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}
        >
          ดูทั้งสัปดาห์ (จ.-อา.)
        </button>

        {DAYS.map((day) => {
          const isSelected = selectedDay === day;
          const dayInfo = DAY_LABELS[day];
          const classCount = timetable.filter((t) => t.dayOfWeek === day).length;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${dayInfo.color}`} />
              <span>{dayInfo.th}</span>
              {classCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                  {classCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Timetable Cards Grid */}
      <div className="space-y-6">
        {displayedDays.map((day) => {
          const dayClasses = timetable
            .filter((t) => t.dayOfWeek === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          const dayInfo = DAY_LABELS[day];

          return (
            <div
              key={day}
              className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${dayInfo.color}`} />
                  <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {dayInfo.th} ({day})
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {dayClasses.length} วิชา
                  </span>
                </div>

                <button
                  onClick={() => openAddModal(day)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มวิชาในวันนี้</span>
                </button>
              </div>

              {/* Class Cards */}
              {dayClasses.length === 0 ? (
                <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                  ยังไม่มีคาบเรียนใน{dayInfo.th} กดปุ่ม &ldquo;เพิ่มวิชาในวันนี้&rdquo; เพื่อบันทึก
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {dayClasses.map((item) => {
                    const googleCalUrl = getGoogleCalendarUrl({
                      title: `[คาบเรียน] ${item.subject}`,
                      description: `รหัสวิชา: ${item.subjectCode || '-'}\nห้อง: ${item.room || '-'}\nครู: ${item.teacher || '-'}\nหมายเหตุ: ${item.notes || '-'}`,
                      location: item.room,
                      startDate: new Date().toISOString().split('T')[0],
                      startTime: item.startTime,
                      endTime: item.endTime,
                    });

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3" />
                              {item.startTime} - {item.endTime}
                            </span>
                            {item.subjectCode && (
                              <span className="text-[11px] font-bold text-slate-400">
                                {item.subjectCode}
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                            {item.subject}
                          </h3>

                          <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                            {item.room && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>ห้อง {item.room}</span>
                              </div>
                            )}
                            {item.teacher && (
                              <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3 h-3 text-slate-400" />
                                <span>{item.teacher}</span>
                              </div>
                            )}
                            {item.notes && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-1 bg-white/60 dark:bg-slate-800/40 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                💬 {item.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
                          <a
                            href={googleCalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                            title="ใส่ใน Google Calendar"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Google Cal</span>
                          </a>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                              title="แก้ไข"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="ลบ"
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
            </div>
          );
        })}
      </div>

      {/* Add / Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <span>{editingItem ? 'แก้ไขข้อมูลคาบเรียน' : 'เพิ่มคาบเรียนใหม่'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  วันในสัปดาห์
                </label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value as DayOfWeek })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-indigo-500"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {DAY_LABELS[d].th} ({d})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อวิชา <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คณิตศาสตร์เพิ่มเติม, ฟิสิกส์ 1"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสวิชา
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ค31201"
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ห้องเรียน / แล็บ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ห้อง 421, แล็บ 2"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เวลาเริ่ม (HH:mm)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เวลาเลิก (HH:mm)
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ครูผู้สอน
                </label>
                <input
                  type="text"
                  placeholder="เช่น ครูสมศรี, Teacher John"
                  value={formData.teacher}
                  onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หมายเหตุ / สิ่งที่ต้องเตรียม
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น นำสมุดกราฟมาด้วย, สอบท้ายคาบ"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
                >
                  {editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มวิชาเรียน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
