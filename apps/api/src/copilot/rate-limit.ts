import { MAX_COPILOT_RPH } from '@bresca/shared';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(userId);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + 3_600_000 });
    return { allowed: true, remaining: MAX_COPILOT_RPH - 1 };
  }

  if (bucket.count >= MAX_COPILOT_RPH) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: MAX_COPILOT_RPH - bucket.count };
}
