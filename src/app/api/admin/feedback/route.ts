import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên" }, { status: 403 });
    }

    const feedbacks = await prisma.feedbackReport.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ feedbacks });
  } catch (error: any) {
    console.error("Lỗi lấy feedback:", error);
    return NextResponse.json({ error: "Lỗi tải phản hồi" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên" }, { status: 403 });
    }

    const { id, status } = await req.json();

    const updated = await prisma.feedbackReport.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, feedback: updated });
  } catch (error: any) {
    console.error("Lỗi cập nhật feedback:", error);
    return NextResponse.json({ error: "Lỗi cập nhật trạng thái phản hồi" }, { status: 500 });
  }
}
