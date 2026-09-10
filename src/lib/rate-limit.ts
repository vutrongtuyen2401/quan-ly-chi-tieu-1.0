import { NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window cache
const rateLimitStore = new Map<string, RateLimitRecord>();

// Định kỳ dọn dẹp các bản ghi hết hạn mỗi 5 phút để tránh memory leak
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  limit: number;       // Số request tối đa trong cửa sổ thời gian
  windowMs: number;    // Cửa sổ thời gian tính bằng mili-giây
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;       // Unix timestamp khi hạn ngạch được reset (giây)
  retryAfterSeconds: number;
}

/**
 * Trích xuất IP của Client từ Request Headers một cách an toàn
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

/**
 * Kiểm tra giới hạn tốc độ gọi (Rate Limiting)
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  cleanupExpired();

  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    // Bản ghi mới hoặc đã hết hạn cửa sổ trước đó
    const resetAt = now + options.windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
    });

    return {
      success: true,
      limit: options.limit,
      remaining: Math.max(0, options.limit - 1),
      reset: Math.ceil(resetAt / 1000),
      retryAfterSeconds: 0,
    };
  }

  // Đang trong cửa sổ thời gian hiện tại
  if (record.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      reset: Math.ceil(record.resetAt / 1000),
      retryAfterSeconds,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: Math.max(0, options.limit - record.count),
    reset: Math.ceil(record.resetAt / 1000),
    retryAfterSeconds: 0,
  };
}

/**
 * Trả về phản hồi lỗi HTTP 429 thân thiện chuẩn tiếng Việt kèm RFC Headers
 */
export function rateLimitResponse(
  result: RateLimitResult,
  customMessage?: string
): NextResponse {
  const message =
    customMessage ||
    `Bạn đang thực hiện thao tác quá nhanh. Vui lòng thử lại sau ${result.retryAfterSeconds} giây để bảo vệ an toàn hệ thống.`;

  return NextResponse.json(
    {
      error: message,
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    }
  );
}

// Cấu hình chuẩn định sẵn cho từng dịch vụ
export const RATE_LIMIT_CONFIGS = {
  AUTH_REGISTER: { limit: 5, windowMs: 15 * 60 * 1000 },    // 5 lần / 15 phút
  AI_CHAT: { limit: 15, windowMs: 60 * 1000 },              // 15 requests / 1 phút
  AI_PARSE_TEXT: { limit: 20, windowMs: 60 * 1000 },        // 20 requests / 1 phút
  AI_PARSE_RECEIPT: { limit: 10, windowMs: 60 * 1000 },     // 10 requests / 1 phút
  AI_HEALTH: { limit: 12, windowMs: 60 * 1000 },            // 12 requests / 1 phút
};
