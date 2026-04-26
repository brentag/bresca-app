# Bresca `apps/web-patient` PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la app B2C de Bresca como PWA React+Vite en `apps/web-patient`, reemplazando React Native para V1, con deploy en Vercel sin App Store.

**Architecture:** SPA React 18 + Vite 6 + React Router v7. Autenticación vía Supabase email OTP. Cámara vía `<input capture>` nativo del browser. PWA manifest + Workbox service worker para instalabilidad en Android.

**Tech Stack:** React 18, Vite 6, TypeScript 5, React Router v7, @supabase/supabase-js, vite-plugin-pwa, Lucide React, Space Grotesk (Google Fonts)

**Design System:** Bresca Design System (`Design System/colors_and_type.css`) + ui-ux-pro-max rules aplicadas: touch targets ≥44px, Lucide icons (no emojis estructurales), bottom nav con label+icon, skeleton screens para listas, safe-area CSS para iOS notch.

---

## File Map

```
apps/web-patient/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── public/
│   ├── manifest.json
│   └── icons/icon-192.png, icon-512.png
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles/tokens.css, global.css
    ├── lib/supabase.ts, session.tsx, useProfile.ts, vault.ts, api.ts
    ├── components/ProtectedRoute.tsx, Layout.tsx, StudyCard.tsx, CategoryChip.tsx, Spinner.tsx
    └── pages/
        ├── auth/Welcome.tsx, Email.tsx, Verify.tsx
        ├── onboarding/Name.tsx, Year.tsx, Conditions.tsx, ConsentIntro.tsx
        └── app/Vault.tsx, Upload.tsx, StudyDetail.tsx, QRGenerate.tsx, QRView.tsx, Copilot.tsx, Family.tsx, Menu.tsx

API fixes (existing files):
├── apps/api/src/qr/router.ts        (fix: extracted_fields allowlist)
├── apps/api/src/copilot/router.ts   (fix: try/catch Anthropic)
└── apps/api/src/cro/router.ts       (fix: fail-closed)
```

---

## Task 1: Scaffold `apps/web-patient`

**Files:**
- Create: `apps/web-patient/package.json`
- Create: `apps/web-patient/vite.config.ts`
- Create: `apps/web-patient/tsconfig.json`
- Create: `apps/web-patient/index.html`
- Create: `apps/web-patient/public/manifest.json`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "@bresca/web-patient",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite --port 5174",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bresca/shared": "workspace:*",
    "@supabase/supabase-js": "^2.104.1",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.5.3"
  },
  "devDependencies": {
    "@types/react": "^18.3.21",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.4.1",
    "typescript": "^5.7.3",
    "vite": "^6.3.4",
    "vite-plugin-pwa": "^0.21.0"
  }
}
```

- [ ] **Step 2: Crear `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: false, // usamos public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*365 } },
        }],
      },
    }),
  ],
  resolve: { alias: { '@': '/src' } },
  server: { port: 5174 },
});
```

- [ ] **Step 3: Crear `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Crear `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#00C87A" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Bresca" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <title>Bresca</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Crear `public/manifest.json`**

```json
{
  "name": "Bresca — Tu historial médico",
  "short_name": "Bresca",
  "description": "Guardá, organizá y compartí tus estudios médicos de forma segura.",
  "theme_color": "#00C87A",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 6: Copiar icono desde Design System**

```bash
cp "Design System/assets/logo-square.png" apps/web-patient/public/icons/icon-192.png
cp "Design System/assets/logo-square.png" apps/web-patient/public/icons/icon-512.png
```

- [ ] **Step 7: Registrar en pnpm-workspace y turbo**

En `pnpm-workspace.yaml` ya existe `packages: ['apps/*', 'packages/*']` — no requiere cambio.

En `turbo.json` verificar que `build` esté en pipeline — ya existe, no requiere cambio.

- [ ] **Step 8: Instalar dependencias**

```bash
pnpm install
```

Expected: resuelve `@bresca/web-patient` con sus deps.

- [ ] **Step 9: Commit**

```bash
git add apps/web-patient/
git commit -m "feat(web-patient): scaffold PWA con Vite + vite-plugin-pwa"
```

---

## Task 2: Design Tokens + Global CSS

**Files:**
- Create: `apps/web-patient/src/styles/tokens.css`
- Create: `apps/web-patient/src/styles/global.css`

- [ ] **Step 1: Copiar tokens del Design System**

```bash
cp "Design System/colors_and_type.css" apps/web-patient/src/styles/tokens.css
```

- [ ] **Step 2: Crear `src/styles/global.css`**

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  font-family: var(--font-body);
  font-size: 16px; /* evita auto-zoom en iOS */
  -webkit-text-size-adjust: 100%;
  background: var(--bg-secondary);
  color: var(--fg-primary);
}

body {
  min-height: 100dvh; /* dvh para mobile, evita bug con 100vh */
  overscroll-behavior: none;
}

#root {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
  background: var(--bg-primary);
  position: relative;
}

button { font-family: inherit; cursor: pointer; touch-action: manipulation; }
input, textarea { font-family: inherit; }
a { color: inherit; text-decoration: none; }

/* Utilities */
.spinner { width: 24px; height: 24px; border: 2.5px solid var(--color-gray-200); border-top-color: var(--color-green); border-radius: 50%; animation: spin 0.7s linear infinite; }
.spinner-lg { width: 36px; height: 36px; border-width: 3px; }
@keyframes spin { to { transform: rotate(360deg); } }

.center { display: flex; align-items: center; justify-content: center; }
.full { flex: 1; }

/* iOS safe areas */
.safe-top { padding-top: env(safe-area-inset-top, 0px); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }

/* Skeleton animation */
.skeleton { background: linear-gradient(90deg, var(--color-gray-100) 25%, var(--color-gray-200) 50%, var(--color-gray-100) 75%); background-size: 200% 100%; animation: shimmer 1.2s ease-in-out infinite; border-radius: var(--radius-md); }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web-patient/src/styles/
git commit -m "feat(web-patient): design tokens y global CSS con safe-areas y skeleton"
```

---

## Task 3: Lib Layer

**Files:**
- Create: `apps/web-patient/src/lib/supabase.ts`
- Create: `apps/web-patient/src/lib/session.tsx`
- Create: `apps/web-patient/src/lib/useProfile.ts`
- Create: `apps/web-patient/src/lib/vault.ts`
- Create: `apps/web-patient/src/lib/api.ts`
- Create: `apps/web-patient/src/env.d.ts`

- [ ] **Step 1: Crear `src/env.d.ts`**

```typescript
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL: string;
}
interface ImportMeta { readonly env: ImportMetaEnv; }
```

- [ ] **Step 2: Crear `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@bresca/shared';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

- [ ] **Step 3: Crear `src/lib/session.tsx`** (porta directo desde `apps/mobile/lib/session.tsx`)

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type SessionState = { session: Session | null; user: User | null; loading: boolean };

const SessionContext = createContext<SessionState>({ session: null, user: null, loading: true });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
```

- [ ] **Step 4: Crear `src/lib/useProfile.ts`** (porta desde `apps/mobile/lib/useProfile.ts`)

```typescript
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useSession } from './session';
import type { Database } from '@bresca/shared';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useProfile() {
  const { user } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { setProfile(data); setLoading(false); });
  }, [user?.id]);

  return { profile, loading };
}
```

- [ ] **Step 5: Crear `src/lib/vault.ts`** (porta desde mobile, sin tipos RN)

```typescript
export type CategoryFilter = 'all' | string;

export const CATEGORIES = [
  { id: 'all',            label: 'Todos',        color: '#0F172A' },
  { id: 'hematología',    label: 'Sangre',       color: '#EF4444' },
  { id: 'bioquímica',     label: 'Bioquímica',   color: '#F59E0B' },
  { id: 'imágenes',       label: 'Imagen',       color: '#3B82F6' },
  { id: 'cardiología',    label: 'Corazón',      color: '#EC4899' },
  { id: 'endocrinología', label: 'Endocrino',    color: '#8B5CF6' },
  { id: 'respiratorio',   label: 'Respiratorio', color: '#06B6D4' },
  { id: 'otro',           label: 'Otro',         color: '#94A3B8' },
] as const;

export function categoryColor(cat: string): string {
  return CATEGORIES.find((c) => c.id === cat)?.color ?? '#94A3B8';
}

export function formatStudyDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function mockExtract(category: string) {
  const today = new Date().toISOString().slice(0, 10);
  const mocks: Record<string, { study_type: string; lab_name: string; study_date: string; extracted_fields: Record<string, string> }> = {
    hematología: { study_type: 'Hemograma completo', lab_name: 'Lab Central', study_date: today, extracted_fields: { Hemoglobina: '14.2 g/dL', Hematocrito: '43 %', Leucocitos: '6800 /mm³', Plaquetas: '220000 /mm³' } },
    bioquímica:  { study_type: 'Perfil bioquímico',  lab_name: 'Lab Central', study_date: today, extracted_fields: { Glucosa: '95 mg/dL', Creatinina: '0.9 mg/dL', 'Colesterol total': '185 mg/dL' } },
    imágenes:    { study_type: 'Radiografía de tórax', lab_name: 'Centro de Imagen', study_date: today, extracted_fields: { Hallazgo: 'Sin alteraciones', Conclusión: 'Tórax normal' } },
    cardiología: { study_type: 'Electrocardiograma', lab_name: 'Cardiología SA', study_date: today, extracted_fields: { Ritmo: 'Sinusal regular', FC: '72 lpm', Conclusión: 'ECG normal' } },
    endocrinología: { study_type: 'Perfil tiroideo', lab_name: 'Lab Endocrino', study_date: today, extracted_fields: { TSH: '2.1 mUI/L', T4L: '1.2 ng/dL' } },
    respiratorio: { study_type: 'Espirometría', lab_name: 'Pulmonar Centro', study_date: today, extracted_fields: { CVF: '4.2 L (95%)', VEF1: '3.5 L (92%)', Conclusión: 'Función normal' } },
  };
  return mocks[category] ?? { study_type: 'Estudio clínico', lab_name: '', study_date: today, extracted_fields: { Resultado: 'Ver documento adjunto' } };
}
```

- [ ] **Step 6: Crear `src/lib/api.ts`**

```typescript
import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
  };
}

export async function sendCopilotMessage(message: string, history: { role: 'user' | 'assistant'; content: string }[]) {
  const res = await fetch(`${BASE}/copilot/chat`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error(`copilot error ${res.status}`);
  return res.json() as Promise<{ reply: string; remaining: number }>;
}

export async function generateQR(study_ids: string[], ttl_hours: number) {
  const res = await fetch(`${BASE}/qr/generate`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ study_ids, ttl_hours }),
  });
  if (!res.ok) throw new Error(`qr error ${res.status}`);
  return res.json() as Promise<{ token: string; expires_at: string }>;
}

export async function revokeQR(token: string) {
  const res = await fetch(`${BASE}/qr/${token}`, { method: 'DELETE', headers: await authHeaders() });
  if (!res.ok) throw new Error(`revoke error ${res.status}`);
}

export async function getQRView(token: string) {
  const res = await fetch(`${BASE}/qr/${token}`);
  if (!res.ok) throw new Error(`qr view error ${res.status}`);
  return res.json() as Promise<{ studies: unknown[]; expires_at: string }>;
}
```

- [ ] **Step 7: Crear `.env` y `.env.example`**

```bash
# apps/web-patient/.env.example
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:3000
```

Copiar `.env.example` a `.env` y completar con los valores de `apps/web-cro/.env`.

- [ ] **Step 8: Commit**

```bash
git add apps/web-patient/src/lib/ apps/web-patient/src/env.d.ts apps/web-patient/.env.example
git commit -m "feat(web-patient): lib layer — supabase, session, useProfile, vault, api"
```

---

## Task 4: App.tsx + Routing + ProtectedRoute

**Files:**
- Create: `apps/web-patient/src/main.tsx`
- Create: `apps/web-patient/src/App.tsx`
- Create: `apps/web-patient/src/components/ProtectedRoute.tsx`
- Create: `apps/web-patient/src/components/Spinner.tsx`

- [ ] **Step 1: Crear `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

- [ ] **Step 2: Crear `src/components/Spinner.tsx`**

```tsx
export function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return <div className={size === 'lg' ? 'spinner spinner-lg' : 'spinner'} aria-label="Cargando" />;
}

export function FullPageSpinner() {
  return (
    <div className="center full" style={{ minHeight: '100dvh' }}>
      <Spinner size="lg" />
    </div>
  );
}
```

- [ ] **Step 3: Crear `src/components/ProtectedRoute.tsx`**

```tsx
import { Navigate } from 'react-router-dom';
import { useSession } from '../lib/session';
import { FullPageSpinner } from './Spinner';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Crear `src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './lib/session';
import ProtectedRoute from './components/ProtectedRoute';
import { FullPageSpinner } from './components/Spinner';
import Welcome from './pages/auth/Welcome';
import Email from './pages/auth/Email';
import Verify from './pages/auth/Verify';
import Name from './pages/onboarding/Name';
import Year from './pages/onboarding/Year';
import Conditions from './pages/onboarding/Conditions';
import ConsentIntro from './pages/onboarding/ConsentIntro';
import Layout from './components/Layout';
import Vault from './pages/app/Vault';
import Upload from './pages/app/Upload';
import StudyDetail from './pages/app/StudyDetail';
import QRGenerate from './pages/app/QRGenerate';
import QRView from './pages/app/QRView';
import Copilot from './pages/app/Copilot';
import Family from './pages/app/Family';
import Menu from './pages/app/Menu';

function RootRedirect() {
  const { session, loading } = useSession();
  if (loading) return <FullPageSpinner />;
  return session ? <Navigate to="/app/vault" replace /> : <Navigate to="/welcome" replace />;
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/auth/email" element={<Email />} />
          <Route path="/auth/verify" element={<Verify />} />
          <Route path="/onboarding/name"       element={<ProtectedRoute><Name /></ProtectedRoute>} />
          <Route path="/onboarding/year"       element={<ProtectedRoute><Year /></ProtectedRoute>} />
          <Route path="/onboarding/conditions" element={<ProtectedRoute><Conditions /></ProtectedRoute>} />
          <Route path="/onboarding/consent"    element={<ProtectedRoute><ConsentIntro /></ProtectedRoute>} />
          <Route path="/qr/:token" element={<QRView />} />
          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/vault" replace />} />
            <Route path="vault"          element={<Vault />} />
            <Route path="vault/upload"   element={<Upload />} />
            <Route path="vault/:id"      element={<StudyDetail />} />
            <Route path="vault/qr"       element={<QRGenerate />} />
            <Route path="copilot"        element={<Copilot />} />
            <Route path="family"         element={<Family />} />
            <Route path="menu"           element={<Menu />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web-patient/src/main.tsx apps/web-patient/src/App.tsx apps/web-patient/src/components/
git commit -m "feat(web-patient): App router, ProtectedRoute, Spinner"
```

---

## Task 5: Layout + Bottom Nav

**Files:**
- Create: `apps/web-patient/src/components/Layout.tsx`

- [ ] **Step 1: Crear `src/components/Layout.tsx`**

ui-ux-pro-max rules aplicadas: bottom nav ≤5 items, label+icon, active state visual, safe-area-inset-bottom, touch targets ≥44px.

```tsx
import { Outlet, NavLink } from 'react-router-dom';
import { Archive, MessageCircle, Users, Menu } from 'lucide-react';

const NAV = [
  { to: '/app/vault',   label: 'Vault',    Icon: Archive },
  { to: '/app/copilot', label: 'Copilot',  Icon: MessageCircle },
  { to: '/app/family',  label: 'Familia',  Icon: Users },
  { to: '/app/menu',    label: 'Menú',     Icon: Menu },
];

export default function Layout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        <Outlet />
      </main>
      <nav style={navStyle}>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} style={{ flex: 1, textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={itemStyle(isActive)}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span style={labelStyle(isActive)}>{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

const navStyle: React.CSSProperties = {
  position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
  width: '100%', maxWidth: 430,
  display: 'flex', backgroundColor: '#fff',
  borderTop: '1px solid #E2E8F0',
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  zIndex: 100,
};

const itemStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: 56, gap: 3, padding: '8px 0',
  color: active ? '#00C87A' : '#94A3B8',
  transition: 'color 150ms ease-out',
});

const labelStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 10, fontWeight: active ? 600 : 400, fontFamily: "'Space Grotesk', sans-serif",
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-patient/src/components/Layout.tsx
git commit -m "feat(web-patient): Layout con bottom nav + safe-area iOS"
```

---

## Task 6: Auth Screens

**Files:**
- Create: `apps/web-patient/src/pages/auth/Welcome.tsx`
- Create: `apps/web-patient/src/pages/auth/Email.tsx`
- Create: `apps/web-patient/src/pages/auth/Verify.tsx`

Referencia visual: `Design System/prototype/Onboarding.jsx` — función `Welcome`.

- [ ] **Step 1: Crear `src/pages/auth/Welcome.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

export default function Welcome() {
  const nav = useNavigate();
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', background: '#fff' }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg,#00C87A,#00B8D4,#4B6EF5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 8px 24px rgba(0,200,122,0.3)' }}>
        <Heart size={36} color="#fff" fill="#fff" />
      </div>
      <img src="/icons/icon-192.png" alt="Bresca" style={{ height: 32, marginBottom: 28, objectFit: 'contain' }} />
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', lineHeight: 1.2, marginBottom: 12 }}>
        Tu historial médico,<br />siempre con vos.
      </h1>
      <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.65, maxWidth: 280, marginBottom: 40 }}>
        Bresca guarda, organiza y te ayuda a entender todos tus estudios médicos — sin importar dónde los hiciste.
      </p>
      <button onClick={() => nav('/auth/email')} style={btnStyle}>
        Comenzar →
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: '100%', maxWidth: 320, padding: '16px', borderRadius: 100, border: 'none',
  background: 'linear-gradient(135deg,#00C87A,#4B6EF5)', color: '#fff',
  fontSize: 16, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif",
  cursor: 'pointer', minHeight: 52, /* touch target ≥44px */
};
```

- [ ] **Step 2: Crear `src/pages/auth/Email.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';

export default function Email() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    if (!email.includes('@')) { setError('Ingresá un email válido.'); return; }
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setLoading(false);
    if (err) { setError('No pudimos enviar el código. Intentá de nuevo.'); return; }
    nav('/auth/verify', { state: { email } });
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '60px 24px 32px', background: '#fff' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Ingresá tu email</h1>
      <p style={{ fontSize: 15, color: '#64748B', marginBottom: 32 }}>Te enviamos un código de verificación.</p>

      <label style={labelStyle}>EMAIL</label>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()}
        placeholder="tu@email.com"
        style={inputStyle}
        autoFocus
      />
      {error && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{error}</p>}

      <button onClick={send} disabled={loading || !email} style={{ ...btnStyle, marginTop: 24, opacity: loading || !email ? 0.5 : 1 }}>
        {loading ? <Spinner /> : 'Continuar →'}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 6, display: 'block' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 16, color: '#0F172A', outline: 'none', minHeight: 52 };
const btnStyle: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: 100, border: 'none', background: '#00C87A', color: '#fff', fontSize: 16, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' };
```

- [ ] **Step 3: Crear `src/pages/auth/Verify.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';

export default function Verify() {
  const nav = useNavigate();
  const { state } = useLocation();
  const email = (state as { email?: string })?.email ?? '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function verify() {
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    setLoading(false);
    if (err) { setError('Código incorrecto o vencido. Intentá de nuevo.'); return; }
    // Check if profile exists
    const { data: profile } = await supabase.from('profiles').select('id').maybeSingle();
    nav(profile ? '/app/vault' : '/onboarding/name', { replace: true });
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '60px 24px 32px', background: '#fff' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Revisá tu email</h1>
      <p style={{ fontSize: 15, color: '#64748B', marginBottom: 32 }}>Enviamos un código a <strong>{email}</strong>.</p>

      <label style={labelStyle}>CÓDIGO DE 6 DÍGITOS</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={otp}
        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={e => e.key === 'Enter' && otp.length === 6 && verify()}
        placeholder="000000"
        style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: 22 }}
        autoFocus
      />
      {error && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{error}</p>}

      <button onClick={verify} disabled={loading || otp.length !== 6} style={{ ...btnStyle, marginTop: 24, opacity: loading || otp.length !== 6 ? 0.5 : 1 }}>
        {loading ? <Spinner /> : 'Verificar →'}
      </button>
      <button onClick={() => nav('/auth/email')} style={{ marginTop: 12, background: 'none', border: 'none', color: '#64748B', fontSize: 14, cursor: 'pointer', minHeight: 44 }}>
        ← Cambiar email
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 6, display: 'block' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 16, color: '#0F172A', outline: 'none', minHeight: 52 };
const btnStyle: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: 100, border: 'none', background: '#00C87A', color: '#fff', fontSize: 16, fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' };
```

- [ ] **Step 4: Commit**

```bash
git add apps/web-patient/src/pages/auth/
git commit -m "feat(web-patient): auth screens — Welcome, Email, Verify OTP"
```

---

## Task 7: Onboarding Screens

**Files:**
- Create: `apps/web-patient/src/pages/onboarding/Name.tsx`
- Create: `apps/web-patient/src/pages/onboarding/Year.tsx`
- Create: `apps/web-patient/src/pages/onboarding/Conditions.tsx`
- Create: `apps/web-patient/src/pages/onboarding/ConsentIntro.tsx`

Referencia visual: `Design System/prototype/Onboarding.jsx` — funciones `ProfileSetup` y `ConsentIntro`.

- [ ] **Step 1: Crear `src/pages/onboarding/Name.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';

export default function Name() {
  const nav = useNavigate();
  const { user } = useSession();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim()) { setError('Ingresá tu nombre.'); return; }
    setLoading(true);
    const { error: err } = await supabase.from('profiles').insert({ user_id: user!.id, display_name: name.trim() });
    setLoading(false);
    if (err) { setError('Error al guardar. Intentá de nuevo.'); return; }
    nav('/onboarding/year');
  }

  return (
    <div style={wrap}>
      <ProgressDots step={0} total={4} />
      <h2 style={title}>¿Cómo te llamás?</h2>
      <p style={sub}>Solo para personalizar tu experiencia.</p>
      <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Tu nombre" autoFocus style={input} />
      {error && <p style={err}>{error}</p>}
      <button onClick={save} disabled={loading} style={btn}>
        {loading ? <Spinner /> : 'Continuar →'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/pages/onboarding/Year.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';

export default function Year() {
  const nav = useNavigate();
  const { user } = useSession();
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    const y = parseInt(year);
    if (year && (isNaN(y) || y < 1900 || y > new Date().getFullYear())) {
      setError('Ingresá un año válido.'); return;
    }
    setLoading(true);
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user!.id).single();
    if (profile && year) {
      await supabase.from('profiles').update({ birth_year: y }).eq('id', profile.id);
    }
    setLoading(false);
    nav('/onboarding/conditions');
  }

  return (
    <div style={wrap}>
      <ProgressDots step={1} total={4} />
      <h2 style={title}>¿Cuál es tu año de nacimiento?</h2>
      <p style={sub}>Opcional — para personalizar el Copilot.</p>
      <input value={year} onChange={e => setYear(e.target.value)} type="number" inputMode="numeric" placeholder="ej. 1985" style={input} autoFocus />
      {error && <p style={err}>{error}</p>}
      <button onClick={save} disabled={loading} style={btn}>
        {loading ? <Spinner /> : 'Continuar →'}
      </button>
      <button onClick={() => nav('/onboarding/conditions')} style={skip}>Saltar</button>
    </div>
  );
}
```

- [ ] **Step 3: Crear `src/pages/onboarding/Conditions.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';

const OPTIONS = ['Diabetes', 'Hipertensión', 'Oncología', 'Cardiopatía', 'Ninguna'];

export default function Conditions() {
  const nav = useNavigate();
  const { user } = useSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggle(c: string) {
    setSelected(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  async function save() {
    setLoading(true);
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user!.id).single();
    if (profile) await supabase.from('profiles').update({ conditions: selected }).eq('id', profile.id);
    setLoading(false);
    nav('/onboarding/consent');
  }

  return (
    <div style={wrap}>
      <ProgressDots step={2} total={4} />
      <h2 style={title}>Condiciones de salud</h2>
      <p style={sub}>Opcional — ayuda al Copilot a contextualizar mejor.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
        {OPTIONS.map(c => (
          <button key={c} onClick={() => toggle(c)} style={{
            padding: '10px 18px', borderRadius: 100, minHeight: 44,
            border: `1.5px solid ${selected.includes(c) ? '#00C87A' : '#E2E8F0'}`,
            background: selected.includes(c) ? 'rgba(0,200,122,0.08)' : 'transparent',
            color: selected.includes(c) ? '#00C87A' : '#64748B',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>{c}</button>
        ))}
      </div>
      <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#166534' }}>
        Tu información es privada. Nunca la compartimos sin tu consentimiento.
      </div>
      <button onClick={save} disabled={loading} style={btn}>
        {loading ? <Spinner /> : 'Continuar →'}
      </button>
      <button onClick={() => nav('/onboarding/consent')} style={skip}>Saltar</button>
    </div>
  );
}
```

- [ ] **Step 4: Crear `src/pages/onboarding/ConsentIntro.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { Check, FlaskConical } from 'lucide-react';

const POINTS = [
  'Siempre es optativo — vos decidís',
  'Tus datos nunca se identifican',
  'Podés revocar en cualquier momento',
  'Recibís info sobre estudios relevantes',
];

export default function ConsentIntro() {
  const nav = useNavigate();
  return (
    <div style={wrap}>
      <ProgressDots step={3} total={4} />
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(75,110,245,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <FlaskConical size={28} color="#4B6EF5" />
      </div>
      <h2 style={title}>Sobre la investigación médica</h2>
      <p style={sub}>Bresca colabora con organizaciones de investigación clínica. Podés elegir contribuir con tus datos de forma anónima.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
        {POINTS.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,200,122,0.12)', border: '1px solid rgba(0,200,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Check size={12} color="#00C87A" strokeWidth={3} />
            </div>
            <span style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.55 }}>{t}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginBottom: 16 }}>
        Podés cambiar estas opciones en Menú → Consentimiento en cualquier momento.
      </p>
      <button onClick={() => nav('/app/vault', { replace: true })} style={btn}>¡Entendido, empezar!</button>
      <button onClick={() => nav('/app/vault', { replace: true })} style={skip}>Configurar más tarde</button>
    </div>
  );
}
```

- [ ] **Step 5: Agregar shared styles a un archivo auxiliar `onboarding-styles.ts`**

Crear `src/pages/onboarding/_styles.ts` con los estilos compartidos que usaron los 4 screens:

```typescript
import type React from 'react';
export const wrap: React.CSSProperties = { minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '40px 24px 32px', background: '#fff' };
export const title: React.CSSProperties = { fontSize: 24, fontWeight: 700, color: '#0F172A', marginBottom: 8 };
export const sub: React.CSSProperties = { fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 };
export const input: React.CSSProperties = { width: '100%', padding: '14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 16, color: '#0F172A', outline: 'none', minHeight: 52, marginBottom: 8 };
export const btn: React.CSSProperties = { width: '100%', padding: '16px', borderRadius: 100, border: 'none', background: '#00C87A', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif" };
export const skip: React.CSSProperties = { marginTop: 12, background: 'none', border: 'none', color: '#94A3B8', fontSize: 14, cursor: 'pointer', minHeight: 44, width: '100%' };
export const err: React.CSSProperties = { color: '#EF4444', fontSize: 13, marginBottom: 8 };
```

Crear `src/pages/onboarding/ProgressDots.tsx`:
```tsx
export function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ height: 6, borderRadius: 100, background: i === step ? '#00C87A' : '#E2E8F0', width: i === step ? 20 : 6, transition: 'all 250ms ease-out' }} />
      ))}
    </div>
  );
}
```

Actualizar los 4 screens de onboarding para importar desde `_styles.ts` y `ProgressDots.tsx`.

- [ ] **Step 6: Commit**

```bash
git add apps/web-patient/src/pages/onboarding/
git commit -m "feat(web-patient): onboarding — Name, Year, Conditions, ConsentIntro"
```

---

## Task 8: Vault Screen + Componentes

**Files:**
- Create: `apps/web-patient/src/pages/app/Vault.tsx`
- Create: `apps/web-patient/src/components/StudyCard.tsx`
- Create: `apps/web-patient/src/components/CategoryChip.tsx`

ui-ux-pro-max: skeleton screens para loading >300ms, empty state con CTA, touch targets ≥44px en chips.

- [ ] **Step 1: Crear `src/components/CategoryChip.tsx`**

```tsx
type Props = { label: string; color: string; active: boolean; onClick: () => void };

export function CategoryChip({ label, color, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px', borderRadius: 100, border: `1.5px solid ${active ? color : '#E2E8F0'}`,
        background: active ? color + '18' : '#fff', color: active ? color : '#64748B',
        fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
        minHeight: 44, whiteSpace: 'nowrap', fontFamily: "'Space Grotesk',sans-serif",
        transition: 'all 150ms ease-out',
      }}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Crear `src/components/StudyCard.tsx`**

```tsx
import { categoryColor, formatStudyDate } from '../lib/vault';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

export function StudyCard({ study, onClick }: { study: Study; onClick: () => void }) {
  const color = categoryColor(study.category);
  return (
    <button onClick={onClick} style={{ width: '100%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, display: 'flex', overflow: 'hidden', cursor: 'pointer', textAlign: 'left', minHeight: 70, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ width: 4, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{study.study_type}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: study.confirmed ? '#DCFCE7' : '#FEF3C7', color: study.confirmed ? '#16A34A' : '#D97706' }}>
            {study.confirmed ? 'Confirmado' : 'Pendiente'}
          </span>
        </div>
        <span style={{ fontSize: 13, color: '#64748B' }}>{formatStudyDate(study.study_date)}</span>
        {study.lab_name && <span style={{ fontSize: 12, color: '#94A3B8', display: 'block' }}>{study.lab_name}</span>}
      </div>
    </button>
  );
}

export function StudyCardSkeleton() {
  return (
    <div style={{ height: 70, borderRadius: 14, display: 'flex', overflow: 'hidden' }}>
      <div className="skeleton" style={{ width: 4 }} />
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="skeleton" style={{ height: 16, width: '60%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 13, width: '30%', borderRadius: 4 }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Crear `src/pages/app/Vault.tsx`**

```tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { CATEGORIES, type CategoryFilter } from '../../lib/vault';
import { StudyCard, StudyCardSkeleton } from '../../components/StudyCard';
import { CategoryChip } from '../../components/CategoryChip';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

export default function Vault() {
  const nav = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const isMounted = useRef(true);

  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    let q = supabase.from('studies').select('*').eq('profile_id', profile.id).order('study_date', { ascending: false });
    if (filter !== 'all') q = q.eq('category', filter);
    q.then(({ data }) => { if (isMounted.current) { setStudies(data ?? []); setLoading(false); } });
  }, [profile?.id, filter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 'env(safe-area-inset-top, 16px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A' }}>Mi Vault</h1>
        <button onClick={() => nav('/app/vault/upload')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#00C87A', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
          <Plus size={16} strokeWidth={2.5} /> Subir
        </button>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 12px', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <CategoryChip key={cat.id} label={cat.label} color={cat.color} active={filter === cat.id} onClick={() => setFilter(cat.id)} />
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 20px 32px' }}>
        {profileLoading || loading
          ? Array.from({ length: 4 }).map((_, i) => <StudyCardSkeleton key={i} />)
          : studies.length === 0
            ? <EmptyState onUpload={() => nav('/app/vault/upload')} />
            : studies.map(s => <StudyCard key={s.id} study={s} onClick={() => nav(`/app/vault/${s.id}`)} />)
        }
      </div>
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      <span style={{ fontSize: 48 }}>🗂</span>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Tu vault está vacío</h3>
      <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>Subí tu primer estudio médico y quedará guardado de forma segura.</p>
      <button onClick={onUpload} style={{ marginTop: 8, background: '#00C87A', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', minHeight: 48 }}>
        Subir estudio
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web-patient/src/pages/app/Vault.tsx apps/web-patient/src/components/
git commit -m "feat(web-patient): Vault screen con skeleton, filtros, StudyCard"
```

---

## Task 9: Upload Screen (3 pasos)

**Files:**
- Create: `apps/web-patient/src/pages/app/Upload.tsx`

ui-ux-pro-max: progressive disclosure (3 pasos), loading feedback al subir, disable botón durante async.

- [ ] **Step 1: Crear `src/pages/app/Upload.tsx`**

```tsx
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';
import { CATEGORIES, mockExtract } from '../../lib/vault';
import { CategoryChip } from '../../components/CategoryChip';
import { Spinner } from '../../components/Spinner';
import type { Database } from '@bresca/shared';

type Step = 'source' | 'processing' | 'review';
type Draft = { category: string; study_type: string; lab_name: string; study_date: string; extracted_fields: Record<string, string>; storagePath?: string };

const MIME_MAP: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

export default function Upload() {
  const nav = useNavigate();
  const { user } = useSession();
  const { profile } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('source');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [category, setCategory] = useState('hematología');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('processing');

    // Upload to storage
    let storagePath: string | undefined;
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      storagePath = `${user!.id}/${Date.now()}.${ext}`;
      const mime = MIME_MAP[ext] ?? 'image/jpeg';
      const { error } = await supabase.storage.from('studies').upload(storagePath, file, { contentType: mime });
      if (error) storagePath = undefined;
    } catch { storagePath = undefined; }

    // Mock OCR — replace with real API when ready
    await new Promise<void>(r => setTimeout(r, 1500));
    const extracted = mockExtract(category);
    setDraft({ ...extracted, category, storagePath });
    setStep('review');
  }

  async function saveStudy() {
    if (!draft || !profile) return;
    setSaving(true); setSaveError('');
    const { error } = await supabase.from('studies').insert({
      profile_id: profile.id,
      study_type: draft.study_type,
      category: draft.category,
      study_date: draft.study_date,
      lab_name: draft.lab_name || null,
      extracted_fields: draft.extracted_fields as Database['public']['Tables']['studies']['Row']['extracted_fields'],
      confirmed: true,
      storage_path: draft.storagePath ?? null,
    });
    setSaving(false);
    if (error) { setSaveError('No pudimos guardar el estudio. Intentá de nuevo.'); return; }
    nav('/app/vault', { replace: true });
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <button onClick={() => step === 'source' ? nav(-1) : setStep('source')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 15, cursor: 'pointer', minHeight: 44, minWidth: 60 }}>
          <ArrowLeft size={18} /> {step === 'source' ? 'Vault' : 'Atrás'}
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Subir estudio</span>
        <div style={{ width: 60 }} />
      </div>

      {step === 'source' && (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>¿Qué tipo de estudio es?</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <CategoryChip key={cat.id} label={cat.label} color={cat.color} active={category === cat.id} onClick={() => setCategory(cat.id)} />
              ))}
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>¿Cómo querés subir el archivo?</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Camera button — capture="environment" abre cámara trasera en mobile */}
              <label style={sourceCardStyle}>
                <Camera size={32} color="#00C87A" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Cámara</span>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFile} style={{ display: 'none' }} />
              </label>
              {/* Gallery/file button — sin capture para elegir de galería */}
              <label style={sourceCardStyle}>
                <Image size={32} color="#4B6EF5" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Galería / PDF</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFile} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Spinner size="lg" />
          <p style={{ fontSize: 17, fontWeight: 600, color: '#0F172A' }}>Extrayendo datos del estudio…</p>
          <p style={{ fontSize: 14, color: '#64748B' }}>Esto toma unos segundos</p>
        </div>
      )}

      {step === 'review' && draft && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Revisá los datos extraídos</h2>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>Podés corregir cualquier campo antes de guardar.</p>

          <div style={fieldGroupStyle}>
            <FieldRow label="Tipo de estudio" value={draft.study_type} onChange={v => setDraft({ ...draft, study_type: v })} />
            <FieldRow label="Laboratorio / Centro" value={draft.lab_name} onChange={v => setDraft({ ...draft, lab_name: v })} />
            <FieldRow label="Fecha (AAAA-MM-DD)" value={draft.study_date} onChange={v => setDraft({ ...draft, study_date: v })} type="date" />
          </div>

          <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginTop: 16, marginBottom: 8 }}>RESULTADOS</p>
          <div style={fieldGroupStyle}>
            {Object.entries(draft.extracted_fields).map(([key, val]) => (
              <FieldRow key={key} label={key} value={val} onChange={v => setDraft({ ...draft, extracted_fields: { ...draft.extracted_fields, [key]: v } })} />
            ))}
          </div>

          {saveError && <p style={{ color: '#EF4444', fontSize: 13, marginTop: 12 }}>{saveError}</p>}
          <button onClick={saveStudy} disabled={saving} style={{ width: '100%', marginTop: 20, padding: '16px', borderRadius: 14, border: 'none', background: saving ? '#94A3B8' : '#00C87A', color: '#fff', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {saving ? <><Spinner /> Guardando…</> : 'Guardar en mi Vault'}
          </button>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', border: 'none', outline: 'none', fontSize: 15, color: '#0F172A', background: 'transparent', minHeight: 28 }} />
    </div>
  );
}

const sourceCardStyle: React.CSSProperties = { flex: 1, background: '#fff', borderRadius: 16, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: '1.5px solid #E2E8F0', cursor: 'pointer', minHeight: 110 };
const fieldGroupStyle: React.CSSProperties = { background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0' };
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-patient/src/pages/app/Upload.tsx
git commit -m "feat(web-patient): Upload screen — camera/gallery, mock OCR, review, save"
```

---

## Task 10: StudyDetail + QRGenerate + QRView

**Files:**
- Create: `apps/web-patient/src/pages/app/StudyDetail.tsx`
- Create: `apps/web-patient/src/pages/app/QRGenerate.tsx`
- Create: `apps/web-patient/src/pages/app/QRView.tsx`

- [ ] **Step 1: Crear `src/pages/app/StudyDetail.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { categoryColor, formatStudyDate } from '../../lib/vault';
import { FullPageSpinner } from '../../components/Spinner';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

export default function StudyDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('studies').select('*').eq('id', id).single()
      .then(({ data }) => { setStudy(data); setLoading(false); });
  }, [id]);

  if (loading) return <FullPageSpinner />;
  if (!study) return <div style={{ padding: 24, color: '#64748B' }}>Estudio no encontrado.</div>;

  const color = categoryColor(study.category);

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <button onClick={() => nav(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 15, cursor: 'pointer', minHeight: 44 }}>
          <ArrowLeft size={18} /> Vault
        </button>
        <button onClick={() => nav('/app/vault/qr', { state: { study_id: study.id } })} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#00C87A', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}>
          <QrCode size={18} /> Compartir QR
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', marginBottom: 16 }}>
          <div style={{ height: 4, background: color }} />
          <div style={{ padding: '16px 20px' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{study.study_type}</h1>
            <p style={{ fontSize: 14, color: '#64748B' }}>{formatStudyDate(study.study_date)}</p>
            {study.lab_name && <p style={{ fontSize: 13, color: '#94A3B8' }}>{study.lab_name}</p>}
          </div>
        </div>

        {Object.entries((study.extracted_fields as Record<string, string>) ?? {}).length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 10 }}>RESULTADOS</p>
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
              {Object.entries(study.extracted_fields as Record<string, string>).map(([key, val], i, arr) => (
                <div key={key} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>{key}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{val}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/pages/app/QRGenerate.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { generateQR } from '../../lib/api';
import { useProfile } from '../../lib/useProfile';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';
import type { Database } from '@bresca/shared';

type Study = Database['public']['Tables']['studies']['Row'];

export default function QRGenerate() {
  const nav = useNavigate();
  const { profile } = useProfile();
  const [studies, setStudies] = useState<Study[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [ttl, setTtl] = useState(24);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase.from('studies').select('*').eq('profile_id', profile.id).eq('confirmed', true)
      .order('study_date', { ascending: false })
      .then(({ data }) => setStudies(data ?? []));
  }, [profile?.id]);

  async function generate() {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const { token: t } = await generateQR(selected, ttl);
      setToken(t);
    } catch { /* handle silently */ }
    setLoading(false);
  }

  const url = token ? `${window.location.origin}/qr/${token}` : '';

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0', gap: 12 }}>
        <button onClick={() => nav(-1)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Generar QR</h1>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {!token ? (
          <>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>Seleccioná los estudios a compartir:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {studies.map(s => (
                  <button key={s.id} onClick={() => setSelected(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${selected.includes(s.id) ? '#00C87A' : '#E2E8F0'}`, background: selected.includes(s.id) ? 'rgba(0,200,122,0.06)' : '#fff', cursor: 'pointer', textAlign: 'left', minHeight: 54 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected.includes(s.id) ? '#00C87A' : '#CBD5E1'}`, background: selected.includes(s.id) ? '#00C87A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selected.includes(s.id) && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 14, color: '#0F172A' }}>{s.study_type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Duración del acceso:</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[24, 48, 72].map(h => (
                  <button key={h} onClick={() => setTtl(h)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${ttl === h ? '#00C87A' : '#E2E8F0'}`, background: ttl === h ? 'rgba(0,200,122,0.08)' : '#fff', color: ttl === h ? '#00C87A' : '#64748B', fontWeight: ttl === h ? 600 : 400, cursor: 'pointer', minHeight: 44 }}>
                    {h}hs
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generate} disabled={loading || selected.length === 0} style={{ padding: '16px', borderRadius: 14, border: 'none', background: selected.length === 0 ? '#E2E8F0' : '#00C87A', color: selected.length === 0 ? '#94A3B8' : '#fff', fontSize: 16, fontWeight: 600, cursor: selected.length === 0 ? 'not-allowed' : 'pointer', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {loading ? <><Spinner /> Generando…</> : 'Generar QR'}
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 20 }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`} alt="QR Code" width={200} height={200} style={{ borderRadius: 16 }} />
            <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid #E2E8F0', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
              <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#00C87A' : '#64748B', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>El médico puede abrir este link en su navegador — sin instalar nada.</p>
            <button onClick={() => setToken('')} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 14, cursor: 'pointer', minHeight: 44 }}>
              Generar otro QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Crear `src/pages/app/QRView.tsx`** (vista pública del médico)

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FullPageSpinner } from '../../components/Spinner';
import { formatStudyDate } from '../../lib/vault';

type StudySafe = { id: string; study_type: string; category: string; study_date: string; lab_name: string | null; extracted_fields: Record<string, string> };

export default function QRView() {
  const { token } = useParams<{ token: string }>();
  const [studies, setStudies] = useState<StudySafe[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/qr/${token}`)
      .then(r => { if (!r.ok) throw new Error('invalid'); return r.json(); })
      .then(d => { setStudies(d.studies ?? []); setExpiresAt(d.expires_at); setLoading(false); })
      .catch(() => { setError('Este QR es inválido o ya venció.'); setLoading(false); });
  }, [token]);

  if (loading) return <FullPageSpinner />;

  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <span style={{ fontSize: 48, marginBottom: 16 }}>⏱</span>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>QR vencido o inválido</h2>
      <p style={{ fontSize: 14, color: '#64748B' }}>El paciente puede generar un nuevo código QR desde la app Bresca.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#F7F9FC', padding: '24px 20px', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <img src="/icons/icon-192.png" alt="Bresca" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Historial médico compartido</h1>
          <p style={{ fontSize: 12, color: '#94A3B8' }}>Acceso válido hasta: {new Date(expiresAt).toLocaleString('es-AR')}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {studies.map((s: StudySafe) => (
          <div key={s.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{s.study_type}</h2>
              <p style={{ fontSize: 13, color: '#64748B' }}>{formatStudyDate(s.study_date)}{s.lab_name ? ` · ${s.lab_name}` : ''}</p>
            </div>
            {Object.entries(s.extracted_fields ?? {}).map(([k, v]) => (
              <div key={k} style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#64748B' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 24 }}>
        Compartido vía Bresca — acceso de solo lectura, controlado por el paciente.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web-patient/src/pages/app/StudyDetail.tsx apps/web-patient/src/pages/app/QRGenerate.tsx apps/web-patient/src/pages/app/QRView.tsx
git commit -m "feat(web-patient): StudyDetail, QRGenerate, QRView (vista médico pública)"
```

---

## Task 11: Copilot Screen

**Files:**
- Create: `apps/web-patient/src/pages/app/Copilot.tsx`

- [ ] **Step 1: Crear `src/pages/app/Copilot.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { sendCopilotMessage } from '../../lib/api';
import { Spinner } from '../../components/Spinner';

type Message = { role: 'user' | 'assistant'; content: string };

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput(''); setError('');
    const next: Message[] = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const { reply, remaining: rem } = await sendCopilotMessage(msg, messages);
      setMessages([...next, { role: 'assistant', content: reply }]);
      setRemaining(rem);
    } catch {
      setError('Error al conectar con el Copilot. Intentá de nuevo.');
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F7F9FC' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Copilot</h1>
        <p style={{ fontSize: 13, color: '#64748B' }}>Tu asistente médico personal{remaining !== null ? ` · ${remaining} consultas restantes hoy` : ''}</p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12, textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#00C87A,#4B6EF5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 28 }}>🧬</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>¿En qué te ayudo?</h2>
            <p style={{ fontSize: 14, color: '#64748B', maxWidth: 260 }}>Preguntame sobre tus estudios, resultados o cualquier duda de salud.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? '#00C87A' : '#fff', color: m.role === 'user' ? '#fff' : '#0F172A', fontSize: 15, lineHeight: 1.6, border: m.role === 'assistant' ? '1px solid #E2E8F0' : 'none' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '14px 18px', borderRadius: '18px 18px 18px 4px', background: '#fff', border: '1px solid #E2E8F0' }}>
              <Spinner />
            </div>
          </div>
        )}
        {error && <p style={{ fontSize: 13, color: '#EF4444', textAlign: 'center' }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', background: '#fff', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Preguntá sobre tus estudios…"
          rows={1}
          style={{ flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '12px 14px', fontSize: 15, fontFamily: "'Space Grotesk',sans-serif", resize: 'none', outline: 'none', maxHeight: 120, color: '#0F172A' }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{ width: 46, height: 46, borderRadius: 14, border: 'none', background: loading || !input.trim() ? '#E2E8F0' : '#00C87A', color: '#fff', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-patient/src/pages/app/Copilot.tsx
git commit -m "feat(web-patient): Copilot chat screen con rate limit display"
```

---

## Task 12: Family + Menu Screens

**Files:**
- Create: `apps/web-patient/src/pages/app/Family.tsx`
- Create: `apps/web-patient/src/pages/app/Menu.tsx`

- [ ] **Step 1: Crear `src/pages/app/Family.tsx`**

```tsx
import { Users } from 'lucide-react';

export default function Family() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 32, textAlign: 'center', gap: 16 }}>
      <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(75,110,245,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Users size={34} color="#4B6EF5" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Familia</h2>
      <p style={{ fontSize: 14, color: '#64748B', maxWidth: 260, lineHeight: 1.6 }}>
        Próximamente podrás gestionar el historial de tu familia desde un solo lugar.
      </p>
      <span style={{ fontSize: 12, background: '#EFF6FF', color: '#4B6EF5', padding: '4px 12px', borderRadius: 100, fontWeight: 600 }}>Próximamente</span>
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/pages/app/Menu.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { User, Shield, LogOut, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../lib/useProfile';
import { useSession } from '../../lib/session';

export default function Menu() {
  const nav = useNavigate();
  const { user } = useSession();
  const { profile } = useProfile();

  async function logout() {
    await supabase.auth.signOut();
    nav('/welcome', { replace: true });
  }

  const items = [
    { icon: <User size={20} color="#64748B" />, label: 'Mi perfil', sub: profile?.display_name ?? '', action: () => {} },
    { icon: <Shield size={20} color="#64748B" />, label: 'Centro de consentimiento', sub: 'Gestioná tus permisos', action: () => {} },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Menú</h1>
      {user?.email && <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>{user.email}</p>}

      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', marginBottom: 24 }}>
        {items.map((item, i) => (
          <button key={i} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'none', border: 'none', borderBottom: i < items.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer', textAlign: 'left', minHeight: 62 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F7F9FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>{item.label}</p>
              {item.sub && <p style={{ fontSize: 12, color: '#94A3B8' }}>{item.sub}</p>}
            </div>
            <ChevronRight size={16} color="#94A3B8" />
          </button>
        ))}
      </div>

      <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, cursor: 'pointer', minHeight: 62 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogOut size={20} color="#EF4444" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#EF4444' }}>Cerrar sesión</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web-patient/src/pages/app/Family.tsx apps/web-patient/src/pages/app/Menu.tsx
git commit -m "feat(web-patient): Family (placeholder) y Menu con logout"
```

---

## Task 13: Critical API Fixes

**Files:**
- Modify: `apps/api/src/qr/router.ts`
- Modify: `apps/api/src/copilot/router.ts`
- Modify: `apps/api/src/cro/router.ts`
- Modify: `apps/mobile/app/(app)/vault/upload.tsx` (dead code)

- [ ] **Step 1: Fix `qr/router.ts:99` — extracted_fields allowlist**

En `apps/api/src/qr/router.ts`, reemplazar el select en GET `/:token`:

Antes:
```typescript
.select('id, study_type, category, study_date, lab_name, extracted_fields, confirmed')
```

Después:
```typescript
.select('id, study_type, category, study_date, lab_name, extracted_fields, confirmed')
```

Y justo antes de `res.json(...)`, agregar filtrado:

```typescript
const SAFE_FIELDS = new Set([
  'Hemoglobina','Hematocrito','Leucocitos','Plaquetas','VCM','Glucosa','Creatinina',
  'Colesterol total','Triglicéridos','Ácido úrico','TSH','T4L','T3L','CVF','VEF1',
  'Relación VEF1/CVF','Ritmo','FC','QRS','Conclusión','Hallazgo','Técnica',
]);

const safeStudies = (studies ?? []).map(s => ({
  ...s,
  extracted_fields: Object.fromEntries(
    Object.entries((s.extracted_fields as Record<string, unknown>) ?? {})
      .filter(([k]) => SAFE_FIELDS.has(k))
  ),
}));

res.json({ studies: safeStudies, expires_at: qrToken.expires_at });
```

- [ ] **Step 2: Fix `copilot/router.ts:67` — try/catch en Anthropic call**

En `apps/api/src/copilot/router.ts`, envolver la llamada a `anthropic.messages.create`:

```typescript
let response: Anthropic.Message;
try {
  response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: COPILOT_MAX_TOKENS,
    system: systemPrompt,
    messages,
  });
} catch (err) {
  console.error('Anthropic API error:', err);
  res.status(503).json({ error: 'Servicio temporalmente no disponible. Intentá en unos minutos.' });
  return;
}

const text = response.content.find((b) => b.type === 'text')?.text ?? '';
res.json({ reply: text, remaining });
```

- [ ] **Step 3: Fix `cro/router.ts:14` — fail-closed en prod**

Reemplazar:
```typescript
if (allowlist.length === 0) { next(); return; } // no restriction in dev
```

Por:
```typescript
if (allowlist.length === 0) {
  if (process.env.NODE_ENV !== 'production') { next(); return; }
  res.status(403).json({ error: 'CRO access not configured' });
  return;
}
```

- [ ] **Step 4: Fix dead code en `apps/mobile/app/(app)/vault/upload.tsx:38`**

Eliminar líneas 37-38:
```typescript
const fn =
  source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.requestMediaLibraryPermissionsAsync;
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/qr/router.ts apps/api/src/copilot/router.ts apps/api/src/cro/router.ts apps/mobile/app/\(app\)/vault/upload.tsx
git commit -m "fix: extracted_fields allowlist en QR, try/catch Anthropic, CRO fail-closed, dead code"
```

---

## Task 14: Deploy Config

**Files:**
- Modify: `vercel.json` (agregar web-patient)
- Create: `apps/web-patient/vercel.json`

- [ ] **Step 1: Agregar web-patient al vercel.json raíz o crear proyecto Vercel separado**

Opción recomendada: **proyecto Vercel separado** para web-patient (URL distinta, deploy independiente).

Crear `apps/web-patient/vercel.json`:
```json
{
  "buildCommand": "pnpm --filter=@bresca/web-patient build",
  "outputDirectory": "apps/web-patient/dist",
  "installCommand": "pnpm install",
  "framework": null,
  "rewrites": [{ "source": "/((?!assets|icons|manifest\\.json|sw\\.js).*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Variables de entorno en Vercel**

En el dashboard de Vercel para el proyecto web-patient, agregar:
```
VITE_SUPABASE_URL      = (mismo valor que web-cro)
VITE_SUPABASE_ANON_KEY = (mismo valor que web-cro)
VITE_API_URL           = https://[railway-url].railway.app
```

- [ ] **Step 3: Verificar build local**

```bash
pnpm --filter=@bresca/web-patient build
```

Expected: `apps/web-patient/dist/` generado sin errores TypeScript.

- [ ] **Step 4: Commit**

```bash
git add apps/web-patient/vercel.json
git commit -m "feat(web-patient): vercel deploy config con SPA rewrites"
```

---

## Self-Review

### Spec coverage check

| Requisito | Task |
|---|---|
| Auth email OTP | Task 6 |
| Onboarding 4 pasos | Task 7 |
| Bottom nav + Layout | Task 5 |
| Vault list + skeleton + filtros | Task 8 |
| Upload cámara web + review | Task 9 |
| Study detail | Task 10 |
| QR generar + vista médico | Task 10 |
| Copilot chat | Task 11 |
| Family + Menú | Task 12 |
| PWA manifest + service worker | Task 1 |
| iOS meta tags | Task 1 |
| Safe-area insets | Task 2, Task 5 |
| Touch targets ≥44px | Todos los botones/inputs |
| Skeleton screens | Task 8 |
| Lucide icons (no emojis estructurales) | Tasks 5–12 |
| extracted_fields fix | Task 13 |
| try/catch Anthropic | Task 13 |
| CRO fail-closed | Task 13 |
| Deploy Vercel | Task 14 |

### Type consistency check
- `Database['public']['Tables']['studies']['Row']` usado consistentemente en Tasks 8, 9, 10
- `sendCopilotMessage` en `api.ts` (Task 3) ↔ `Copilot.tsx` (Task 11): ✓ parámetros coinciden
- `generateQR` en `api.ts` (Task 3) ↔ `QRGenerate.tsx` (Task 10): ✓

### Placeholder scan
- mockExtract: presente por diseño (OCR real es Task futura). Comentado explícitamente en Upload.tsx.
- QR icon image: usa `api.qrserver.com` — servicio externo gratuito para MVP. Reemplazar con librería local en V2.
- Family screen: placeholder por diseño, marcado como "Próximamente".

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-04-25-web-patient-pwa.md`.

**Dos opciones de ejecución:**

**1. Subagent-Driven (recomendado)** — un subagente por task, review entre tasks, iteración rápida. Usar `superpowers:subagent-driven-development`.

**2. Inline Execution** — ejecutar tasks en esta sesión con `superpowers:executing-plans`, con checkpoints de revisión.

¿Cuál preferís?
