import type { Metadata } from "next";
import { Space_Grotesk, DM_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

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
    <html lang="vi" className={`dark h-full antialiased ${spaceGrotesk.variable} ${dmMono.variable}`}>
      <body
        className={`min-h-full bg-[#080808] text-[#f2f2f2] selection:bg-yellow-500/20 selection:text-yellow-200 ${spaceGrotesk.className}`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
