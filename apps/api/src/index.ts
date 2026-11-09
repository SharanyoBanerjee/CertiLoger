import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'certiledger-api' });
});

app.get('/api', (_req, res) => {
  res.json({ name: 'CertiLedger API', version: '0.0.0' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

export default app;
