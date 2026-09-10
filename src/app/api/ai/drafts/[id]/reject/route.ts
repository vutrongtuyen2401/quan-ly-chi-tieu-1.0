import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id: draftId } = await params;

    const draft = await prisma.aiTransactionDraft.findFirst({
      where: { id: draftId, userId: session.user.id },
    });

    if (!draft) {
      return NextResponse.json({ error: "Bản nháp không tồn tại" }, { status: 404 });
    }

    await prisma.aiTransactionDraft.update({
      where: { id: draftId },
      data: { status: "REJECTED" },
    });

    return NextResponse.json({ success: true, message: "Đã hủy bỏ bản nháp" });
  } catch (error: any) {
    console.error("Lỗi hủy bản nháp:", error);
    return NextResponse.json({ error: "Lỗi xử lý yêu cầu" }, { status: 500 });
  }
}
