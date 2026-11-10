import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import institutionRouter from './routes/institutions.js';
import keysRouter from './routes/keys.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'certiledger-api' });
});

app.get('/api', (_req, res) => {
  res.json({ name: 'CertiLedger API', version: '0.0.0' });
});

app.use('/api/auth', authRouter);
app.use('/api/institutions', institutionRouter);
app.use('/api/keys', keysRouter);

app.use(errorHandler);

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

export default app;
