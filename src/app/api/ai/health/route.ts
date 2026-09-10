import { NextResponse } from "next/server";
import { checkGeminiHealth, isGeminiConfigured, getGeminiModelName } from "@/lib/ai/gemini-client";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";

// In-memory cache để không làm cạn kiệt quota gọi Gemini API khi có nhiều request ping health
interface CachedHealth {
  ok: boolean;
  model: string;
  message: string;
  timestamp: number;
}

let cachedHealth: CachedHealth | null = null;
const HEALTH_CACHE_TTL_MS = 60 * 1000; // 60 giây

export async function GET(req: Request) {
  // 1. Áp dụng Rate Limiting bảo vệ endpoint (tối đa 12 requests / phút / IP)
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`health:${clientIp}`, RATE_LIMIT_CONFIGS.AI_HEALTH);
  if (!rateLimit.success) {
    return rateLimitResponse(
      rateLimit,
      `Endpoint kiểm tra sức khỏe AI đang bị giới hạn tần suất. Vui lòng thử lại sau ${rateLimit.retryAfterSeconds} giây.`
    );
  }

  // 2. Xác thực quyền xem thông tin chi tiết (Internal Monitor / Secret Token)
  const healthSecret = process.env.HEALTH_CHECK_SECRET;
  const providedToken =
    req.headers.get("x-health-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const isAuthorized = !healthSecret || (providedToken && providedToken === healthSecret);

  // 3. Kiểm tra cấu hình Gemini cơ bản
  const isConfigured = isGeminiConfigured();
  const configuredModel = getGeminiModelName();

  if (!isConfigured) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        service: "ai-engine",
        message: isAuthorized
          ? "Chưa cấu hình GEMINI_API_KEY trong file .env"
          : "Dịch vụ AI chưa sẵn sàng",
      },
      { status: 503 }
    );
  }

  // 4. Lấy kết quả từ Cache nếu còn hiệu lực (TTL 60s)
  const now = Date.now();
  let healthResult: { ok: boolean; model: string; message: string };

  if (cachedHealth && now - cachedHealth.timestamp < HEALTH_CACHE_TTL_MS) {
    healthResult = cachedHealth;
  } else {
    const fresh = await checkGeminiHealth();
    cachedHealth = {
      ...fresh,
      timestamp: now,
    };
    healthResult = fresh;
  }

  // 5. Nếu là request công khai và đang ở production mà không có secret token:
  // Chỉ trả về trạng thái tổng quát để bảo vệ an toàn nội bộ hệ thống.
  if (!isAuthorized && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        status: healthResult.ok ? "healthy" : "unhealthy",
        service: "ai-engine",
      },
      { status: healthResult.ok ? 200 : 503 }
    );
  }

  // Trả về đầy đủ kết quả chẩn đoán cho người quản trị / hệ thống monitoring nội bộ
  return NextResponse.json(
    {
      ok: healthResult.ok,
      configured: true,
      model: healthResult.model || configuredModel,
      message: healthResult.message,
      cached: cachedHealth !== null && now - cachedHealth.timestamp > 0,
    },
    { status: healthResult.ok ? 200 : 503 }
  );
}
