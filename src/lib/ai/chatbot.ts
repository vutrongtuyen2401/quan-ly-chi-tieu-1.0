import { Type } from "@google/genai";
import { getGeminiClient, getGeminiModelName, safeAiLog } from "./gemini-client";
import {
  get_financial_overview,
  get_transactions,
  get_spending_by_category,
  get_budget_status,
  get_savings_goals,
  get_debt_status,
  get_wallet_balances,
  get_recurring_transactions,
  search_app_help,
} from "./financial-tools";

export interface ChatHistoryItem {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_INSTRUCTION = `Bạn là "ChiTiêu AI", một Trợ lý Trí tuệ Nhân tạo đa năng, thân thiện, thông minh và hài hước nhẹ nhàng, dành riêng cho người dùng Việt Nam.

QUY TẮC GIAO TIẾP VÀ TRẢ LỜI:
1. Đa năng và thân thiện: Bạn có thể trả lời linh hoạt mọi chủ đề an toàn như chào hỏi, trò chuyện vui vẻ, kiến thức phổ thông, học tập, công nghệ, gợi ý cuộc sống. KHÔNG BAO GIỜ từ chối câu hỏi ngoài hệ thống nếu nó an toàn. KHÔNG trả lời kiểu "tôi chỉ là trợ lý tài chính". KHÔNG tự nhắc đến tài chính khi người dùng không hỏi về tài chính.
2. Bảo vệ dữ liệu tài chính tuyệt đối: Khi người dùng hỏi về số liệu tài chính của họ (số dư, tài sản, chi tiêu, ngân sách, nợ...), BẮT BUỘC PHẢI DÙNG CÔNG CỤ (function calling) để truy vấn dữ liệu thực tế. TUYỆT ĐỐI KHÔNG tự bịa đặt, suy đoán, hoặc đưa ra số giả định.
3. Phân biệt dữ liệu và lời khuyên: Khi có dữ liệu từ công cụ, hãy trích dẫn cụ thể. Khi chia sẻ lời khuyên tài chính, nói rõ đây là nguyên tắc tham khảo. KHÔNG đưa ra lời khuyên đầu tư khẳng định hoặc hứa hẹn làm giàu.
4. Phong cách: Xưng "Tôi" và gọi "Bạn" hoặc "Anh/Chị" lịch thiệp. Dùng Markdown chuẩn (in đậm VNĐ, bullet points).`;

// Danh sách khai báo 9 công cụ Read-Only an toàn
const toolDeclarations = [
  {
    name: "get_financial_overview",
    description:
      "Xem tổng quan tình hình tài chính của người dùng hiện tại (tổng tài sản khả dụng, tổng thu nhập, tổng chi tiêu, tích lũy ròng, tỷ lệ tiết kiệm) theo kỳ.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description: "Kỳ báo cáo: 'this_month' (tháng này), 'last_month' (tháng trước), 'this_year' (năm nay), 'all' (toàn bộ thời gian)",
          enum: ["this_month", "last_month", "this_year", "all"],
        },
      },
    },
  },
  {
    name: "get_transactions",
    description:
      "Truy vấn danh sách các giao dịch thực tế của người dùng theo bộ lọc (khoảng thời gian, danh mục, tên ví, loại chi tiêu/thu nhập/chuyển tiền, từ khóa tìm kiếm).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        startDate: { type: Type.STRING, description: "Ngày bắt đầu (định dạng YYYY-MM-DD)" },
        endDate: { type: Type.STRING, description: "Ngày kết thúc (định dạng YYYY-MM-DD)" },
        category: { type: Type.STRING, description: "Tên danh mục cần lọc (ví dụ: Ăn uống, Mua sắm, Tiền lương)" },
        wallet: { type: Type.STRING, description: "Tên ví cần lọc (ví dụ: Ví MoMo, Vietcombank, Tiền mặt)" },
        type: {
          type: Type.STRING,
          description: "Loại giao dịch: EXPENSE (Chi tiêu), INCOME (Thu nhập), TRANSFER (Chuyển khoản)",
          enum: ["EXPENSE", "INCOME", "TRANSFER"],
        },
        search: { type: Type.STRING, description: "Từ khóa tìm kiếm trong mô tả hoặc ghi chú" },
        limit: { type: Type.INTEGER, description: "Số lượng giao dịch cần xem (tối đa 25, mặc định 10)" },
      },
    },
  },
  {
    name: "get_spending_by_category",
    description:
      "Phân tích cơ cấu và tỷ trọng chi tiêu (%) theo từng danh mục của người dùng trong một kỳ cụ thể.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description: "Khoảng thời gian: 'this_month', 'last_month', 'this_year'",
          enum: ["this_month", "last_month", "this_year"],
        },
      },
    },
  },
  {
    name: "get_budget_status",
    description:
      "Kiểm tra tình trạng và tiến độ sử dụng ngân sách tháng này, cảnh báo các danh mục sắp chạm (>=80%) hoặc đã vượt quá hạn mức.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING, description: "Kỳ ngân sách (ví dụ: this_month)" },
      },
    },
  },
  {
    name: "get_savings_goals",
    description:
      "Xem danh sách các mục tiêu tiết kiệm, số tiền đã tích lũy, số tiền còn thiếu, thời hạn và tiến độ hoàn thành (%).",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_debt_status",
    description:
      "Xem tổng hợp sổ nợ gồm cả các khoản Cho vay (người khác nợ tôi) và Đi vay (tôi nợ người khác), tiến độ trả nợ và các khoản quá hạn.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_wallet_balances",
    description:
      "Xem danh sách và số dư chi tiết của tất cả ví/tài khoản khả dụng (Tiền mặt, Ngân hàng, Ví điện tử MoMo/ZaloPay, Sổ tiết kiệm).",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_recurring_transactions",
    description:
      "Xem danh sách các quy tắc giao dịch định kỳ (tiền nhà, tiền mạng, học phí, tiền lương cố định/biến động) và ngày đến hạn tiếp theo.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "search_app_help",
    description:
      "Tra cứu tài liệu hướng dẫn sử dụng các tính năng trong ứng dụng ChiTiêu AI (ví, ngân sách, nhập liệu AI, sổ nợ, tiết kiệm).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: "Câu hỏi hoặc tính năng cần tìm hiểu cách dùng trong ứng dụng" },
      },
      required: ["question"],
    },
  },
];

/**
 * Điều phối gọi hàm cục bộ trên Server với userId lấy duy nhất từ session server-side
 * TUYỆT ĐỐI không nhận userId từ model hay client
 * Chỉ log metadata: toolName, durationMs, status. Tuyệt đối không log args hay kết quả nhạy cảm.
 */
async function executeTool(userId: string, name: string, args: any): Promise<any> {
  const toolStart = Date.now();
  try {
    let result: any;
    switch (name) {
      case "get_financial_overview":
        result = await get_financial_overview(userId, args || {});
        break;
      case "get_transactions":
        result = await get_transactions(userId, args || {});
        break;
      case "get_spending_by_category":
        result = await get_spending_by_category(userId, args || {});
        break;
      case "get_budget_status":
        result = await get_budget_status(userId, args || {});
        break;
      case "get_savings_goals":
        result = await get_savings_goals(userId);
        break;
      case "get_debt_status":
        result = await get_debt_status(userId);
        break;
      case "get_wallet_balances":
        result = await get_wallet_balances(userId);
        break;
      case "get_recurring_transactions":
        result = await get_recurring_transactions(userId);
        break;
      case "search_app_help":
        result = await search_app_help(args?.question || "");
        break;
      default:
        result = { error: `Không tìm thấy công cụ '${name}'` };
        break;
    }

    safeAiLog("info", "Tool execution success", {
      toolName: name,
      durationMs: Date.now() - toolStart,
      status: "success",
    });

    return result;
  } catch (error: any) {
    safeAiLog("error", "Tool execution failed", {
      toolName: name,
      durationMs: Date.now() - toolStart,
      status: "error",
      errorSnippet: error?.message?.slice(0, 100),
    });
    return { error: `Lỗi thực thi công cụ: ${error?.message || "Không xác định"}` };
  }
}

export type IntentMode = "financial" | "realtime" | "general";

/**
 * Class định nghĩa lỗi chuyên biệt từ AI Provider với mã HTTP và metadata
 */
export class AiProviderError extends Error {
  code: string;
  statusCode: number;
  model: string;
  toolMode: IntentMode;
  requestId?: string;

  constructor(
    message: string,
    options: {
      code: string;
      statusCode: number;
      model: string;
      toolMode: IntentMode;
      requestId?: string;
    }
  ) {
    super(message);
    this.name = "AiProviderError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.model = options.model;
    this.toolMode = options.toolMode;
    this.requestId = options.requestId;
  }
}

/**
 * Phân loại intent server-side trước khi gọi Gemini:
 * - 'financial': số dư, thu chi, ví, ngân sách, nợ, tiết kiệm, giao dịch -> custom tools
 * - 'realtime': thời tiết, tin tức, lịch, giá, kiến thức bên ngoài -> Google Search khi cần
 * - 'general': trò chuyện thông thường, kiến thức cơ bản -> trả lời trực tiếp
 */
export function classifyIntent(message: string): IntentMode {
  const normalized = message.toLowerCase().normalize("NFC");

  // 1. Nhóm từ khóa tài chính cá nhân (truy vấn dữ liệu private trong database)
  const financialKeywords = [
    "số dư", "so du", "sodu",
    "thu chi", "thu nhập", "chi tiêu", "chi tieu", "thu nhap",
    "tiền", "tien", "ví", "vi momo", "ngân hàng", "ngan hang", "vietcombank", "momo",
    "ngân sách", "ngan sach", "budget",
    "nợ", "sổ nợ", "vay", "cho vay", "tra no", "trả nợ",
    "tiết kiệm", "tiet kiem", "mục tiêu", "saving",
    "giao dịch", "giao dich", "khoản chi", "khoản thu",
    "tài sản", "tai san", "tích lũy", "tich luy",
    "định kỳ", "dinh ky", "hạn mức", "han muc",
    "báo cáo", "bao cao", "tài chính", "tai chinh",
    "mua sắm", "ăn uống", "hoa don", "hóa đơn",
    "lương", "luong", "thưởng", "thuong"
  ];

  for (const kw of financialKeywords) {
    if (normalized.includes(kw)) {
      return "financial";
    }
  }

  // 2. Nhóm từ khóa thời gian thực / thông tin bên ngoài
  const realtimeKeywords = [
    "thời tiết", "thoi tiet", "nhiệt độ", "nhiet do", "mưa", "nắng", "dự báo",
    "hôm nay", "hom nay", "bây giờ", "bay gio", "ngày mấy", "ngay may", "mấy giờ", "may gio",
    "thời sự", "thoi su", "tin tức", "tin tuc", "tin moi", "mới nhất",
    "giá vàng", "gia vang", "giá xăng", "gia xang", "giá coin", "gia coin", "chứng khoán", "chung khoan",
    "tỷ giá", "ty gia", "usd", "ngoại tệ", "bitcoin", "btc", "eth",
    "âm lịch", "am lich", "lịch âm", "lich am", "ngày âm",
    "bóng đá", "bong da", "kết quả", "ket qua", "giải đấu"
  ];

  for (const kw of realtimeKeywords) {
    if (normalized.includes(kw)) {
      return "realtime";
    }
  }

  // 3. Mặc định: Trò chuyện chung, kiến thức học tập / thường thức
  return "general";
}

/**
 * Thu thập dữ liệu thời tiết thời gian thực từ trạm quan trắc mở Open-Meteo
 */
async function fetchRealtimeWeather(cityQuery: string): Promise<string | null> {
  try {
    let lat = 21.0285;
    let lon = 105.8542;
    let cityName = "Hà Nội";

    const lower = cityQuery.toLowerCase();
    if (lower.includes("hồ chí minh") || lower.includes("sài gòn") || lower.includes("hcm")) {
      lat = 10.8231;
      lon = 106.6297;
      cityName = "TP. Hồ Chí Minh";
    } else if (lower.includes("đà nẵng")) {
      lat = 16.0544;
      lon = 108.2022;
      cityName = "Đà Nẵng";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FBangkok`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current;
    if (!current) return null;

    const weatherCodeMap: Record<number, string> = {
      0: "Trời quang mây, nắng",
      1: "Chủ yếu quang mây",
      2: "Có mây một phần",
      3: "Trời nhiều mây u ám",
      45: "Có sương mù",
      48: "Sương mù đóng băng",
      51: "Mưa phùn nhẹ",
      53: "Mưa phùn vừa",
      55: "Mưa phùn dày",
      61: "Mưa rào nhẹ",
      63: "Mưa vừa",
      65: "Mưa to",
      80: "Mưa rào rải rác",
      81: "Mưa rào vừa",
      82: "Mưa rào dữ dội",
      95: "Có dông sét",
    };

    const condition = weatherCodeMap[current.weather_code] || "Có mây thay đổi";
    return `Dữ liệu quan trắc thời tiết thời gian thực tại ${cityName}:
- Nhiệt độ hiện tại: ${current.temperature_2m}°C
- Độ ẩm không khí: ${current.relative_humidity_2m}%
- Tốc độ gió: ${current.wind_speed_10m} km/h
- Hiện trạng bầu trời: ${condition}
[Nguồn dữ liệu: Open-Meteo Weather Service]`;
  } catch {
    return null;
  }
}

/**
 * Trả về thông tin ngày giờ hệ thống hiện tại tại Việt Nam
 */
function getRealtimeDateContext(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  const viDateStr = now.toLocaleDateString("vi-VN", options);
  return `Thời gian hiện tại tại Việt Nam (GMT+7): ${viDateStr}. [Nguồn: Đồng hồ thời gian thực hệ thống]`;
}

/**
 * Chuyển đổi lỗi của thư viện/mô hình AI thành AiProviderError có cấu trúc
 */
function mapToAiProviderError(error: any, model: string, toolMode: IntentMode): AiProviderError {
  if (error instanceof AiProviderError) {
    return error;
  }

  const msg = error?.message || "";
  const status = error?.status;

  if (msg.includes("AI_TIMEOUT")) {
    return new AiProviderError("Yêu cầu xử lý AI bị quá thời gian (Timeout). Vui lòng thử lại sau.", {
      code: "AI_TIMEOUT",
      statusCode: 504,
      model,
      toolMode,
    });
  }

  if (msg.includes("not found") || msg.includes("404") || status === 404) {
    return new AiProviderError(
      `Mô hình AI '${model}' không tìm thấy hoặc không được hỗ trợ. Vui lòng kiểm tra biến GEMINI_MODEL.`,
      {
        code: "AI_MODEL_NOT_FOUND",
        statusCode: 503,
        model,
        toolMode,
      }
    );
  }

  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429") || status === 429) {
    return new AiProviderError(
      "Hạn ngạch gọi AI tạm thời bị vượt quá (Rate limit / Quota exceeded). Vui lòng thử lại sau ít phút.",
      {
        code: "AI_QUOTA_EXCEEDED",
        statusCode: 503,
        model,
        toolMode,
      }
    );
  }

  if (
    msg.includes("API key not valid") ||
    msg.includes("401") ||
    msg.includes("403") ||
    status === 401 ||
    status === 403
  ) {
    return new AiProviderError(
      "Khóa GEMINI_API_KEY không hợp lệ hoặc đã hết hạn.",
      {
        code: "AI_AUTH_ERROR",
        statusCode: 502,
        model,
        toolMode,
      }
    );
  }

  return new AiProviderError(
    `Lỗi kết nối máy chủ AI: ${msg.slice(0, 120)}`,
    {
      code: "AI_PROVIDER_ERROR",
      statusCode: 502,
      model,
      toolMode,
    }
  );
}

/**
 * Gọi generateContent kèm cơ chế tự động thử lại (retry backoff) khi gặp 429 Rate Limit
 */
async function generateContentWithRetry(
  gemini: any,
  params: any,
  maxRetries: number = 3
): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      return await gemini.models.generateContent(params);
    } catch (err: any) {
      attempt++;
      const errMsg = err?.message || "";
      const isRateLimit =
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        err?.status === 429;

      if (isRateLimit && attempt <= maxRetries) {
        let delayMs = attempt * 3500;
        const match = errMsg.match(/retry in ([0-9.]+)s/i);
        if (match && match[1]) {
          const sec = parseFloat(match[1]);
          if (!isNaN(sec) && sec > 0 && sec <= 12) {
            delayMs = Math.ceil(sec * 1000) + 1000;
          }
        }
        safeAiLog("warn", `Gemini Rate Limit 429, tự động thử lại sau ${delayMs}ms (Lượt ${attempt}/${maxRetries})`, {
          model: params.model,
          status: "timeout",
        });
        await new Promise((res) => setTimeout(res, delayMs));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Xử lý cuộc trò chuyện với Gemini AI theo phân loại Intent an toàn:
 * - financial: Chỉ dùng custom function calling (bảo vệ 100% dữ liệu tài chính riêng tư)
 * - realtime: Dùng Google Search (kèm fallback grounding thời gian thực khi hết quota)
 * - general: Trả lời trực tiếp, không bật tool
 */
export async function processAiFinancialChat(
  userId: string,
  userMessage: string,
  history: ChatHistoryItem[] = []
): Promise<string> {
  const gemini = getGeminiClient();
  const currentModel = getGeminiModelName();
  const toolMode = classifyIntent(userMessage);

  // Nếu chưa cấu hình GEMINI_API_KEY, ném lỗi cấu hình 503 thay vì trả lời giả thành công
  if (!gemini) {
    throw new AiProviderError(
      "Chưa cấu hình GEMINI_API_KEY trong file .env. Vui lòng cấu hình khóa API để sử dụng tính năng này.",
      {
        code: "AI_CONFIG_MISSING",
        statusCode: 503,
        model: currentModel,
        toolMode,
      }
    );
  }

  // Chuẩn bị nội dung hội thoại
  const contents: any[] = [];
  for (const item of history) {
    contents.push({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    });
  }
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  // =========================================================================
  // LUỒNG 1: FINANCIAL - Truy vấn dữ liệu tài chính qua 9 Custom Function Tools
  // TUYỆT ĐỐI KHÔNG BẬT googleSearch để tránh rò rỉ dữ liệu và xung đột tool
  // =========================================================================
  if (toolMode === "financial") {
    const toolsConfig = [{ functionDeclarations: toolDeclarations as any }];
    const MAX_TURNS = 4;
    let turnCount = 0;

    while (turnCount < MAX_TURNS) {
      turnCount++;

      safeAiLog("info", "Gemini Financial Chat Turn", {
        model: currentModel,
        toolName: "financial_tools",
        status: "success",
      });

      let response: any;
      try {
        response = await generateContentWithRetry(gemini, {
          model: currentModel,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: toolsConfig,
          },
        });
      } catch (err: any) {
        throw mapToAiProviderError(err, currentModel, "financial");
      }

      const candidate = response.candidates?.[0];
      const modelContent = candidate?.content;

      if (!modelContent) {
        throw new AiProviderError("Không nhận được nội dung phản hồi từ mô hình AI", {
          code: "AI_EMPTY_RESPONSE",
          statusCode: 502,
          model: currentModel,
          toolMode: "financial",
        });
      }

      contents.push(modelContent);
      const functionCalls = response.functionCalls;

      if (!functionCalls || functionCalls.length === 0) {
        const finalText = response.text || "";
        if (finalText.trim().length > 0) {
          return finalText;
        }
        const partsText = modelContent.parts
          ?.filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join("\n");
        if (partsText && partsText.trim().length > 0) {
          return partsText;
        }
        return "Tôi đã phân tích xong dữ liệu của bạn, bạn cần hỗ trợ thêm thông tin gì không?";
      }

      // Thực thi từng function call với userId server-side an toàn
      const functionResponseParts: any[] = [];
      for (const call of functionCalls) {
        const callName = call.name || "";
        if (!callName) continue;

        const result = await executeTool(userId, callName, call.args || {});
        functionResponseParts.push({
          functionResponse: {
            name: callName,
            ...(call.id ? { id: call.id } : {}),
            response: { result },
          },
        });
      }

      contents.push({
        role: "user",
        parts: functionResponseParts,
      });

      // Nghỉ ngắn để giảm xung đột rate limit giữa các lượt gọi
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // Nếu đạt quá 4 lượt, yêu cầu tổng hợp lần cuối
    try {
      const finalResponse = await generateContentWithRetry(gemini, {
        model: currentModel,
        contents: [
          ...contents,
          {
            role: "user",
            parts: [
              {
                text: "Hãy tổng hợp lại kết quả dựa trên các dữ liệu đã truy vấn ở trên để trả lời câu hỏi của tôi một cách súc tích.",
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      return finalResponse.text || "Đã hoàn thành phân tích các số liệu tài chính của bạn.";
    } catch (err: any) {
      throw mapToAiProviderError(err, currentModel, "financial");
    }
  }

  // =========================================================================
  // LUỒNG 2: REALTIME - Tra cứu thông tin thời gian thực / bên ngoài
  // Chỉ bật googleSearch (KHÔNG bật functionDeclarations).
  // Nếu Google Search bị giới hạn quota (429), fallback sang nguồn dữ liệu thời gian thực
  // =========================================================================
  if (toolMode === "realtime") {
    try {
      const searchResponse = await gemini.models.generateContent({
        model: currentModel,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      const searchText = searchResponse.text || "";
      if (searchText.trim().length > 0) {
        const groundingMeta = searchResponse.candidates?.[0]?.groundingMetadata;
        let finalReply = searchText;
        if (groundingMeta?.webSearchQueries?.length && !finalReply.includes("Nguồn")) {
          finalReply += `\n\n*(Nguồn tra cứu: Google Search - từ khóa: ${groundingMeta.webSearchQueries.join(", ")})*`;
        }
        return finalReply;
      }
    } catch (searchErr: any) {
      const errMsg = searchErr?.message || "";
      const isQuotaOrToolIssue =
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota") ||
        errMsg.includes("unsupported") ||
        errMsg.includes("googleSearch");

      // Nếu không phải lỗi quota/tool của Google Search mà là lỗi Auth hay Model Not Found, ném lỗi ngay
      if (!isQuotaOrToolIssue) {
        throw mapToAiProviderError(searchErr, currentModel, "realtime");
      }

      safeAiLog("warn", "Google Search tool quota exhausted, falling back to open realtime grounding", {
        model: currentModel,
        toolMode: "realtime",
        errorSnippet: errMsg.slice(0, 100),
      });
    }

    // Fallback: Tra cứu thời tiết hoặc ngày giờ thực tế và nạp vào prompt để Gemini trả lời kèm nguồn
    let realtimeContext = "";
    const isWeather = [
      "thời tiết", "thoi tiet", "nhiệt độ", "nhiet do", "mưa", "nắng", "dự báo"
    ].some((k) => userMessage.toLowerCase().includes(k));

    if (isWeather) {
      const weatherData = await fetchRealtimeWeather(userMessage);
      if (weatherData) {
        realtimeContext += `\n\n${weatherData}`;
      }
    }

    realtimeContext += `\n\n${getRealtimeDateContext()}`;

    try {
      const fallbackResponse = await generateContentWithRetry(gemini, {
        model: currentModel,
        contents: [
          ...contents.slice(0, -1),
          {
            role: "user",
            parts: [
              {
                text: `${userMessage}\n\n[DỮ LIỆU NGUỒN THỜI GIAN THỰC ĐƯỢC CUNG CẤP]:\n${realtimeContext}\n\nHãy trả lời câu hỏi của tôi một cách chi tiết, thân thiện và chính xác dựa trên dữ liệu thời gian thực trên. Hãy nhớ ghi rõ nguồn thông tin tham khảo ở cuối phản hồi.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      const fallbackText = fallbackResponse.text || "";
      if (fallbackText.trim().length > 0) {
        return fallbackText;
      }
      throw new AiProviderError("Không nhận được phản hồi từ mô hình AI", {
        code: "AI_EMPTY_RESPONSE",
        statusCode: 502,
        model: currentModel,
        toolMode: "realtime",
      });
    } catch (fbErr: any) {
      throw mapToAiProviderError(fbErr, currentModel, "realtime");
    }
  }

  // =========================================================================
  // LUỒNG 3: GENERAL - Trò chuyện thông thường & kiến thức phổ thông
  // Không cần tool, trả lời trực tiếp siêu nhanh và tối ưu chi phí
  // =========================================================================
  try {
    const generalResponse = await generateContentWithRetry(gemini, {
      model: currentModel,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const replyText = generalResponse.text || "";
    if (replyText.trim().length > 0) {
      return replyText;
    }
    throw new AiProviderError("Không nhận được nội dung phản hồi từ mô hình AI", {
      code: "AI_EMPTY_RESPONSE",
      statusCode: 502,
      model: currentModel,
      toolMode: "general",
    });
  } catch (err: any) {
    throw mapToAiProviderError(err, currentModel, "general");
  }
}

