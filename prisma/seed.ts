import { PrismaClient, Role, UserStatus, WalletType, TransactionType, TransactionSource, DebtType, DebtStatus, Frequency, FeedbackType, FeedbackStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu dọn dẹp và seed dữ liệu mẫu chuẩn VNĐ...");

  // Xóa dữ liệu cũ theo thứ tự quan hệ
  await prisma.feedbackReport.deleteMany({});
  await prisma.aiTransactionDraft.deleteMany({});
  await prisma.debtRepayment.deleteMany({});
  await prisma.debtBook.deleteMany({});
  await prisma.recurringRule.deleteMany({});
  await prisma.savingsGoal.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("📁 Đang tạo danh mục mặc định chuẩn Việt Nam...");

  const defaultExpenseCategories = [
    { name: "Ăn uống", icon: "Utensils", color: "#f59e0b" },
    { name: "Đi lại & Xăng xe", icon: "Car", color: "#3b82f6" },
    { name: "Mua sắm & Tiêu dùng", icon: "ShoppingBag", color: "#ec4899" },
    { name: "Hóa đơn & Tiện ích", icon: "Receipt", color: "#06b6d4" },
    { name: "Nhà cửa & Thuê nhà", icon: "Home", color: "#8b5cf6" },
    { name: "Y tế & Sức khỏe", icon: "HeartPulse", color: "#ef4444" },
    { name: "Giáo dục & Học tập", icon: "GraduationCap", color: "#10b981" },
    { name: "Giải trí & Du lịch", icon: "Film", color: "#f97316" },
    { name: "Gia đình & Hiếu hỷ", icon: "Users", color: "#14b8a6" },
    { name: "Chi phí khác", icon: "MoreHorizontal", color: "#64748b" },
  ];

  const defaultIncomeCategories = [
    { name: "Tiền lương", icon: "Banknote", color: "#10b981" },
    { name: "Thưởng & Hoa hồng", icon: "Award", color: "#06b6d4" },
    { name: "Đầu tư & Sinh lời", icon: "TrendingUp", color: "#8b5cf6" },
    { name: "Kinh doanh & Nghề tay trái", icon: "Briefcase", color: "#f59e0b" },
    { name: "Được tặng & Lì xì", icon: "Gift", color: "#ec4899" },
    { name: "Thu nhập khác", icon: "PlusCircle", color: "#64748b" },
  ];

  for (const cat of defaultExpenseCategories) {
    await prisma.category.create({
      data: {
        name: cat.name,
        type: TransactionType.EXPENSE,
        icon: cat.icon,
        color: cat.color,
        isSystemDefault: true,
      },
    });
  }

  for (const cat of defaultIncomeCategories) {
    await prisma.category.create({
      data: {
        name: cat.name,
        type: TransactionType.INCOME,
        icon: cat.icon,
        color: cat.color,
        isSystemDefault: true,
      },
    });
  }

  const allCategories = await prisma.category.findMany({ where: { isSystemDefault: true } });
  const catMap = new Map(allCategories.map((c) => [c.name, c.id]));

  console.log("👤 Đang tạo tài khoản Admin và Demo User...");
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("admin123456", salt);
  const demoPasswordHash = await bcrypt.hash("demo123456", salt);

  await prisma.user.create({
    data: {
      email: "admin@quanlychitieu.vn",
      name: "Quản trị viên Hệ thống",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: "demo@quanlychitieu.vn",
      name: "Nguyễn Văn An",
      passwordHash: demoPasswordHash,
      role: Role.USER,
      status: UserStatus.ACTIVE,
    },
  });

  console.log("💳 Đang tạo ví & tài khoản cho Demo User...");
  const cashWallet = await prisma.wallet.create({
    data: {
      userId: demoUser.id,
      name: "Tiền mặt trong ví",
      type: WalletType.CASH,
      balance: BigInt(3500000), // 3.500.000 VNĐ
      initialBalance: BigInt(3500000),
      color: "#10b981",
      icon: "Banknote",
    },
  });

  const vcbWallet = await prisma.wallet.create({
    data: {
      userId: demoUser.id,
      name: "Vietcombank Priority",
      type: WalletType.BANK,
      bankName: "Vietcombank",
      accountNumber: "0011004328899",
      balance: BigInt(28650000), // 28.650.000 VNĐ
      initialBalance: BigInt(20000000),
      color: "#06b6d4",
      icon: "Building2",
    },
  });

  const momoWallet = await prisma.wallet.create({
    data: {
      userId: demoUser.id,
      name: "Ví MoMo",
      type: WalletType.E_WALLET,
      accountNumber: "0912345678",
      balance: BigInt(1850000), // 1.850.000 VNĐ
      initialBalance: BigInt(2000000),
      color: "#ec4899",
      icon: "Smartphone",
    },
  });

  const savingsWallet = await prisma.wallet.create({
    data: {
      userId: demoUser.id,
      name: "Sổ tiết kiệm Techcombank",
      type: WalletType.SAVINGS,
      bankName: "Techcombank",
      accountNumber: "TK-2026-9912",
      balance: BigInt(50000000), // 50.000.000 VNĐ
      initialBalance: BigInt(50000000),
      color: "#8b5cf6",
      icon: "PiggyBank",
    },
  });

  console.log("📝 Đang tạo các giao dịch mẫu thực tế...");
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const sampleTransactions = [
    {
      walletId: vcbWallet.id,
      categoryId: catMap.get("Tiền lương"),
      amount: BigInt(35000000),
      type: TransactionType.INCOME,
      date: new Date(currentYear, currentMonth, 5, 9, 30),
      description: "Nhận lương tháng " + (currentMonth + 1) + " từ Công ty FPT Software",
      source: TransactionSource.MANUAL,
    },
    {
      walletId: vcbWallet.id,
      categoryId: catMap.get("Nhà cửa & Thuê nhà"),
      amount: BigInt(7000000),
      type: TransactionType.EXPENSE,
      date: new Date(currentYear, currentMonth, 6, 14, 0),
      description: "Thanh toán tiền thuê căn hộ Vinhomes tháng " + (currentMonth + 1),
      source: TransactionSource.RECURRING,
    },
    {
      walletId: vcbWallet.id,
      categoryId: catMap.get("Hóa đơn & Tiện ích"),
      amount: BigInt(1420000),
      type: TransactionType.EXPENSE,
      date: new Date(currentYear, currentMonth, 7, 10, 15),
      description: "Tiền điện EVN HANOI tháng " + (currentMonth + 1),
      source: TransactionSource.MANUAL,
    },
    {
      walletId: momoWallet.id,
      categoryId: catMap.get("Ăn uống"),
      amount: BigInt(85000),
      type: TransactionType.EXPENSE,
      date: new Date(currentYear, currentMonth, 8, 12, 30),
      description: "Phở Thìn Lò Đúc và nước cam ép",
      source: TransactionSource.AI_TEXT,
    },
    {
      walletId: momoWallet.id,
      categoryId: catMap.get("Ăn uống"),
      amount: BigInt(350000),
      type: TransactionType.EXPENSE,
      date: new Date(currentYear, currentMonth, 8, 19, 45),
      description: "Lẩu Haidilao đi cùng đồng nghiệp",
      source: TransactionSource.AI_RECEIPT,
    },
    {
      walletId: cashWallet.id,
      categoryId: catMap.get("Đi lại & Xăng xe"),
      amount: BigInt(90000),
      type: TransactionType.EXPENSE,
      date: new Date(currentYear, currentMonth, 9, 8, 10),
      description: "Đổ đầy bình xăng xe máy Honda SH",
      source: TransactionSource.AI_VOICE,
    },
    {
      walletId: vcbWallet.id,
      categoryId: catMap.get("Mua sắm & Tiêu dùng"),
      amount: BigInt(1890000),
      type: TransactionType.EXPENSE,
      date: new Date(currentYear, currentMonth, 9, 15, 20),
      description: "Mua sắm quần áo và giày thể thao Uniqlo",
      source: TransactionSource.MANUAL,
    },
    {
      walletId: vcbWallet.id,
      destinationWalletId: momoWallet.id,
      amount: BigInt(1000000),
      type: TransactionType.TRANSFER,
      date: new Date(currentYear, currentMonth, 8, 11, 0),
      description: "Nạp tiền từ Vietcombank vào ví MoMo để chi tiêu ăn uống",
      source: TransactionSource.MANUAL,
    },
    {
      walletId: vcbWallet.id,
      categoryId: catMap.get("Thưởng & Hoa hồng"),
      amount: BigInt(5000000),
      type: TransactionType.INCOME,
      date: new Date(currentYear, currentMonth, 4, 16, 0),
      description: "Thưởng hoàn thành xuất sắc Sprint quý 3",
      source: TransactionSource.MANUAL,
    }
  ];

  for (const tx of sampleTransactions) {
    await prisma.transaction.create({
      data: {
        userId: demoUser.id,
        walletId: tx.walletId,
        destinationWalletId: tx.destinationWalletId || null,
        categoryId: tx.categoryId || null,
        amount: tx.amount,
        type: tx.type,
        date: tx.date,
        description: tx.description,
        source: tx.source,
      },
    });
  }

  console.log("📊 Đang tạo Ngân sách tháng...");
  // Ngân sách tổng tháng
  await prisma.budget.create({
    data: {
      userId: demoUser.id,
      categoryId: null, // Tổng
      month: currentMonth + 1,
      year: currentYear,
      limitAmount: BigInt(20000000), // 20.000.000 VNĐ
    },
  });

  // Ngân sách Ăn uống
  await prisma.budget.create({
    data: {
      userId: demoUser.id,
      categoryId: catMap.get("Ăn uống"),
      month: currentMonth + 1,
      year: currentYear,
      limitAmount: BigInt(6000000), // 6.000.000 VNĐ
    },
  });

  // Ngân sách Mua sắm
  await prisma.budget.create({
    data: {
      userId: demoUser.id,
      categoryId: catMap.get("Mua sắm & Tiêu dùng"),
      month: currentMonth + 1,
      year: currentYear,
      limitAmount: BigInt(3000000), // 3.000.000 VNĐ
    },
  });

  console.log("🎯 Đang tạo Mục tiêu tiết kiệm...");
  await prisma.savingsGoal.create({
    data: {
      userId: demoUser.id,
      walletId: savingsWallet.id,
      name: "Quỹ dự phòng khẩn cấp 6 tháng",
      targetAmount: BigInt(60000000),
      currentAmount: BigInt(50000000),
      deadline: new Date(currentYear + 1, 5, 30),
      color: "#10b981",
      icon: "ShieldCheck",
    },
  });

  await prisma.savingsGoal.create({
    data: {
      userId: demoUser.id,
      name: "Mua MacBook Pro M4 Max",
      targetAmount: BigInt(45000000),
      currentAmount: BigInt(22500000),
      deadline: new Date(currentYear, 11, 31),
      color: "#8b5cf6",
      icon: "Laptop",
    },
  });

  console.log("📖 Đang tạo Sổ nợ...");
  const lendDebt = await prisma.debtBook.create({
    data: {
      userId: demoUser.id,
      type: DebtType.LEND,
      personName: "Trần Minh Tuấn",
      phone: "0987654321",
      totalAmount: BigInt(5000000),
      paidAmount: BigInt(2000000),
      dueDate: new Date(currentYear, currentMonth + 1, 15),
      status: DebtStatus.ACTIVE,
      notes: "Cho Tuấn vay mua xe máy trả góp, hẹn ngày 15 trả nốt",
    },
  });

  await prisma.debtRepayment.create({
    data: {
      debtBookId: lendDebt.id,
      amount: BigInt(2000000),
      walletId: vcbWallet.id,
      date: new Date(currentYear, currentMonth, 3),
      note: "Tuấn chuyển khoản trả đợt 1 qua Vietcombank",
    },
  });

  await prisma.debtBook.create({
    data: {
      userId: demoUser.id,
      type: DebtType.BORROW,
      personName: "Ngân hàng Shinhan (Vay tiêu dùng)",
      totalAmount: BigInt(12000000),
      paidAmount: BigInt(4000000),
      dueDate: new Date(currentYear, currentMonth + 2, 20),
      status: DebtStatus.ACTIVE,
      notes: "Trả góp điện thoại iPhone 16 Pro, mỗi tháng trả 2 triệu",
    },
  });

  console.log("⏰ Đang tạo Giao dịch định kỳ...");
  await prisma.recurringRule.create({
    data: {
      userId: demoUser.id,
      walletId: vcbWallet.id,
      categoryId: catMap.get("Tiền lương"),
      amount: BigInt(35000000),
      type: TransactionType.INCOME,
      description: "Lương cố định hàng tháng FPT",
      frequency: Frequency.MONTHLY,
      isFixedAmount: true, // Tự động ghi sổ
      startDate: new Date(currentYear, 0, 5),
      nextDueDate: new Date(currentYear, currentMonth + 1, 5),
      isActive: true,
    },
  });

  await prisma.recurringRule.create({
    data: {
      userId: demoUser.id,
      walletId: vcbWallet.id,
      categoryId: catMap.get("Hóa đơn & Tiện ích"),
      amount: BigInt(1500000),
      type: TransactionType.EXPENSE,
      description: "Hóa đơn điện nước gia đình (Số tiền biến động)",
      frequency: Frequency.MONTHLY,
      isFixedAmount: false, // Tạo nháp nhắc xác nhận
      startDate: new Date(currentYear, 0, 15),
      nextDueDate: new Date(currentYear, currentMonth, 15),
      isActive: true,
    },
  });

  console.log("🤖 Đang tạo Bản nháp AI mẫu chờ xác nhận...");
  await prisma.aiTransactionDraft.create({
    data: {
      userId: demoUser.id,
      rawInput: "chi 65k mua trà sữa Koi Thé bằng ví momo",
      sourceType: "TEXT",
      status: "PENDING",
      suggestedData: {
        amount: 65000,
        type: "EXPENSE",
        categoryName: "Ăn uống",
        walletName: "Ví MoMo",
        description: "Mua trà sữa Koi Thé",
        date: new Date().toISOString(),
      },
    },
  });

  console.log("💬 Đang tạo Báo cáo/Phản hồi mẫu cho Admin...");
  await prisma.feedbackReport.create({
    data: {
      userId: demoUser.id,
      type: FeedbackType.FEEDBACK,
      title: "Đề xuất thêm tính năng quét mã QR thanh toán",
      content: "Ứng dụng rất mượt và đẹp! Nếu có thêm tính năng quét QR VietQR để tự nhận diện tài khoản chuyển tiền thì tuyệt vời hơn nữa.",
      status: FeedbackStatus.OPEN,
    },
  });

  console.log("✅ Seed dữ liệu hoàn tất thành công!");
  console.log("------------------------------------------");
  console.log("🔑 Tài khoản Demo:");
  console.log("   - Email: demo@quanlychitieu.vn");
  console.log("   - Password: demo123456");
  console.log("👑 Tài khoản Admin:");
  console.log("   - Email: admin@quanlychitieu.vn");
  console.log("   - Password: admin123456");
  console.log("------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi seed dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
