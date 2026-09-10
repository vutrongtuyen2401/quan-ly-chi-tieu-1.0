import { GoogleGenAI } from "@google/genai";

/**
 * Gemini Client Singleton & Configuration Helper
 * Sử dụng SDK chính thức @google/genai
 * GEMINI_MODEL cấu hình qua .env, mặc định gemini-3.6-flash
 */

const getApiKey = () => process.env.GEMINI_API_KEY?.trim() || "";
export const getGeminiModelName = () => process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
export const GEMINI_MODEL = getGeminiModelName();

let geminiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }
  if (!geminiInstance) {
    geminiInstance = new GoogleGenAI({ apiKey });
  }
  return geminiInstance;
}

export function isGeminiConfigured(): boolean {
  return getApiKey().length > 0;
}

/**
 * Kiểm tra kết nối và tính khả dụng của Model (Health-check)
 * Chỉ chạy khi có GEMINI_API_KEY.
 * Nếu model không hợp lệ / không tồn tại, trả lỗi cấu hình thân thiện.
 */
export async function checkGeminiHealth(): Promise<{
  ok: boolean;
  model: string;
  message: string;
}> {
  const apiKey = getApiKey();
  const modelName = getGeminiModelName();

  if (!apiKey) {
    return {
      ok: false,
      model: modelName,
      message: "Chưa cấu hình GEMINI_API_KEY trong file .env",
    };
  }

  const client = getGeminiClient();
  if (!client) {
    return {
      ok: false,
      model: modelName,
      message: "Không thể khởi tạo Gemini Client với khóa hiện tại",
    };
  }

  try {
    const testResponse = await client.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    });

    if (testResponse && (testResponse.text !== undefined || testResponse.candidates?.length)) {
      return {
        ok: true,
        model: modelName,
        message: `Mô hình ${modelName} đang hoạt động bình thường`,
      };
    }

    return {
      ok: false,
      model: modelName,
      message: `Mô hình ${modelName} không trả về phản hồi hợp lệ`,
    };
  } catch (error: any) {
    const errorMsg = error?.message || "";
    safeAiLog("warn", "Gemini Health Check Failed", {
      model: modelName,
      errorSnippet: errorMsg.slice(0, 100),
    });

    if (errorMsg.includes("not found") || errorMsg.includes("404") || errorMsg.includes("unsupported")) {
      return {
        ok: false,
        model: modelName,
        message: `Mô hình '${modelName}' không khả dụng hoặc không được hỗ trợ bởi tài khoản/khóa API của bạn. Vui lòng kiểm tra lại cấu hình GEMINI_MODEL trong file .env.`,
      };
    }

    if (errorMsg.includes("API key not valid") || errorMsg.includes("403") || errorMsg.includes("401")) {
      return {
        ok: false,
        model: modelName,
        message: "GEMINI_API_KEY không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại khóa API.",
      };
    }

    return {
      ok: false,
      model: modelName,
      message: `Lỗi kết nối tới mô hình ${modelName}: ${errorMsg.slice(0, 120)}`,
    };
  }
}

/**
 * Log an toàn tuyệt đối:
 * Chỉ log tên tool, request id, thời gian và trạng thái.
 * TUYỆT ĐỐI không log nội dung giao dịch, arguments hay dữ liệu cá nhân nhạy cảm.
 */
export function safeAiLog(
  level: "info" | "warn" | "error",
  eventName: string,
  metadata?: {
    toolName?: string;
    toolMode?: string;
    requestId?: string;
    durationMs?: number;
    status?: "success" | "error" | "timeout";
    model?: string;
    errorSnippet?: string;
  }
) {
  const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : "";
  if (level === "error") {
    console.error(`[AI ${level.toUpperCase()}] ${eventName}${metaStr}`);
  } else if (level === "warn") {
    console.warn(`[AI ${level.toUpperCase()}] ${eventName}${metaStr}`);
  } else {
    console.log(`[AI ${level.toUpperCase()}] ${eventName}${metaStr}`);
  }
}
