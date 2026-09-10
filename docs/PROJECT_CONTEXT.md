# Bối cảnh & Tiến độ Dự án (docs/PROJECT_CONTEXT.md)

- **Thời điểm cập nhật**: 2026-09-09T16:25:00+07:00
- **Trạng thái**: TOÀN BỘ CÁC CHẶNG ĐÃ HOÀN THÀNH (100% PRODUCTION READY)

---

## 1. Tổng quan
- **Tên dự án**: Ứng dụng Quản lý Chi tiêu Cá nhân tích hợp AI (Việt Nam) - `quan-ly-chi-tieu-1.0`
- **Mục tiêu**: Nền tảng quản lý tài chính cá nhân hoàn chỉnh, chuẩn production, hỗ trợ VNĐ, tiếng Việt, giao diện Premium Dark Futuristic Fintech, phân tích ngân sách, sổ nợ, mục tiêu tiết kiệm, giao dịch định kỳ, trợ lý AI bóc tách dữ liệu đa phương thức và Chatbot tư vấn tài chính riêng tư.

## 2. Công nghệ sử dụng
- **Frontend & Fullstack**: Next.js 16.3.4 (App Router), React 19, TypeScript
- **Styling & Design System**: Tailwind CSS v4, Glassmorphism, CSS Variables, Lucide Icons, Recharts
- **Animation Engine**: `motion` (`^13.2.0`) – Hỗ trợ chuyển động spring physics, stagger animations, spotlight cursor tracking, 3D tilt, number ticker, và tôn trọng `prefers-reduced-motion`
- **Database & ORM**: PostgreSQL 18 (Cục bộ localhost:5432), Prisma ORM
- **Authentication**: NextAuth.js / Auth.js (Email/Password với bcryptjs mã hóa an toàn, Google OAuth sẵn sàng)
- **Validation**: Zod (Client-side & Server-side)
- **AI Core**:
  - Official SDK `@google/genai` (v2.21.0), cấu hình model `gemini-3.6-flash`
  - Natural Language Financial Parser (Gemini Structured Outputs + Zod validation)
  - Speech-to-Text (Web Speech API `vi-VN`) với animated audio waveform
  - Receipt / Invoice OCR Vision Parser (Gemini Vision, không fallback dữ liệu giả)
  - Safe User-Scoped Tool Calling Financial Chatbot (9 tools tài chính Read-Only, Google Search Grounding)

## 3. Lệnh chạy dự án
```bash
# Khởi động dịch vụ PostgreSQL 18 (nếu chưa chạy)
# Kết nối DB: postgresql://postgres:1@localhost:5432/quanlychitieu?schema=public

# Cập nhật schema vào database
npx prisma db push

# Seed dữ liệu mẫu phong phú
npx prisma db seed

# Chạy server phát triển
npm run dev

# Kiểm tra kiểu và build production
npm run build

# Chạy server production
npm run start

# Chạy kiểm thử tự động toàn diện
node scripts/test-e2e.mjs
node scripts/test-ai-upgrade.mjs
```

## 4. Tiến độ các chặng (Status: 100% HOÀN THÀNH)
- [x] **Chặng 1**: Khảo sát môi trường, kết nối PostgreSQL 18, cấu hình Next.js, cài đặt thư viện lõi, tạo cấu hình môi trường `.env.example`, tài liệu kiến trúc `docs/DECISIONS.md`.
- [x] **Chặng 2**: Thiết kế Prisma Schema hoàn chỉnh 14 bảng quan hệ, đẩy dữ liệu vào PostgreSQL (`npx prisma db push`) và tạo `prisma/seed.ts` với 16 danh mục chuẩn, 4 ví, 9 giao dịch, ngân sách, mục tiêu tiết kiệm, sổ nợ, bản nháp AI và 2 tài khoản mẫu.
- [x] **Chặng 3**: Xây dựng hệ thống xác thực NextAuth v5 (Email/Password mã hóa Bcrypt + Google OAuth sẵn sàng), Middleware bảo vệ route, Design System Dark Futuristic (Deep Midnight, Neon Cyan/Purple, Glassmorphism, Responsive).
- [x] **Chặng 4**: Module Ví/Tài khoản kim loại & Chuyển tiền nội bộ nguyên tử, Module Giao dịch đa năng (Thu/Chi/Chuyển khoản, bộ lọc danh mục/thời gian, tìm kiếm, hoàn tác số dư khi xóa).
- [x] **Chặng 5**: AI Engine đa phương thức (Bóc tách câu tự nhiên tiếng Việt, Web Speech API nhận diện giọng nói, Quét hóa đơn OCR) và cơ chế bắt buộc tạo Bản Nháp (`AiTransactionDraft`) chờ người dùng phê duyệt trước khi ghi sổ.
- [x] **Chặng 6**: Module Ngân sách thông minh (cảnh báo vượt hạn mức), Mục tiêu tiết kiệm (tiến độ, nạp/rút tiền, hiệu ứng confetti), Sổ nợ (Cho vay/Đi vay, trả từng phần), Giao dịch định kỳ (tự động và nhắc nhở).
- [x] **Chặng 7**: Dashboard trực quan với Recharts (Dòng tiền 6 tháng, cơ cấu chi tiêu PieChart), Trợ lý Chatbot AI tài chính hỗ trợ công cụ truy vấn dữ liệu cá nhân theo `userId`, Phân quyền & Khu vực Admin Portal quản trị hệ thống an toàn (không lộ giao dịch riêng tư).
- [x] **Chặng 8**: Kiểm tra Type-check (100% pass), Lint (`npm run lint` 0 error), Build (`next build` Turbopack 32 routes thành công), Kiểm thử tự động E2E (`scripts/test-e2e.mjs` đạt 25/25 test PASS).
- [x] **Chặng 9 (Nâng cấp Hoàn chỉnh AI)**:
  - Tích hợp SDK chính thức `@google/genai`, cấu hình `GEMINI_MODEL="gemini-3.6-flash"` qua `getGeminiModelName()`.
  - Chatbot đa năng, thông minh, thân thiện; phân luồng câu hỏi tự nhiên, Google Search Grounding cho kiến thức mở.
  - Hệ thống hội thoại lưu Database (`ChatConversation`, `ChatMessage`) bảo vệ nghiêm ngặt theo `userId`.
  - Fix lỗi trùng lặp tin nhắn, tối ưu thứ tự 12 tin nhắn gần nhất.
  - 9 công cụ tài chính Read-Only an toàn server-side.
  - Loại bỏ hoàn toàn fallback dữ liệu giả.
  - Bộ kiểm thử `scripts/test-ai-upgrade.mjs` đạt 44/44 test PASS.
- [x] **Chặng 10 (Thiết kế lại Giao diện Futuristic Fintech & Hoạt Ảnh)**:
  - Khảo sát và tích hợp chọn lọc từ `shadcn-fintech`, `magicui`, `motion-primitives` (100% MIT License).
  - Tích hợp animation engine `motion` (`^13.2.0`) tối ưu React 19 & Next.js 16.
  - Xây dựng các primitives chuyển động: `SpotlightCard`, `NumberTicker` (tabular-nums), `BorderBeam`, `ProgressRing`, `PageTransition`, `animations.ts`.
  - Nâng cấp Dashboard với KPI count-up, 3D tilt thẻ ví, ProgressRing ngân sách, Recharts animated.
  - Nâng cấp Ví với hiệu ứng luồng ánh sáng dòng tiền chuyển khoản.
  - Nâng cấp Tiết kiệm với visual milestone timeline & confetti celebration.
  - Nâng cấp AI Assistant với spring chat bubbles, typing indicator 3 chấm nảy, radar scan AI thinking, motion prompt chips.
  - Nâng cấp AI Quick-Entry với sóng âm thanh 5 dải sống động và stagger draft preview.
  - Nâng cấp Login/Register với ambient floating gradient bokeh và SpotlightCard.
  - 100% các trang đạt HTTP 200 OK, Lint 0 errors/0 warnings, Type-check 0 errors, Build 34 routes thành công.

---

## 5. Tài khoản mẫu để kiểm thử & Trải nghiệm
| Vai trò | Email | Mật khẩu | Chức năng nổi bật |
|---|---|---|---|
| **Demo User** | `demo@quanlychitieu.vn` | `demo123456` | Đầy đủ 4 ví, 9 giao dịch mẫu, ngân sách, tiết kiệm, sổ nợ, chatbot AI lưu lịch sử |
| **Admin** | `admin@quanlychitieu.vn` | `admin123456` | Truy cập trang Quản trị `/admin`, xem thống kê hệ thống, quản lý khóa/mở tài khoản |

---

## 6. Kết Quả Kiểm Thử Toàn Diện (81/81 PASS)
1. **Kiểm thử Nghiệp vụ & Bảo mật gốc (`node scripts/test-e2e.mjs`)**: **25/25 PASS**
2. **Kiểm thử Hệ thống AI Nâng cấp (`node scripts/test-ai-upgrade.mjs`)**: **44/44 PASS**
3. **Kiểm tra Mã Nguồn**:
   - `npm run lint`: **0 errors, 0 warnings**
   - `npx tsc --noEmit`: **0 errors**
   - `npm run build`: **Compiled successfully (34 routes)**
4. **Kiểm tra Tính Khả Dụng Tuyến Đường (HTTP Status Code)**:
   - 12/12 tuyến đường chính (`/`, `/login`, `/register`, `/wallets`, `/budgets`, `/savings`, `/transactions`, `/assistant`, `/reports`, `/debts`, `/recurring`, `/admin`) đều trả về mã **HTTP 200 OK**.
