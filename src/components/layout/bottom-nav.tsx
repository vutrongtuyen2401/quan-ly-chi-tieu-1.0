"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  Sparkles,
  PiggyBank,
  BarChart3,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/components/ui/button";

const bottomNavItems = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  { name: "Giao dịch", href: "/transactions", icon: ReceiptText },
  { name: "AI", href: "/ai-entry", icon: Sparkles, highlight: true },
  { name: "Ngân sách", href: "/budgets", icon: PiggyBank },
  { name: "Báo cáo", href: "/reports", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#080808]/95 border-t border-[rgba(245,200,66,0.12)] backdrop-blur-xl flex items-center">
      <div className="flex items-center justify-around w-full px-2">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const isHighlight = item.highlight;

          if (isHighlight) {
            return (
              <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center -mt-5">
                <div className={cn(
                  "relative h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-br from-[#f5c842] to-[#92692a] shadow-yellow-500/40 animate-gold-pulse"
                    : "bg-gradient-to-br from-[#f5c842] to-[#92692a] shadow-yellow-500/25"
                )}>
                  <item.icon className="h-5 w-5 text-[#080808]" />
                </div>
                <span className="text-[9px] font-bold text-[#f5c842] mt-1">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-[rgba(245,200,66,0.08)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <item.icon
                className={cn(
                  "relative z-10 transition-all duration-200",
                  isActive
                    ? "bottom-nav-active h-5 w-5"
                    : "h-5 w-5 text-[#4a4a4a]"
                )}
              />
              <span
                className={cn(
                  "relative z-10 text-[9px] font-semibold transition-colors duration-200",
                  isActive ? "text-[#f5c842]" : "text-[#4a4a4a]"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
