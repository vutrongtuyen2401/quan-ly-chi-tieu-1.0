import { prisma } from "@/lib/prisma";
import { formatVND } from "@/lib/formatters";

/**
 * Các công cụ tài chính Read-Only an toàn (User-Scoped Server-Side Financial Tools)
 * TUYỆT ĐỐI chỉ truy vấn dữ liệu thuộc về userId được truyền từ session server.
 * KHÔNG nhận userId từ LLM argument hay client payload.
 * Dữ liệu trả về được tối ưu súc tích, chỉ cung cấp vừa đủ cho câu hỏi.
 */

// 1. get_financial_overview(period)
export async function get_financial_overview(
  userId: string,
  params: { period?: "this_month" | "last_month" | "this_year" | "all" } = {}
) {
  const period = params.period || "this_month";
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let periodLabel = "Tháng này";

  if (period === "this_month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    periodLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  } else if (period === "last_month") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    periodLabel = `Tháng ${now.getMonth() === 0 ? 12 : now.getMonth()}/${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}`;
  } else if (period === "this_year") {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    periodLabel = `Năm ${now.getFullYear()}`;
  } else {
    periodLabel = "Toàn bộ thời gian";
  }

  const [wallets, transactions] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId, isExcludedFromTotal: false },
      select: { balance: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        ...(startDate && endDate ? { date: { gte: startDate, lte: endDate } } : {}),
      },
      select: { amount: true, type: true },
    }),
  ]);

  const totalBalance = wallets.reduce((acc, w) => acc + Number(w.balance), 0);
  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    if (t.type === "INCOME") totalIncome += Number(t.amount);
    if (t.type === "EXPENSE") totalExpense += Number(t.amount);
  }

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  return {
    ky_bao_cao: periodLabel,
    tong_tai_san_hien_tai: formatVND(totalBalance),
    tong_thu_nhap: formatVND(totalIncome),
    tong_chi_tieu: formatVND(totalExpense),
    tiet_kiem_rong: formatVND(netSavings),
    ty_le_tiet_kiem: `${savingsRate}%`,
    so_luong_giao_dich: transactions.length,
  };
}

// 2. get_transactions(filters)
export async function get_transactions(
  userId: string,
  params: {
    startDate?: string;
    endDate?: string;
    category?: string;
    wallet?: string;
    type?: "EXPENSE" | "INCOME" | "TRANSFER";
    search?: string;
    limit?: number;
  } = {}
) {
  const limit = Math.min(Math.max(params.limit || 10, 1), 25);
  const where: any = { userId };

  if (params.type) where.type = params.type;

  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) where.date.gte = new Date(params.startDate);
    if (params.endDate) where.date.lte = new Date(params.endDate);
  }

  if (params.category) {
    where.category = { name: { contains: params.category, mode: "insensitive" } };
  }

  if (params.wallet) {
    where.wallet = { name: { contains: params.wallet, mode: "insensitive" } };
  }

  if (params.search) {
    where.OR = [
      { description: { contains: params.search, mode: "insensitive" } },
      { note: { contains: params.search, mode: "insensitive" } },
      { payee: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const txs = await prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      date: true,
      description: true,
      amount: true,
      type: true,
      wallet: { select: { name: true } },
      destinationWallet: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  return {
    so_luong_tra_ve: txs.length,
    danh_sach: txs.map((t) => ({
      ngay: t.date.toISOString().split("T")[0],
      mo_ta: t.description,
      so_tien: formatVND(t.amount),
      loai: t.type === "EXPENSE" ? "Chi tiêu" : t.type === "INCOME" ? "Thu nhập" : "Chuyển tiền",
      vi: t.wallet.name,
      vi_den: t.destinationWallet?.name || null,
      danh_muc: t.category?.name || "Khác",
    })),
  };
}

// 3. get_spending_by_category(period)
export async function get_spending_by_category(
  userId: string,
  params: { period?: "this_month" | "last_month" | "this_year" } = {}
) {
  const period = params.period || "this_month";
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let periodLabel = "Tháng này";

  if (period === "last_month") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    periodLabel = `Tháng ${now.getMonth() === 0 ? 12 : now.getMonth()}/${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}`;
  } else if (period === "this_year") {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    periodLabel = `Năm ${now.getFullYear()}`;
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    periodLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  }

  const expenseTxs = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: startDate, lte: endDate },
    },
    select: {
      amount: true,
      category: { select: { name: true } },
    },
  });

  const catMap = new Map<string, number>();
  let total = 0;

  for (const t of expenseTxs) {
    const cName = t.category?.name || "Khác";
    const amt = Number(t.amount);
    total += amt;
    catMap.set(cName, (catMap.get(cName) || 0) + amt);
  }

  const breakdown = Array.from(catMap.entries())
    .map(([category, amt]) => ({
      danh_muc: category,
      so_tien: formatVND(amt),
      ty_le: total > 0 ? `${Math.round((amt / total) * 100)}%` : "0%",
      rawAmount: amt,
    }))
    .sort((a, b) => b.rawAmount - a.rawAmount)
    .map(({ danh_muc, so_tien, ty_le }) => ({ danh_muc, so_tien, ty_le }));

  return {
    ky_bao_cao: periodLabel,
    tong_chi_tieu: formatVND(total),
    co_cau_chi_tieu: breakdown,
  };
}

// 4. get_budget_status(period)
export async function get_budget_status(
  userId: string,
  _params: { period?: "this_month" | "next_month" | string } = {}
) {
  void _params;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const budgets = await prisma.budget.findMany({
    where: { userId, month, year },
    include: { category: { select: { name: true } } },
  });

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    select: { amount: true, categoryId: true },
  });

  const budgetResults = budgets.map((b) => {
    let spent = 0;
    if (b.categoryId) {
      spent = transactions
        .filter((t) => t.categoryId === b.categoryId)
        .reduce((sum, t) => sum + Number(t.amount), 0);
    } else {
      spent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    }

    const limit = Number(b.limitAmount);
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const isExceeded = spent > limit;
    const isWarning = spent >= limit * 0.8 && !isExceeded;

    return {
      danh_muc: b.category?.name || "Tổng chi tiêu",
      han_muc: formatVND(limit),
      da_chi: formatVND(spent),
      con_lai: formatVND(Math.max(0, limit - spent)),
      ty_le_da_dung: `${pct}%`,
      tinh_trang: isExceeded ? "🔴 VƯỢT HẠN MỨC" : isWarning ? "🟡 CẢNH BÁO (>80%)" : "🟢 AN TOÀN",
    };
  });

  return {
    thang: `${month}/${year}`,
    so_luong_ngan_sach: budgets.length,
    chi_tiet: budgetResults,
  };
}

// 5. get_savings_goals()
export async function get_savings_goals(userId: string) {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    include: { wallet: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    tong_so_muc_tieu: goals.length,
    danh_sach: goals.map((g) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      const remaining = Math.max(0, target - current);

      return {
        ten_muc_tieu: g.name,
        muc_tieu: formatVND(target),
        hien_tai: formatVND(current),
        con_thieu: formatVND(remaining),
        tien_do: `${pct}%`,
        han_chot: g.deadline ? g.deadline.toISOString().split("T")[0] : "Không có hạn",
        trang_thai: g.status === "COMPLETED" ? "Đã hoàn thành" : g.status === "CANCELLED" ? "Đã hủy" : "Đang thực hiện",
        vi_lien_ket: g.wallet?.name || "Chưa gắn ví",
      };
    }),
  };
}

// 6. get_debt_status()
export async function get_debt_status(userId: string) {
  const debts = await prisma.debtBook.findMany({
    where: { userId },
    include: { repayments: true },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  let totalLend = 0;
  let totalBorrow = 0;

  const list = debts.map((d) => {
    const total = Number(d.totalAmount);
    const paid = Number(d.paidAmount);
    const remaining = Math.max(0, total - paid);
    const isOverdue = d.dueDate && new Date(d.dueDate) < now && d.status !== "SETTLED";

    if (d.type === "LEND") totalLend += remaining;
    if (d.type === "BORROW") totalBorrow += remaining;

    return {
      nguoi_lien_quan: d.personName,
      phan_loai: d.type === "LEND" ? "Cho vay (Người khác nợ tôi)" : "Đi vay (Tôi nợ người khác)",
      tong_tien: formatVND(total),
      da_tra: formatVND(paid),
      con_lai: formatVND(remaining),
      han_tra: d.dueDate ? d.dueDate.toISOString().split("T")[0] : "Không đặt hạn",
      trang_thai: d.status === "SETTLED" ? "Đã tất toán" : isOverdue ? "⚠️ Quá hạn trả" : "Đang còn nợ",
    };
  });

  return {
    tong_cho_vay_chua_thu: formatVND(totalLend),
    tong_di_vay_chua_tra: formatVND(totalBorrow),
    danh_sach_so_no: list,
  };
}

// 7. get_wallet_balances()
export async function get_wallet_balances(userId: string) {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  let totalActive = 0;
  const list = wallets.map((w) => {
    const bal = Number(w.balance);
    if (!w.isExcludedFromTotal) totalActive += bal;

    let typeStr = "Tiền mặt";
    if (w.type === "BANK") typeStr = "Tài khoản Ngân hàng";
    else if (w.type === "E_WALLET") typeStr = "Ví điện tử";
    else if (w.type === "SAVINGS") typeStr = "Sổ tiết kiệm";

    return {
      ten_vi: w.name,
      loai_vi: typeStr,
      so_du: formatVND(bal),
      tinh_vao_tong_tai_san: !w.isExcludedFromTotal ? "Có" : "Không",
      so_tai_khoan: w.accountNumber || null,
      ngan_hang: w.bankName || null,
    };
  });

  return {
    tong_so_vi: wallets.length,
    tong_tai_san_kha_dung: formatVND(totalActive),
    chi_tiet_tung_vi: list,
  };
}

// 8. get_recurring_transactions()
export async function get_recurring_transactions(userId: string) {
  const rules = await prisma.recurringRule.findMany({
    where: { userId },
    include: {
      wallet: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { nextDueDate: "asc" },
  });

  return {
    so_luong_dinh_ky: rules.length,
    danh_sach: rules.map((r) => {
      let freq = "Hàng tháng";
      if (r.frequency === "DAILY") freq = "Hàng ngày";
      else if (r.frequency === "WEEKLY") freq = "Hàng tuần";
      else if (r.frequency === "YEARLY") freq = "Hàng năm";

      return {
        mo_ta: r.description,
        so_tien: formatVND(r.amount),
        loai: r.type === "EXPENSE" ? "Khoản chi định kỳ" : "Khoản thu định kỳ",
        chu_ky: freq,
        co_dinh: r.isFixedAmount ? "Cố định (Tự động tạo)" : "Biến động (Tạo nháp nhắc nhở)",
        ngay_den_han_tiep_theo: r.nextDueDate.toISOString().split("T")[0],
        vi_thanh_toan: r.wallet.name,
        danh_muc: r.category?.name || "Khác",
        dang_kich_hoat: r.isActive ? "Đang bật" : "Đã tạm dừng",
      };
    }),
  };
}

// 9. search_app_help(question)
export async function search_app_help(question: string) {
  const q = question.toLowerCase();
  const helpDocs = [
    {
      topic: "Ví & Quản lý Tài khoản",
      keywords: ["ví", "tài khoản", "ngân hàng", "momo", "chuyển tiền", "số dư"],
      guide: "Truy cập mục 'Ví & Tài khoản' để thêm ví (Tiền mặt, Ngân hàng, MoMo, Tiết kiệm). Bạn có thể bấm 'Chuyển tiền nội bộ' để luân chuyển tiền giữa các ví an toàn mà không ảnh hưởng đến doanh thu/chi tiêu.",
    },
    {
      topic: "Nhập liệu AI Đa kênh",
      keywords: ["nhập ai", "giọng nói", "hóa đơn", "ocr", "bản nháp", "draft"],
      guide: "Hệ thống hỗ trợ 3 cách nhập: (1) Gõ câu tự nhiên như 'Ăn phở 45k ví MoMo', (2) Bấm micro nói tiếng Việt, (3) Tải ảnh hóa đơn siêu thị/nhà hàng. AI luôn tạo 'Bản nháp' để bạn xem lại và bấm 'Xác nhận' trước khi ghi vào sổ.",
    },
    {
      topic: "Ngân sách (Budgets)",
      keywords: ["ngân sách", "hạn mức", "vượt mức", "cảnh báo"],
      guide: "Vào mục 'Ngân sách' để đặt hạn mức chi tiêu cho từng danh mục hoặc tổng tháng. Thanh tiến độ sẽ chuyển màu vàng khi bạn dùng trên 80% và chuyển màu đỏ cảnh báo khi vượt ngân sách.",
    },
    {
      topic: "Mục tiêu Tiết kiệm (Savings Goals)",
      keywords: ["tiết kiệm", "mục tiêu", "tích lũy", "quỹ"],
      guide: "Mục 'Tiết kiệm' giúp bạn theo dõi tiến độ mua laptop, đi du lịch, quỹ khẩn cấp. Bạn có thể nạp/rút tiền tích lũy và sẽ nhận được hiệu ứng confetti khi hoàn thành 100%.",
    },
    {
      topic: "Sổ nợ (Debts)",
      keywords: ["nợ", "cho vay", "đi vay", "mượn", "trả nợ"],
      guide: "Quản lý cả 'Cho vay' và 'Đi vay'. Bạn có thể ghi nhận người vay, hạn trả nợ và cập nhật trả từng phần cho đến khi tất toán.",
    },
    {
      topic: "Giao dịch Định kỳ (Recurring)",
      keywords: ["định kỳ", "lặp lại", "tiền nhà", "netflix", "tiền mạng"],
      guide: "Thiết lập các khoản tiền nhà, học phí, tiền mạng định kỳ. Khoản cố định sẽ tự động tạo giao dịch vào ngày đến hạn; khoản biến động (tiền điện, tiền nước) sẽ tạo bản nháp nhắc bạn xác nhận số tiền.",
    },
    {
      topic: "Trợ lý Chatbot AI",
      keywords: ["chatbot", "trợ lý", "hỏi đáp", "tư vấn"],
      guide: "Trợ lý AI phân tích số liệu tài chính trực tiếp từ tài khoản của bạn thông qua các công cụ đọc an toàn (Read-Only). Bạn có thể hỏi số dư, chi tiêu nhiều nhất, tư vấn cách tiết kiệm.",
    },
  ];

  const matched = helpDocs.filter((doc) =>
    doc.keywords.some((kw) => q.includes(kw)) || doc.topic.toLowerCase().includes(q)
  );

  if (matched.length > 0) {
    return {
      ket_qua_tim_kiem: matched.map((m) => ({
        chu_de: m.topic,
        huong_dan: m.guide,
      })),
    };
  }

  return {
    huong_dan_chung:
      "Ứng dụng ChiTiêu AI cung cấp các tính năng: Quản lý Ví, Giao dịch Thu/Chi, Nhập liệu AI (Văn bản/Voice/Hóa đơn), Ngân sách, Sổ tiết kiệm, Sổ nợ, Giao dịch định kỳ và Báo cáo trực quan. Hãy chọn chức năng tương ứng trên thanh điều hướng bên trái.",
  };
}
