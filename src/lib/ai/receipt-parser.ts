import { Type } from "@google/genai";
import { z } from "zod";
import { getGeminiClient, getGeminiModelName, safeAiLog } from "./gemini-client";

export const ReceiptItemZodSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive().optional().default(1),
  price: z.number().int().nonnegative().optional().default(0),
});

export const ParsedReceiptZodSchema = z.object({
  merchantName: z.string().min(1),
  totalAmount: z.number().int().positive("Tổng tiền phải lớn hơn 0"),
  date: z.string(),
  categoryName: z.string().min(1),
  items: z.array(ReceiptItemZodSchema).default([]),
  taxAmount: z.number().int().nonnegative().optional(),
  confidence: z.number().min(0).max(1).default(0.9),
});

export type ReceiptItem = z.infer<typeof ReceiptItemZodSchema>;
export type ParsedReceiptData = z.infer<typeof ParsedReceiptZodSchema>;

/**
 * Phân tích ảnh hóa đơn bằng Gemini Vision Structured JSON
 * TUYỆT ĐỐI KHÔNG TẠO DỮ LIỆU HÓA ĐƠN MẪU GIẢ
 * Nếu không đọc được số tiền, báo lỗi rõ ràng để người dùng xử lý.
 */
export async function parseReceiptImage(
  imageBase64: string,
  ocrTextOverride?: string
): Promise<ParsedReceiptData> {
  const gemini = getGeminiClient();

  // 1. Phân tích qua Gemini Multimodal Vision API nếu đã cấu hình
  if (gemini && imageBase64 && imageBase64.trim().length > 0) {
    try {
      safeAiLog("info", "Bắt đầu bóc tách hóa đơn bằng Gemini Vision", { model: getGeminiModelName() });

      // Trích xuất mime_type và data base64 thuần
      let mimeType = "image/jpeg";
      let base64Data = imageBase64;

      const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
        base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
      }

      const prompt = `Bạn là chuyên gia bóc tách hóa đơn tài chính tại Việt Nam.
Hãy đọc toàn bộ thông tin trên ảnh hóa đơn này:
1. merchantName: Tên cửa hàng, siêu thị, nhà hàng hoặc doanh nghiệp xuất hóa đơn.
2. totalAmount: Tổng số tiền thanh toán cuối cùng (bắt buộc là số nguyên VNĐ, ví dụ 150000).
3. date: Ngày giờ in hóa đơn theo định dạng chuẩn ISO 8601 (nếu không thấy giờ, lấy ngày lúc 00:00:00).
4. categoryName: Danh mục chi tiêu tương ứng nhất (ví dụ: 'Ăn uống', 'Mua sắm & Tiêu dùng', 'Đi lại & Xăng xe', 'Hóa đơn & Tiện ích', 'Y tế & Sức khỏe').
5. items: Toàn bộ danh sách các mặt hàng/món ăn xuất hiện trên hóa đơn gồm tên món (name), số lượng (quantity) và đơn giá/thành tiền (price).
6. taxAmount: Tiền thuế VAT (nếu có ghi trên hóa đơn).

Nếu hình ảnh quá mờ hoặc không phải là hóa đơn và không thể đọc được tổng tiền, hãy để totalAmount là 0.`;

      const currentModel = getGeminiModelName();
      const parseStart = Date.now();

      const response = await gemini.models.generateContent({
        model: currentModel,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchantName: { type: Type.STRING },
              totalAmount: { type: Type.INTEGER },
              date: { type: Type.STRING },
              categoryName: { type: Type.STRING },
              taxAmount: { type: Type.INTEGER },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    price: { type: Type.INTEGER },
                  },
                  required: ["name", "price"],
                },
              },
            },
            required: ["merchantName", "totalAmount", "categoryName"],
          },
        },
      });

      const responseText = response.text;
      if (responseText) {
        const rawJson = JSON.parse(responseText);
        if (!rawJson.date) rawJson.date = new Date().toISOString();
        rawJson.confidence = 0.95;

        const validated = ParsedReceiptZodSchema.safeParse(rawJson);
        if (validated.success && validated.data.totalAmount > 0) {
          safeAiLog("info", "Gemini Vision bóc tách hóa đơn thành công", {
            model: currentModel,
            durationMs: Date.now() - parseStart,
            status: "success",
          });
          return validated.data;
        }
      }
    } catch (error: any) {
      safeAiLog("warn", "Lỗi bóc tách hóa đơn qua Gemini Vision", {
        status: "error",
        errorSnippet: error?.message?.slice(0, 100),
      });
    }
  }

  // 2. Nếu có văn bản OCR đi kèm (ví dụ OCR client-side)
  const text = ocrTextOverride || "";
  if (text.trim().length > 0) {
    const lower = text.toLowerCase();
    let merchant = "Cửa hàng / Nhà cung cấp";
    let category = "Mua sắm & Tiêu dùng";
    let total = 0;

    if (lower.includes("winmart") || lower.includes("vinmart")) {
      merchant = "Siêu thị WinMart";
      category = "Mua sắm & Tiêu dùng";
    } else if (lower.includes("co.op") || lower.includes("coopmart")) {
      merchant = "Siêu thị Co.opmart";
      category = "Mua sắm & Tiêu dùng";
    } else if (lower.includes("haidilao")) {
      merchant = "Lẩu Haidilao";
      category = "Ăn uống";
    } else if (lower.includes("highlands")) {
      merchant = "Highlands Coffee";
      category = "Ăn uống";
    } else if (lower.includes("petrolimex") || lower.includes("xăng")) {
      merchant = "Cửa hàng Xăng dầu";
      category = "Đi lại & Xăng xe";
    }

    const totalMatches = text.match(/(tổng cộng|thanh toán|tong tien|total|thành tiền)[\s:]*([0-9.,]+)/i);
    if (totalMatches && totalMatches[2]) {
      const clean = totalMatches[2].replace(/[.,]/g, "");
      total = parseInt(clean, 10) || 0;
    }

    if (total > 0) {
      return {
        merchantName: merchant,
        totalAmount: total,
        date: new Date().toISOString(),
        categoryName: category,
        items: [],
        confidence: 0.8,
      };
    }
  }

  // TUYỆT ĐỐI KHÔNG DÙNG DỮ LIỆU MẪU GIẢ (HIGHLANDS COFFEE 145K TRƯỚC ĐÂY ĐÃ BỊ XÓA BỎ)
  throw new Error(
    "Không thể bóc tách thông tin từ ảnh hóa đơn này. Vui lòng đảm bảo ảnh chụp rõ nét, đủ ánh sáng hoặc nhập tay thông tin giao dịch."
  );
}
