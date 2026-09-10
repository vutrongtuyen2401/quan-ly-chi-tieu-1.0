import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Truy cập bị từ chối: Yêu cầu quyền Quản trị viên" }, { status: 403 });
    }

    // Thống kê tổng quan hệ thống (Bảo mật: Không truy xuất chi tiết nội dung giao dịch cá nhân)
    const [totalUsers, activeUsers, totalWallets, totalTransactions, totalAiDrafts, confirmedAiDrafts, totalFeedback] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: "ACTIVE" } }),
        prisma.wallet.count(),
        prisma.transaction.count(),
        prisma.aiTransactionDraft.count(),
        prisma.aiTransactionDraft.count({ where: { status: "CONFIRMED" } }),
        prisma.feedbackReport.count({ where: { status: "OPEN" } }),
      ]);

    const aiAccuracyRate =
      totalAiDrafts > 0 ? Math.round((confirmedAiDrafts / totalAiDrafts) * 100) : 100;

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers: totalUsers - activeUsers,
        totalWallets,
        totalTransactions,
        totalAiDrafts,
        confirmedAiDrafts,
        aiAccuracyRate: `${aiAccuracyRate}%`,
        pendingFeedback: totalFeedback,
      },
    });
  } catch (error: any) {
    console.error("Lỗi lấy thống kê Admin:", error);
    return NextResponse.json({ error: "Lỗi tải thống kê hệ thống" }, { status: 500 });
  }
}
