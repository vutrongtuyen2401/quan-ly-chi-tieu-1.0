import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WalletSchema } from "@/lib/validations";
import { serializeBigInt } from "@/lib/formatters";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const wallets = await prisma.wallet.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ wallets: serializeBigInt(wallets) });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách ví:", error);
    return NextResponse.json({ error: "Lỗi tải ví" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = WalletSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu ví không hợp lệ" },
        { status: 400 }
      );
    }

    const { name, type, accountNumber, bankName, balance, color, icon, isExcludedFromTotal } =
      parsed.data;

    const balanceBigInt = BigInt(Math.round(balance));

    const wallet = await prisma.wallet.create({
      data: {
        userId: session.user.id,
        name,
        type,
        accountNumber: accountNumber || null,
        bankName: bankName || null,
        balance: balanceBigInt,
        initialBalance: balanceBigInt,
        color,
        icon,
        isExcludedFromTotal,
      },
    });

    return NextResponse.json({ success: true, wallet: serializeBigInt(wallet) }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi tạo ví:", error);
    return NextResponse.json({ error: "Lỗi tạo ví" }, { status: 500 });
  }
}
