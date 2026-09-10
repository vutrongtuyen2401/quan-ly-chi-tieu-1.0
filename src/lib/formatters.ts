import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Định dạng số tiền sang chuẩn VNĐ (Không dùng float, hiển thị đơn vị ₫)
 * Ví dụ: 50000 -> "50.000 ₫"
 */
export function formatVND(amount: number | bigint | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0 ₫";
  const num = typeof amount === "bigint" ? Number(amount) : Number(amount);
  if (isNaN(num)) return "0 ₫";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Rút gọn tiền tệ (ví dụ 1.500.000 -> 1.5 triệu, 50.000 -> 50k)
 */
export function formatCompactVND(amount: number | bigint | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0 ₫";
  const num = typeof amount === "bigint" ? Number(amount) : Number(amount);
  if (isNaN(num)) return "0 ₫";

  if (Math.abs(num) >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`;
  }
  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")} tr`;
  }
  if (Math.abs(num) >= 1_000) {
    return `${(num / 1_000).toFixed(0)}k`;
  }
  return `${num} ₫`;
}

/**
 * Định dạng ngày kiểu Việt Nam (ví dụ: "09/09/2026")
 */
export function formatDateVI(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy", { locale: vi });
}

/**
 * Định dạng ngày giờ kiểu Việt Nam (ví dụ: "14:30 - 09/09/2026")
 */
export function formatDateTimeVI(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "HH:mm - dd/MM/yyyy", { locale: vi });
}

/**
 * Khoảng cách thời gian so với hiện tại (ví dụ: "2 giờ trước")
 */
export function formatRelativeTimeVI(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: vi });
}

/**
 * Chuyển đổi an toàn đối tượng chứa BigInt sang Number để truyền qua JSON / Client Component
 */
export function serializeBigInt<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => (typeof value === "bigint" ? Number(value) : value))
  );
}
