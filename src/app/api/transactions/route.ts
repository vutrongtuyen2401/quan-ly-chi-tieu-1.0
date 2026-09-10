import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionSchema } from "@/lib/validations";
import { serializeBigInt } from "@/lib/formatters";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const walletId = searchParams.get("walletId");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type"); // EXPENSE, INCOME, TRANSFER
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {
      userId: session.user.id,
    };

    if (walletId) whereClause.walletId = walletId;
    if (categoryId) whereClause.categoryId = categoryId;
    if (type) whereClause.type = type;

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate);
      if (endDate) whereClause.date.lte = new Date(endDate);
    }

    if (search && search.trim().length > 0) {
      whereClause.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { note: { contains: search, mode: "insensitive" } },
        { payee: { contains: search, mode: "insensitive" } },
      ];
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          wallet: { select: { id: true, name: true, color: true, icon: true } },
          destinationWallet: { select: { id: true, name: true, color: true, icon: true } },
          category: { select: { id: true, name: true, color: true, icon: true } },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip,
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      transactions: serializeBigInt(transactions),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách giao dịch:", error);
    return NextResponse.json({ error: "Lỗi tải giao dịch" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const body = await req.json();
    const parsed = TransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Thông tin giao dịch không hợp lệ" },
        { status: 400 }
      );
    }

    const {
      walletId,
      destinationWalletId,
      categoryId,
      amount,
      type,
      date,
      description,
      note,
      payee,
      tags,
      imageUrl,
    } = parsed.data;

    const amountBigInt = BigInt(Math.round(amount));

    // Kiểm tra ví thuộc về user
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: session.user.id },
    });
    if (!wallet) {
      return NextResponse.json({ error: "Ví không hợp lệ" }, { status: 400 });
    }

    if (type === "TRANSFER") {
      if (!destinationWalletId) {
        return NextResponse.json({ error: "Vui lòng chọn ví đích" }, { status: 400 });
      }
      const destWallet = await prisma.wallet.findFirst({
        where: { id: destinationWalletId, userId: session.user.id },
      });
      if (!destWallet) {
        return NextResponse.json({ error: "Ví đích không hợp lệ" }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: currentUserId,
          walletId,
          destinationWalletId: type === "TRANSFER" ? destinationWalletId : null,
          categoryId: type !== "TRANSFER" ? categoryId : null,
          amount: amountBigInt,
          type,
          date: new Date(date),
          description,
          note: note || null,
          payee: payee || null,
          tags,
          imageUrl: imageUrl || null,
          source: "MANUAL",
        },
      });

      // Cập nhật số dư ví tương ứng
      if (type === "EXPENSE") {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { decrement: amountBigInt } },
        });
      } else if (type === "INCOME") {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: amountBigInt } },
        });
      } else if (type === "TRANSFER" && destinationWalletId) {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { decrement: amountBigInt } },
        });
        await tx.wallet.update({
          where: { id: destinationWalletId },
          data: { balance: { increment: amountBigInt } },
        });
      }

      return transaction;
    });

    return NextResponse.json({ success: true, transaction: serializeBigInt(result) }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi tạo giao dịch:", error);
    return NextResponse.json({ error: "Lỗi tạo giao dịch" }, { status: 500 });
  }
}
