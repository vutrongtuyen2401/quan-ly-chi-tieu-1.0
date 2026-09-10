import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditAction } from "@/lib/audit";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Giao dịch không tồn tại" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Hoàn tác số dư trên ví
      if (existing.type === "EXPENSE") {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { increment: existing.amount } },
        });
      } else if (existing.type === "INCOME") {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { decrement: existing.amount } },
        });
      } else if (existing.type === "TRANSFER" && existing.destinationWalletId) {
        await tx.wallet.update({
          where: { id: existing.walletId },
          data: { balance: { increment: existing.amount } },
        });
        await tx.wallet.update({
          where: { id: existing.destinationWalletId },
          data: { balance: { decrement: existing.amount } },
        });
      }

      await tx.transaction.delete({ where: { id } });
    });

    await logAuditAction({
      userId: session.user.id,
      action: "TRANSACTION_DELETE",
      entity: "Transaction",
      entityId: id,
      details: {
        amount: existing.amount.toString(),
        type: existing.type,
        walletId: existing.walletId,
      },
      req,
    });

    return NextResponse.json({ success: true, message: "Đã xóa giao dịch và hoàn tất cập nhật số dư ví" });
  } catch (error: any) {
    console.error("Lỗi xóa giao dịch:", error);
    return NextResponse.json({ error: "Lỗi xóa giao dịch" }, { status: 500 });
  }
}
