import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
  };
}

export async function sendCopilotMessage(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
) {
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
