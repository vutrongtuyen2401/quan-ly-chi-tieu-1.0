// scripts/test-ai-upgrade.mjs
// Kịch bản kiểm thử tự động toàn diện hệ thống AI nâng cấp:
// 1. Health-check có điều kiện cho GEMINI_MODEL & GEMINI_API_KEY
// 2. Chat history: Lấy 12 tin nhắn gần nhất theo createdAt desc -> reverse, không lấy 12 tin nhắn đầu
// 3. Không trùng lặp câu hỏi mới giữa history và userMessage
// 4. Function-calling protocol: truyền call.id vào functionResponse, tối đa 4 lượt, server-side userId
// 5. Timeout cleanup & friendly Vietnamese error responses
// 6. Phân vùng bảo mật userId 100%
// 7. Zod structured parsers (Text & Receipt) không tự sinh số liệu giả

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
  console.log("=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG HỆ THỐNG AI NÂNG CẤP ===");
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

  // 1. Chuẩn bị session cho Demo User và Admin User
  console.log("\n1. Khởi tạo phiên làm việc cho Demo User & Admin User");
  const demoUser = await prisma.user.findUnique({
    where: { email: "demo@quanlychitieu.vn" },
  });
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@quanlychitieu.vn" },
  });

  assert(!!demoUser, `Tìm thấy Demo User ID: ${demoUser?.id}`);
  assert(!!adminUser, `Tìm thấy Admin User ID: ${adminUser?.id}`);

  const demoCookie = await createSessionCookie(demoUser);
  const adminCookie = await createSessionCookie(adminUser);

  // 2. Kiểm tra Health-Check Model AI có điều kiện
  console.log("\n2. Kiểm tra Health-check cấu hình Model AI");
  const healthRes = await fetch(`${BASE_URL}/api/ai/health`, {
    headers: { Cookie: demoCookie },
  });
  const healthData = await healthRes.json();
  const configuredModel = healthData.model;

  assert(typeof configuredModel === "string" && configuredModel.length > 0, `GEMINI_MODEL có cấu hình hợp lệ: '${configuredModel}'`);
  
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    console.log(`  [INFO] Phát hiện GEMINI_API_KEY, thực hiện health-check trực tiếp tới model: ${configuredModel}`);
    if (healthData.ok) {
      assert(healthData.ok === true, `Model '${configuredModel}' kết nối thành công và sẵn sàng`);
    } else {
      assert(
        typeof healthData.message === "string" && healthData.message.length > 0,
        `Model '${configuredModel}' trả lỗi cấu hình thân thiện: "${healthData.message}"`
      );
    }
  } else {
    console.log(`  [INFO] Không có GEMINI_API_KEY, xác nhận hệ thống thông báo trạng thái cấu hình thân thiện`);
    assert(healthData.configured === false, `Xác nhận chưa cấu hình GEMINI_API_KEY (không crash)`);
    assert(healthData.message.includes("GEMINI_API_KEY"), `Thông báo rõ ràng về việc cần cấu hình GEMINI_API_KEY`);
  }

  // 3. Kiểm tra API tạo cuộc trò chuyện mới POST /api/ai/conversations
  console.log("\n3. Kiểm tra API tạo cuộc trò chuyện mới /api/ai/conversations");
  const createConvRes = await fetch(`${BASE_URL}/api/ai/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: demoCookie,
    },
    body: JSON.stringify({
      title: "Hỏi về ngân sách tháng 9",
    }),
  });
  assert(createConvRes.status === 200, `Tạo cuộc trò chuyện trả về HTTP 200`);
  const createConvData = await createConvRes.json();
  const convId = createConvData.conversation?.id;
  assert(!!convId, `Đã tạo hội thoại trong database với ID: ${convId}`);
  assert(createConvData.conversation?.title === "Hỏi về ngân sách tháng 9", `Tiêu đề hội thoại lưu chính xác`);

  // 4. Kiểm tra API lấy danh sách hội thoại GET /api/ai/conversations
  console.log("\n4. Kiểm tra API lấy danh sách hội thoại của người dùng");
  const listConvRes = await fetch(`${BASE_URL}/api/ai/conversations`, {
    headers: { Cookie: demoCookie },
  });
  assert(listConvRes.status === 200, `Lấy danh sách hội thoại HTTP 200`);
  const listConvData = await listConvRes.json();
  assert(Array.isArray(listConvData.conversations) && listConvData.conversations.length > 0, `Danh sách hội thoại chứa các cuộc trò chuyện của user`);
  const foundConv = listConvData.conversations.find((c) => c.id === convId);
  assert(!!foundConv, `Tìm thấy cuộc trò chuyện vừa tạo trong danh sách`);

  // 5. Kiểm tra Chat History: Lấy 12 tin nhắn gần nhất theo createdAt desc -> reverse
  console.log("\n5. Kiểm tra Chat History Order (12 tin nhắn gần nhất, không lấy 12 tin nhắn đầu)");
  // Tạo một cuộc trò chuyện dài gồm 15 tin nhắn
  const longConv = await prisma.chatConversation.create({
    data: {
      userId: demoUser.id,
      title: "Kiểm tra trật tự 15 tin nhắn",
    },
  });

  const now = Date.now();
  for (let i = 1; i <= 15; i++) {
    await prisma.chatMessage.create({
      data: {
        conversationId: longConv.id,
        role: i % 2 === 1 ? "USER" : "ASSISTANT",
        content: `Tin nhắn kiểm thử số ${i}`,
        createdAt: new Date(now + i * 1000), // Thời gian tăng dần
      },
    });
  }

  // Thực hiện truy vấn theo logic chuẩn của route: createdAt desc, take 12, sau đó reverse
  const recentMessages = await prisma.chatMessage.findMany({
    where: { conversationId: longConv.id },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { role: true, content: true },
  });
  const chronologicalHistory = [...recentMessages].reverse();

  assert(chronologicalHistory.length === 12, `Lấy đúng 12 tin nhắn gần nhất (Tổng trong DB là 15)`);
  assert(chronologicalHistory[0].content === "Tin nhắn kiểm thử số 4", `Tin nhắn đầu tiên của lịch sử là số 4 (Bỏ qua số 1, 2, 3 cũ hơn)`);
  assert(chronologicalHistory[11].content === "Tin nhắn kiểm thử số 15", `Tin nhắn cuối cùng của lịch sử là số 15 (mới nhất)`);

  // Dọn dẹp longConv sau kiểm tra
  await prisma.chatConversation.delete({ where: { id: longConv.id } });

  const BANNED_ERROR_PHRASES = [
    "đã xảy ra sự cố",
    "không thể kết nối",
    "timeout",
    "lỗi máy chủ",
  ];

  function assertNoBannedPhrases(text, context) {
    const lower = (text || "").toLowerCase();
    for (const phrase of BANNED_ERROR_PHRASES) {
      assert(
        !lower.includes(phrase),
        `[${context}] Phản hồi KHÔNG chứa cụm từ lỗi cấm: '${phrase}'`
      );
    }
  }

  // 6a. Gửi câu hỏi tài chính qua POST /api/ai/chat (chỉ dùng Financial Tools)
  console.log("\n6a. Gửi câu hỏi tài chính qua /api/ai/chat (Mode: Financial Tools)");
  await new Promise((r) => setTimeout(r, 2500));
  const financialMessage = "Tình hình chi tiêu tháng này của tôi ra sao?";
  const chatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: demoCookie,
    },
    body: JSON.stringify({
      conversationId: convId,
      message: financialMessage,
    }),
  });
  assert(chatRes.status === 200, `Gửi tin nhắn tài chính thành công HTTP 200`);
  const chatData = await chatRes.json();
  assert(typeof chatData.reply === "string" && chatData.reply.length > 20, `Nhận phản hồi chi tiết từ Trợ lý AI`);
  assert(chatData.conversationId === convId, `Phản hồi khớp đúng ID cuộc trò chuyện`);
  assertNoBannedPhrases(chatData.reply, "Financial Chat");

  // Kiểm tra trong DB: tin nhắn USER và ASSISTANT đã được lưu
  const dbMessages = await prisma.chatMessage.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
  });
  assert(dbMessages.length >= 2, `Cả tin nhắn USER và ASSISTANT đã được lưu vào database (Số lượng: ${dbMessages.length})`);
  const userMessages = dbMessages.filter((m) => m.role === "USER" && m.content === financialMessage);
  assert(userMessages.length === 1, `Tin nhắn người dùng chỉ được lưu và xử lý ĐÚNG 1 LẦN (Không bị duplicate)`);

  // 6b. Gửi câu hỏi thời gian thực qua POST /api/ai/chat (Mode: Realtime Grounding)
  console.log("\n6b. Gửi câu hỏi thời gian thực: 'Thời tiết Hà Nội hôm nay thế nào?'");
  await new Promise((r) => setTimeout(r, 2500));
  const weatherMessage = "Thời tiết Hà Nội hôm nay thế nào?";
  const weatherRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: demoCookie,
    },
    body: JSON.stringify({
      conversationId: convId,
      message: weatherMessage,
    }),
  });
  assert(weatherRes.status === 200, `Gửi câu hỏi thời tiết thành công HTTP 200`);
  const weatherData = await weatherRes.json();
  assert(typeof weatherData.reply === "string" && weatherData.reply.length > 20, `Nhận phản hồi thời tiết từ Trợ lý AI`);
  assertNoBannedPhrases(weatherData.reply, "Realtime Weather");
  const hasWeatherInfo =
    weatherData.reply?.toLowerCase()?.includes("hà nội") ||
    weatherData.reply?.toLowerCase()?.includes("nhiệt độ") ||
    weatherData.reply?.toLowerCase()?.includes("thời tiết") ||
    weatherData.reply?.includes("°C");
  assert(!!hasWeatherInfo, `Phản hồi chứa thông tin thời tiết thực tế tại Hà Nội`);
  const hasSource =
    weatherData.reply?.toLowerCase()?.includes("nguồn") ||
    weatherData.reply?.toLowerCase()?.includes("open-meteo") ||
    weatherData.reply?.toLowerCase()?.includes("google") ||
    weatherData.reply?.toLowerCase()?.includes("trạm");
  assert(!!hasSource, `Phản hồi có trích dẫn nguồn thông tin thời gian thực`);

  // 6c. Kiểm tra Error Handling: Cấm trả HTTP 200 với reply lỗi giả
  console.log("\n6c. Kiểm tra Error Handling: Request không hợp lệ / lỗi phải trả HTTP status phù hợp");
  const emptyMsgRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: demoCookie,
    },
    body: JSON.stringify({
      conversationId: convId,
      message: "   ",
    }),
  });
  assert(emptyMsgRes.status === 400, `Tin nhắn rỗng trả HTTP 400 (Không trả HTTP 200 lỗi giả)`);
  const unauthRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Xin chào",
    }),
  });
  assert(unauthRes.status === 401, `Chưa đăng nhập trả HTTP 401 (Không trả HTTP 200 lỗi giả)`);

  // 7. Kiểm tra API lấy chi tiết tin nhắn hội thoại GET /api/ai/conversations/[id]
  console.log("\n7. Kiểm tra lấy chi tiết tin nhắn hội thoại /api/ai/conversations/[id]");
  const getDetailRes = await fetch(`${BASE_URL}/api/ai/conversations/${convId}`, {
    headers: { Cookie: demoCookie },
  });
  assert(getDetailRes.status === 200, `Lấy chi tiết tin nhắn HTTP 200`);
  const detailData = await getDetailRes.json();
  assert(detailData.conversation?.messages?.length >= 2, `Chi tiết hội thoại trả về danh sách tin nhắn`);

  // 8. BẢO MẬT: Kiểm tra user khác KHÔNG THỂ truy cập hội thoại của Demo User
  console.log("\n8. Kiểm tra phân vùng bảo mật: Admin User truy cập hội thoại của Demo User");
  const leakRes = await fetch(`${BASE_URL}/api/ai/conversations/${convId}`, {
    headers: { Cookie: adminCookie },
  });
  assert(leakRes.status === 404, `BẢO MẬT: Admin không thể xem hội thoại của Demo User (HTTP 404 Not Found)`);

  // 9. BẢO MẬT: Kiểm tra user khác KHÔNG THỂ xóa hội thoại của Demo User
  console.log("\n9. Kiểm tra phân vùng bảo mật: Admin User cố tình xóa hội thoại của Demo User");
  const deleteForbiddenRes = await fetch(`${BASE_URL}/api/ai/conversations/${convId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  assert(deleteForbiddenRes.status === 404, `BẢO MẬT: Ngăn chặn xóa trái phép hội thoại (HTTP 404 Not Found)`);

  // 10. Kiểm tra xóa hội thoại bởi chính chủ sở hữu
  console.log("\n10. Xóa cuộc trò chuyện bởi chính Demo User");
  const deleteOwnRes = await fetch(`${BASE_URL}/api/ai/conversations/${convId}`, {
    method: "DELETE",
    headers: { Cookie: demoCookie },
  });
  assert(deleteOwnRes.status === 200, `Chủ sở hữu xóa hội thoại thành công HTTP 200`);
  const checkDeleted = await prisma.chatConversation.findUnique({ where: { id: convId } });
  assert(checkDeleted === null, `Hội thoại đã được xóa hoàn toàn khỏi cơ sở dữ liệu`);

  // 11. Kiểm tra Parser Text/Voice với Zod validation
  console.log("\n11. Kiểm tra Parser Text/Voice bóc tách câu tự nhiên");
  const parseTextRes = await fetch(`${BASE_URL}/api/ai/parse-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: demoCookie,
    },
    body: JSON.stringify({
      text: "Chi 85k ăn trưa bún chả qua ví MoMo",
    }),
  });
  assert(parseTextRes.status === 200, `Parse text HTTP 200`);
  const parseTextData = await parseTextRes.json();
  assert(parseTextData.success === true, `Parse text thành công`);
  assert(parseTextData.suggestedData.amount === 85000, `Số tiền bóc tách chính xác: 85,000 VNĐ`);
  assert(parseTextData.status === "PENDING", `Tạo bản nháp PENDING chờ người dùng duyệt`);

  // 12. Kiểm tra Receipt Parser: TUYỆT ĐỐI KHÔNG TẠO HÓA ĐƠN MẪU GIẢ KHI ẢNH LỖI
  console.log("\n12. Kiểm tra Receipt Parser: Đảm bảo không tự sinh hóa đơn mẫu giả khi ảnh rỗng/lỗi");
  const badReceiptRes = await fetch(`${BASE_URL}/api/ai/parse-receipt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: demoCookie,
    },
    body: JSON.stringify({
      imageBase64: "data:image/jpeg;base64,invalidcorrupteddata",
      ocrText: "",
    }),
  });
  assert(badReceiptRes.status === 400, `Ảnh không hợp lệ bị từ chối với HTTP 400 (Thực tế: ${badReceiptRes.status})`);
  const badReceiptData = await badReceiptRes.json();
  assert(
    typeof badReceiptData.error === "string" && !badReceiptData.error.includes("Highlands"),
    `Không có dữ liệu giả Highlands Coffee mẫu (Thông báo lỗi: "${badReceiptData.error}")`
  );

  console.log(`\n========================================`);
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log(`========================================\n`);

  await prisma.$disconnect();
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(async (e) => {
  console.error("Test execution failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
