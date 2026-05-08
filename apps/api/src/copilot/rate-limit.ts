import { MAX_COPILOT_RPH } from '@bresca/shared';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  maxPerHour: number = MAX_COPILOT_RPH,
): { allowed: boolean; remaining: number } {
  if (buckets.size > 500) cleanupExpired();

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + 3_600_000 });
    return { allowed: true, remaining: maxPerHour - 1 };
  }

  if (bucket.count >= maxPerHour) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: maxPerHour - bucket.count };
}
