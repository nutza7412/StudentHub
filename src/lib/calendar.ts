import { HomeworkItem, TimetableItem } from '../types';

/**
 * Generate a Google Calendar event creation URL
 */
export function getGoogleCalendarUrl(event: {
  title: string;
  description?: string;
  location?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate?: string;
  endTime?: string;
}): string {
  const startClean = `${event.startDate.replace(/-/g, '')}T${event.startTime.replace(/:/g, '')}00`;
  const endD = event.endDate || event.startDate;
  const endT = event.endTime || event.startTime;
  const endClean = `${endD.replace(/-/g, '')}T${endT.replace(/:/g, '')}00`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startClean}/${endClean}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate standard .ics (iCalendar) file and trigger download
 * Works natively on iOS Apple Calendar, Google Calendar, Outlook, and Android
 */
export function downloadIcsFile(event: {
  title: string;
  description?: string;
  location?: string;
  startDate: string;
  startTime: string;
  endTime?: string;
}) {
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const startClean = `${event.startDate.replace(/-/g, '')}T${event.startTime.replace(/:/g, '')}00`;
  const endT = event.endTime || event.startTime;
  const endClean = `${event.startDate.replace(/-/g, '')}T${endT.replace(/:/g, '')}00`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudentHub//Student Personal Dashboard//TH',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTAMP:${dtStamp}`,
    `UID:studenthub-${Date.now()}@studenthub.app`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location || ''}`,
    `DTSTART:${startClean}`,
    `DTEND:${endClean}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: ' + event.title,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert homework item to Google Calendar URL
 */
export function homeworkToGoogleCalendar(homework: HomeworkItem): string {
  return getGoogleCalendarUrl({
    title: `[การบ้าน] ${homework.title} (${homework.subject})`,
    description: `วิชา: ${homework.subject}\nความสำคัญ: ${homework.priority}\nรายละเอียด: ${homework.description || '-'}\nกำหนดส่ง: ${homework.dueDate} ${homework.dueTime}`,
    startDate: homework.dueDate,
    startTime: homework.dueTime || '17:00',
    endTime: homework.dueTime || '18:00',
  });
}
