import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: session.user.id }, { isSystemDefault: true }],
      },
      orderBy: [{ isSystemDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error("Lỗi lấy danh mục:", error);
    return NextResponse.json({ error: "Lỗi tải danh mục" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { name, type, icon, color } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Tên danh mục không được để trống" }, { status: 400 });
    }

    const newCategory = await prisma.category.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        type: type || "EXPENSE",
        icon: icon || "Tag",
        color: color || "#8b5cf6",
        isSystemDefault: false,
      },
    });

    return NextResponse.json({ success: true, category: newCategory }, { status: 201 });
  } catch (error: any) {
    console.error("Lỗi tạo danh mục:", error);
    return NextResponse.json({ error: "Lỗi tạo danh mục" }, { status: 500 });
  }
}
