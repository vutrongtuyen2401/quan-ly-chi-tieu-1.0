# Architecture & Technical Decisions (docs/DECISIONS.md)

Tài liệu này ghi lại các quyết định kiến trúc, công nghệ và quy ước thiết kế trong dự án **Quản lý Chi tiêu Cá nhân AI (quan-ly-chi-tieu-1.0)**.

---

## 1. Lưu trữ tiền tệ: Integer VNĐ (BigInt / Int)
- **Quyết định**: Tuyệt đối không sử dụng kiểu dữ liệu `Float` hay `Double` cho các trường tiền tệ (`amount`, `balance`, `limitAmount`, `targetAmount`, `currentAmount`, `paidAmount`). Thay vào đó sử dụng `BigInt` (hoặc `Int` trong PostgreSQL) tính theo đơn vị Đồng (VNĐ).
- **Lý do**: Số học dấu chấm động (`float`) trong JavaScript và máy tính dễ gây ra lỗi sai số lũy kế (ví dụ `0.1 + 0.2 = 0.30000000000000004`). Với tiền tệ VNĐ không có hào/xu lẻ thập phân, việc lưu số nguyên đại diện chính xác 100% số tiền thực tế.
- **Quy ước hiển thị**: Format ở client và server thông qua hàm tiện ích chuẩn `formatVND(amount)` sử dụng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.
- **Chuyển đổi API**: BigInt khi serialize ra JSON được format về string hoặc number an toàn để không gây lỗi `Do not know how to serialize a BigInt`.

---

## 2. Bảo mật phân vùng dữ liệu: Multi-Tenant By UserId
- **Quyết định**: Mọi bảng dữ liệu liên quan đến tài chính cá nhân (`Wallet`, `Transaction`, `Category` cá nhân, `Budget`, `SavingsGoal`, `DebtBook`, `RecurringRule`, `AiTransactionDraft`) đều bắt buộc có trường `userId String`.
- **Thực thi bảo mật**:
  - Mọi API endpoint và Server Action trước khi truy vấn đều phải giải mã session của người dùng đăng nhập hiện tại (`session.user.id`).
  - Mọi câu lệnh Prisma `findMany`, `findFirst`, `update`, `delete` đều bắt buộc đính kèm `where: { userId }` hoặc kiểm tra quyền sở hữu trước khi thực hiện.
  - Role `ADMIN` bị giới hạn: chỉ được xem số liệu thống kê tổng hợp (tổng số giao dịch, tổng ví, số lượng người dùng) và quản lý hệ thống (danh mục mặc định, phản hồi). Không có quyền xem hay truy vấn nội dung giao dịch riêng tư của bất kỳ người dùng nào.

---

## 3. Cơ chế AI Input an toàn: Bắt buộc tạo Bản Nháp (Drafts)
- **Quyết định**: AI (dù là nhập văn bản tự nhiên, giọng nói hay quét hóa đơn) **không bao giờ được phép tự ý ghi thẳng vào cơ sở dữ liệu giao dịch chính thức** hoặc sửa/xóa dữ liệu.
- **Quy trình hoạt động**:
  1. Người dùng nhập câu nói, giọng nói hoặc tải ảnh hóa đơn.
  2. AI Engine (Gemini API hoặc Rule-based Vietnamese Financial Parser) phân tích và bóc tách thành đối tượng nháp (`amount`, `type`, `categoryId`, `walletId`, `date`, `description`, `items`).
  3. Dữ liệu được lưu vào bảng `AiTransactionDraft` với trạng thái `PENDING`.
  4. Giao diện mở Modal/Drawer xác nhận cho phép người dùng xem lại, sửa đổi bất kỳ trường nào bị hiểu nhầm.
  5. Khi người dùng bấm **"Xác nhận ghi sổ"**, một transaction chính thức mới được tạo và cập nhật số dư ví tương ứng. Nếu bấm **"Hủy bỏ"**, bản nháp chuyển sang `REJECTED`.

---

## 4. Kiến trúc AI Đa Tầng (Hybrid AI Strategy)
- **Quyết định**: Cung cấp kiến trúc AI linh hoạt hỗ trợ 2 chế độ:
  - **Chế độ Nâng cao (Gemini AI Vision & LLM)**: Nếu có `GEMINI_API_KEY`, hệ thống gọi Gemini API để phân tích hình ảnh hóa đơn phức tạp, câu nói ẩn ý và trả lời chatbot tài chính thông minh.
  - **Chế độ Cục bộ Độc lập (Built-in Rule-based Vietnamese Financial NLP)**: Hoạt động ngay lập tức 100% offline/không cần API key bên ngoài. Tự động nhận diện các mẫu câu phổ biến của người Việt (ví dụ: "chi 50k ăn trưa momo", "nhận lương 20tr vcb", "đổ xăng 70 nghìn tiền mặt", các mẫu hóa đơn tiền tệ).
  - **Web Speech API**: Nhận diện giọng nói trực tiếp trên trình duyệt bằng Web Speech API chuẩn HTML5 (tiếng Việt `vi-VN`), không tốn chi phí và độ trễ cực thấp.

---

## 5. UI Dark Futuristic Design System
- **Quyết định**:
  - Tông màu: Dark Midnight Canvas (`#050811`), Deep Slate (`#0a0f1d`), Card Glass (`#0f172a` với opacity và `backdrop-blur`).
  - Điểm nhấn neon: Cyan (`#06b6d4`), Purple/Violet (`#8b5cf6`), Thu nhập xanh ngọc (`#10b981`), Chi tiêu đỏ hồng neon (`#f43f5e`), Cảnh báo vàng hổ phách (`#f59e0b`).
  - Thẻ ví bóng bẩy: Thiết kế dạng thẻ ngân hàng metallic sang trọng với logo mạng lưới (MoMo, Vietcombank, Cash, Techcombank...).
  - Đảm bảo độ tương phản cao, dễ đọc số liệu tài chính cả ban ngày lẫn ban đêm.

---

## 6. Xác thực & Quản lý Phiên (NextAuth v5 / Auth.js)
- **Quyết định**: Sử dụng NextAuth v5 cấu hình kết hợp Credentials Provider (mật khẩu mã hóa Bcrypt) và Google OAuth.
- **Session Strategy**: JWT Session không trạng thái (stateless) với `trustHost: true` để đảm bảo tương thích hoàn hảo trong môi trường container, reverse proxy và production deployment.
- **Role-Based Access Control (RBAC)**: Phân quyền `USER` và `ADMIN` gắn kèm trong JWT token và session object, bảo vệ route `/admin` bằng middleware kiểm tra quyền hạn nghiêm ngặt.

---

## 7. Cơ sở Dữ liệu & Tính toàn vẹn Dữ liệu Tài chính
- **Quyết định**: Sử dụng PostgreSQL kết hợp Prisma ORM với 14 bảng quan hệ chặt chẽ.
- **ACID Transaction**: Mọi thao tác ghi nhận giao dịch, chuyển tiền liên ví, xác nhận bản nháp AI và trả nợ đều được bọc trong `prisma.$transaction` nhằm đảm bảo số dư ví và nhật ký giao dịch luôn đồng nhất tuyệt đối, ngăn ngừa race condition.
- **BigInt JSON Serialization**: Cung cấp hàm `serializeBigInt` đệ quy chuyển đổi an toàn các trường BigInt sang number/string trước khi trả về client.

---

## 8. Nâng cấp Hệ thống AI: SDK Chính thức @google/genai & Server-Enforced Function Calling
- **Quyết định**: Chuyển đổi toàn bộ từ raw fetch và hard-coded model sang SDK chính thức `@google/genai` với biến môi trường `GEMINI_MODEL="gemini-3.5-flash-lite"`.
- **Function Calling Vòng lặp 4 lượt**: Triển khai 9 công cụ Read-Only tài chính (`get_financial_overview`, `get_transactions`, `get_spending_by_category`, `get_budget_status`, `get_savings_goals`, `get_debt_status`, `get_wallet_balances`, `get_recurring_transactions`, `search_app_help`).
- **Server-Side userId Enforcement**: Tuyệt đối không cho phép mô hình AI hoặc client truyền tham số `userId`. Toàn bộ quyền truy cập dữ liệu được khóa chặt bằng `session.user.id` giải mã tại server.
- **Loại bỏ Hoàn toàn Fallback Giả**: Xóa bỏ vĩnh viễn đoạn code sinh hóa đơn mẫu Highlands Coffee giả. Khi không bóc tách được số tiền, hệ thống thông báo lỗi minh bạch để người dùng biết và điều chỉnh.
- **Lưu trữ Lịch sử Hội thoại Phân vùng**: Mô hình `ChatConversation` và `ChatMessage` trong database gắn chặt với `userId`. Người dùng khác tuyệt đối không thể truy cập hoặc xóa hội thoại của nhau.

---

## 9. Hoàn thiện Giao thức AI Chat & An toàn Dữ liệu (AI Protocol Hardening & Hygiene)
- **Gemini Model Configurable & Health-Check**: Giữ `GEMINI_MODEL` hoàn toàn cấu hình qua `.env`. Bổ sung endpoint `/api/ai/health` và hàm `checkGeminiHealth()` kiểm tra kết nối thực tế có điều kiện khi có `GEMINI_API_KEY`. Trả lỗi cấu hình thân thiện nếu model không khả dụng, tuyệt đối không fallback sang model không rõ.
- **Loại bỏ Trùng lặp Tin nhắn (Deduplication)**: Trong `/api/ai/chat`, lấy 12 tin nhắn gần nhất TRƯỚC KHI lưu tin nhắn mới vào database, sau đó chỉ truyền câu hỏi mới qua tham số `userMessage`, đảm bảo Gemini nhận đúng câu hỏi một lần duy nhất.
- **Trật tự Lịch sử Hội thoại Chuẩn**: Lấy 12 tin nhắn gần nhất theo `createdAt: "desc"`, sau đó `.reverse()` thành thứ tự thời gian tăng dần (`asc`), đảm bảo AI nắm bắt ngữ cảnh các tin nhắn gần nhất thay vì 12 tin nhắn đầu của hội thoại.
- **Function Calling Protocol & Safe Logging**: Khi Gemini trả về function call có `id`, bắt buộc truyền `id` vào `functionResponse`. Giữ tối đa 4 vòng gọi tool. Tuyệt đối không log nội dung giao dịch, tin nhắn, args chi tiết hay dữ liệu tài chính nhạy cảm; chỉ log metadata an toàn (tên tool, request id, thời gian durationMs và trạng thái).
- **Timeout Cleanup & Lỗi Thân thiện**: Sử dụng `clearTimeout` trong block `finally` ngay khi request hoàn tất. Không trả raw provider error cho client mà log an toàn server-side và trả thông báo tiếng Việt thân thiện.
- **Code Hygiene**: Dọn sạch 100% unused imports/variables, đạt 0 warning trên toàn bộ dự án với `npm run lint` và 0 lỗi với `npx tsc --noEmit`.
