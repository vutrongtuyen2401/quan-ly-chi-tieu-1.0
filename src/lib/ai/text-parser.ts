import { z } from "zod";
import { Type } from "@google/genai";
import { getGeminiClient, getGeminiModelName, safeAiLog } from "./gemini-client";

export const ParsedTransactionZodSchema = z.object({
  amount: z.number().int().nonnegative(),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  categoryName: z.string().min(1),
  walletName: z.string().optional(),
  destinationWalletName: z.string().optional(),
  description: z.string().min(1),
  date: z.string(),
  confidence: z.number().min(0).max(1),
});

export type ParsedTransactionData = z.infer<typeof ParsedTransactionZodSchema>;

/**
 * Phân tích bằng Rule-based NLP tiếng Việt
 */
function parseByLocalRules(text: string): ParsedTransactionData {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Phân tích loại giao dịch (Type)
  let type: "EXPENSE" | "INCOME" | "TRANSFER" = "EXPENSE";
  if (
    lower.includes("chuyển từ") ||
    lower.includes("nạp vào") ||
    lower.includes("sang ví") ||
    (lower.includes("chuyển") && (lower.includes("sang") || lower.includes("vào ví")))
  ) {
    type = "TRANSFER";
  } else if (
    lower.includes("lương") ||
    lower.includes("nhận") ||
    lower.includes("thưởng") ||
    lower.includes("thu nhập") ||
    lower.includes("được cho") ||
    lower.includes("được tặng") ||
    lower.includes("bán được") ||
    lower.includes("tiền lãi")
  ) {
    type = "INCOME";
  } else {
    type = "EXPENSE";
  }

  // 2. Trích xuất số tiền (Amount in VND Integer)
  let amount = 0;
  const trieuMatch = lower.match(/(\d+([.,]\d+)?)\s*(tr|triệu|trieu)/i);
  const kMatch = lower.match(/(\d+([.,]\d+)?)\s*(k|nghìn|ngàn|nghin|ngan)/i);
  const tyMatch = lower.match(/(\d+([.,]\d+)?)\s*(tỷ|ty)/i);
  const exactNumberMatch = lower.match(/(\d{1,3}([.,]\d{3})+|\d{4,12})/);

  if (tyMatch) {
    const val = parseFloat(tyMatch[1].replace(",", "."));
    amount = Math.round(val * 1_000_000_000);
  } else if (trieuMatch) {
    const val = parseFloat(trieuMatch[1].replace(",", "."));
    amount = Math.round(val * 1_000_000);
  } else if (kMatch) {
    const val = parseFloat(kMatch[1].replace(",", "."));
    amount = Math.round(val * 1_000);
  } else if (exactNumberMatch) {
    const cleanStr = exactNumberMatch[0].replace(/[.,]/g, "");
    amount = parseInt(cleanStr, 10) || 0;
  }

  // 3. Phân tích danh mục
  let categoryName = type === "INCOME" ? "Thu nhập khác" : "Chi phí khác";

  if (type === "TRANSFER") {
    categoryName = "Chuyển khoản nội bộ";
  } else if (type === "INCOME") {
    if (lower.includes("lương")) categoryName = "Tiền lương";
    else if (lower.includes("thưởng") || lower.includes("hoa hồng")) categoryName = "Thưởng & Hoa hồng";
    else if (lower.includes("đầu tư") || lower.includes("cổ tức") || lower.includes("tiền lãi")) categoryName = "Đầu tư & Sinh lời";
    else if (lower.includes("kinh doanh") || lower.includes("bán hàng") || lower.includes("nghề phụ")) categoryName = "Kinh doanh & Nghề tay trái";
    else if (lower.includes("tặng") || lower.includes("lì xì") || lower.includes("cho")) categoryName = "Được tặng & Lì xì";
  } else {
    if (
      lower.includes("ăn") ||
      lower.includes("uống") ||
      lower.includes("phở") ||
      lower.includes("cơm") ||
      lower.includes("trà sữa") ||
      lower.includes("cafe") ||
      lower.includes("cà phê") ||
      lower.includes("nhậu") ||
      lower.includes("lẩu") ||
      lower.includes("bún") ||
      lower.includes("bánh mì") ||
      lower.includes("haidilao") ||
      lower.includes("highlands") ||
      lower.includes("starbucks")
    ) {
      categoryName = "Ăn uống";
    } else if (
      lower.includes("xăng") ||
      lower.includes("xe") ||
      lower.includes("grab") ||
      lower.includes("be") ||
      lower.includes("taxi") ||
      lower.includes("gửi xe")
    ) {
      categoryName = "Đi lại & Xăng xe";
    } else if (
      lower.includes("mua") ||
      lower.includes("shopee") ||
      lower.includes("lazada") ||
      lower.includes("tiki") ||
      lower.includes("quần") ||
      lower.includes("áo") ||
      lower.includes("giày") ||
      lower.includes("siêu thị") ||
      lower.includes("vinmart") ||
      lower.includes("winmart")
    ) {
      categoryName = "Mua sắm & Tiêu dùng";
    } else if (
      lower.includes("điện") ||
      lower.includes("nước") ||
      lower.includes("wifi") ||
      lower.includes("internet") ||
      lower.includes("hóa đơn") ||
      lower.includes("tiện ích")
    ) {
      categoryName = "Hóa đơn & Tiện ích";
    } else if (
      lower.includes("thuê nhà") ||
      lower.includes("tiền nhà") ||
      lower.includes("phòng trọ") ||
      lower.includes("chung cư")
    ) {
      categoryName = "Nhà cửa & Thuê nhà";
    } else if (
      lower.includes("thuốc") ||
      lower.includes("khám") ||
      lower.includes("bệnh viện")
    ) {
      categoryName = "Y tế & Sức khỏe";
    } else if (
      lower.includes("học") ||
      lower.includes("sách") ||
      lower.includes("khóa học")
    ) {
      categoryName = "Giáo dục & Học tập";
    } else if (
      lower.includes("phim") ||
      lower.includes("du lịch") ||
      lower.includes("vé máy bay")
    ) {
      categoryName = "Giải trí & Du lịch";
    }
  }

  // 4. Phân tích Ví
  let walletName: string | undefined = undefined;
  let destinationWalletName: string | undefined = undefined;

  if (lower.includes("momo") || lower.includes("ví momo")) walletName = "Ví MoMo";
  else if (lower.includes("vietcombank") || lower.includes("vcb")) walletName = "Vietcombank Priority";
  else if (lower.includes("techcombank") || lower.includes("tcb")) walletName = "Sổ tiết kiệm Techcombank";
  else if (lower.includes("tiền mặt") || lower.includes("trong ví")) walletName = "Tiền mặt trong ví";

  if (type === "TRANSFER") {
    if (lower.includes("sang momo") || lower.includes("vào momo")) {
      destinationWalletName = "Ví MoMo";
    } else if (lower.includes("sang vietcombank") || lower.includes("vào vietcombank")) {
      destinationWalletName = "Vietcombank Priority";
    }
  }

  // 5. Mô tả
  let description = raw;
  const cleanDescription = raw
    .replace(/(bằng|qua|từ|vào)\s+(ví|tài khoản|ngân hàng)?\s*(momo|vcb|vietcombank|tiền mặt|techcombank)/gi, "")
    .trim();

  if (cleanDescription.length > 3) {
    description = cleanDescription;
  }

  const now = new Date();
  let dateObj = now;
  if (lower.includes("hôm qua") || lower.includes("tối qua")) {
    dateObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (lower.includes("hôm kia")) {
    dateObj = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  }

  return {
    amount: amount || 0,
    type,
    categoryName,
    walletName,
    destinationWalletName,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    date: dateObj.toISOString(),
    confidence: amount > 0 ? 0.95 : 0.6,
  };
}

/**
 * Bóc tách câu tự nhiên / giọng nói với Gemini Structured JSON & Zod validation
 */
export async function parseVietnameseTransaction(text: string): Promise<ParsedTransactionData> {
  const gemini = getGeminiClient();

  if (gemini) {
    try {
      const prompt = `Phân tích câu giao dịch tài chính tiếng Việt sau và bóc tách thành thông tin có cấu trúc:
"${text}"

Quy tắc:
- amount: Số tiền nguyên dương tính bằng VNĐ (ví dụ "50k" -> 50000, "2 triệu" -> 2000000, "2.5tr" -> 2500000).
- type: 'EXPENSE' (chi tiêu thông thường), 'INCOME' (tiền về/lương/thưởng), hoặc 'TRANSFER' (chuyển tiền giữa các ví).
- categoryName: Tên danh mục phù hợp (Ăn uống, Đi lại & Xăng xe, Mua sắm & Tiêu dùng, Hóa đơn & Tiện ích, Nhà cửa & Thuê nhà, Y tế & Sức khỏe, Giáo dục & Học tập, Tiền lương, Thưởng & Hoa hồng, v.v.).
- walletName: Tên ví/tài khoản nguồn nếu được nhắc tới (Ví MoMo, Vietcombank Priority, Tiền mặt trong ví, Sổ tiết kiệm Techcombank).
- destinationWalletName: Tên ví đích nếu là TRANSFER.
- description: Mô tả ngắn gọn nội dung giao dịch.
- date: Ngày giờ theo chuẩn ISO 8601 (mặc định hôm nay).
- confidence: Độ tự tin từ 0.0 đến 1.0.`;

      const currentModel = getGeminiModelName();
      const parseStart = Date.now();

      const response = await gemini.models.generateContent({
        model: currentModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.INTEGER, description: "Số tiền nguyên VNĐ" },
              type: { type: Type.STRING, enum: ["EXPENSE", "INCOME", "TRANSFER"] },
              categoryName: { type: Type.STRING },
              walletName: { type: Type.STRING },
              destinationWalletName: { type: Type.STRING },
              description: { type: Type.STRING },
              date: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ["amount", "type", "categoryName", "description"],
          },
        },
      });

      const responseText = response.text;
      if (responseText) {
        const rawJson = JSON.parse(responseText);
        // Đảm bảo date hợp lệ
        if (!rawJson.date) rawJson.date = new Date().toISOString();
        if (rawJson.confidence === undefined) rawJson.confidence = 0.95;

        const validated = ParsedTransactionZodSchema.safeParse(rawJson);
        if (validated.success && validated.data.amount > 0) {
          safeAiLog("info", "Gemini Structured Text Parse Thành Công", {
            model: currentModel,
            durationMs: Date.now() - parseStart,
            status: "success",
          });
          return validated.data;
        }
      }
    } catch (e: any) {
      safeAiLog("warn", "Lỗi Gemini Structured Parse, chuyển sang Local Rule-based", {
        status: "error",
        errorSnippet: e?.message?.slice(0, 100),
      });
    }
  }

  // Fallback an toàn sang local rules (vẫn qua Zod validation)
  const localResult = parseByLocalRules(text);
  return ParsedTransactionZodSchema.parse(localResult);
}
