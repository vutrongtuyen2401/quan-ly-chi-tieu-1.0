import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "QuanLyChiTieu – Quản Lý Tài Chính Thông Minh",
  description:
    "Ứng dụng quản lý tài chính cá nhân thông minh với AI cho Việt Nam: nhập liệu tự nhiên, quét hóa đơn, giọng nói, ngân sách, mục tiêu tiết kiệm, sổ nợ và trợ lý tài chính.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark h-full antialiased">
      <head>
        {/* Space Grotesk + DM Mono from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full bg-[#080808] text-[#f2f2f2] selection:bg-yellow-500/20 selection:text-yellow-200"
        style={{ fontFamily: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
