import { prisma } from "./prisma";
import { getClientIp } from "./rate-limit";

export interface LogAuditParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any>;
  req?: Request;
}

/**
 * Ghi nhận nhật ký kiểm toán (Audit Log) cho các thao tác tài chính nhạy cảm và quản trị viên.
 * Hàm này chạy độc lập, bắt lỗi an toàn để không bao giờ làm gián đoạn giao dịch chính.
 */
export async function logAuditAction({
  userId,
  action,
  entity,
  entityId,
  details,
  req,
}: LogAuditParams): Promise<void> {
  try {
    const ipAddress = req ? getClientIp(req) : null;
    const userAgent = req?.headers.get("user-agent") || null;

    // Chuyển đổi an toàn các giá trị BigInt trong details (nếu có) thành String
    const safeDetails = details
      ? JSON.parse(
          JSON.stringify(details, (_, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        )
      : null;

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        details: safeDetails,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("⚠️ Không thể lưu Audit Log:", error);
  }
}
