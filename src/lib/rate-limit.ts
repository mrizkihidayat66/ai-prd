import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_MAX_CHAT_REQUESTS } from '@/constants/limits';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production)
const requestStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (record.resetAt < now) {
      requestStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limiting function
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param maxRequests - Maximum requests allowed in window (default: 100)
 * @param windowMs - Time window in milliseconds (default: 60000)
 * @returns { success: boolean, retryAfter?: number }
 */
export async function rateLimit(
  identifier: string,
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = RATE_LIMIT_WINDOW_MS
): Promise<{ success: boolean; retryAfter?: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const key = `${identifier}:${Math.floor(now / windowMs)}`;
  
  if (!requestStore.has(key)) {
    requestStore.set(key, { count: 0, resetAt: now + windowMs });
  }
  
  const record = requestStore.get(key)!;
  
  if (record.count >= maxRequests) {
    return { success: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  
  record.count++;
  return { success: true };
}

/**
 * Rate limiting for chat endpoints (stricter limit: 20 req/min)
 */
export async function rateLimitChat(identifier: string): Promise<{ success: boolean; retryAfter?: number }> {
  return rateLimit(identifier, RATE_LIMIT_MAX_CHAT_REQUESTS, RATE_LIMIT_WINDOW_MS);
}
