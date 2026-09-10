"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, Plus, Bell, Calendar, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

interface HeaderProps {
  onOpenAiEntry?: () => void;
  onOpenAddTransaction?: () => void;
}

interface NotificationItem {
  id: string;
  type: "warning" | "ai" | "calendar";
  title: string;
  desc: string;
  time: string;
}

const initialNotifications: NotificationItem[] = [
  {
    id: "1",
    type: "warning",
    title: "⚠️ Cảnh báo Ngân sách",
    desc: 'Danh mục "Ăn uống" đã chi 75% hạn mức tháng này.',
    time: "10 phút trước",
  },
  {
    id: "2",
    type: "ai",
    title: "🤖 Bản nháp AI chờ duyệt",
    desc: "Bạn có 1 giao dịch từ câu nói tự nhiên chưa xác nhận vào sổ.",
    time: "30 phút trước",
  },
  {
    id: "3",
    type: "calendar",
    title: "📅 Sổ nợ sắp đến hạn",
    desc: "Khoản cho Trần Minh Tuấn vay hẹn trả vào ngày 15 tháng này.",
    time: "Hôm nay",
  },
];

export function Header({ onOpenAiEntry, onOpenAddTransaction }: HeaderProps) {
  const { data: session } = useSession();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const notificationRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const todayStr = format(new Date(), "EEEE, 'ngày' dd/MM/yyyy", { locale: vi });

  // Close notifications on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="sticky top-0 z-20 w-full h-18 bg-[#080808]/90 backdrop-blur-2xl border-b border-[rgba(245,200,66,0.08)] px-4 lg:px-8 flex items-center justify-between">
      {/* Left side: Greeting & Date */}
      <div className="pl-12 lg:pl-0">
        <div className="flex items-center gap-2 text-xs font-medium text-[#9a8050] capitalize">
          <Calendar className="h-3.5 w-3.5" />
          <span>{todayStr}</span>
        </div>
        <h1 className="text-base lg:text-lg font-bold text-[#e0e0e0]">
          Xin chào,{" "}
          <span className="text-gradient-gold">
            {session?.user?.name || "Bạn"}
          </span>{" "}
          👋
        </h1>
      </div>

      {/* Right side: Quick Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Quick AI Input Button */}
        {onOpenAiEntry && (
          <Button
            onClick={onOpenAiEntry}
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Sparkles className="h-4 w-4" />
            <span>Nhập liệu AI</span>
          </Button>
        )}

        {/* Quick Add Manual Transaction with Shimmer variant */}
        {onOpenAddTransaction && (
          <Button
            onClick={onOpenAddTransaction}
            variant="shimmer"
            size="sm"
            className="shadow-lg shadow-purple-500/25"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Thêm giao dịch</span>
            <span className="sm:hidden">Thêm</span>
          </Button>
        )}

        {/* Notifications Popover Container */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl bg-[#0f0f0f] border border-[rgba(245,200,66,0.12)] text-[#7a7a7a] hover:text-[#c0a035] hover:border-[rgba(245,200,66,0.25)] transition-colors cursor-pointer"
            title="Thông báo hệ thống"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <>
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#f5c842] animate-ping" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#f5c842]" />
              </>
            )}
          </button>

          {/* AnimatePresence for Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="absolute right-0 mt-3 w-84 rounded-2xl bg-[#0a0a0a] border border-[rgba(245,200,66,0.15)] shadow-2xl shadow-yellow-500/5 p-4 z-50 backdrop-blur-2xl"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[rgba(245,200,66,0.08)]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#e0e0e0] uppercase tracking-wider">
                      Thông báo tài chính
                    </span>
                    {notifications.length > 0 && (
                      <span className="text-[10px] text-[#c0a035] font-bold bg-[rgba(245,200,66,0.10)] px-1.5 py-0.5 rounded-full border border-[rgba(245,200,66,0.20)]">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#9a8050] font-medium">Cập nhật</span>
                </div>

                <div className="mt-3 space-y-2 text-xs max-h-72 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-[#5a5a5a] text-xs">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
                      Không có thông báo mới nào
                    </div>
                  ) : (
                    <AnimatePresence>
                      {notifications.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                          className={`relative p-3 rounded-xl bg-[#0f0f0f] border transition-all ${
                            item.type === "warning"
                              ? "border-amber-500/25"
                              : item.type === "ai"
                              ? "border-[rgba(245,200,66,0.20)]"
                              : "border-[rgba(245,200,66,0.15)]"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div
                              className={`font-semibold text-xs ${
                                item.type === "warning"
                                  ? "text-amber-400"
                                  : item.type === "ai"
                                  ? "text-[#f5c842]"
                                  : "text-[#c0a035]"
                              }`}
                            >
                              {item.title}
                            </div>
                            <button
                              onClick={() => dismissNotification(item.id)}
                              className="text-[#4a4a4a] hover:text-[#9a8050] transition-colors p-0.5"
                              title="Bỏ qua"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-[#6b6b6b] leading-relaxed">
                            {item.desc}
                          </p>
                          <div className="mt-1.5 text-[10px] text-[#4a4a4a]">{item.time}</div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
