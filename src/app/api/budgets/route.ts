import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BudgetSchema } from "@/lib/validations";
import { serializeBigInt } from "@/lib/formatters";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || (now.getMonth() + 1).toString(), 10);
    const year = parseInt(searchParams.get("year") || now.getFullYear().toString(), 10);

    const budgets = await prisma.budget.findMany({
      where: { userId: session.user.id, month, year },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
      },
    });

    // Lấy chi tiêu thực tế trong tháng này để tính toán % đã dùng
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const expenses = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const budgetsWithSpent = budgets.map((b) => {
      let spent = 0;
      if (b.categoryId) {
        spent = expenses
          .filter((e) => e.categoryId === b.categoryId)
          .reduce((sum, e) => sum + Number(e.amount), 0);
      } else {
        // Tổng ngân sách
        spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      }

      const limit = Number(b.limitAmount);
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      return {
        ...b,
        spent,
        percentage,
        isWarning: spent >= limit * 0.8 && spent <= limit,
        isExceeded: spent > limit,
      };
    });

    return NextResponse.json({ budgets: serializeBigInt(budgetsWithSpent) });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách ngân sách:", error);
    return NextResponse.json({ error: "Lỗi tải ngân sách" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = BudgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Thông tin ngân sách không hợp lệ" },
        { status: 400 }
      );
    }

    const { categoryId, month, year, limitAmount } = parsed.data;

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: session.user.id,
          categoryId: categoryId || "",
          month,
          year,
        },
      },
      update: {
        limitAmount: BigInt(Math.round(limitAmount)),
      },
      create: {
        userId: session.user.id,
        categoryId: categoryId || null,
        month,
        year,
        limitAmount: BigInt(Math.round(limitAmount)),
      },
      include: { category: true },
    });

    return NextResponse.json({ success: true, budget: serializeBigInt(budget) }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi tạo/cập nhật ngân sách:", error);
    return NextResponse.json({ error: "Lỗi lưu ngân sách" }, { status: 500 });
  }
}
