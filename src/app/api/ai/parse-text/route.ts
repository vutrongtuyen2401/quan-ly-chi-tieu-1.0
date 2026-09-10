import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseVietnameseTransaction } from "@/lib/ai/text-parser";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Vui lòng nhập nội dung câu nói" }, { status: 400 });
    }

    const parsed = await parseVietnameseTransaction(text);

    // Tìm ví phù hợp của người dùng hoặc lấy ví đầu tiên
    const userWallets = await prisma.wallet.findMany({
      where: { userId: session.user.id },
    });

    let selectedWallet = userWallets[0];
    if (parsed.walletName) {
      const match = userWallets.find((w) =>
        w.name.toLowerCase().includes(parsed.walletName!.toLowerCase())
      );
      if (match) selectedWallet = match;
    }

    // Tìm danh mục phù hợp
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: session.user.id }, { isSystemDefault: true }],
      },
    });

    const selectedCategory = categories.find((c) =>
      c.name.toLowerCase().includes(parsed.categoryName.toLowerCase())
    );

    // BẮT BUỘC: Tạo bản nháp (Draft), TUYỆT ĐỐI KHÔNG ghi trực tiếp vào bảng Transaction
    const draft = await prisma.aiTransactionDraft.create({
      data: {
        userId: session.user.id,
        rawInput: text,
        sourceType: "TEXT",
        status: "PENDING",
        suggestedData: {
          amount: parsed.amount,
          type: parsed.type,
          categoryId: selectedCategory?.id || null,
          categoryName: selectedCategory?.name || parsed.categoryName,
          walletId: selectedWallet?.id || null,
          walletName: selectedWallet?.name || "Tiền mặt",
          description: parsed.description,
          date: parsed.date,
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
    console.error("Lỗi parse-text:", error);
    return NextResponse.json({ error: "Lỗi xử lý ngôn ngữ tự nhiên" }, { status: 500 });
  }
}
