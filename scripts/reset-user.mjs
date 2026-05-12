#!/usr/bin/env node
/**
 * Bresca — Reset de usuario de QA
 *
 * Borra COMPLETAMENTE un usuario y todos sus datos para permitir retests
 * consistentes sin contaminación de estado previo.
 *
 * Qué borra:
 *   - storage/studies/{user_id}/*    (archivos subidos)
 *   - auth.users[user_id]            → cascade DB:
 *       · profiles (owner_user_id + user_id)
 *         · studies, study_drafts, qr_tokens, notifications, referral_invitations
 *         · consent_audit (anonymizado por trigger BEFORE DELETE)
 *       · user_consent_state
 *       · user_feedback (SET NULL — no se borra, se desasocia)
 *       · events.profile_id (SET NULL)
 *
 * Uso:
 *   node scripts/reset-user.mjs <email> [<email>...]
 *   node scripts/reset-user.mjs <email> --dry-run         # solo lista, no borra
 *   node scripts/reset-user.mjs <email> --yes             # sin confirmación interactiva
 *   node scripts/reset-user.mjs admin@bresca.io --force-admin  # permite borrar @bresca.io
 *
 * Env vars (lee de apps/api/.env automáticamente):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Carga .env desde apps/api/.env (donde vive la service role key) ────────────
for (const f of ['apps/api/.env', '.env', '.env.local']) {
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
  } catch { /* archivo no existe — fine */ }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SR_KEY) {
  console.error('✖ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.');
  console.error('  Esperaba encontrarlas en apps/api/.env');
  process.exit(1);
}

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const emails = args.filter(a => !a.startsWith('--'));
const DRY_RUN = flags.has('--dry-run');
const SKIP_CONFIRM = flags.has('--yes');
const FORCE_ADMIN = flags.has('--force-admin');

if (emails.length === 0) {
  console.error('Uso: node scripts/reset-user.mjs <email> [<email>...] [--dry-run] [--yes] [--force-admin]');
  process.exit(1);  // Antes de cualquier fetch — safe.
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const adminHeaders = {
  apikey: SR_KEY,
  Authorization: `Bearer ${SR_KEY}`,
  'Content-Type': 'application/json',
};

async function sb(path, init = {}) {
  const url = path.startsWith('http') ? path : `${SUPABASE_URL}${path}`;
  const res = await fetch(url, { ...init, headers: { ...adminHeaders, ...(init.headers || {}) } });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

async function findUserByEmail(email) {
  // GoTrue admin no garantiza filter por email; listamos páginas y matcheamos local.
  const perPage = 1000;
  let page = 1;
  while (true) {
    const r = await sb(`/auth/v1/admin/users?per_page=${perPage}&page=${page}`);
    if (!r.ok) throw new Error(`listUsers failed: ${r.status} ${JSON.stringify(r.body)}`);
    const users = r.body?.users ?? [];
    const hit = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (users.length < perPage) return null;
    page += 1;
    if (page > 50) return null; // safety stop
  }
}

async function countRows(table, query) {
  const r = await sb(`/rest/v1/${table}?${query}&select=id`);
  return Array.isArray(r.body) ? r.body.length : 0;
}

async function listProfileIds(userId) {
  // Perfiles donde es owner (familia + propio) o donde user_id = userId (legacy)
  const [r1, r2] = await Promise.all([
    sb(`/rest/v1/profiles?owner_user_id=eq.${userId}&select=id`),
    sb(`/rest/v1/profiles?user_id=eq.${userId}&select=id`),
  ]);
  const ids = new Set();
  for (const row of (Array.isArray(r1.body) ? r1.body : [])) ids.add(row.id);
  for (const row of (Array.isArray(r2.body) ? r2.body : [])) ids.add(row.id);
  return [...ids];
}

async function countByProfileIds(table, profileIds) {
  if (profileIds.length === 0) return 0;
  const list = profileIds.join(',');
  return countRows(table, `profile_id=in.(${list})`);
}

async function listStorageFiles(userId) {
  const r = await sb(`/storage/v1/object/list/studies`, {
    method: 'POST',
    body: JSON.stringify({ prefix: userId, limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!r.ok) {
    console.warn(`  ⚠ no se pudo listar storage: ${r.status}`);
    return [];
  }
  return (r.body ?? []).map(f => `${userId}/${f.name}`);
}

async function removeStorageFiles(paths) {
  if (paths.length === 0) return { removed: 0 };
  const r = await sb(`/storage/v1/object/studies`, {
    method: 'DELETE',
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!r.ok) throw new Error(`storage remove failed: ${r.status} ${JSON.stringify(r.body)}`);
  return { removed: paths.length };
}

async function deleteAuthUser(userId) {
  const r = await sb(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`deleteUser failed: ${r.status} ${JSON.stringify(r.body)}`);
  return true;
}

function confirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ── Main por email ────────────────────────────────────────────────────────────
async function resetOne(email) {
  console.log(`\n━━━ ${email} ━━━`);

  if (email.endsWith('@bresca.io') && !FORCE_ADMIN) {
    console.log('  ⛔ email @bresca.io — usa --force-admin si realmente querés borrarlo. SKIP.');
    return { email, status: 'skipped_admin' };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    console.log('  ℹ usuario no encontrado en auth.users — nada que borrar.');
    return { email, status: 'not_found' };
  }
  console.log(`  user_id: ${user.id}`);

  // Inventario de lo que se va a borrar
  const profileIds = await listProfileIds(user.id);
  const [studies, drafts, qrTokens, notifications, consent, events, userConsent, storagePaths] = await Promise.all([
    countByProfileIds('studies', profileIds),
    countByProfileIds('study_drafts', profileIds),
    countByProfileIds('qr_tokens', profileIds),
    countByProfileIds('notifications', profileIds),
    countByProfileIds('consent_audit', profileIds),
    countRows('events', `user_id=eq.${user.id}`),
    countRows('user_consent_state', `user_id=eq.${user.id}`),
    listStorageFiles(user.id),
  ]);

  console.log(`  perfiles: ${profileIds.length}   archivos storage: ${storagePaths.length}`);
  console.log(`  studies: ${studies}   drafts: ${drafts}   qr_tokens: ${qrTokens}`);
  console.log(`  notifications: ${notifications}   consent_audit: ${consent} (anonimizado, no borrado)`);
  console.log(`  events: ${events}   user_consent_state: ${userConsent}`);

  if (DRY_RUN) {
    console.log('  🔍 --dry-run — no se borra nada.');
    return { email, status: 'dry_run', userId: user.id };
  }

  if (!SKIP_CONFIRM) {
    const ans = await confirm(`  ¿Borrar ${email} y todos sus datos? [y/N]: `);
    if (ans !== 'y' && ans !== 'yes') {
      console.log('  cancelado.');
      return { email, status: 'cancelled' };
    }
  }

  // 1. Storage primero (auth.admin.deleteUser no toca storage)
  if (storagePaths.length > 0) {
    await removeStorageFiles(storagePaths);
    console.log(`  ✓ storage: ${storagePaths.length} archivos eliminados`);
  }

  // 2. Auth user → DB cascade
  await deleteAuthUser(user.id);
  console.log(`  ✓ auth.users: usuario eliminado (cascade DB ejecutado)`);

  // 3. Verificación
  const verify = await findUserByEmail(email);
  if (verify) {
    console.log('  ⚠ usuario aún existe después del DELETE — revisar manualmente.');
    return { email, status: 'verify_failed', userId: user.id };
  }
  console.log('  ✅ verificación OK — usuario y datos eliminados.');
  return { email, status: 'deleted', userId: user.id };
}

// ── Run ───────────────────────────────────────────────────────────────────────
const results = [];
for (const email of emails) {
  try {
    results.push(await resetOne(email));
  } catch (err) {
    console.error(`  ✖ error: ${err.message}`);
    results.push({ email, status: 'error', error: err.message });
  }
}

console.log('\n━━━ Resumen ━━━');
for (const r of results) {
  console.log(`  ${r.status.padEnd(16)} ${r.email}${r.error ? `  — ${r.error}` : ''}`);
}

const failed = results.filter(r => r.status === 'error' || r.status === 'verify_failed').length;
// process.exitCode evita un crash libuv en Windows cuando fetch deja keepalive abierto.
process.exitCode = failed > 0 ? 1 : 0;
