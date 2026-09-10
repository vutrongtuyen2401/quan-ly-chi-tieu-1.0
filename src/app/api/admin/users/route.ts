import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditAction } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            wallets: true,
            transactions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách user:", error);
    return NextResponse.json({ error: "Lỗi tải người dùng" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên" }, { status: 403 });
    }

    const { id, status, role } = await req.json();

    // Không cho phép tự khóa tài khoản chính mình
    if (id === session.user.id && status === "BLOCKED") {
      return NextResponse.json({ error: "Không thể tự khóa tài khoản của chính mình" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        status: status !== undefined ? status : undefined,
        role: role !== undefined ? role : undefined,
      },
    });

    await logAuditAction({
      userId: session.user.id,
      action: status !== undefined ? `ADMIN_USER_STATUS_${status}` : `ADMIN_USER_ROLE_${role}`,
      entity: "User",
      entityId: id,
      details: { targetUserId: id, status, role },
      req,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("Lỗi cập nhật user:", error);
    return NextResponse.json({ error: "Lỗi cập nhật người dùng" }, { status: 500 });
  }
}
