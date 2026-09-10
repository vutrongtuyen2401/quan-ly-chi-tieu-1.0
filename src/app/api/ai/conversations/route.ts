import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const conversations = await prisma.chatConversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    const result = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
      lastMessage: c.messages[0]?.content || null,
      messageCount: c._count.messages,
    }));

    return NextResponse.json({ conversations: result });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách hội thoại:", error);
    return NextResponse.json({ error: "Lỗi tải lịch sử hội thoại" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    let title = "Cuộc trò chuyện mới";
    try {
      const body = await req.json();
      if (body?.title && typeof body.title === "string" && body.title.trim().length > 0) {
        title = body.title.trim().slice(0, 80);
      }
    } catch {
      // Cho phép body rỗng
    }

    const conversation = await prisma.chatConversation.create({
      data: {
        userId: session.user.id,
        title,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error("Lỗi tạo cuộc trò chuyện mới:", error);
    return NextResponse.json({ error: "Lỗi tạo cuộc trò chuyện mới" }, { status: 500 });
  }
}
