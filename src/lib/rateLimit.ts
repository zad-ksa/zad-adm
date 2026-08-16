/**
 * Simple in-memory fixed-window rate limiter for auth/OTP endpoints.
 *
 * NOTE: state lives in process memory. On a single long-running Node server
 * this is a real, effective limit. On multi-instance serverless platforms
 * each warm instance keeps its own counters, so this is best-effort (it
 * blunts casual brute-force/OTP-spam) rather than a hard distributed
 * guarantee. Upgrading to a shared store (Redis/Upstash) would make it
 * exact across instances, but that's a new infra dependency this project
 * doesn't have yet — flagged as a possible follow-up, not built here.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { allowed: true, retryAfterSeconds: 0 };
}

// Periodic sweep so the map doesn't grow unbounded over the process lifetime.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();
