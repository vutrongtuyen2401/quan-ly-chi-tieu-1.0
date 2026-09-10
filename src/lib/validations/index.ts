import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export const LoginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const WalletSchema = z.object({
  name: z.string().min(2, "Tên ví phải có ít nhất 2 ký tự"),
  type: z.enum(["CASH", "BANK", "E_WALLET", "SAVINGS"]),
  accountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  balance: z.number().int("Số dư phải là số nguyên VNĐ").default(0),
  color: z.string().default("#06b6d4"),
  icon: z.string().default("Wallet"),
  isExcludedFromTotal: z.boolean().default(false),
});

export const TransferSchema = z.object({
  sourceWalletId: z.string().min(1, "Vui lòng chọn ví nguồn"),
  destinationWalletId: z.string().min(1, "Vui lòng chọn ví đích"),
  amount: z.number().int().positive("Số tiền chuyển phải lớn hơn 0"),
  date: z.string().or(z.date()).default(() => new Date()),
  note: z.string().optional().nullable(),
}).refine((data) => data.sourceWalletId !== data.destinationWalletId, {
  message: "Ví nguồn và ví đích không được trùng nhau",
  path: ["destinationWalletId"],
});

export const TransactionSchema = z.object({
  walletId: z.string().min(1, "Vui lòng chọn ví"),
  destinationWalletId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  amount: z.number().int().positive("Số tiền phải lớn hơn 0"),
  type: z.enum(["EXPENSE", "INCOME", "TRANSFER"]),
  date: z.string().or(z.date()).default(() => new Date()),
  description: z.string().min(1, "Vui lòng nhập mô tả giao dịch"),
  note: z.string().optional().nullable(),
  payee: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().optional().nullable(),
});

export const BudgetSchema = z.object({
  categoryId: z.string().optional().nullable(), // null = tổng chi tiêu
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  limitAmount: z.number().int().positive("Hạn mức ngân sách phải lớn hơn 0"),
});

export const SavingsGoalSchema = z.object({
  name: z.string().min(2, "Tên mục tiêu phải có ít nhất 2 ký tự"),
  walletId: z.string().optional().nullable(),
  targetAmount: z.number().int().positive("Mục tiêu tiền phải lớn hơn 0"),
  currentAmount: z.number().int().min(0).default(0),
  deadline: z.string().or(z.date()).optional().nullable(),
  color: z.string().default("#10b981"),
  icon: z.string().default("Target"),
});

export const DebtBookSchema = z.object({
  type: z.enum(["LEND", "BORROW"]),
  personName: z.string().min(2, "Vui lòng nhập tên đối tác/người vay"),
  phone: z.string().optional().nullable(),
  totalAmount: z.number().int().positive("Tổng số tiền phải lớn hơn 0"),
  dueDate: z.string().or(z.date()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const DebtRepaymentSchema = z.object({
  debtBookId: z.string().min(1),
  amount: z.number().int().positive("Số tiền trả phải lớn hơn 0"),
  walletId: z.string().optional().nullable(),
  date: z.string().or(z.date()).default(() => new Date()),
  note: z.string().optional().nullable(),
});

export const RecurringRuleSchema = z.object({
  walletId: z.string().min(1, "Vui lòng chọn ví"),
  categoryId: z.string().optional().nullable(),
  amount: z.number().int().positive("Số tiền định kỳ phải lớn hơn 0"),
  type: z.enum(["EXPENSE", "INCOME"]),
  description: z.string().min(1, "Vui lòng nhập mô tả"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  isFixedAmount: z.boolean().default(true),
  startDate: z.string().or(z.date()).default(() => new Date()),
  nextDueDate: z.string().or(z.date()),
  isActive: z.boolean().default(true),
});

export const FeedbackSchema = z.object({
  type: z.enum(["FEEDBACK", "BUG"]),
  title: z.string().min(3, "Tiêu đề phải từ 3 ký tự trở lên"),
  content: z.string().min(10, "Nội dung phản hồi phải từ 10 ký tự trở lên"),
});
