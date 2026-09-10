import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const drafts = await prisma.aiTransactionDraft.findMany({
      where: {
        userId: session.user.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ drafts });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách draft:", error);
    return NextResponse.json({ error: "Lỗi tải bản nháp" }, { status: 500 });
  }
}
