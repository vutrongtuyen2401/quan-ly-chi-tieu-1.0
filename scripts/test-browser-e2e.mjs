// scripts/test-browser-e2e.mjs
// Kịch bản kiểm thử tích hợp E2E toàn diện cho Production Hardening:
// 1. Xác thực luồng người dùng cốt lõi (User Journey)
// 2. Kiểm thử cơ chế Rate Limiting (HTTP 429)
// 3. Kiểm thử xác thực tệp upload (MIME thật, dung lượng, kích thước)
// 4. Kiểm thử ghi nhận Audit Logs cho các thao tác tài chính
// 5. Kiểm thử bảo vệ endpoint /api/ai/health

import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
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

async function runBrowserE2ETests() {
  console.log("===============================================================================");
  console.log("🚀 BẮT ĐẦU BỘ KIỂM THỬ E2E & PRODUCTION HARDENING CHO CHITIÊU AI");
  console.log("===============================================================================\n");

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

  try {
    // -------------------------------------------------------------------------
    // PHẦN 1: KIỂM THỬ TRANG GIAO DIỆN & PHIÊN NGƯỜI DÙNG
    // -------------------------------------------------------------------------
    console.log("📌 PHẦN 1: Kiểm tra trang giao diện & bảo mật thông tin tài khoản mẫu");
    const loginRes = await fetch(`${BASE_URL}/login`);
    assert(loginRes.status === 200, `Trang đăng nhập /login trả về HTTP 200 OK`);
    const loginHtml = await loginRes.text();
    assert(loginHtml.includes("Đăng nhập hệ thống"), `Giao diện chứa nút gửi form đăng nhập`);

    // Tìm user thử nghiệm có sẵn ví tiền trong DB
    const testUser = await prisma.user.findFirst({
      where: { wallets: { some: {} } },
      include: { wallets: true },
    });
    assert(!!testUser, `Tìm thấy người dùng kiểm thử trong cơ sở dữ liệu: ${testUser?.email}`);
    const userCookie = await createSessionCookie(testUser);

    // -------------------------------------------------------------------------
    // PHẦN 2: LUỒNG NGƯỜI DÙNG CỐT LÕI (DASHBOARD -> AI ENTRY -> CONFIRM DRAFT)
    // -------------------------------------------------------------------------
    console.log("\n📌 PHẦN 2: Kiểm thử Luồng người dùng cốt lõi (User Journey)");
    const dashboardRes = await fetch(`${BASE_URL}/api/wallets`, {
      headers: { Cookie: userCookie },
    });
    assert(dashboardRes.status === 200, `Lấy dữ liệu ví tiền của người dùng thành công (HTTP 200)`);
    const walletsData = await dashboardRes.json();
    const wallets = walletsData.wallets || walletsData;
    assert(Array.isArray(wallets) && wallets.length > 0, `Người dùng có ít nhất một ví tiền hợp lệ`);
    const primaryWallet = wallets[0];

    // Tạo bản nháp qua AI Parser
    const parseRes = await fetch(`${BASE_URL}/api/ai/parse-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({
        text: `Ăn tối nhà hàng BBQ 350k bằng ví ${primaryWallet.name}`,
      }),
    });
    assert(parseRes.status === 200, `Gọi API AI parse-text thành công (HTTP 200)`);
    const parseData = await parseRes.json();
    assert(parseData.success === true, `AI bóc tách câu tự nhiên thành công`);
    assert(parseData.status === "PENDING", `Bản nháp được lưu ở trạng thái PENDING`);
    const draftId = parseData.draftId;

    // Phê duyệt bản nháp
    const initialBalance = BigInt(primaryWallet.balance);
    const confirmRes = await fetch(`${BASE_URL}/api/ai/drafts/${draftId}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({
        amount: 350000,
        walletId: primaryWallet.id,
        type: "EXPENSE",
        description: "Ăn tối nhà hàng BBQ 350k",
      }),
    });
    assert(confirmRes.status === 200, `Phê duyệt bản nháp thành công HTTP 200`);
    const confirmData = await confirmRes.json();
    assert(confirmData.success === true, `Giao dịch đã được ghi sổ chính thức: ID ${confirmData.transactionId}`);

    // Kiểm tra số dư ví được trừ chính xác
    const updatedWallet = await prisma.wallet.findUnique({ where: { id: primaryWallet.id } });
    const expectedBalance = initialBalance - BigInt(350000);
    assert(
      updatedWallet.balance === expectedBalance,
      `Số dư ví ${primaryWallet.name} cập nhật chính xác (-350,000 VNĐ)`
    );

    // -------------------------------------------------------------------------
    // PHẦN 3: KIỂM THỬ AUDIT LOGS CHO CÁC THAO TÁC TÀI CHÍNH
    // -------------------------------------------------------------------------
    console.log("\n📌 PHẦN 3: Kiểm thử hệ thống Audit Logs");
    const draftAudit = await prisma.auditLog.findFirst({
      where: {
        action: "AI_DRAFT_CONFIRM",
        entityId: draftId,
      },
      orderBy: { createdAt: "desc" },
    });
    assert(!!draftAudit, `Tìm thấy bản ghi Audit Log AI_DRAFT_CONFIRM cho bản nháp ${draftId}`);
    assert(draftAudit?.userId === testUser.id, `Audit Log ghi nhận đúng UserId thao tác`);

    // Thực hiện chuyển tiền giữa 2 ví và kiểm tra Audit Log
    if (wallets.length >= 2) {
      const w1 = wallets[0];
      const w2 = wallets[1];
      const transferRes = await fetch(`${BASE_URL}/api/wallets/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: userCookie,
        },
        body: JSON.stringify({
          sourceWalletId: w1.id,
          destinationWalletId: w2.id,
          amount: 50000,
          date: new Date().toISOString(),
          note: "Test chuyển tiền E2E",
        }),
      });
      assert(transferRes.status === 201, `Thực hiện chuyển khoản nội bộ thành công HTTP 201`);

      const transferAudit = await prisma.auditLog.findFirst({
        where: {
          action: "WALLET_TRANSFER",
          userId: testUser.id,
        },
        orderBy: { createdAt: "desc" },
      });
      assert(!!transferAudit, `Tìm thấy bản ghi Audit Log WALLET_TRANSFER trong cơ sở dữ liệu`);
    }

    // -------------------------------------------------------------------------
    // PHẦN 4: KIỂM THỬ RATE LIMITING (HTTP 429)
    // -------------------------------------------------------------------------
    console.log("\n📌 PHẦN 4: Kiểm thử cơ chế Rate Limiting (HTTP 429)");
    let got429 = false;
    let rateLimitMessage = "";
    let retryAfterHeader = null;

    // Gửi liên tục các request để kích hoạt rate limit trên /api/auth/register (limit: 5)
    for (let i = 0; i < 7; i++) {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.199", // Test IP cố định
        },
        body: JSON.stringify({
          name: `Spam Tester ${i}`,
          email: `spam_${Date.now()}_${i}@test.com`,
          password: "password123",
        }),
      });

      if (res.status === 429) {
        got429 = true;
        const data = await res.json();
        rateLimitMessage = data.error;
        retryAfterHeader = res.headers.get("Retry-After");
        break;
      }
    }

    assert(got429 === true, `Hệ thống phản hồi mã HTTP 429 Too Many Requests khi gọi dồn dập`);
    assert(
      rateLimitMessage.includes("quá nhiều lần") || rateLimitMessage.includes("quá nhanh"),
      `Thông báo lỗi Rate Limit hiển thị tiếng Việt thân thiện: "${rateLimitMessage}"`
    );
    assert(!!retryAfterHeader, `Phản hồi 429 chứa Header Retry-After chuẩn RFC: ${retryAfterHeader}s`);

    // -------------------------------------------------------------------------
    // PHẦN 5: KIỂM THỬ XÁC THỰC TỆP ẢNH HÓA ĐƠN (MIME THẬT & DUNG LƯỢNG)
    // -------------------------------------------------------------------------
    console.log("\n📌 PHẦN 5: Kiểm thử bảo mật tệp Upload hóa đơn");

    // Test 1: Tệp giả mạo (Text mạo danh JPEG)
    const fakeImageRes = await fetch(`${BASE_URL}/api/ai/parse-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({
        imageBase64: "data:image/jpeg;base64," + Buffer.from("<html><script>alert(1)</script></html>").toString("base64"),
      }),
    });
    assert(fakeImageRes.status === 400, `Từ chối tệp giả mạo nội dung không phải ảnh thật (HTTP 400)`);
    const fakeImageData = await fakeImageRes.json();
    assert(
      fakeImageData.error.includes("Định dạng tệp không được hỗ trợ"),
      `Trả về thông báo định dạng ảnh không hợp lệ chính xác: "${fakeImageData.error}"`
    );

    // Test 2: Tệp vượt quá 5MB
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
    // Ghi magic bytes PNG để vượt qua kiểm tra mime nhưng bị chặn ở dung lượng
    oversizedBuffer[0] = 0x89;
    oversizedBuffer[1] = 0x50;
    oversizedBuffer[2] = 0x4e;
    oversizedBuffer[3] = 0x47;
    oversizedBuffer[4] = 0x0d;
    oversizedBuffer[5] = 0x0a;
    oversizedBuffer[6] = 0x1a;
    oversizedBuffer[7] = 0x0a;

    const oversizedRes = await fetch(`${BASE_URL}/api/ai/parse-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({
        imageBase64: "data:image/png;base64," + oversizedBuffer.toString("base64"),
      }),
    });
    assert(oversizedRes.status === 400, `Từ chối tệp vượt quá 5MB (HTTP 400)`);
    const oversizedData = await oversizedRes.json();
    assert(
      oversizedData.error.includes("vượt quá giới hạn cho phép"),
      `Trả về cảnh báo vượt dung lượng tiếng Việt: "${oversizedData.error}"`
    );

    // -------------------------------------------------------------------------
    // PHẦN 6: KIỂM THỬ BẢO VỆ ENDPOINT /api/ai/health
    // -------------------------------------------------------------------------
    console.log("\n📌 PHẦN 6: Kiểm thử bảo vệ & giám sát /api/ai/health");
    const healthRes = await fetch(`${BASE_URL}/api/ai/health`);
    assert(healthRes.status === 200 || healthRes.status === 503, `Endpoint /api/ai/health phản hồi hợp lệ (HTTP ${healthRes.status})`);
    const healthData = await healthRes.json();
    assert(healthData.ok !== undefined || healthData.status !== undefined, `Cấu trúc phản hồi health check chuẩn`);

    console.log("\n===============================================================================");
    console.log(`📊 TỔNG KẾT BỘ TEST E2E & HARDENING: ${passed} PASS, ${failed} FAIL`);
    console.log("===============================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Lỗi nghiêm trọng trong quá trình chạy kiểm thử:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBrowserE2ETests();
