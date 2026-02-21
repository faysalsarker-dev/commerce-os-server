import rateLimit, { Options, RateLimitRequestHandler } from "express-rate-limit";

// ─── Industry-standard defaults ───────────────────────────────────────────────
const DEFAULT_LIMIT_OPTIONS: Partial<Options> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,               // 100 requests per window (recommended for most APIs)
  standardHeaders: "draft-8", // Return RateLimit headers (RFC standard)
  legacyHeaders: false,
  message: {
    success: false,
    status: 429,
    message: "Too many requests, please try again later.",
  },
};

// ─── Global limiter — apply to all routes in app.ts ───────────────────────────
export const globalRateLimiter: RateLimitRequestHandler =
  rateLimit(DEFAULT_LIMIT_OPTIONS);


export const createRateLimiter = (
  overrides: Partial<Options> = {}
): RateLimitRequestHandler =>
  rateLimit({
    ...DEFAULT_LIMIT_OPTIONS,
    ...overrides,
  });

// ─── Pre-built common limiters (ready to use, no config needed) ───────────────
export const authRateLimiter     = createRateLimiter({ limit: 10,  windowMs: 15 * 60 * 1000 }); // strict — login / signup / forgot-password
export const sensitiveRateLimiter = createRateLimiter({ limit: 5,  windowMs: 60 * 60 * 1000 }); // very strict — OTP / password-reset / 2FA
export const publicRateLimiter   = createRateLimiter({ limit: 200, windowMs: 15 * 60 * 1000 }); // relaxed — public read endpoints