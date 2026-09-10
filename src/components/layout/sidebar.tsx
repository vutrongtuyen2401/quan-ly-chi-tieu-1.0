"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ReceiptText,
  WalletCards,
  Sparkles,
  PiggyBank,
  Target,
  HandCoins,
  Repeat,
  BarChart3,
  BotMessageSquare,
  ShieldAlert,
  LogOut,
  User,
  ChevronRight,
  Coins,
} from "lucide-react";
import { cn } from "@/components/ui/button";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

const navItems = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  { name: "Sổ giao dịch", href: "/transactions", icon: ReceiptText },
  { name: "Ví & Tài khoản", href: "/wallets", icon: WalletCards },
  {
    name: "Nhập liệu AI",
    href: "/ai-entry",
    icon: Sparkles,
    badge: "AI",
    glow: true,
  },
  { name: "Ngân sách", href: "/budgets", icon: PiggyBank },
  { name: "Mục tiêu tiết kiệm", href: "/savings", icon: Target },
  { name: "Sổ nợ", href: "/debts", icon: HandCoins },
  { name: "Giao dịch định kỳ", href: "/recurring", icon: Repeat },
  { name: "Báo cáo & Phân tích", href: "/reports", icon: BarChart3 },
  { name: "Trợ lý AI", href: "/assistant", icon: BotMessageSquare, badge: "Chat" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();

  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="p-5 border-b border-[rgba(245,200,66,0.12)] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group" onClick={closeMobile}>
          {/* Gold coin icon */}
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#f5c842] to-[#92692a] flex items-center justify-center shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40 transition-all duration-300 shrink-0">
            <Coins className="h-5 w-5 text-[#080808]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wide text-gradient-gold leading-tight">
                QuanLyChiTieu
              </span>
            </div>
            <p className="text-[11px] text-[#6b6b6b] font-medium leading-tight">
              Quản lý thông minh mọi đồng tiền
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-[#4a4030] uppercase mb-1">
          Quản lý tài chính
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className={cn(
                "relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 group"
              )}
            >
              {/* Animated active indicator */}
              {isActive && (
                <motion.div
                  layoutId={shouldReduceMotion ? undefined : "sidebar-active-indicator"}
                  className="absolute inset-0 rounded-xl sidebar-active-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex items-center gap-3">
                <item.icon
                  className={cn(
                    "h-4.5 w-4.5 transition-colors shrink-0",
                    isActive
                      ? "text-[#f5c842]"
                      : "text-[#4a4a4a] group-hover:text-[#9a8050]"
                  )}
                  style={{ width: "1.1rem", height: "1.1rem" }}
                />
                <span
                  className={cn(
                    "text-[13px] leading-tight",
                    isActive
                      ? "text-[#f5c842] font-semibold"
                      : "text-[#7a7a7a] group-hover:text-[#c0a035]"
                  )}
                >
                  {item.name}
                </span>
              </div>

              {item.badge && (
                <span
                  className={cn(
                    "relative z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                    item.glow
                      ? "bg-gradient-to-r from-[#f5c842] to-[#92692a] text-[#080808] shadow-sm shadow-yellow-500/30"
                      : "bg-[#1a1a1a] text-[#9a8050] border border-[rgba(245,200,66,0.20)]"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Admin */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-[rgba(245,200,66,0.08)]">
            <div className="px-3 py-1 text-[10px] font-bold tracking-widest text-[#4a4030] uppercase flex items-center gap-1.5 mb-1">
              <ShieldAlert className="h-3 w-3" />
              <span>Quản trị</span>
            </div>
            <Link
              href="/admin"
              onClick={closeMobile}
              className="relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 group"
            >
              {pathname === "/admin" && (
                <motion.div
                  layoutId={shouldReduceMotion ? undefined : "sidebar-active-indicator"}
                  className="absolute inset-0 rounded-xl sidebar-active-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <ShieldAlert className="h-4 w-4 text-[#9a8050] group-hover:text-[#f5c842]" />
                <span className={pathname === "/admin" ? "text-[#f5c842] font-semibold text-[13px]" : "text-[#7a7a7a] group-hover:text-[#c0a035] text-[13px]"}>
                  Admin Portal
                </span>
              </div>
              <ChevronRight className="relative z-10 h-3.5 w-3.5 text-[#4a4a4a] group-hover:text-[#9a8050]" />
            </Link>
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-[rgba(245,200,66,0.10)]">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f0f0f] border border-[rgba(245,200,66,0.08)] hover:border-[rgba(245,200,66,0.18)] transition-all">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[rgba(245,200,66,0.20)] flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-[#9a8050]" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-[#e0e0e0] truncate">
                {session?.user?.name || "Người dùng"}
              </p>
              <p className="text-[11px] text-[#5a5a5a] truncate">
                {session?.user?.email || "Tài khoản cá nhân"}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Đăng xuất"
            className="p-1.5 rounded-lg text-[#5a5a5a] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex fixed top-0 bottom-0 left-0 z-30 w-64 bg-[#080808]/97 border-r border-[rgba(245,200,66,0.08)] backdrop-blur-2xl flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Animated Drawer with AnimatePresence */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobile}
              className="lg:hidden fixed inset-0 z-30 bg-black/80 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="lg:hidden fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#080808]/97 border-r border-[rgba(245,200,66,0.08)] backdrop-blur-2xl flex flex-col shadow-2xl shadow-black/50"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
