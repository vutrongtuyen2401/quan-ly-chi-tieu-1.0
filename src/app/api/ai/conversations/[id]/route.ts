import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await props.params;

    // Kiểm tra quyền sở hữu cuộc trò chuyện của chính userId
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Không tìm thấy cuộc trò chuyện" }, { status: 404 });
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role.toLowerCase(),
          content: m.content,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Lỗi lấy chi tiết hội thoại:", error);
    return NextResponse.json({ error: "Lỗi tải chi tiết hội thoại" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await props.params;

    // Chỉ cho phép xóa nếu cuộc trò chuyện thuộc về userId
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Không tìm thấy cuộc trò chuyện" }, { status: 404 });
    }

    await prisma.chatConversation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Đã xóa cuộc trò chuyện thành công" });
  } catch (error: any) {
    console.error("Lỗi xóa hội thoại:", error);
    return NextResponse.json({ error: "Lỗi xóa cuộc trò chuyện" }, { status: 500 });
  }
}
