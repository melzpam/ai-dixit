import rateLimit from "express-rate-limit";
import sanitizeHtml from "sanitize-html";

/** HTTP rate limiter for Express routes */
export const httpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

/** WebSocket event rate limiter — tracks events per socket */
const socketEventCounts = new Map<string, { count: number; resetAt: number }>();

export function checkSocketRateLimit(socketId: string): boolean {
  const now = Date.now();
  const entry = socketEventCounts.get(socketId);

  if (!entry || now >= entry.resetAt) {
    socketEventCounts.set(socketId, { count: 1, resetAt: now + 1000 });
    return true;
  }

  entry.count++;
  // 30 events per second max
  return entry.count <= 30;
}

export function clearSocketRateLimit(socketId: string): void {
  socketEventCounts.delete(socketId);
}

/** Sanitize user text input (nickname, association, prompt) */
export function sanitizeInput(input: string, maxLength = 200): string {
  const cleaned = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return cleaned.trim().slice(0, maxLength);
}
