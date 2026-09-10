import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SavingsGoalSchema } from "@/lib/validations";
import { serializeBigInt } from "@/lib/formatters";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const goals = await prisma.savingsGoal.findMany({
      where: { userId: session.user.id },
      include: {
        wallet: { select: { id: true, name: true, balance: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Tính toán tiến độ % và dự báo
    const enriched = goals.map((g) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      const remaining = Math.max(0, target - current);

      return {
        ...g,
        percentage,
        remaining,
        isCompleted: current >= target,
      };
    });

    return NextResponse.json({ goals: serializeBigInt(enriched) });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách mục tiêu:", error);
    return NextResponse.json({ error: "Lỗi tải mục tiêu tiết kiệm" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = SavingsGoalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu mục tiêu không hợp lệ" },
        { status: 400 }
      );
    }

    const { name, walletId, targetAmount, currentAmount, deadline, color, icon } = parsed.data;

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: session.user.id,
        walletId: walletId || null,
        name,
        targetAmount: BigInt(Math.round(targetAmount)),
        currentAmount: BigInt(Math.round(currentAmount || 0)),
        deadline: deadline ? new Date(deadline) : null,
        color: color || "#10b981",
        icon: icon || "Target",
        status: currentAmount >= targetAmount ? "COMPLETED" : "IN_PROGRESS",
      },
    });

    return NextResponse.json({ success: true, goal: serializeBigInt(goal) }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi tạo mục tiêu:", error);
    return NextResponse.json({ error: "Lỗi tạo mục tiêu" }, { status: 500 });
  }
}
