import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditAction } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const { id: draftId } = await params;
    const body = await req.json();

    // 1. Kiểm tra bản nháp thuộc về chính user hiện tại
    const draft = await prisma.aiTransactionDraft.findFirst({
      where: { id: draftId, userId: session.user.id, status: "PENDING" },
    });

    if (!draft) {
      return NextResponse.json({ error: "Bản nháp không tồn tại hoặc đã được xử lý" }, { status: 404 });
    }

    const amount = BigInt(Math.round(Number(body.amount) || 0));
    if (amount <= 0) {
      return NextResponse.json({ error: "Số tiền phải lớn hơn 0" }, { status: 400 });
    }

    const walletId = body.walletId;
    if (!walletId) {
      return NextResponse.json({ error: "Vui lòng chọn ví để ghi sổ" }, { status: 400 });
    }

    // Kiểm tra ví thuộc về user
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: session.user.id },
    });
    if (!wallet) {
      return NextResponse.json({ error: "Ví không hợp lệ" }, { status: 400 });
    }

    const type = (body.type || "EXPENSE") as "EXPENSE" | "INCOME" | "TRANSFER";
    const description = body.description || "Giao dịch xác nhận từ AI";
    const date = body.date ? new Date(body.date) : new Date();
    const categoryId = body.categoryId || null;
    const destinationWalletId = body.destinationWalletId || null;

    // 2. Chạy Prisma Transaction đảm bảo tính toàn vẹn 2 chiều
    const result = await prisma.$transaction(async (tx) => {
      // Tạo giao dịch chính thức
      const transaction = await tx.transaction.create({
        data: {
          userId: currentUserId,
          walletId,
          destinationWalletId: type === "TRANSFER" ? destinationWalletId : null,
          categoryId: type !== "TRANSFER" ? categoryId : null,
          amount,
          type,
          description,
          note: body.note || null,
          date,
          source:
            draft.sourceType === "VOICE"
              ? "AI_VOICE"
              : draft.sourceType === "RECEIPT"
              ? "AI_RECEIPT"
              : "AI_TEXT",
        },
      });

      // Cập nhật số dư ví
      if (type === "EXPENSE") {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { decrement: amount } },
        });
      } else if (type === "INCOME") {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: amount } },
        });
      } else if (type === "TRANSFER" && destinationWalletId) {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { decrement: amount } },
        });
        await tx.wallet.update({
          where: { id: destinationWalletId },
          data: { balance: { increment: amount } },
        });
      }

      // Cập nhật trạng thái bản nháp
      await tx.aiTransactionDraft.update({
        where: { id: draftId },
        data: {
          status: "CONFIRMED",
          confirmedTransactionId: transaction.id,
        },
      });

      return transaction;
    });

    await logAuditAction({
      userId: session.user.id,
      action: "AI_DRAFT_CONFIRM",
      entity: "AiTransactionDraft",
      entityId: draftId,
      details: {
        transactionId: result.id,
        amount: Number(amount),
        type,
        walletId,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      transactionId: result.id,
      message: "Giao dịch đã được xác nhận và ghi vào sổ thành công!",
    });
  } catch (error: any) {
    console.error("Lỗi xác nhận bản nháp:", error);
    return NextResponse.json({ error: "Lỗi ghi nhận giao dịch vào cơ sở dữ liệu" }, { status: 500 });
  }
}
