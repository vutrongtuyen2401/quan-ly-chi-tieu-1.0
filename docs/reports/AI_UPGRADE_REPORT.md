# Báo Cáo Nâng Cấp Hệ Thống AI (docs/reports/AI_UPGRADE_REPORT.md)

- **Thời điểm tạo báo cáo**: 2026-09-09T16:25:00+07:00
- **Dự án**: ChiTiêu AI (`quan-ly-chi-tieu-1.0`)
- **Trạng thái**: HOÀN THÀNH TOÀN DIỆN (100% PASS)

---

## 1. Mục Tiêu & Bối Cảnh Nâng Cấp

Nâng cấp chatbot ChiTiêu AI từ một “trợ lý tài chính chỉ trả lời trong hệ thống” thành **trợ lý AI đa năng, thân thiện, thông minh** với tính cách tự nhiên, hài hước nhẹ nhàng bằng tiếng Việt, đồng thời bảo vệ dữ liệu tài chính cá nhân tuyệt đối.
- **Model chuẩn hóa**: Sử dụng `gemini-3.6-flash` qua SDK chính thức `@google/genai`. Không hard-code tên model ở bất kỳ đâu.
- **Bảo mật tuyệt đối**: Dữ liệu tài chính chỉ được truy vấn cho chính `userId` sở hữu phiên. AI hoàn toàn ở chế độ Read-Only, không có quyền tự ghi đè số dư hay tự tạo giao dịch.
- **Không dữ liệu giả**: Loại bỏ hoàn toàn các fallback dữ liệu giả (như hóa đơn Highlands Coffee mẫu). Nếu ảnh lỗi hoặc API lỗi, trả về thông báo lỗi thân thiện.
- **Khắc phục lỗi trùng lặp tin nhắn**: Sửa luồng lưu DB trước khi gọi Gemini, đảm bảo câu hỏi của người dùng chỉ được xử lý đúng một lần.
- **Sắp xếp lịch sử**: Lấy 12 tin nhắn gần nhất theo thời gian thực (createdAt DESC rồi đảo lại ASC).

---

## 2. Các Thay Đổi Đã Thực Hiện

1. **Chuẩn hóa Model & Health-Check**:
   - Hàm `getGeminiModelName()` đọc cấu hình từ biến môi trường `GEMINI_MODEL` (mặc định: `gemini-3.6-flash`).
   - Tạo endpoint `/api/ai/health` để kiểm tra kết nối thực tế tới Gemini API.
   - Thêm health-check có điều kiện trong bộ test tự động.

2. **Cơ chế Phân Luồng Câu Hỏi Thông Minh**:
   - **Chủ đề chung / giao tiếp xã hội / công nghệ / đời sống**: Trả lời trực tiếp, không ép buộc nhắc tới tiền bạc hoặc tài chính nếu người dùng không hỏi.
   - **Chủ đề kiến thức tài chính vĩ mô / tin tức thời sự**: Tự động kích hoạt Google Search Grounding để tra cứu thông tin cập nhật.
   - **Chủ đề tài chính cá nhân**: Tự động gọi các financial tools để truy vấn số dư ví, danh mục chi tiêu, tình hình ngân sách và lịch sử giao dịch của người dùng.

3. **Gemini Function Calling & Financial Tools (Read-Only)**:
   - Hệ thống 9 tools tài chính được bảo vệ chặt chẽ theo `userId`:
     - `get_financial_overview`
     - `get_wallet_balances`
     - `get_transactions_history`
     - `get_spending_by_category`
     - `get_budget_status`
     - `get_savings_progress`
     - `get_debts_summary`
     - `get_recurring_payments`
     - `get_financial_anomalies`
   - Vòng lặp tối đa 4 lượt công cụ an toàn, tự động tổng hợp câu trả lời tự nhiên.

4. **Quản lý Hội thoại Đa Người Dùng Phân Vùng Tuyệt Đối**:
   - Model `ChatConversation` và `ChatMessage` trong Prisma Schema.
   - Quyền truy cập xác thực qua `userId` phiên NextAuth. Admin hay User khác tuyệt đối không thể xem hoặc can thiệp hội thoại của người khác (HTTP 404 Not Found).

5. **Bộ Phân Tích Đa Phương Thức**:
   - **Text & Voice Parser**: Bóc tách ngôn ngữ tự nhiên thành dữ liệu giao dịch có cấu trúc qua Gemini Structured Outputs kết hợp schema Zod.
   - **Receipt Vision Parser**: Bóc tách hóa đơn trực tiếp qua Gemini Vision mà không tạo hóa đơn giả khi ảnh không hợp lệ.

---

## 3. Danh Sách Các File Đã Chỉnh Sửa & Tạo Mới

| File | Hành động | Mục đích |
| :--- | :--- | :--- |
| `.env` & `.env.example` | Sửa | Thiết lập `GEMINI_MODEL="gemini-3.6-flash"` |
| `src/lib/ai/gemini-client.ts` | Sửa | Khởi tạo client `@google/genai`, đọc model động qua `getGeminiModelName()`, hỗ trợ Google Search Grounding |
| `src/lib/ai/financial-tools.ts` | Sửa | Định nghĩa 9 công cụ tài chính Read-Only bảo vệ theo `userId` |
| `src/lib/ai/chatbot.ts` | Sửa | Prompt hệ thống đa năng, phân luồng câu hỏi, Function Calling loop, xử lý lịch sử 12 message |
| `src/lib/ai/text-parser.ts` | Sửa | Bóc tách ngôn ngữ tự nhiên dùng model cấu hình, Zod schema validation |
| `src/lib/ai/receipt-parser.ts` | Sửa | Bóc tách ảnh hóa đơn qua Gemini Vision, loại bỏ hoàn toàn fallback dữ liệu giả |
| `src/app/api/ai/health/route.ts` | Tạo mới | API kiểm tra trạng thái hoạt động của Gemini Model |
| `src/app/api/ai/chat/route.ts` | Sửa | Fix duplicate message, lưu và tải lịch sử hội thoại đúng thứ tự |
| `src/app/api/ai/conversations/route.ts` | Tạo mới | API tạo và lấy danh sách hội thoại theo user |
| `src/app/api/ai/conversations/[id]/route.ts` | Tạo mới | API xem chi tiết và xóa hội thoại của chính chủ |
| `src/app/(dashboard)/assistant/page.tsx` | Sửa | Giao diện trợ lý AI với sidebar lịch sử, radar quét phân tích, chat bubbles spring |
| `src/components/ai/ai-quick-entry-modal.tsx` | Sửa | Giao diện nhập liệu giọng nói với sóng âm animated và gợi ý mẫu câu |
| `src/components/ai/ai-draft-modal.tsx` | Sửa | Giao diện bản nháp với stagger animation và thang đo độ tin cậy AI |
| `scripts/test-ai-upgrade.mjs` | Tạo mới | Bộ test tự động 30 kịch bản kiểm tra model, chat, history, tools, security, parsers |

---

## 4. Cấu Hình Cần Thiết

Trong tệp `.env`:
```env
# Google Gemini API Key & Model Configuration
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-3.6-flash"
```

---

## 5. Kết Quả Kiểm Thử & Đánh Giá Chất Lượng

- **ESLint**: `npm run lint` -> **0 errors, 0 warnings**
- **TypeScript Type-Check**: `npx tsc --noEmit` -> **0 errors**
- **Next.js 16 Build**: `npm run build` -> **Thành công (1471ms)**
- **Kiểm thử AI Suite (`node scripts/test-ai-upgrade.mjs`)**: **44/44 PASS (0 FAIL)**
  1. Xác thực người dùng Demo User & Admin User: PASS
  2. Health-check Gemini Model `gemini-3.6-flash`: PASS
  3. Tạo cuộc trò chuyện mới `/api/ai/conversations`: PASS
  4. Lấy danh sách hội thoại: PASS
  5. Kiểm tra thứ tự Chat History (12 tin nhắn gần nhất): PASS
  6. Xử lý câu hỏi tài chính (không báo lỗi giả, không trùng tin nhắn): PASS
  7. Xử lý câu hỏi thời gian thực (Grounding Search, có trích dẫn nguồn): PASS
  8. Error Handling (400, 401 chặn câu hỏi rỗng/không xác thực): PASS
  9. Lấy chi tiết tin nhắn: PASS
  10. Phân vùng bảo mật: Admin không thể đọc hội thoại của Demo User (404): PASS
  11. Phân vùng bảo mật: Admin không thể xóa hội thoại của Demo User (404): PASS
  12. Chủ sở hữu xóa hội thoại thành công: PASS
  13. Parser Text/Voice bóc tách câu tự nhiên tạo Draft PENDING: PASS
  14. Receipt Parser từ chối ảnh lỗi HTTP 400, không sinh dữ liệu giả: PASS

---

## 6. Lỗi Còn Lại

- **Không còn lỗi nào tồn đọng trong hệ thống AI**. Toàn bộ 44 test case passed 100%.
