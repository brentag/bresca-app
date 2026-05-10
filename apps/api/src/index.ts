import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import copilotRouter from './copilot/router';
import qrRouter from './qr/router';
import croRouter from './cro/router';
import extractRouter from './extract/router';
import accountRouter from './account/router';
import adminRouter from './admin/router';

const app = express();
const PORT = process.env.PORT ?? 3000;

const corsOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',').map(s => s.trim()).filter(Boolean);

if (corsOrigins.length === 0) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] CORS_ORIGIN no configurado — deteniendo servidor');
    process.exit(1);
  }
  console.warn('[security] CORS_ORIGIN no configurado — usando defaults de desarrollo');
  corsOrigins.push('http://localhost:5173', 'http://localhost:5174');
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'none'"],
      frameAncestors:["'none'"],
    },
  },
  frameguard:    { action: 'deny' },
  referrerPolicy:{ policy: 'no-referrer' },
}));
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// S-14 — access log de requests autenticados (sin body, sin tokens en path)
function sanitizePath(p: string): string {
  return p
    .replace(/\/qr\/[^/]+/, '/qr/:token')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '/:id');
}
app.use((req, res, next) => {
  res.on('finish', () => {
    const userId = res.locals.userId as string | undefined;
    if (!userId) return;
    console.log(JSON.stringify({
      t: new Date().toISOString(),
      m: req.method,
      p: sanitizePath(req.path),
      s: res.statusCode,
      u: userId,
    }));
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use('/copilot', copilotRouter);
app.use('/qr', qrRouter);
app.use('/cro', croRouter);
app.use('/extract', extractRouter);
app.use('/account', accountRouter);
app.use('/admin', adminRouter);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
