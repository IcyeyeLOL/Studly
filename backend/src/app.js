import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { profileRouter } from './routes/profile.js';
import { savedSolutionsRouter } from './routes/saved-solutions.js';
import { projectsRouter } from './routes/projects.js';
import { recentQuestionsRouter } from './routes/recent-questions.js';
import { uploadRouter } from './routes/upload.js';
import { solveRouter } from './routes/solve.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Health check before Clerk so it works without any auth config
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use(clerkMiddleware());

app.use('/api/profile', profileRouter);
app.use('/api/saved-solutions', savedSolutionsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/recent-questions', recentQuestionsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/solve', solveRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
