import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { indexRouter } from './routes/index.routes.js';
import { chatRouter } from './routes/chat.routes.js';

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', indexRouter);
app.use('/api', chatRouter);

app.listen(config.port, () => {
  console.warn(`Backend listening on http://localhost:${config.port}`);
});
