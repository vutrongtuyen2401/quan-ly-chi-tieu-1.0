import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DebtBookSchema } from "@/lib/validations";
import { serializeBigInt } from "@/lib/formatters";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const debts = await prisma.debtBook.findMany({
      where: { userId: session.user.id },
      include: {
        repayments: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const enriched = debts.map((d) => {
      const total = Number(d.totalAmount);
      const paid = Number(d.paidAmount);
      const remaining = Math.max(0, total - paid);
      const isSettled = paid >= total;
      const isOverdue = !isSettled && d.dueDate && new Date(d.dueDate) < now;

      return {
        ...d,
        remaining,
        computedStatus: isSettled ? "SETTLED" : isOverdue ? "OVERDUE" : "ACTIVE",
      };
    });

    return NextResponse.json({ debts: serializeBigInt(enriched) });
  } catch (error: any) {
    console.error("Lỗi lấy sổ nợ:", error);
    return NextResponse.json({ error: "Lỗi tải sổ nợ" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = DebtBookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu sổ nợ không hợp lệ" },
        { status: 400 }
      );
    }

    const { type, personName, phone, totalAmount, dueDate, notes } = parsed.data;

    const debt = await prisma.debtBook.create({
      data: {
        userId: session.user.id,
        type,
        personName,
        phone: phone || null,
        totalAmount: BigInt(Math.round(totalAmount)),
        paidAmount: BigInt(0),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, debt: serializeBigInt(debt) }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi tạo khoản nợ:", error);
    return NextResponse.json({ error: "Lỗi tạo khoản nợ" }, { status: 500 });
  }
}
