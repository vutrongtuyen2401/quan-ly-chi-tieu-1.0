import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/formatters";
import { logAuditAction } from "@/lib/audit";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.wallet.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ví không tồn tại" }, { status: 404 });
    }

    const updated = await prisma.wallet.update({
      where: { id },
      data: {
        name: body.name || existing.name,
        bankName: body.bankName !== undefined ? body.bankName : existing.bankName,
        accountNumber: body.accountNumber !== undefined ? body.accountNumber : existing.accountNumber,
        color: body.color || existing.color,
        icon: body.icon || existing.icon,
        isExcludedFromTotal:
          body.isExcludedFromTotal !== undefined
            ? body.isExcludedFromTotal
            : existing.isExcludedFromTotal,
      },
    });

    await logAuditAction({
      userId: session.user.id,
      action: "WALLET_UPDATE",
      entity: "Wallet",
      entityId: id,
      details: { name: updated.name, color: updated.color, icon: updated.icon },
      req,
    });

    return NextResponse.json({ success: true, wallet: serializeBigInt(updated) });
  } catch (error: any) {
    console.error("Lỗi cập nhật ví:", error);
    return NextResponse.json({ error: "Lỗi cập nhật ví" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.wallet.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ví không tồn tại" }, { status: 404 });
    }

    await prisma.wallet.delete({
      where: { id },
    });

    await logAuditAction({
      userId: session.user.id,
      action: "WALLET_DELETE",
      entity: "Wallet",
      entityId: id,
      details: { deletedWalletName: existing.name },
      req,
    });

    return NextResponse.json({ success: true, message: "Đã xóa ví thành công" });
  } catch (error: any) {
    console.error("Lỗi xóa ví:", error);
    return NextResponse.json({ error: "Lỗi xóa ví" }, { status: 500 });
  }
}
