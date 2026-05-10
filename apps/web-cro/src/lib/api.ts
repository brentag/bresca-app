import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function headers(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
  };
}

export async function getStats() {
  const res = await fetch(`${BASE}/cro/stats`, { headers: await headers() });
  if (!res.ok) throw new Error('stats fetch failed');
  return res.json() as Promise<{
    total_patients: number;
    total_studies: number;
    active_consents: number;
    studies_by_category: Record<string, number>;
  }>;
}

export async function getPatients(page = 0, limit = 50) {
  const res = await fetch(`${BASE}/cro/patients?page=${page}&limit=${limit}`, { headers: await headers() });
  if (!res.ok) throw new Error('patients fetch failed');
  return res.json() as Promise<{
    patients: Array<{ patient_hash: string; age_range: number | null; study_categories: string[]; study_types: string[]; last_study_date: string }>;
    total: number;
    page: number;
    limit: number;
  }>;
}

export async function getDistribution() {
  const res = await fetch(`${BASE}/cro/distribution`, { headers: await headers() });
  if (!res.ok) throw new Error('distribution fetch failed');
  return res.json() as Promise<{
    by_category: Array<{ name: string; value: number }>;
    by_type: Array<{ name: string; value: number }>;
  }>;
}

export async function matchPatients(filters: { age_min?: number; age_max?: number; categories?: string[] }) {
  const res = await fetch(`${BASE}/cro/match`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify(filters),
  });
  if (!res.ok) throw new Error('match failed');
  return res.json() as Promise<{
    matches: Array<{ patient_hash: string; age_range: number | null; study_categories: string[]; study_types: string[]; last_study_date: string }>;
    count: number;
  }>;
}

export async function getMetrics(period: 'day' | 'week' | 'month') {
  const res = await fetch(`${BASE}/admin/metrics?period=${period}`, { headers: await headers() });
  if (!res.ok) throw new Error('metrics fetch failed');
  return res.json();
}

export async function getLive() {
  const res = await fetch(`${BASE}/admin/live`, { headers: await headers() });
  if (!res.ok) throw new Error('live fetch failed');
  return res.json() as Promise<{ nodes: Record<string, number>; as_of: string }>;
}
