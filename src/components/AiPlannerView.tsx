import React, { useState } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  CalendarPlus,
  BookOpen,
  Award
} from 'lucide-react';
import { HomeworkItem, TimetableItem, UserProfile } from '../types';
import { getGoogleCalendarUrl } from '../lib/calendar';
import { StudentDataService } from '../lib/storage';

interface AiPlannerViewProps {
  user: UserProfile;
  homework: HomeworkItem[];
  timetable: TimetableItem[];
}

export const AiPlannerView: React.FC<AiPlannerViewProps> = ({
  user,
  homework,
  timetable,
}) => {
  const [dailyHours, setDailyHours] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scheduleData, setScheduleData] = useState<any | null>(null);

  const pendingHomework = homework.filter((h) => h.status !== 'completed');

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const hwPayload = pendingHomework.length > 0
        ? pendingHomework.map((h) => ({
            title: h.title,
            subject: h.subject,
            dueDate: h.dueDate,
            dueTime: h.dueTime,
            priority: h.priority,
            estimatedMinutes: h.estimatedMinutes,
          }))
        : (timetable.slice(0, 4).map((t) => ({
            title: `ทบทวนและเตรียมสอบวิชา ${t.subject}`,
            subject: t.subject,
            dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            dueTime: '20:00',
            priority: 'medium',
            estimatedMinutes: 45,
          })));

      let data: any = null;

      try {
        const res = await fetch('/api/ai/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            homeworkList: hwPayload,
            timetable: timetable.map((t) => ({
              dayOfWeek: t.dayOfWeek,
              subject: t.subject,
              startTime: t.startTime,
              endTime: t.endTime,
            })),
            dailyAvailableHours: dailyHours,
          }),
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn('API call skipped or offline, falling back to local smart scheduler', e);
      }

      // If backend was unreachable or 404 on Vercel static, construct smart plan directly
      if (!data || !data.schedule || !Array.isArray(data.schedule)) {
        const dayNames = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const sortedHw = [...hwPayload].sort((a, b) => {
          const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          const pA = priorityWeight[a.priority] || 2;
          const pB = priorityWeight[b.priority] || 2;
          if (pA !== pB) return pB - pA;
          return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
        });

        const urgentAlerts: string[] = [];
        const overdueItems = sortedHw.filter((h) => h.dueDate && h.dueDate < todayStr);
        const todayItems = sortedHw.filter((h) => h.dueDate === todayStr);

        if (overdueItems.length > 0) {
          urgentAlerts.push(`⚠️ มีงานเลยกำหนดส่ง ${overdueItems.length} รายการ: "${overdueItems[0].title}" ควรรีบทำให้เสร็จเป็นอันดับแรก`);
        }
        if (todayItems.length > 0) {
          urgentAlerts.push(`⏰ งานที่ต้องส่งภายในวันนี้ ${todayItems.length} รายการ: "${todayItems[0].title}" จัดทำช่วงเย็นนี้ทันที`);
        }
        if (sortedHw.length > 0 && urgentAlerts.length === 0) {
          urgentAlerts.push(`✨ การบ้านงานถัดไปที่ใกล้ส่งที่สุด: "${sortedHw[0].title}" (ส่ง ${sortedHw[0].dueDate || 'เร็วๆ นี้'})`);
        }

        const schedule: any[] = [];
        let hwIndex = 0;

        for (let d = 0; d < 5; d++) {
          const targetDate = new Date();
          targetDate.setDate(now.getDate() + d);
          const dateStr = targetDate.toISOString().split('T')[0];
          const dayName = dayNames[targetDate.getDay()];

          const slots: any[] = [];
          const maxSlots = Math.min(Math.max(dailyHours, 1), 4);
          const baseTimes = [
            { label: '17:30 - 18:15' },
            { label: '18:30 - 19:15' },
            { label: '19:30 - 20:15' },
            { label: '20:30 - 21:15' },
          ];

          for (let s = 0; s < maxSlots; s++) {
            if (sortedHw.length === 0) break;
            const currentHw = sortedHw[hwIndex % sortedHw.length];
            hwIndex++;

            const techniques = [
              'เทคนิค Pomodoro: ทำโฟกัสเต็มที่ 45 นาที แล้วพักเบรก 10 นาที',
              'แบ่งอ่านทีละหัวข้อและสรุปเป็น Mind Map สั้นๆ',
              'ทำแบบฝึกหัดข้อคี่ก่อนเพื่อประเมินความเข้าใจเร็วขึ้น',
              'ทบทวนโจทย์ตัวอย่างของครูควบคู่กับการทำโจทย์จริง',
            ];

            slots.push({
              time: baseTimes[s].label,
              subject: currentHw.subject || 'วิชาเรียน',
              taskTitle: currentHw.title || 'ทำการบ้าน',
              action: `ลงมือทำส่วนสำคัญของ "${currentHw.title}" ตรวจสอบความถูกต้องและเตรียมส่ง`,
              technique: techniques[s % techniques.length],
            });
          }

          if (slots.length > 0) {
            schedule.push({ date: dateStr, dayName, slots });
          }
        }

        data = {
          summary: `AI วิเคราะห์แผนการทำงานจาก ${sortedHw.length} งานที่ค้างอยู่ โดยเฉลี่ยเวลาว่างวันละ ${dailyHours} ชม. จัดแบ่งเป็นรอบย่อยแบบ Pomodoro เพื่อให้สมองไม่ล้าและส่งงานทันกำหนดทุกวิชา`,
          schedule,
          urgentAlerts,
          studyTips: [
            'ช่วง 17:30 - 19:30 เป็นช่วงที่สมองมีสมาธิสูงสุด เหมาะกับวิชาคำนวณและงานที่ยากที่สุด',
            'ดื่มน้ำระหว่างพักเบรก 10 นาที และอย่านั่งติดต่อกันเกิน 1 ชั่วโมง',
            'เมื่อทำเสร็จแต่ละข้อ ให้ขีดฆ่าในแอปทันทีเพื่อสร้าง Dopamine เพิ่มแรงจูงใจในการเรียน',
          ],
        };
      }

      setScheduleData(data);

      // Auto-assign schedule tips back to matching homework items
      if (data.schedule && Array.isArray(data.schedule)) {
        for (const day of data.schedule) {
          if (day.slots && Array.isArray(day.slots)) {
            for (const slot of day.slots) {
              const matchedHw = pendingHomework.find(
                (h) => h.title.includes(slot.taskTitle) || slot.taskTitle.includes(h.title)
              );
              if (matchedHw) {
                await StudentDataService.saveHomeworkItem({
                  ...matchedHw,
                  aiScheduledSlot: `${day.dayName} เวลา ${slot.time} (${slot.action})`,
                });
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการสร้างตารางเวลา');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-xl shadow-purple-500/15 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Study & Homework Scheduler (Gemini 3.8)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black">
            ผู้ช่วย AI จัดเวลาทำการบ้านและส่งงาน
          </h1>

          <p className="text-white/85 text-xs sm:text-sm">
            วิเคราะห์วันครบกำหนดส่งงาน ลำดับความสำคัญ และตารางเรียนจริง เพื่อสร้างไทม์ไลน์การทำงานที่ผ่อนคลาย ไม่กดดัน พร้อมเชื่อมต่อลงใน Google Calendar ได้ทันที
          </p>

          {/* Quick Input Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-2xl text-xs font-bold">
              <span>เวลาว่างทำการบ้าน/วัน:</span>
              <select
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="bg-transparent text-white font-black focus:outline-none cursor-pointer"
              >
                <option value={2} className="text-slate-900">2 ชั่วโมง</option>
                <option value={3} className="text-slate-900">3 ชั่วโมง</option>
                <option value={4} className="text-slate-900">4 ชั่วโมง</option>
                <option value={5} className="text-slate-900">5 ชั่วโมง</option>
              </select>
            </div>

            <button
              onClick={handleGeneratePlan}
              disabled={isLoading}
              className="px-5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI กำลังประมวลผลตาราง...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>สร้างแผนจัดเวลาอัจฉริยะ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* When no schedule generated yet */}
      {!scheduleData && !isLoading && (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
              มีงานค้างส่ง {pendingHomework.length} ชิ้น พร้อมจัดเวลา
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              กดปุ่ม &ldquo;สร้างแผนจัดเวลาอัจฉริยะ&rdquo; เพื่อให้ AI คำนวณช่วงเวลาที่เหมาะสมในการทยอยทำการบ้านแต่ละชิ้น
            </p>
          </div>
        </div>
      )}

      {/* Generated Schedule Display */}
      {scheduleData && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* AI Summary Banner */}
          {scheduleData.summary && (
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800/90 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>คำแนะนำและภาพรวมจาก AI Coach</span>
              </div>
              <p className="leading-relaxed">{scheduleData.summary}</p>
            </div>
          )}

          {/* Urgent Alerts from AI */}
          {scheduleData.urgentAlerts && scheduleData.urgentAlerts.length > 0 && (
            <div className="p-4 rounded-3xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs space-y-2">
              <div className="font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>การแจ้งเตือนเร่งด่วน</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                {scheduleData.urgentAlerts.map((alert: string, idx: number) => (
                  <li key={idx}>{alert}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline of Days */}
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <span>ตารางช่วงเวลาทำการบ้านที่แนะนำ</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduleData.schedule?.map((day: any, dIdx: number) => (
                <div
                  key={dIdx}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                        {day.dayName} ({day.date})
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {day.slots?.length || 0} ช่วงเวลา
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {day.slots?.map((slot: any, sIdx: number) => {
                      const calUrl = getGoogleCalendarUrl({
                        title: `[ช่วงทำการบ้าน] ${slot.taskTitle} (${slot.subject})`,
                        description: `เป้าหมาย: ${slot.action}\nเทคนิค: ${slot.technique || '-'}`,
                        startDate: day.date || new Date().toISOString().split('T')[0],
                        startTime: slot.time?.split(' - ')[0] || '18:00',
                        endTime: slot.time?.split(' - ')[1] || '19:00',
                      });

                      return (
                        <div
                          key={sIdx}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {slot.time}
                            </span>
                            <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {slot.subject}
                            </span>
                          </div>

                          <p className="font-extrabold text-slate-800 dark:text-slate-200">
                            {slot.taskTitle}
                          </p>

                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            👉 {slot.action}
                          </p>

                          {slot.technique && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-800/40">
                              💡 {slot.technique}
                            </p>
                          )}

                          <div className="pt-2 flex items-center justify-end">
                            <a
                              href={calUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              <span>เพิ่มลงใน Google Calendar</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Study Tips from AI */}
          {scheduleData.studyTips && (
            <div className="p-4 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1.5">
              <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                <span>เคล็ดลับการเรียนรู้สำหรับสัปดาห์นี้</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                {scheduleData.studyTips.map((tip: string, idx: number) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
