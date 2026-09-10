import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransferSchema } from "@/lib/validations";
import { serializeBigInt } from "@/lib/formatters";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const body = await req.json();
    const parsed = TransferSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Thông tin chuyển tiền không hợp lệ" },
        { status: 400 }
      );
    }

    const { sourceWalletId, destinationWalletId, amount, date, note } = parsed.data;
    const amountBigInt = BigInt(Math.round(amount));

    // Kiểm tra 2 ví đều thuộc về user
    const [sourceWallet, destWallet] = await Promise.all([
      prisma.wallet.findFirst({ where: { id: sourceWalletId, userId: session.user.id } }),
      prisma.wallet.findFirst({ where: { id: destinationWalletId, userId: session.user.id } }),
    ]);

    if (!sourceWallet || !destWallet) {
      return NextResponse.json({ error: "Ví nguồn hoặc ví đích không tồn tại" }, { status: 404 });
    }

    if (sourceWallet.balance < amountBigInt) {
      return NextResponse.json(
        { error: `Số dư ví nguồn không đủ (Số dư hiện tại: ${sourceWallet.balance.toLocaleString("vi-VN")} ₫)` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Trừ tiền ví nguồn
      await tx.wallet.update({
        where: { id: sourceWalletId },
        data: { balance: { decrement: amountBigInt } },
      });

      // 2. Cộng tiền ví đích
      await tx.wallet.update({
        where: { id: destinationWalletId },
        data: { balance: { increment: amountBigInt } },
      });

      // 3. Tạo bản ghi giao dịch chuyển khoản
      const transaction = await tx.transaction.create({
        data: {
          userId: currentUserId,
          walletId: sourceWalletId,
          destinationWalletId,
          amount: amountBigInt,
          type: "TRANSFER",
          description: `Chuyển tiền từ ${sourceWallet.name} sang ${destWallet.name}`,
          note: note || null,
          date: new Date(date),
          source: "MANUAL",
        },
      });

      return transaction;
    });

    return NextResponse.json({ success: true, transaction: serializeBigInt(result) }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi chuyển tiền nội bộ:", error);
    return NextResponse.json({ error: "Lỗi chuyển tiền nội bộ" }, { status: 500 });
  }
}
