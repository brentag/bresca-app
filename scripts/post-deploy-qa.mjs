#!/usr/bin/env node
/**
 * Bresca QA Agent
 * Pruebas end-to-end de flujos de usuario reales después de cada deploy.
 * Análisis con Claude Haiku (económico). Genera reporte + GitHub issues.
 *
 * Uso:
 *   node scripts/post-deploy-qa.mjs
 *   node scripts/post-deploy-qa.mjs --no-issues   # solo reporte
 *   node scripts/post-deploy-qa.mjs --dry-run     # sin requests a prod
 *
 * Env vars requeridas (leer de .env o sistema):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY  (para crear/borrar test users)
 *   ANTHROPIC_API_KEY          (Haiku para análisis)
 *   QA_WEB_PATIENT_URL         (ej: https://app.bresca.ar)
 *   QA_WEB_CRO_URL             (ej: https://cro.bresca.ar)
 *   QA_API_URL                 (ej: https://api.bresca.ar)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Carga .env sin dependencias externas ──────────────────────────────────────
for (const f of ['.env', '.env.local', 'apps/api/.env']) {
  try {
    const lines = readFileSync(resolve(ROOT, f), 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* archivo no existe */ }
}

// ── Config ────────────────────────────────────────────────────────────────────
const C = {
  supabaseUrl:  process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL        || '',
  supabaseAnon: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  supabaseSR:   process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  webPatient:   process.env.QA_WEB_PATIENT_URL || process.env.VITE_APP_URL || '',
  webCro:       process.env.QA_WEB_CRO_URL     || '',
  api:          process.env.QA_API_URL          || 'https://api-bresca.railway.app',
  noIssues:     process.argv.includes('--no-issues'),
  dryRun:       process.argv.includes('--dry-run'),
};

// ── Estado de la sesión de pruebas ────────────────────────────────────────────
const S = {
  email:           `qa-${Date.now()}@bresca-qa.test`,
  password:        `Qa!${Math.random().toString(36).slice(2, 10)}`,
  email2:          `qa2-${Date.now()}@bresca-qa.test`,
  password2:       `Qa!${Math.random().toString(36).slice(2, 10)}`,
  userId:          null,
  userId2:         null,
  token:           null,
  profileId:       null,
  studyId:         null,
  familyProfileId: null,
};

const results = [];

// ── Helpers Supabase REST (fetch nativo, Node 20+) ────────────────────────────

function sbHeaders(token, extra = {}) {
  return {
    'apikey': C.supabaseAnon,
    'Authorization': `Bearer ${token || C.supabaseAnon}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function sbAdminHeaders() {
  return {
    'apikey': C.supabaseSR,
    'Authorization': `Bearer ${C.supabaseSR}`,
    'Content-Type': 'application/json',
  };
}

async function sbGet(table, qs, token) {
  const r = await fetch(`${C.supabaseUrl}/rest/v1/${table}?${qs}`, {
    headers: sbHeaders(token),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) { const e = new Error(`GET ${table}: HTTP ${r.status}`); e.detail = await r.text(); throw e; }
  return r.json();
}

async function sbPost(table, body, token) {
  const r = await fetch(`${C.supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders(token, { 'Prefer': 'return=representation' }),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const payload = await r.json().catch(() => null);
  if (!r.ok) { const e = new Error(`POST ${table}: HTTP ${r.status}`); e.detail = payload; throw e; }
  return Array.isArray(payload) ? payload[0] : payload;
}

async function sbPatch(table, body, qs, token) {
  const r = await fetch(`${C.supabaseUrl}/rest/v1/${table}?${qs}`, {
    method: 'PATCH',
    headers: sbHeaders(token, { 'Prefer': 'return=representation' }),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  return { ok: r.ok, status: r.status, body: await r.json().catch(() => null) };
}

async function sbSignIn(email, password) {
  const r = await fetch(`${C.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': C.supabaseAnon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) { const e = new Error(`signIn: HTTP ${r.status}`); e.detail = await r.text(); throw e; }
  return r.json();
}

async function sbAdminCreateUser(email, password) {
  const r = await fetch(`${C.supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: await sbAdminHeaders(),
    body: JSON.stringify({ email, password, email_confirm: true }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) { const e = new Error(`adminCreateUser: HTTP ${r.status}`); e.detail = await r.text(); throw e; }
  const d = await r.json();
  return d.user || d;
}

async function sbAdminDeleteUser(uid) {
  await fetch(`${C.supabaseUrl}/auth/v1/admin/users/${uid}`, {
    method: 'DELETE',
    headers: await sbAdminHeaders(),
  }).catch(() => {});
}

// ── Helpers de test ───────────────────────────────────────────────────────────

function assert(cond, msg, detail) {
  if (!cond) { const e = new Error(msg); e.detail = detail; throw e; }
}

async function httpOk(url, label) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  assert(r.ok, `${label} devolvió HTTP ${r.status}`, { url, status: r.status });
}

// ── Suite de tests ────────────────────────────────────────────────────────────

const TESTS = [
  // ── T01: Health HTTP ─────────────────────────────────────────────────────
  {
    id: 'T01a', name: 'HTTP: web-patient responde 200', sev: 'CRITICAL',
    skipIf: () => !C.webPatient,
    skipReason: 'QA_WEB_PATIENT_URL no configurada (agregar al .env)',
    fn: () => httpOk(C.webPatient, 'web-patient'),
  },
  {
    id: 'T01b', name: 'HTTP: web-cro responde 200', sev: 'HIGH',
    skipIf: () => !C.webCro,
    skipReason: 'QA_WEB_CRO_URL no configurada (portal CRO pendiente de deploy)',
    fn: () => httpOk(C.webCro, 'web-cro'),
  },
  {
    id: 'T01c', name: 'HTTP: API /health responde 200', sev: 'CRITICAL',
    fn: () => httpOk(`${C.api}/health`, 'API /health'),
  },

  // ── T02: Auth ────────────────────────────────────────────────────────────
  {
    id: 'T02', name: 'Auth: crear usuario de prueba (admin)', sev: 'CRITICAL',
    needs: [],
    fn: async () => {
      assert(C.supabaseSR, 'SUPABASE_SERVICE_ROLE_KEY no configurada — test omitido');
      const u = await sbAdminCreateUser(S.email, S.password);
      S.userId = u.id;
      assert(S.userId, 'Sin user.id en respuesta', u);
    },
  },
  {
    id: 'T03', name: 'Auth: login con anon key', sev: 'CRITICAL',
    needs: ['T02'],
    fn: async () => {
      const data = await sbSignIn(S.email, S.password);
      assert(data.access_token, 'Sin access_token', data);
      S.token = data.access_token;
    },
  },

  // ── T04: Perfil ──────────────────────────────────────────────────────────
  {
    id: 'T04', name: 'Perfil: crear perfil primario con RLS', sev: 'CRITICAL',
    needs: ['T03'],
    fn: async () => {
      const p = await sbPost('profiles', {
        display_name: 'QA Test User',
        user_id: S.userId,
        conditions: [],
      }, S.token);
      assert(p?.id, 'Sin id en perfil creado', p);
      S.profileId = p.id;
    },
  },

  // ── T05-T07: Vault ───────────────────────────────────────────────────────
  {
    id: 'T05', name: 'Vault: listar estudios (vacío)', sev: 'HIGH',
    needs: ['T04'],
    fn: async () => {
      const data = await sbGet('studies', `profile_id=eq.${S.profileId}`, S.token);
      assert(Array.isArray(data), 'Respuesta no es array', data);
    },
  },
  {
    id: 'T06', name: 'Upload: insertar estudio confirmado', sev: 'CRITICAL',
    needs: ['T04'],
    fn: async () => {
      const s = await sbPost('studies', {
        profile_id:       S.profileId,
        study_type:       'Hemograma QA',
        category:         'hematología',
        study_date:       '2026-01-01',
        confirmed:        true,
        extracted_fields: { glucosa: '90 mg/dL' },
        storage_paths:    [],
      }, S.token);
      assert(s?.id, 'Sin id en estudio insertado', s);
      S.studyId = s.id;
    },
  },
  {
    id: 'T07', name: 'Vault: estudio aparece en listado', sev: 'HIGH',
    needs: ['T06'],
    fn: async () => {
      const data = await sbGet('studies', `profile_id=eq.${S.profileId}`, S.token);
      assert(data.some(s => s.id === S.studyId), 'Estudio insertado no aparece en Vault', data);
    },
  },

  // ── T08-T09: Familia ─────────────────────────────────────────────────────
  {
    id: 'T08', name: 'Familia: agregar familiar (sin cuenta)', sev: 'HIGH',
    needs: ['T04'],
    fn: async () => {
      const p = await sbPost('profiles', {
        display_name:  'Familiar QA',
        owner_user_id: S.userId,
        relationship:  'Hijo/a',
        conditions:    [],
      }, S.token);
      assert(p?.id, 'Sin id en perfil familiar', p);
      S.familyProfileId = p.id;
    },
  },
  {
    id: 'T09', name: 'Familia: vault del familiar accesible por owner', sev: 'HIGH',
    needs: ['T08'],
    fn: async () => {
      const data = await sbGet('studies', `profile_id=eq.${S.familyProfileId}`, S.token);
      assert(Array.isArray(data), 'Vault familiar inaccesible', data);
    },
  },

  // ── T10: RLS aislamiento ─────────────────────────────────────────────────
  {
    id: 'T10', name: 'RLS: usuario B no puede leer datos de usuario A', sev: 'CRITICAL',
    needs: ['T06'],
    fn: async () => {
      assert(C.supabaseSR, 'SUPABASE_SERVICE_ROLE_KEY requerida para este test');
      const u2 = await sbAdminCreateUser(S.email2, S.password2);
      S.userId2 = u2.id;
      const session2 = await sbSignIn(S.email2, S.password2);
      const data = await sbGet('studies', `id=eq.${S.studyId}`, session2.access_token);
      await sbAdminDeleteUser(S.userId2);
      S.userId2 = null;
      assert(
        data.length === 0,
        `RLS BREACH: usuario B puede leer ${data.length} estudio(s) de usuario A`,
        { studyId: S.studyId, rows: data },
      );
    },
  },

  // ── T11: QR API ──────────────────────────────────────────────────────────
  {
    id: 'T11', name: 'QR: API genera token válido', sev: 'HIGH',
    needs: ['T06'],
    fn: async () => {
      const r = await fetch(`${C.api}/qr/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${S.token}`,
        },
        body: JSON.stringify({ study_ids: [S.studyId], ttl_hours: 24 }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.status === 404) { throw Object.assign(new Error('Endpoint /qr/generate no encontrado — ¿Render hizo redeploy?'), { detail: { status: 404 } }); }
      assert(r.ok, `POST /qr/generate: HTTP ${r.status}`, { status: r.status, body: await r.text() });
      const body = await r.json();
      assert(body.token, 'Respuesta sin token QR', body);
    },
  },

  // ── T12: consent_audit append-only ───────────────────────────────────────
  {
    id: 'T12', name: 'consent_audit: rechaza UPDATE (append-only)', sev: 'CRITICAL',
    needs: ['T04'],
    fn: async () => {
      const row = await sbPost('consent_audit', {
        profile_id: S.profileId,
        layer:      'research',
        granted:    true,
      }, S.token);
      assert(row?.id, 'No se pudo insertar en consent_audit', row);
      // RLS no tiene política UPDATE → PostgREST devuelve 200 con 0 filas; el trigger
      // de excepción no llega a ejecutarse. Verificamos que el dato no cambió.
      await sbPatch('consent_audit', { granted: false }, `id=eq.${row.id}`, S.token);
      const verify = await sbGet('consent_audit', `id=eq.${row.id}`, S.token);
      assert(
        verify.length === 1 && verify[0].granted === true,
        'consent_audit permitió modificar granted=true → false (append-only violado)',
        { after: verify[0] },
      );
    },
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

async function run() {
  const failed = new Set();
  for (const t of TESTS) {
    const blockedBy = (t.needs || []).filter(id => failed.has(id));
    if (blockedBy.length) {
      results.push({ ...t, status: 'SKIP', ms: 0, reason: `Requiere ${blockedBy.join(', ')}` });
      console.log(`  ⏭️  ${t.id} ${t.name} (skip)`);
      continue;
    }
    if (t.skipIf && t.skipIf()) {
      results.push({ ...t, status: 'SKIP', ms: 0, reason: t.skipReason || 'condición de skip' });
      console.log(`  ⏭️  ${t.id} ${t.name} (skip: ${t.skipReason || ''})`);
      continue;
    }
    const start = Date.now();
    try {
      if (!C.dryRun) await t.fn();
      results.push({ ...t, status: 'PASS', ms: Date.now() - start });
      console.log(`  ✅ ${t.id} ${t.name}`);
    } catch (err) {
      failed.add(t.id);
      results.push({ ...t, status: 'FAIL', ms: Date.now() - start, error: err.message, detail: err.detail });
      console.log(`  ❌ ${t.id} ${t.name}: ${err.message}`);
    }
  }
}

// ── Cleanup (siempre se ejecuta) ──────────────────────────────────────────────

async function cleanup() {
  const ids = [S.userId, S.userId2].filter(Boolean);
  for (const uid of ids) {
    try { await sbAdminDeleteUser(uid); } catch { /* ignorar */ }
  }
}

// ── Contexto del deploy (git + skill files) ───────────────────────────────────

function buildDeployContext() {
  const ctx = {};

  // Qué se deployó
  try { ctx.commits = execSync('git log --oneline -7', { cwd: ROOT }).toString().trim(); } catch { ctx.commits = 'unavailable'; }
  try { ctx.lastCommitFull = execSync('git log -1 --format="%B"', { cwd: ROOT }).toString().trim(); } catch {}
  try { ctx.changedFiles = execSync('git diff HEAD~1 --name-only', { cwd: ROOT }).toString().trim(); } catch {}
  try { ctx.diffStat = execSync('git diff HEAD~1 --stat', { cwd: ROOT }).toString().trim().slice(0, 800); } catch {}

  // Contexto de la app (skill files — truncados para economía)
  const SKILLS = [
    ['.claude/skills/bresca-architecture.md', 2500],
    ['.claude/skills/supabase-rls.md',        1200],
    ['.claude/skills/ocr-pipeline.md',         800],
  ];
  ctx.appContext = '';
  for (const [file, limit] of SKILLS) {
    try {
      const content = readFileSync(resolve(ROOT, file), 'utf8').slice(0, limit);
      ctx.appContext += `\n\n### ${file.split('/').pop().replace('.md','')}\n${content}`;
    } catch { /* skill no existe */ }
  }

  // Resultados de los tests (para que Haiku sepa qué se probó)
  ctx.testResults = results.map(r => {
    const s = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    return `${s} ${r.id} ${r.name}${r.error ? ` → ${r.error}` : ''}`;
  }).join('\n');

  return ctx;
}

// ── Análisis con Claude Haiku ─────────────────────────────────────────────────

async function analyzeWithHaiku() {
  if (!C.anthropicKey) return null;

  const deploy = buildDeployContext();
  const failures = results.filter(r => r.status === 'FAIL');

  const prompt = `Sos el QA agent de Bresca, plataforma de salud en Argentina (B2C + B2B).

## Arquitectura y reglas de negocio de la app
${deploy.appContext || '(skill files no disponibles)'}

---

## Qué se deployó en este push

**Commits recientes:**
${deploy.commits}

**Último commit (mensaje completo):**
${deploy.lastCommitFull || '(no disponible)'}

**Archivos modificados:**
${deploy.changedFiles || '(no disponible)'}

**Resumen de cambios:**
${deploy.diffStat || '(no disponible)'}

---

## Resultados de los tests automáticos (12 tests)

${deploy.testResults}

---

## Tu tarea

Analizá el deploy con contexto real de la app. Respondé en español rioplatense con JSON exacto:

{
  "resumen": "2-3 oraciones: qué se deployó, si los tests lo cubren, estado general",
  "cobertura": "¿qué aspectos del deploy quedan SIN cubrir por los tests automáticos? Sé específico.",
  "checks_manuales": [
    "acción concreta que un humano debería verificar en la UI o API (específica al deploy, no genérica)"
  ],
  "issues": [
    {
      "id": "T06",
      "titulo": "título del GitHub issue < 70 chars",
      "severidad": "critical | high | medium",
      "cuerpo": "markdown: qué rompió, por qué es un problema para el usuario, cómo reproducir, contexto del commit relacionado"
    }
  ]
}

Reglas:
- "issues" solo para tests que FALLARON (${failures.length} falla(s))
- "checks_manuales" es para todos los deploys, fallen o no — señalá lo que el test automático no puede ver
- Si no fallaron tests, "resumen" igual debe decir qué funcionalidad se deployó y confirmar cobertura
- Solo JSON, sin texto extra antes o después`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': C.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!r.ok) return null;
  const data = await r.json();
  try {
    const text = data.content[0].text.trim();
    return JSON.parse(text.startsWith('```') ? text.replace(/```json?\n?|\n?```/g, '') : text);
  } catch {
    return { resumen: data.content[0].text, issues: [], checks_manuales: [] };
  }
}

// ── Reporte Markdown ──────────────────────────────────────────────────────────

function buildReport(analysis) {
  let sha = 'unknown';
  try { sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch {}

  const now   = new Date();
  const stamp = now.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  const pass  = results.filter(r => r.status === 'PASS').length;
  const fail  = results.filter(r => r.status === 'FAIL').length;
  const skip  = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;
  const ok    = fail === 0;

  const table = results.map(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    return `| ${r.id} | ${r.name} | ${icon} ${r.status} | ${r.sev || '-'} | ${r.ms}ms |`;
  }).join('\n');

  const errorDetail = results
    .filter(r => r.status === 'FAIL')
    .map(f => `
### ${f.id} — ${f.name}
**Severidad:** ${f.sev}
**Error:** \`${f.error}\`
${f.detail ? `\`\`\`json\n${JSON.stringify(f.detail, null, 2)}\n\`\`\`` : ''}
`).join('\n');

  // Contexto del deploy para el reporte
  let deploySection = '';
  try {
    const commits = execSync('git log --oneline -5', { cwd: ROOT }).toString().trim();
    const changed = execSync('git diff HEAD~1 --name-only', { cwd: ROOT }).toString().trim();
    deploySection = `
## Deploy

\`\`\`
${commits}
\`\`\`

**Archivos modificados:** ${changed.split('\n').join(', ') || 'ninguno'}
`;
  } catch {}

  const checksSection = analysis?.checks_manuales?.length
    ? `## Verificaciones manuales recomendadas\n\n${analysis.checks_manuales.map(c => `- ${c}`).join('\n')}\n`
    : '';

  const coverageSection = analysis?.cobertura
    ? `## Cobertura\n\n${analysis.cobertura}\n`
    : '';

  return `# QA Report — ${stamp}

**Commit:** \`${sha}\`
**Resultado:** ${ok ? '✅ PASS' : `❌ FAIL (${fail} errores)`}
**Tests:** ${pass} pasaron · ${fail} fallaron · ${skip} omitidos de ${total}
**Duración:** ${results.reduce((s, r) => s + r.ms, 0)}ms

---

${deploySection}

${analysis?.resumen ? `## Análisis del deploy\n\n${analysis.resumen}\n` : ''}

${coverageSection}

${checksSection}

---

## Resultados

| ID | Test | Estado | Severidad | Tiempo |
|----|------|--------|-----------|--------|
${table}

${fail > 0 ? `## Detalle de errores\n${errorDetail}` : '## Sin errores\n\nTodos los flujos de usuario operativos. Deploy verificado. ✅'}

---
*Bresca QA Agent · claude-haiku-4-5-20251001 · ${new Date().toISOString()}*
`;
}

function saveReport(md) {
  const sha = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch { return 'x'; } })();
  const ts  = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  const dir = resolve(ROOT, 'docs', 'qa-reports');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${ts}_${sha}.md`);
  writeFileSync(path, md, 'utf8');
  return path;
}

// ── GitHub Issues ─────────────────────────────────────────────────────────────

function createGitHubIssues(failures, analysis) {
  if (C.noIssues || C.dryRun || !failures.length) return;

  const issues = analysis?.issues?.length
    ? analysis.issues
    : failures.map(f => ({
        id: f.id,
        titulo: `[QA] ${f.id} — ${f.name}`,
        severidad: f.sev?.toLowerCase() === 'critical' ? 'critical' : 'high',
        cuerpo: `## Falla detectada en QA post-deploy\n\n**Test:** ${f.id} — ${f.name}\n**Error:** ${f.error}\n\n${f.detail ? `\`\`\`json\n${JSON.stringify(f.detail, null, 2)}\n\`\`\`` : ''}`,
      }));

  for (const issue of issues) {
    try {
      const labels = `qa,bug,${issue.severidad}`;
      const title  = `[QA] ${issue.titulo}`.slice(0, 70);
      execSync(
        `gh issue create --title ${JSON.stringify(title)} --body ${JSON.stringify(issue.cuerpo)} --label ${JSON.stringify(labels)}`,
        { cwd: ROOT, stdio: 'pipe' },
      );
      console.log(`  📋 Issue creado: ${title}`);
    } catch (e) {
      console.warn(`  ⚠️  No se pudo crear issue para ${issue.id}: ${e.message.split('\n')[0]}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍 Bresca QA Agent — iniciando\n');
  if (C.dryRun) console.log('  [dry-run: sin requests reales]\n');

  if (!C.supabaseUrl || !C.supabaseAnon) {
    console.error('❌  Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  try {
    await run();
  } finally {
    await cleanup();
  }

  const failures = results.filter(r => r.status === 'FAIL');

  if (C.anthropicKey) {
    console.log('\n🤖 Analizando deploy con Haiku...');
  }
  const analysis = await analyzeWithHaiku();

  const md   = buildReport(analysis);
  const path = saveReport(md);
  console.log(`\n📄 Reporte: ${path}`);

  if (failures.length) {
    console.log(`\n🐛 ${failures.length} test(s) fallaron — creando GitHub issues...`);
    createGitHubIssues(failures, analysis);
  }

  const pass = results.filter(r => r.status === 'PASS').length;
  console.log(
    failures.length === 0
      ? `\n✅ ${pass}/${results.length} tests pasaron — deploy verificado\n`
      : `\n❌ ${failures.length}/${results.length} tests fallaron — ver reporte\n`,
  );

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch(err => { console.error('QA Agent error fatal:', err); process.exit(1); });
