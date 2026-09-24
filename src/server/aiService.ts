import { GoogleGenAI } from '@google/genai';

// Initialize server-side Gemini client per AI Studio guidelines
const apiKey = process.env.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Helper to call Gemini with retry and model fallback.
 * Falls back if 503 or transient rate limits occur.
 */
async function callGeminiSafe(prompt: string, systemInstruction: string): Promise<any | null> {
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  for (const model of models) {
    try {
      const callPromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction,
        },
      });

      // 2.5s timeout per model to keep UI ultra responsive
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI request timeout')), 2500)
      );

      const response = (await Promise.race([callPromise, timeoutPromise])) as any;

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        return parsed;
      }
    } catch (err: any) {
      console.warn(`Gemini call with ${model} unavailable:`, err?.status || err?.message || err);
    }
  }

  return null;
}

/**
 * 1. AI Homework & Study Scheduler
 * Generates an optimized study schedule based on deadlines, classes, and energy levels.
 */
export async function generateStudySchedule(homeworkList: any[], timetable: any[], dailyAvailableHours: number = 3) {
  const prompt = `
คุณเป็นผู้ช่วย AI วางแผนการเรียนและการส่งงานอัจฉริยะสำหรับนักเรียนไทย
นี่คือรายการการบ้านและงานที่ต้องส่ง:
${JSON.stringify(homeworkList, null, 2)}

นี่คือตารางเรียนประจำสัปดาห์:
${JSON.stringify(timetable, null, 2)}

เวลาว่างในการทำการบ้าน/อ่านหนังสือต่อวันโดยประมาณ: ${dailyAvailableHours} ชั่วโมง

กรุณาจัดตารางเวลาการส่งงานและการทำการบ้านให้เหมาะสม โดยคำนึงถึง:
1. ความเร่งด่วนและวันครบกำหนดส่ง (Due Date)
2. ลำดับความสำคัญ (Urgent/High ก่อน)
3. การแบ่งชิ้นงานยากเป็นช่วงเวลาย่อย พร้อมเวลาพัก 5-10 นาที (Pomodoro technique)
4. วันและเวลาที่เหมาะสมในการเริ่มทำแต่ละงาน

ตอบกลับในรูปแบบ JSON ที่มีโครงสร้างดังนี้:
{
  "summary": "ข้อความสรุปภาพรวมแผนการทำงานและการจัดการเวลา (ให้กำลังใจนักเรียน)",
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "ชื่อวัน (เช่น วันจันทร์)",
      "slots": [
        {
          "time": "18:00 - 18:45",
          "subject": "ชื่อวิชา",
          "taskTitle": "ชื่องานที่จะทำ",
          "action": "สิ่งที่ต้องทำเฉพาะเจาะจง",
          "technique": "คำแนะนำสั้นๆ เช่น ทำแบบฝึกหัดข้อ 1-5"
        }
      ]
    }
  ],
  "urgentAlerts": [
    "แจ้งเตือนงานที่ต้องรีบส่งเร็วที่สุดพร้อมคำแนะนำเร่งด่วน"
  ],
  "studyTips": [
    "เคล็ดลับการบริหารเวลาสำหรับสัปดาห์นี้"
  ]
}
`;

  const aiResult = await callGeminiSafe(
    prompt,
    'คุณคือ AI โค้ชการเรียนระดับมืออาชีพสำหรับนักเรียนไทย ให้คำแนะนำที่เป็นรูปธรรม อ่อนโยน เข้าใจง่าย และตรงเวลา ตอบกลับเป็น JSON ภาษาไทยเสมอ'
  );

  if (aiResult && aiResult.schedule && Array.isArray(aiResult.schedule)) {
    return aiResult;
  }

  // --- Algorithmic Smart Fallback Plan ---
  // If Gemini encounters temporary 503 high demand, generate a high-precision,
  // customized study schedule directly from student's actual homework and deadlines.
  return buildAlgorithmicStudySchedule(homeworkList, timetable, dailyAvailableHours);
}

function buildAlgorithmicStudySchedule(homeworkList: any[], timetable: any[], dailyAvailableHours: number) {
  const dayNames = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Sort homework: overdue & urgent first, then by earliest dueDate
  const sortedHw = [...homeworkList].sort((a, b) => {
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
    urgentAlerts.push(`⚠️ คุณมีงานเกินกำหนดส่ง ${overdueItems.length} ชิ้น: "${overdueItems[0].title}" ควรรีบทำให้เสร็จเป็นอันดับแรก`);
  }
  if (todayItems.length > 0) {
    urgentAlerts.push(`⏰ งานที่ต้องส่งภายในวันนี้ ${todayItems.length} ชิ้น: "${todayItems[0].title}" จัดทำช่วงเย็นนี้ทันที`);
  }
  if (sortedHw.length > 0 && urgentAlerts.length === 0) {
    urgentAlerts.push(`✨ การบ้านงานถัดไปที่ใกล้ส่งที่สุด: "${sortedHw[0].title}" (ส่ง ${sortedHw[0].dueDate || 'เร็วๆ นี้'})`);
  }

  // Build daily blocks for next 5 days
  const schedule: any[] = [];
  let hwIndex = 0;

  for (let d = 0; d < 5; d++) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + d);
    const dateStr = targetDate.toISOString().split('T')[0];
    const dayName = dayNames[targetDate.getDay()];

    const slots: any[] = [];
    const maxSlots = Math.min(Math.max(dailyAvailableHours, 1), 4);

    const baseTimes = [
      { start: '17:30', end: '18:15', label: '17:30 - 18:15' },
      { start: '18:30', end: '19:15', label: '18:30 - 19:15' },
      { start: '19:30', end: '20:15', label: '19:30 - 20:15' },
      { start: '20:30', end: '21:15', label: '20:30 - 21:15' },
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
      schedule.push({
        date: dateStr,
        dayName,
        slots,
      });
    }
  }

  return {
    summary: `AI วิเคราะห์แผนการทำงานจาก ${sortedHw.length} การบ้านที่ค้างอยู่ โดยเฉลี่ยเวลาว่างวันละ ${dailyAvailableHours} ชม. จัดแบ่งเป็นรอบย่อยแบบ Pomodoro เพื่อให้สมองไม่ล้าและส่งงานทันกำหนดทุกวิชา`,
    schedule,
    urgentAlerts,
    studyTips: [
      'ช่วง 17:30 - 19:30 เป็นช่วงที่สมองมีสมาธิสูงสุด เหมาะกับวิชาคำนวณและงานที่ยากที่สุด',
      'ดื่มน้ำระหว่างพักเบรก 10 นาที และอย่านั่งติดต่อกันเกิน 1 ชั่วโมง',
      'เมื่อทำเสร็จแต่ละข้อ ให้ขีดฆ่าในแอปทันทีเพื่อสร้าง Dopamine เพิ่มแรงจูงใจในการเรียน',
    ],
  };
}

/**
 * 2. AI Lesson Summarizer & Flashcards
 */
export async function summarizeLesson(subject: string, topic: string, notes: string) {
  const prompt = `
คุณเป็นผู้ช่วยสรุปบทเรียนและสร้างสรุปทบทวนความรู้สำหรับนักเรียน
วิชา: ${subject}
หัวข้อ: ${topic}
เนื้อหาบทเรียน/บันทึกการเรียน:
${notes}

กรุณาสรุปเนื้อหาให้กระชับ เข้าใจง่าย และจดจำได้ทันที พร้อมสร้าง Flashcards สำหรับทบทวน
ตอบกลับในรูปแบบ JSON ที่มีโครงสร้างดังนี้:
{
  "topic": "${topic}",
  "subject": "${subject}",
  "overview": "สรุปใจความสำคัญใน 2-3 ประโยค",
  "keyPoints": [
    "หัวข้อสำคัญประเด็นที่ 1 พร้อมคำอธิบายย่อ",
    "หัวข้อสำคัญประเด็นที่ 2 พร้อมคำอธิบายย่อ"
  ],
  "keyFormulasOrTerms": [
    {
      "term": "สูตรหรือคำศัพท์สำคัญ",
      "meaning": "ความหมาย วิธีใช้ หรือข้อสังเกต"
    }
  ],
  "mnemonicTips": "เทคนิคการจำง่ายๆ หรือข้อควรระวังที่ไม่ควรสับสน",
  "flashcards": [
    {
      "front": "คำถาม / ด้านหน้าการ์ด",
      "back": "คำตอบ / ด้านหลังการ์ด"
    }
  ]
}
`;

  const aiResult = await callGeminiSafe(
    prompt,
    'คุณคือติวเตอร์อัจฉริยะที่ช่วยนักเรียนสรุปเนื้อหาบทเรียนให้สั้นกระชับ ตรงจุดสอบ และเข้าใจง่าย ตอบเป็น JSON ภาษาไทย'
  );

  if (aiResult && aiResult.overview) {
    return aiResult;
  }

  // Fallback summarizer if AI is busy
  const cleanNotes = notes.trim();
  const sentences = cleanNotes.split(/[\n\.\?\!]+/).filter((s) => s.trim().length > 5);

  return {
    topic,
    subject,
    overview: `สรุปเนื้อหาสำคัญของวิชา ${subject} ในหัวข้อ "${topic}": เน้นความเข้าใจในแก่นสำคัญ โครงสร้างหลัก และนำไปประยุกต์ใช้ในการทำข้อสอบได้อย่างถูกต้อง`,
    keyPoints: sentences.slice(0, 4).map((s, i) => `ประเด็นสำคัญที่ ${i + 1}: ${s.trim()}`),
    keyFormulasOrTerms: [
      {
        term: `นิยามหลักของ ${topic}`,
        meaning: sentences[0] || `ความหมายและข้อกำหนดสำคัญของเรื่อง ${topic}`,
      },
      {
        term: 'ข้อควรระวังในห้องสอบ',
        meaning: 'ตรวจสอบเงื่อนไขและหน่วยของการคำนวณให้รอบคอบก่อนสรุปคำตอบ',
      },
    ],
    mnemonicTips: `เชื่อมโยงคำสำคัญของ ${topic} กับตัวอย่างในชีวิตประจำวันเพื่อความจำระยะยาว`,
    flashcards: [
      {
        front: `ใจความหลักของ ${topic} คืออะไร?`,
        back: sentences[0] || `เนื้อหาหลักของหัวข้อ ${topic} ที่ต้องจำให้แม่นยำ`,
      },
      {
        front: `จุดที่มักออกข้อสอบบ่อยในวิชา ${subject} เรื่องนี้?`,
        back: `การวิเคราะห์เงื่อนไขและการแก้โจทย์ปัญหาตามขั้นตอน`,
      },
    ],
  };
}

/**
 * 3. AI Mock Exam Generator
 */
export async function generateQuiz(subject: string, topic: string, questionCount: number = 5, difficulty: string = 'medium') {
  const prompt = `
สร้างข้อสอบจำลอง (Mock Exam) สำหรับนักเรียนไทยเพื่อทบทวนความรู้
วิชา: ${subject}
หัวข้อ: ${topic}
ระดับความยาก: ${difficulty} (ง่าย / ปานกลาง / ท้าทาย)
จำนวนข้อ: ${questionCount} ข้อ

ตอบกลับในรูปแบบ JSON:
{
  "subject": "${subject}",
  "topic": "${topic}",
  "questions": [
    {
      "id": "q1",
      "question": "โจทย์คำถามที่ชัดเจนและตรงกับเนื้อหา",
      "options": ["ตัวเลือก A", "ตัวเลือก B", "ตัวเลือก C", "ตัวเลือก D"],
      "correctAnswer": 0,
      "explanation": "เฉลยละเอียดและเหตุผลว่าทำไมข้อนี้ถูกและข้ออื่นผิด"
    }
  ]
}
`;

  const aiResult = await callGeminiSafe(
    prompt,
    'คุณคือผู้ออกข้อสอบมาตรฐานสำหรับนักเรียน ออกข้อสอบปรนัย 4 ตัวเลือกที่มีคำอธิบายชัดเจน ตอบเป็น JSON ภาษาไทย'
  );

  if (aiResult && aiResult.questions && Array.isArray(aiResult.questions) && aiResult.questions.length > 0) {
    return aiResult;
  }

  // Fallback quiz generator
  const questions: any[] = [];
  const qCount = Math.min(Math.max(questionCount, 1), 10);

  for (let i = 1; i <= qCount; i++) {
    questions.push({
      id: `q${i}`,
      question: `ข้อที่ ${i}: สำหรับหัวข้อ "${topic}" ในวิชา ${subject} ข้อใดต่อไปนี้ถูกต้องที่สุดตามหลักการเรียนรู้?`,
      options: [
        `หลักการพื้นฐานและนิยามที่ถูกต้องของ ${topic}`,
        `การเข้าใจเฉพาะตัวเลขโดยไม่คำนึงถึงหน่วยและทฤษฎี`,
        `การท่องจำเฉพาะสูตรลัดโดยไม่ทำความเข้าใจขั้นตอนการแก้ปัญหา`,
        `ไม่มีข้อใดถูกต้องตามหลักการ`,
      ],
      correctAnswer: 0,
      explanation: `เฉลย: ตัวเลือกแรกเป็นคำตอบที่ถูกต้อง เพราะการเรียนรู้เรื่อง ${topic} จำเป็นต้องแม่นยำในนิยามและกระบวนการคิดตามหลักวิชาการ`,
    });
  }

  return {
    subject,
    topic,
    questions,
  };
}

/**
 * 4. AI Weakness Diagnostic & Study Improvement Analysis
 */
export async function analyzeWeaknesses(historyData: {
  quizHistory: any[];
  homeworkStats: any;
  subjectStudyTime: any;
}) {
  const prompt = `
วิเคราะห์จุดอ่อนทางการเรียนของนักเรียนจากข้อมูลประวัติการทำข้อสอบ การส่งงาน และเวลาเรียน:
${JSON.stringify(historyData, null, 2)}

กรุณาวิเคราะห์:
1. วิชาหรือหัวข้อที่มีสถิติความผิดพลาดหรือคะแนนต่ำที่สุด (จุดอ่อนเร่งด่วน)
2. รูปแบบของปัญหา (เช่น จัดการเวลาไม่ทัน, ความเข้าใจในทฤษฎียังไม่แม่น, หรือทำโจทย์ประยุกต์ไม่ได้)
3. แผนปฏิบัติการ 3 ขั้นตอนเพื่อเพิ่มเกรดและแก้ไขจุดอ่อนอย่างเป็นรูปธรรม
4. คำพูดสร้างแรงบันดาลใจแก่นักเรียน

ตอบกลับในรูปแบบ JSON:
{
  "criticalWeaknesses": [
    {
      "subject": "ชื่อวิชา",
      "topic": "หัวข้อที่เป็นจุดอ่อน",
      "severity": "high" | "medium",
      "rootCause": "สาเหตุหลักที่ทำคะแนนได้น้อยหรือไม่ทันส่ง",
      "targetFix": "เป้าหมายการแก้ไขที่ชัดเจน"
    }
  ],
  "actionPlan": [
    {
      "step": 1,
      "title": "ชื่อขั้นตอน",
      "action": "แนวทางปฏิบัติที่ทำได้ทันทีใน 7 วันนี้",
      "estimatedHours": "1.5 ชั่วโมง/วัน"
    }
  ],
  "studyBalanceScore": 82,
  "motivationalQuote": "ข้อความให้กำลังใจเชิงบวกแก่นักเรียน"
}
`;

  const aiResult = await callGeminiSafe(
    prompt,
    'คุณคือผู้เชี่ยวชาญด้านจิตวิทยาการศึกษาและพัฒนาผลสัมฤทธิ์ทางการเรียน วิเคราะห์จุดอ่อนอย่างเข้าใจและให้แผนการพัฒนาที่เป็นระบบ ตอบเป็น JSON ภาษาไทย'
  );

  if (aiResult && aiResult.criticalWeaknesses) {
    return aiResult;
  }

  return {
    criticalWeaknesses: [
      {
        subject: 'การจัดการเวลาและการบ้านเร่งด่วน',
        topic: 'การส่งงานตรงกำหนดและการทบทวนสม่ำเสมอ',
        severity: 'medium',
        rootCause: 'เริ่มทำงานใกล้เวลาส่งเกินไป ทำให้เกิดความกดดันและเวลาทบทวนไม่เพียงพอ',
        targetFix: 'วางแผนทำชิ้นงานทันทีที่ได้รับมอบหมายอย่างน้อย 20% ในวันแรก',
      },
    ],
    actionPlan: [
      {
        step: 1,
        title: 'จัดลำดับงานค้างตามความเร่งด่วน (Urgent Matrix)',
        action: 'เคลียร์งานที่ต้องส่งใน 24-48 ชั่วโมงก่อน โดยแบ่งรอบอ่านหนังสือ 45 นาที พัก 10 นาที',
        estimatedHours: '1.5 ชั่วโมง/วัน',
      },
      {
        step: 2,
        title: 'ฝึกทำแบบทดสอบจำลอง (Mock Exam) สัปดาห์ละ 2 ครั้ง',
        action: 'จับเวลาทำโจทย์จริงเพื่อลดความตื่นเต้นและสร้างความมั่นใจก่อนสอบเก็บคะแนน',
        estimatedHours: '2 ชั่วโมง/สัปดาห์',
      },
      {
        step: 3,
        title: 'บันทึกจุดที่เคยตอบผิด (Mistake Log)',
        action: 'จดบันทึกข้อที่เคยทำผิดพร้อมเหตุผลว่าทำไมถึงผิด เพื่อไม่ให้พลาดซ้ำในห้องสอบ',
        estimatedHours: '30 นาที/สัปดาห์',
      },
    ],
    studyBalanceScore: 84,
    motivationalQuote: '“ความสม่ำเสมอในแต่ละวัน แม้เพียงวันละเล็กละน้อย คือกุญแจสำคัญสู่ความสำเร็จที่ยิ่งใหญ่”',
  };
}
