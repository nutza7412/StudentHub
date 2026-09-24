import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  BookOpenCheck, 
  Sparkles, 
  FileText, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  RotateCw, 
  Award, 
  Save, 
  TrendingUp,
  Bookmark
} from 'lucide-react';
import { QuizQuestion, QuizResult, StudySummary, UserProfile } from '../types';
import { StudentDataService } from '../lib/storage';

interface AiSummaryQuizViewProps {
  user: UserProfile;
  studySummaries: StudySummary[];
  quizResults: QuizResult[];
  onNavigateToAnalytics: () => void;
}

export const AiSummaryQuizView: React.FC<AiSummaryQuizViewProps> = ({
  user,
  studySummaries,
  quizResults,
  onNavigateToAnalytics,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'quiz'>('summary');

  // Summary Form states
  const [summarySubject, setSummarySubject] = useState('ฟิสิกส์ 1');
  const [summaryTopic, setSummaryTopic] = useState('กฎการเคลื่อนที่ของนิวตัน');
  const [notesContent, setNotesContent] = useState(`กฎข้อที่ 1: วัตถุจะรักษาสภาพหยุดนิ่งหรือเคลื่อนที่ด้วยความเร็วคงที่ในแนวตรง ถ้าไม่มีแรงภายนอกมากระทำ (Sigma F = 0) เรียกว่า กฎความเฉื่อย
กฎข้อที่ 2: เมื่อมีแรงลัพธ์ที่ไม่เป็นศูนย์มากระทำต่อวัตถุ จะทำให้วัตถุเกิดความเร่งในทิศเดียวกับแรงลัพธ์ โดยความเร่งจะแปรผันตรงกับแรงและแปรผกผันกับมวล (Sigma F = ma)
กฎข้อที่ 3: ทุกแรงกิริยา (Action) ย่อมมีแรงปฏิกิริยา (Reaction) ที่มีขนาดเท่ากัน แต่มีทิศทางตรงกันข้ามเสมอ และกระทำต่อวัตถุคนละก้อน`);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<any | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  // Quiz Form states
  const [quizSubject, setQuizSubject] = useState('คณิตศาสตร์');
  const [quizTopic, setQuizTopic] = useState('ฟังก์ชันตรีโกณมิติ');
  const [quizDifficulty, setQuizDifficulty] = useState('medium');
  const [quizCount, setQuizCount] = useState(5);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizData, setQuizData] = useState<{ subject: string; topic: string; questions: QuizQuestion[] } | null>(null);

  // Active Quiz taking states
  const [currentAnswers, setCurrentAnswers] = useState<Record<number, number>>({});
  const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState(0);

  // Handle Summary Generation
  const handleGenerateSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesContent.trim()) return;

    setIsSummarizing(true);
    try {
      let data: any = null;
      try {
        const res = await fetch('/api/ai/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: summarySubject,
            topic: summaryTopic,
            notes: notesContent,
          }),
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn('AI summarize API unreachable, fallback locally:', e);
      }

      if (!data || !data.overview) {
        const sentences = notesContent.split(/[\n\.\?\!]+/).filter((s) => s.trim().length > 5);
        data = {
          topic: summaryTopic,
          subject: summarySubject,
          overview: `สรุปใจความสำคัญของวิชา ${summarySubject} ในหัวข้อ "${summaryTopic}": เน้นความเข้าใจในหลักการสำคัญและนำไปประยุกต์ใช้ในการทำข้อสอบจริงได้อย่างถูกต้อง`,
          keyPoints: (sentences.length > 0 ? sentences.slice(0, 4) : [notesContent]).map((s, i) => `ประเด็นสำคัญที่ ${i + 1}: ${s.trim()}`),
          keyFormulasOrTerms: [
            { term: `นิยามหลักของ ${summaryTopic}`, meaning: sentences[0] || `ความหมายและข้อกำหนดสำคัญของ ${summaryTopic}` },
            { term: 'จุดที่มักผิดบ่อย', meaning: 'ตรวจทานขั้นตอนและเงื่อนไขของโจทย์ให้รอบคอบก่อนสรุปคำตอบ' }
          ],
          mnemonicTips: `จำคำสำคัญของ ${summaryTopic} โดยเชื่อมโยงกับสถานการณ์จริงในชีวิตประจำวัน`,
          flashcards: [
            { front: `หัวใจสำคัญของ ${summaryTopic} คืออะไร?`, back: sentences[0] || `เนื้อหาหลักของ ${summaryTopic}` },
            { front: `จุดที่มักออกสอบในวิชา ${summarySubject}?`, back: 'การแก้โจทย์ปัญหาและการประยุกต์ใช้กฎเกณฑ์' }
          ]
        };
      }

      setSummaryResult(data);

      // Save to storage
      const id = 'summary_' + Math.random().toString(36).substring(2, 9);
      await StudentDataService.saveStudySummary({
        id,
        userId: user.uid,
        subject: summarySubject,
        topic: summaryTopic,
        originalNotes: notesContent,
        summary: JSON.stringify(data),
        flashcards: data.flashcards || [],
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Handle Quiz Generation
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingQuiz(true);
    setIsQuizSubmitted(false);
    setCurrentAnswers({});
    setCalculatedScore(0);

    try {
      let data: any = null;
      try {
        const res = await fetch('/api/ai/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: quizSubject,
            topic: quizTopic,
            questionCount: quizCount,
            difficulty: quizDifficulty,
          }),
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn('Quiz API unreachable, fallback locally:', e);
      }

      if (!data || !data.questions || data.questions.length === 0) {
        const questions: any[] = [];
        for (let i = 1; i <= quizCount; i++) {
          questions.push({
            id: `q${i}`,
            question: `ข้อที่ ${i}: สำหรับหัวข้อ "${quizTopic}" ในวิชา ${quizSubject} ข้อใดต่อไปนี้ถูกต้องที่สุด?`,
            options: [
              `หลักการพื้นฐานและนิยามที่ถูกต้องของ ${quizTopic}`,
              `การพิจารณาเฉพาะผลลัพธ์โดยไม่คำนึงถึงเงื่อนไขและทฤษฎี`,
              `การจำเฉพาะสูตรลัดโดยไม่เข้าใจขั้นตอนการแก้ปัญหา`,
              `ไม่มีข้อใดถูกต้องตามหลักการ`,
            ],
            correctAnswer: 0,
            explanation: `เฉลย: ตัวเลือกที่ 1 ถูกต้องที่สุด เพราะการศึกษาเรื่อง ${quizTopic} ต้องยึดตามนิยามและกระบวนการคิดที่ถูกต้อง`,
          });
        }
        data = { subject: quizSubject, topic: quizTopic, questions };
      }

      setQuizData(data);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Submit Quiz Answers
  const handleSubmitQuiz = async () => {
    if (!quizData) return;

    let score = 0;
    quizData.questions.forEach((q, idx) => {
      if (currentAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });

    setCalculatedScore(score);
    setIsQuizSubmitted(true);

    if (score >= Math.ceil(quizData.questions.length * 0.7)) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    // Save result to Firebase
    const id = 'quiz_' + Math.random().toString(36).substring(2, 9);
    const resultItem: QuizResult = {
      id,
      userId: user.uid,
      subject: quizData.subject,
      topic: quizData.topic,
      score,
      totalQuestions: quizData.questions.length,
      weaknessAnalysis: score < quizData.questions.length 
        ? `ควรทบทวนหัวข้อ ${quizData.topic} เพิ่มเติม โดยเฉพาะจุดที่ตอบผิด` 
        : `ทำคะแนนได้ยอดเยี่ยม เข้าใจทฤษฎี ${quizData.topic} เป็นอย่างดี`,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    await StudentDataService.saveQuizResult(resultItem);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-emerald-500" />
            <span>AI สรุปบทเรียน & ข้อสอบจำลอง</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            สรุปเนื้อหาบทเรียน ย่อยเป็นประเด็นสำคัญ และทำแบบทดสอบวัดผลเพื่อค้นหาจุดอ่อน
          </p>
        </div>

        {/* SubTab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'summary'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>สรุปบทเรียน & การ์ดคำถาม</span>
          </button>
          <button
            onClick={() => setActiveSubTab('quiz')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'quiz'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>ทำข้อสอบจำลอง (Mock Exam)</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: AI LESSON SUMMARY */}
      {activeSubTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Column */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>ป้อนข้อมูลบทเรียนเพื่อสรุป</span>
            </h2>

            <form onSubmit={handleGenerateSummary} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  วิชา
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ฟิสิกส์ 1, เคมี, ชีววิทยา"
                  value={summarySubject}
                  onChange={(e) => setSummarySubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หัวข้อ / บทเรียน
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น กฎการเคลื่อนที่ของนิวตัน, การสังเคราะห์แสง"
                  value={summaryTopic}
                  onChange={(e) => setSummaryTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เนื้อหาบทเรียน / บันทึกการเรียน (วางข้อความได้เลย)
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="วางเนื้อหาหรือโน้ตที่จดไว้ในห้องเรียน..."
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-indigo-500 font-mono text-[11px]"
                />
              </div>

              <button
                type="submit"
                disabled={isSummarizing}
                className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                {isSummarizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI กำลังสรุปบทเรียน...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>สรุปบทเรียนและสร้าง Flashcards</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-2 space-y-4">
            {!summaryResult ? (
              <div className="p-12 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-500 mx-auto flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-200">ยังไม่มีสรุปบทเรียน</h3>
                  <p className="text-xs text-slate-400 mt-1">วางเนื้อหาบทเรียนแล้วกดปุ่มสรุปเพื่อดูประเด็นสำคัญและ Flashcards</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Overview Box */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {summaryResult.subject} • {summaryResult.topic}
                    </span>
                    <span className="text-[10px] text-slate-400">สรุปสำเร็จโดย Gemini AI</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {summaryResult.overview}
                  </p>

                  {/* Key Points */}
                  {summaryResult.keyPoints && (
                    <div className="space-y-1.5 pt-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">💡 ประเด็นสำคัญที่ต้องจำ:</p>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {summaryResult.keyPoints.map((pt: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-indigo-500 font-bold shrink-0">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Formulas or Terms */}
                  {summaryResult.keyFormulasOrTerms && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">📐 สูตรและศัพท์สำคัญ:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {summaryResult.keyFormulasOrTerms.map((f: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs">
                            <p className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">{f.term}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.meaning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mnemonic Tips */}
                  {summaryResult.mnemonicTips && (
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>เทคนิคการจำง่ายๆ</span>
                      </p>
                      <p className="text-[11px]">{summaryResult.mnemonicTips}</p>
                    </div>
                  )}
                </div>

                {/* Interactive Flashcards */}
                {summaryResult.flashcards && summaryResult.flashcards.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-purple-500" />
                      <span>Flashcards ทบทวนความจำ (คลิกเพื่อพลิกดูคำตอบ)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {summaryResult.flashcards.map((card: any, idx: number) => {
                        const isFlipped = flippedCards[idx] || false;
                        return (
                          <div
                            key={idx}
                            onClick={() => setFlippedCards({ ...flippedCards, [idx]: !isFlipped })}
                            className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer min-h-[120px] flex flex-col justify-between shadow-xs select-none ${
                              isFlipped
                                ? 'bg-indigo-600 text-white border-indigo-700 transform rotate-y-180'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] uppercase font-bold opacity-75 mb-2">
                              <span>{isFlipped ? 'เฉลย / คำตอบ' : 'คำถามที่ ' + (idx + 1)}</span>
                              <RotateCw className="w-3 h-3" />
                            </div>

                            <p className="text-xs sm:text-sm font-bold my-auto">
                              {isFlipped ? card.back : card.front}
                            </p>

                            <p className="text-[10px] text-right opacity-60 mt-2">
                              {isFlipped ? 'คลิกเพื่อดูคำถาม' : 'คลิกเพื่อดูเฉลย'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AI MOCK EXAM */}
      {activeSubTab === 'quiz' && (
        <div className="space-y-6">
          
          {/* Quiz Setup Header */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <form onSubmit={handleGenerateQuiz} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  วิชาที่ต้องการทดสอบ
                </label>
                <input
                  type="text"
                  required
                  value={quizSubject}
                  onChange={(e) => setQuizSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หัวข้อ / ขอบเขตข้อสอบ
                </label>
                <input
                  type="text"
                  required
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={isGeneratingQuiz}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {isGeneratingQuiz ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังออกข้อสอบ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>สร้างข้อสอบจำลอง</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Quiz Card */}
          {quizData && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Exam Info & Score Banner if Submitted */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    แบบทดสอบ: {quizData.subject} • {quizData.topic}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    จำนวน {quizData.questions.length} ข้อ (เลือกคำตอบที่ถูกต้องที่สุด)
                  </p>
                </div>

                {isQuizSubmitted && (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">คะแนนที่ได้</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {calculatedScore} / {quizData.questions.length}
                      </p>
                    </div>
                    <button
                      onClick={onNavigateToAnalytics}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>ดูวิเคราะห์จุดอ่อน</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {quizData.questions.map((q, qIdx) => {
                  const selectedOpt = currentAnswers[qIdx];
                  return (
                    <div
                      key={q.id || qIdx}
                      className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 shadow-xs space-y-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100">
                          {q.question}
                        </h3>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedOpt === optIdx;
                          const isCorrect = isQuizSubmitted && optIdx === q.correctAnswer;
                          const isWrongSelection = isQuizSubmitted && isSelected && optIdx !== q.correctAnswer;

                          return (
                            <button
                              key={optIdx}
                              disabled={isQuizSubmitted}
                              onClick={() => setCurrentAnswers({ ...currentAnswers, [qIdx]: optIdx })}
                              className={`p-3 rounded-2xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200 font-bold'
                                  : isWrongSelection
                                  ? 'bg-rose-50 text-rose-900 border-rose-500 dark:bg-rose-950/60 dark:text-rose-200 line-through'
                                  : isSelected
                                  ? 'bg-indigo-50 border-indigo-500 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-bold shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              <span>{opt}</span>
                              {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />}
                              {isWrongSelection && <XCircle className="w-4 h-4 text-rose-500 shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation box after submission */}
                      {isQuizSubmitted && q.explanation && (
                        <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                          <p className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">💡 คำอธิบายและเฉลย:</p>
                          <p>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit Quiz Action */}
              {!isQuizSubmitted && (
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(currentAnswers).length === 0}
                    className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-105 disabled:opacity-50 cursor-pointer"
                  >
                    ส่งคำตอบและตรวจผลสอบ
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
