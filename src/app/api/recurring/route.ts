import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RecurringRuleSchema } from "@/lib/validations";
import { serializeBigInt } from "@/lib/formatters";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const rules = await prisma.recurringRule.findMany({
      where: { userId: session.user.id },
      include: {
        wallet: { select: { id: true, name: true, color: true } },
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { nextDueDate: "asc" },
    });

    return NextResponse.json({ rules: serializeBigInt(rules) });
  } catch (error: any) {
    console.error("Lỗi lấy giao dịch định kỳ:", error);
    return NextResponse.json({ error: "Lỗi tải giao dịch định kỳ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = RecurringRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Thông tin định kỳ không hợp lệ" },
        { status: 400 }
      );
    }

    const {
      walletId,
      categoryId,
      amount,
      type,
      description,
      frequency,
      isFixedAmount,
      startDate,
      nextDueDate,
    } = parsed.data;

    const rule = await prisma.recurringRule.create({
      data: {
        userId: session.user.id,
        walletId,
        categoryId: categoryId || null,
        amount: BigInt(Math.round(amount)),
        type,
        description,
        frequency,
        isFixedAmount,
        startDate: new Date(startDate),
        nextDueDate: new Date(nextDueDate),
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, rule: serializeBigInt(rule) }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi tạo giao dịch định kỳ:", error);
    return NextResponse.json({ error: "Lỗi tạo giao dịch định kỳ" }, { status: 500 });
  }
}
