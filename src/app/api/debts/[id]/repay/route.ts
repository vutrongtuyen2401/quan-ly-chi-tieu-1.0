import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DebtRepaymentSchema } from "@/lib/validations";
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
    const body = await req.json();
    const parsed = DebtRepaymentSchema.safeParse({ ...body, debtBookId: id });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Thông tin trả nợ không hợp lệ" },
        { status: 400 }
      );
    }

    const { amount, walletId, date, note } = parsed.data;
    const repaymentAmount = BigInt(Math.round(amount));

    const debt = await prisma.debtBook.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!debt) {
      return NextResponse.json({ error: "Khoản nợ không tồn tại" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Tạo bản ghi trả nợ
      const repayment = await tx.debtRepayment.create({
        data: {
          debtBookId: id,
          amount: repaymentAmount,
          walletId: walletId || null,
          date: new Date(date),
          note: note || null,
        },
      });

      // 2. Cập nhật số tiền đã trả và trạng thái khoản nợ
      const newPaidAmount = debt.paidAmount + repaymentAmount;
      const isSettled = newPaidAmount >= debt.totalAmount;

      await tx.debtBook.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          status: isSettled ? "SETTLED" : "ACTIVE",
        },
      });

      // 3. Nếu có gắn ví, cập nhật số dư ví
      if (walletId) {
        if (debt.type === "LEND") {
          // Người khác trả tiền cho mình -> tăng tiền ví
          await tx.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: repaymentAmount } },
          });
        } else {
          // Mình trả tiền cho người ta -> giảm tiền ví
          await tx.wallet.update({
            where: { id: walletId },
            data: { balance: { decrement: repaymentAmount } },
          });
        }
      }

      return repayment;
    });

    return NextResponse.json({ success: true, repayment: serializeBigInt(result) }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi ghi nhận trả nợ:", error);
    return NextResponse.json({ error: "Lỗi ghi nhận trả nợ" }, { status: 500 });
  }
}
