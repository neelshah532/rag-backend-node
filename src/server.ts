import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { indexRouter } from './routes/index.routes.js';
import { chatRouter } from './routes/chat.routes.js';

const app = express();
app.use(cors());            // allow the frontend dev server to call us
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', indexRouter);
app.use('/api', chatRouter);

app.listen(config.port, () => {
  console.warn(`Backend listening on http://localhost:${config.port}`);
});
