# Báo Cáo Nâng Cấp Giao Diện – Black & Gold VIP Banking Redesign

- **Thời điểm tạo báo cáo**: 2026-09-09T17:05:00+07:00
- **Dự án**: QuanLyChiTieu (đổi brand từ ChiTiêu AI)
- **Trạng thái**: ✅ HOÀN THÀNH – Build PASS, Server HTTP 200

---

## 1. Mục Tiêu Thiết Kế (Thu thập từ User)

| Hạng mục | Lựa chọn của User |
|---|---|
| **Bảng màu** | Đen than + Gold/Bạc như app ngân hàng VIP |
| **Font** | Space Grotesk + DM Mono (futuristic, tech vibes) |
| **Animation** | Nhiều, mượt mà, premium (3D tilt khi hover) |
| **Navigation mobile** | Bottom Navigation Bar |
| **Dashboard** | KPI cards 1 hàng (số dư, thu nhập, chi tiêu, tiết kiệm) |
| **KPI Style** | Icon + số tiền + % thay đổi so tháng trước |
| **AI** | Rất quan trọng – FAB vàng nổi, expand menu 4 chức năng |
| **Brand** | Icon Coins + tên "QuanLyChiTieu" |
| **Ngôn ngữ** | Tiếng Việt thuần túy |

---

## 2. Design System Mới – Black & Gold VIP

### Palette màu
```
Background:     #080808  (đen than gần như tuyệt đối)
Surface card:   #0f0f0f  (card dark)
Gold primary:   #f5c842  (vàng chính)
Gold dim:       #92692a  (vàng tối, gradient end)
Gold label:     #c0a035  (text vàng phụ)
Gold border:    rgba(245,200,66, 0.10-0.30)
Silver:         #c0c0c0  (bạc accent)
White text:     #f2f2f2  (text chính)
Muted text:     #6b6b6b  (text phụ)
Income:         #22c55e  (xanh lá)
Expense:        #ef4444  (đỏ)
```

### Typography
- **Heading/Body**: `Space Grotesk` (300–800 weight) – loaded via Google Fonts link tag
- **Numbers**: `DM Mono` (monospace, tabular-nums) via class `num-tabular`
- Font loaded với `display=swap` cho LCP optimization
- Fallback: `system-ui, -apple-system, BlinkMacSystemFont, sans-serif`

---

## 3. Danh Sách File Đã Thay Đổi

| File | Thay đổi chính |
|---|---|
| `src/app/globals.css` | Toàn bộ design tokens → Black & Gold. Thêm: `shimmer-gold-text`, `gold-pulse`, `metal-grid`, `text-gradient-gold`, `sidebar-active-pill`, `bottom-nav-active`, scrollbar vàng |
| `src/app/layout.tsx` | Đổi title → "QuanLyChiTieu". Google Fonts (Space Grotesk + DM Mono) qua `<link>` tag (Turbopack compatible). Body font + bg `#080808` |
| `src/components/layout/sidebar.tsx` | Brand: Coins icon + "QuanLyChiTieu". Active pill: gold left-border + gold bg. NavLinks: gold text/icon khi active. Sidebar width: 64 (256px). User footer: gold-tinted |
| `src/components/layout/bottom-nav.tsx` | **[NEW]** Mobile bottom navigation: 5 tabs, AI tab elevated gold FAB button, active tab gold, spring `layoutId` animation |
| `src/app/(dashboard)/layout.tsx` | Import BottomNav. `pl-64` (adjust cho sidebar mới). AI FAB: gold gradient Coins button, expand menu 4 actions, AnimatePresence overlay, `pb-20` mobile safe area |
| `src/app/(dashboard)/page.tsx` | Loading spinner: gold. AI draft banner: gold BorderBeam. KPI Card 1 (Tổng tài sản): gold icon, gold number, enableTilt |
| `src/app/(auth)/login/page.tsx` | Brand: Coins + gold title. Background: `#080808` + `bg-metal-grid`. Gold orbs. Form: dark glass + gold border. Demo buttons: gold outline |
| `src/app/(auth)/register/page.tsx` | Đồng nhất với login: Coins icon, gold brand, gold form |
| `src/components/ui/button.tsx` | `primary` → gold gradient. `shimmer` → gold shimmer. `secondary/outline/ghost` → dark với gold accent |
| `src/components/ui/spotlight-card.tsx` | Default spotlight: gold rgba. Border: gold-tinted. 3D tilt: ±6° (tăng từ ±4°) |
| `src/components/layout/header.tsx` | Gold greeting gradient. Gold date text. AI button: gold outline. Notification ping: gold. Dropdown: dark bg + gold borders |

---

## 4. Animations & Interactions

| Effect | Trigger | Implementation |
|---|---|---|
| **3D Tilt** | Mouse hover trên SpotlightCard (desktop) | `rotateX/Y` up to ±6°, `transformPerspective: 1000` |
| **Gold Pulse** | AI FAB button khi idle | `@keyframes gold-pulse` CSS (box-shadow vàng) |
| **Gold Shimmer** | Nút shimmer + logo text | `shimmer-gold-text`, `animate-shimmer` overlay |
| **Border Beam** | AI draft banner | `BorderBeam` component với gold colors |
| **Gold Spotlight** | Mouse move trên cards | Radial gradient `rgba(245,200,66,0.10)` |
| **Sidebar Active Pill** | Nav item active | `layoutId="sidebar-active-indicator"` spring |
| **Bottom Nav Active** | Tab active | `layoutId="bottom-nav-active"` spring + gold CSS |
| **FAB Expand** | Click AI FAB button | `AnimatePresence` stagger với `rotate: 45` |
| **Float Slow** | Auth page background orbs | `animate-float-slow` + `float-slow-reverse` |

---

## 5. Cấu Hình Kỹ Thuật

- **Font loading**: Google Fonts link tag (`preconnect` + `stylesheet`) thay vì `next/font/google` (không tương thích Turbopack)
- **Sidebar width**: 64 (256px) thay vì 72 (288px) → compact hơn
- **Mobile safe area**: `pb-20 lg:pb-8` trên main content để không bị che bởi bottom nav

---

## 6. Kết Quả Kiểm Thử

- **Next.js Build**: `npm run build` → **✅ PASS (exit 0)**
- **Routes generated**: 34 routes (○ Static + ƒ Dynamic)
- **Server HTTP**: `GET /login` → **HTTP 200 OK**
- **Turbopack**: Không còn lỗi module not found
- **Lỗi còn lại**: 0

---

## 7. Tóm Tắt Trải Nghiệm Người Dùng

**Trước**: Dark Navy + Cyan/Purple futuristic (ChiTiêu AI)  
**Sau**: Pure Black + Gold/Silver VIP Banking (QuanLyChiTieu)

Giao diện mới mang cảm giác **ngân hàng cao cấp**, sang trọng hơn với:
- Tông màu đen thanh lịch và vàng premium
- Typography futuristic (Space Grotesk + DM Mono)
- Bottom navigation thân thiện cho mobile
- AI FAB gold nổi bật, dễ tiếp cận
- 3D tilt cards, gold spotlight, border beam vàng
