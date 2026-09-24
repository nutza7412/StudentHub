import express from 'express';
import dotenv from 'dotenv';
import { 
  generateStudySchedule, 
  summarizeLesson, 
  generateQuiz, 
  analyzeWeaknesses 
} from './aiService.ts';

dotenv.config();

export const app = express();

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'StudentHub API', time: new Date().toISOString() });
});

// AI 1: Schedule Homework & Study Blocks
app.post('/api/ai/schedule', async (req, res) => {
  try {
    const { homeworkList, timetable, dailyAvailableHours } = req.body;
    const result = await generateStudySchedule(
      homeworkList || [], 
      timetable || [], 
      dailyAvailableHours || 3
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/ai/schedule:', error);
    res.status(500).json({ error: error.message || 'Failed to generate schedule' });
  }
});

// AI 2: Summarize Lesson & Flashcards
app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { subject, topic, notes } = req.body;
    if (!subject || !topic || !notes) {
      return res.status(400).json({ error: 'Missing subject, topic, or notes' });
    }
    const result = await summarizeLesson(subject, topic, notes);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/ai/summarize:', error);
    res.status(500).json({ error: error.message || 'Failed to summarize lesson' });
  }
});

// AI 3: Generate Practice Quiz
app.post('/api/ai/quiz', async (req, res) => {
  try {
    const { subject, topic, questionCount, difficulty } = req.body;
    if (!subject || !topic) {
      return res.status(400).json({ error: 'Missing subject or topic' });
    }
    const result = await generateQuiz(
      subject, 
      topic, 
      questionCount || 5, 
      difficulty || 'medium'
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/ai/quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
});

// AI 4: Analyze Weaknesses
app.post('/api/ai/weakness', async (req, res) => {
  try {
    const { quizHistory, homeworkStats, subjectStudyTime } = req.body;
    const result = await analyzeWeaknesses({ 
      quizHistory: quizHistory || [], 
      homeworkStats: homeworkStats || {}, 
      subjectStudyTime: subjectStudyTime || {} 
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/ai/weakness:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze weaknesses' });
  }
});

export default app;
