// scripts/test-e2e.mjs
// Script kiểm thử tự động toàn diện API, bảo mật và nghiệp vụ AI
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";
const AUTH_SECRET = process.env.AUTH_SECRET || "quanlychitieu_auth_secret_key_production_2026_super_secure_salt";

async function createSessionCookie(user) {
  const token = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sub: user.id,
  };
  const encoded = await encode({
    token,
    secret: AUTH_SECRET,
    salt: "authjs.session-token",
  });
  return `authjs.session-token=${encoded}`;
}

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG HỆ THỐNG 'CHITIÊU AI' ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Kiểm tra trang Login
  console.log("\n1. Kiểm tra trang /login");
  const loginRes = await fetch(`${BASE_URL}/login`);
  assert(loginRes.status === 200, `Trang login trả về mã HTTP 200 (Thực tế: ${loginRes.status})`);
  const loginHtml = await loginRes.text();
  assert(loginHtml.includes("ChiTiêu AI") || loginHtml.includes("email"), "Giao diện đăng nhập chứa nhãn nhận diện thương hiệu");

  // 2. Chuẩn bị session cho Demo User
  console.log("\n2. Xác thực phiên làm việc cho demo@quanlychitieu.vn");
  const demoUser = await prisma.user.findUnique({
    where: { email: "demo@quanlychitieu.vn" },
  });
  assert(!!demoUser, `Tìm thấy Demo User trong cơ sở dữ liệu (ID: ${demoUser?.id})`);
  const demoCookie = await createSessionCookie(demoUser);

  // 3. Kiểm tra API Ví
  console.log("\n3. Kiểm tra API /api/wallets");
  const walletsRes = await fetch(`${BASE_URL}/api/wallets`, {
    headers: { Cookie: demoCookie },
  });
  assert(walletsRes.status === 200, `Lấy danh sách ví thành công HTTP 200`);
  const walletsData = await walletsRes.json();
  const wallets = walletsData.wallets || walletsData;
  assert(Array.isArray(wallets) && wallets.length >= 4, `Số lượng ví của Demo User >= 4 (Thực tế: ${wallets?.length})`);
  const momoWallet = wallets.find(w => w.name.toLowerCase().includes("momo"));
  assert(!!momoWallet, `Tìm thấy ví MoMo với số dư: ${momoWallet?.balance?.toLocaleString?.('vi-VN') || momoWallet?.balance} VNĐ`);
  const initialMomoBalance = BigInt(momoWallet.balance);

  // 4. Kiểm tra AI NLP Parser & Bắt buộc tạo Draft (Quy tắc 3)
  console.log("\n4. Kiểm tra AI Text Parser & Tạo bản nháp (QUY TẮC BẮT BUỘC: KHÔNG TỰ ĐỘNG GHI SỔ)");
  const aiParseRes = await fetch(`${BASE_URL}/api/ai/parse-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: demoCookie,
    },
    body: JSON.stringify({
      text: "Trưa nay ăn bún bò Huế 60k bằng ví MoMo",
    }),
  });
  assert(aiParseRes.status === 200, `Gọi API AI parse text trả về 200 OK`);
  const aiParseData = await aiParseRes.json();
  assert(aiParseData.success === true, `AI bóc tách câu tự nhiên thành công`);
  assert(aiParseData.suggestedData.amount === 60000, `Số tiền bóc tách chính xác: 60,000 VNĐ (Thực tế: ${aiParseData.suggestedData.amount})`);
  assert(aiParseData.suggestedData.type === "EXPENSE", `Loại giao dịch nhận diện: EXPENSE (Chi tiêu)`);
  assert(aiParseData.status === "PENDING", `ĐÃ TẠO BẢN NHÁP DRAFT Ở TRẠNG THÁI 'PENDING'`);
  const draftId = aiParseData.draftId;

  // 5. Kiểm tra danh sách bản nháp AI
  console.log("\n5. Kiểm tra hàng đợi bản nháp /api/ai/drafts");
  const draftsRes = await fetch(`${BASE_URL}/api/ai/drafts`, {
    headers: { Cookie: demoCookie },
  });
  const draftsData = await draftsRes.json();
  const drafts = draftsData.drafts || draftsData;
  const createdDraft = drafts.find(d => d.id === draftId);
  assert(!!createdDraft, `Bản nháp ID ${draftId} tồn tại trong hàng đợi chờ duyệt`);

  // 6. Xác nhận duyệt bản nháp -> Ghi vào sổ giao dịch và trừ ví
  console.log("\n6. Phê duyệt bản nháp /api/ai/drafts/[id]/confirm");
  const confirmRes = await fetch(`${BASE_URL}/api/ai/drafts/${draftId}/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: demoCookie,
    },
    body: JSON.stringify({
      amount: 60000,
      type: "EXPENSE",
      categoryId: createdDraft.suggestedData.categoryId,
      walletId: momoWallet.id,
      description: "Bún bò Huế trưa",
    }),
  });
  assert(confirmRes.status === 200, `Xác nhận bản nháp thành công HTTP 200`);
  const confirmData = await confirmRes.json();
  assert(confirmData.success === true && !!confirmData.transactionId, `Giao dịch chính thức đã được ghi vào sổ (ID: ${confirmData.transactionId})`);

  // Kiểm tra số dư ví MoMo đã bị trừ chính xác 60,000 VNĐ
  const walletsAfterRes = await fetch(`${BASE_URL}/api/wallets`, {
    headers: { Cookie: demoCookie },
  });
  const walletsAfterData = await walletsAfterRes.json();
  const walletsAfter = walletsAfterData.wallets || walletsAfterData;
  const momoAfter = walletsAfter.find(w => w.id === momoWallet.id);
  const newMomoBalance = BigInt(momoAfter.balance);
  assert(
    newMomoBalance === initialMomoBalance - 60000n,
    `Số dư ví MoMo cập nhật chính xác: ${initialMomoBalance} -> ${newMomoBalance} (-60,000 VNĐ)`
  );

  // 7. Kiểm tra Chatbot AI tiếng Việt với dữ liệu thật
  console.log("\n7. Kiểm tra Chatbot AI Trợ lý Tài chính /api/ai/chat");
  const chatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: demoCookie,
    },
    body: JSON.stringify({
      message: "Tổng tài sản của tôi hiện tại là bao nhiêu?",
    }),
  });
  assert(chatRes.status === 200, `Chatbot phản hồi HTTP 200`);
  const chatData = await chatRes.json();
  assert(typeof chatData.reply === "string" && chatData.reply.length > 20, `Chatbot trả lời nội dung phân tích chi tiết`);
  console.log(`    [Chatbot]: "${chatData.reply.slice(0, 100)}..."`);

  // 8. Kiểm tra Phân quyền Admin: User thường không được xem Admin Stats
  console.log("\n8. Kiểm tra Phân quyền Bảo mật (RBAC): User thường gọi API Admin");
  const forbidAdminRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Cookie: demoCookie },
  });
  assert(forbidAdminRes.status === 403, `User thường bị từ chối truy cập API Admin: HTTP 403 Forbidden`);

  // 9. Kiểm tra với tài khoản Admin
  console.log("\n9. Kiểm tra tài khoản Admin admin@quanlychitieu.vn");
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@quanlychitieu.vn" },
  });
  assert(!!adminUser, `Tìm thấy Admin User trong cơ sở dữ liệu (ID: ${adminUser?.id})`);
  const adminCookie = await createSessionCookie(adminUser);

  const adminStatsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Cookie: adminCookie },
  });
  assert(adminStatsRes.status === 200, `Admin truy cập thành công API thống kê hệ thống HTTP 200`);
  const adminStats = await adminStatsRes.json();
  assert(adminStats.stats && adminStats.stats.totalUsers >= 2, `Thống kê tổng người dùng: ${adminStats.stats?.totalUsers}`);
  assert(!("personalTransactions" in adminStats.stats), `BẢO MẬT: Admin Stats KHÔNG chứa danh sách giao dịch cá nhân riêng tư`);

  // 10. Kiểm tra API Ngân sách, Tiết kiệm, Sổ nợ
  console.log("\n10. Kiểm tra các module tài chính khác (Ngân sách, Tiết kiệm, Sổ nợ)");
  const [bRes, sRes, dRes] = await Promise.all([
    fetch(`${BASE_URL}/api/budgets`, { headers: { Cookie: demoCookie } }),
    fetch(`${BASE_URL}/api/savings`, { headers: { Cookie: demoCookie } }),
    fetch(`${BASE_URL}/api/debts`, { headers: { Cookie: demoCookie } }),
  ]);
  assert(bRes.status === 200, `API Ngân sách HTTP 200`);
  assert(sRes.status === 200, `API Mục tiêu tiết kiệm HTTP 200`);
  assert(dRes.status === 200, `API Sổ nợ HTTP 200`);

  console.log(`\n========================================`);
  console.log(`KẾT QUẢ: ${passed} PASS, ${failed} FAIL`);
  console.log(`========================================\n`);

  await prisma.$disconnect();
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(async (err) => {
  console.error("Test execution failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
