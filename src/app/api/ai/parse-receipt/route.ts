import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseReceiptImage } from "@/lib/ai/receipt-parser";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";
import { validateReceiptImage } from "@/lib/file-validator";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimitKey = `ai_receipt:${session.user.id || clientIp}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.AI_PARSE_RECEIPT);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Bạn đang tải lên hóa đơn quá nhanh. Vui lòng thử lại sau ${rateLimit.retryAfterSeconds} giây.`
      );
    }

    const { imageBase64, ocrText } = await req.json();
    if (!imageBase64 && !ocrText) {
      return NextResponse.json({ error: "Vui lòng cung cấp ảnh hóa đơn hoặc dữ liệu quét" }, { status: 400 });
    }

    // Kiểm tra tính hợp lệ của tệp ảnh (MIME thật, dung lượng <= 5MB, kích thước/tỷ lệ)
    if (imageBase64) {
      const validation = validateReceiptImage(imageBase64);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    const parsed = await parseReceiptImage(imageBase64 || "", ocrText);

    // Lấy ví mặc định của user
    const wallets = await prisma.wallet.findMany({
      where: { userId: session.user.id },
    });
    const defaultWallet = wallets[0];

    // Tìm danh mục
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: session.user.id }, { isSystemDefault: true }],
      },
    });

    const matchedCategory = categories.find((c) =>
      c.name.toLowerCase().includes(parsed.categoryName.toLowerCase())
    );

    // BẮT BUỘC: Tạo bản nháp (Draft), TUYỆT ĐỐI KHÔNG ghi trực tiếp
    const draft = await prisma.aiTransactionDraft.create({
      data: {
        userId: session.user.id,
        rawInput: `Hóa đơn: ${parsed.merchantName} - Tổng tiền: ${parsed.totalAmount} VNĐ`,
        sourceType: "RECEIPT",
        status: "PENDING",
        suggestedData: {
          merchantName: parsed.merchantName,
          amount: parsed.totalAmount,
          type: "EXPENSE",
          categoryId: matchedCategory?.id || null,
          categoryName: matchedCategory?.name || parsed.categoryName,
          walletId: defaultWallet?.id || null,
          walletName: defaultWallet?.name || "Tiền mặt",
          description: `Chi tiêu tại ${parsed.merchantName}`,
          date: parsed.date,
          items: parsed.items as any,
          confidence: parsed.confidence,
        },
      },
    });

    return NextResponse.json({
      success: true,
      draftId: draft.id,
      suggestedData: draft.suggestedData,
      status: draft.status,
    });
  } catch (error: any) {
    console.error("Lỗi parse-receipt:", error);
    return NextResponse.json(
      { error: error?.message || "Lỗi bóc tách ảnh hóa đơn" },
      { status: 400 }
    );
  }
}
