import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import copilotRouter from './copilot/router';
import qrRouter from './qr/router';
import croRouter from './cro/router';
import extractRouter from './extract/router';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use('/copilot', copilotRouter);
app.use('/qr', qrRouter);
app.use('/cro', croRouter);
app.use('/extract', extractRouter);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
