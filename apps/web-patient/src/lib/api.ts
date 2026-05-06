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

export type DraftRealtimeRow = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  study_type: string | null;
  lab_name: string | null;
  study_date: string | null;
  extracted_fields: Record<string, string> | null;
  error_log: string | null;
};

export async function enqueueExtract(
  storage_paths: string[],
  mime_type: string,
  category: string,
  profile_id?: string,
): Promise<{ job_id: string }> {
  const body: Record<string, unknown> = { storage_paths, mime_type, category };
  if (profile_id) body.profile_id = profile_id;

  const attempt = async () => {
    const res = await fetch(`${BASE}/extract`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`extract enqueue error ${res.status}`);
    return res.json() as Promise<{ job_id: string }>;
  };

  try {
    return await attempt();
  } catch (err) {
    // Render.com free tier cold-start: reintento único tras 4s
    if (err instanceof TypeError) {
      await new Promise(r => setTimeout(r, 4000));
      return attempt();
    }
    throw err;
  }
}

export function waitForDraft(jobId: string, timeoutMs: number): Promise<DraftRealtimeRow> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (!settled) { settled = true; fn(); }
    };

    const channel = supabase
      .channel(`draft-${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'study_drafts', filter: `id=eq.${jobId}` },
        (payload) => {
          const row = payload.new as DraftRealtimeRow;
          if (row.status === 'completed' || row.status === 'failed') {
            finish(() => {
              clearTimeout(timer);
              clearInterval(poll);
              supabase.removeChannel(channel);
              resolve(row);
            });
          }
        },
      )
      .subscribe();

    // Fallback polling cada 4s — cubre cold starts de Realtime o jobs ya completos
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('study_drafts')
        .select('id,status,study_type,lab_name,study_date,extracted_fields,error_log')
        .eq('id', jobId)
        .single();
      if (data && (data.status === 'completed' || data.status === 'failed')) {
        finish(() => {
          clearTimeout(timer);
          clearInterval(poll);
          supabase.removeChannel(channel);
          resolve(data as DraftRealtimeRow);
        });
      }
    }, 4000);

    const timer = setTimeout(() => {
      finish(() => {
        clearInterval(poll);
        supabase.removeChannel(channel);
        reject(new Error('extract_timeout'));
      });
    }, timeoutMs);
  });
}
