import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/formatters";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const { amount, type, walletId } = await req.json(); // type: "DEPOSIT" | "WITHDRAW"

    const amt = BigInt(Math.round(Number(amount) || 0));
    if (amt <= 0) {
      return NextResponse.json({ error: "Số tiền phải lớn hơn 0" }, { status: 400 });
    }

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!goal) {
      return NextResponse.json({ error: "Mục tiêu không tồn tại" }, { status: 404 });
    }

    const activeWalletId = walletId || goal.walletId;

    const updated = await prisma.$transaction(async (tx) => {
      // Nếu có gắn ví, cập nhật số dư ví
      if (activeWalletId) {
        if (type === "DEPOSIT") {
          // Trừ tiền ở ví nạp vào mục tiêu
          await tx.wallet.update({
            where: { id: activeWalletId },
            data: { balance: { decrement: amt } },
          });
        } else if (type === "WITHDRAW") {
          // Rút tiền từ mục tiêu về ví
          await tx.wallet.update({
            where: { id: activeWalletId },
            data: { balance: { increment: amt } },
          });
        }
      }

      // Cập nhật số tiền hiện có của mục tiêu
      const newCurrentAmount =
        type === "DEPOSIT"
          ? goal.currentAmount + amt
          : goal.currentAmount >= amt
          ? goal.currentAmount - amt
          : BigInt(0);

      const isCompleted = newCurrentAmount >= goal.targetAmount;

      return tx.savingsGoal.update({
        where: { id },
        data: {
          currentAmount: newCurrentAmount,
          status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
        },
      });
    });

    return NextResponse.json({ success: true, goal: serializeBigInt(updated) });
  } catch (error: any) {
    console.error("Lỗi nạp/rút tiền tiết kiệm:", error);
    return NextResponse.json({ error: "Lỗi xử lý giao dịch tiết kiệm" }, { status: 500 });
  }
}
