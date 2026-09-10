"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatVND } from "@/lib/formatters";
import { motion, useReducedMotion } from "motion/react";

export default function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Form states
  const [categoryId, setCategoryId] = useState("");
  const [limitAmount, setLimitAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadBudgets = useCallback(async () => {
    try {
      const res = await fetch(`/api/budgets?month=${month}&year=${year}`);
      const data = await res.json();
      setBudgets(data.budgets || []);
    } catch (e) {
      console.error(e);
    }
  }, [month, year]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitAmount <= 0) {
      setError("Hạn mức ngân sách phải lớn hơn 0");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryId || null,
          month,
          year,
          limitAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể lưu ngân sách");
      } else {
        setIsModalOpen(false);
        setLimitAmount(0);
        setCategoryId("");
        loadBudgets();
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBudget = budgets.find((b) => !b.categoryId);
  const categoryBudgets = budgets.filter((b) => b.categoryId);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Quản Lý Ngân Sách</h2>
          <p className="text-xs text-slate-400 mt-1">
            Đặt hạn mức chi tiêu tổng tháng và cho từng danh mục để nhận cảnh báo thông minh.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month/Year Picker */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-white px-2 py-1 outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m} className="bg-slate-900">
                  Tháng {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-white px-2 py-1 outline-none cursor-pointer"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-slate-900">
                  Năm {y}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={() => setIsModalOpen(true)} variant="cyan">
            <Plus className="h-4 w-4" />
            <span>Thiết lập ngân sách</span>
          </Button>
        </div>
      </div>

      {/* Overall Monthly Budget Card with ProgressRing */}
      {totalBudget ? (
        <SpotlightCard
          spotlightColor={
            totalBudget.isExceeded
              ? "rgba(244, 63, 94, 0.15)"
              : totalBudget.isWarning
              ? "rgba(245, 158, 11, 0.15)"
              : "rgba(6, 182, 212, 0.15)"
          }
          className={`p-6 border ${
            totalBudget.isExceeded
              ? "border-rose-500/40 shadow-rose-500/10"
              : totalBudget.isWarning
              ? "border-amber-500/40 shadow-amber-500/10"
              : "border-cyan-500/30"
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ngân sách tổng tháng {month}/{year}
                </span>
                {totalBudget.isExceeded ? (
                  <Badge variant="rose">Vượt hạn mức ({totalBudget.percentage}%)</Badge>
                ) : totalBudget.isWarning ? (
                  <Badge variant="amber">Cảnh báo chạm 80% ({totalBudget.percentage}%)</Badge>
                ) : (
                  <Badge variant="emerald">An toàn ({totalBudget.percentage}%)</Badge>
                )}
              </div>
              <div className="text-3xl font-black text-white num-tabular">
                <NumberTicker value={totalBudget.spent} isCurrency />{" "}
                <span className="text-slate-400 text-lg font-normal">
                  / {formatVND(totalBudget.limitAmount)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Số tiền còn lại có thể chi:{" "}
                <strong className="text-cyan-400">
                  {formatVND(Math.max(0, Number(totalBudget.limitAmount) - totalBudget.spent))}
                </strong>
              </p>
            </div>

            {/* Circular Progress Ring */}
            <div className="flex items-center gap-4">
              <ProgressRing
                percentage={totalBudget.percentage}
                size={90}
                strokeWidth={8}
              />
            </div>
          </div>
        </SpotlightCard>
      ) : (
        <Card className="glass-card text-center py-8">
          <p className="text-xs text-slate-400">
            Chưa thiết lập ngân sách tổng cho tháng {month}/{year}. Bấm &quot;Thiết lập ngân sách&quot; để cài đặt!
          </p>
        </Card>
      )}

      {/* Per-category Budgets Grid with Animated Rings & Soft Pulse Warning */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white tracking-wide">
          Ngân sách theo Danh mục ({categoryBudgets.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryBudgets.map((b) => {
            const isExceeded = b.isExceeded;
            const isWarning = b.isWarning;

            return (
              <SpotlightCard
                key={b.id}
                spotlightColor={
                  isExceeded
                    ? "rgba(244, 63, 94, 0.15)"
                    : isWarning
                    ? "rgba(245, 158, 11, 0.15)"
                    : "rgba(6, 182, 212, 0.12)"
                }
                className={`p-5 transition-all ${
                  isExceeded
                    ? "border-rose-500/40"
                    : isWarning
                    ? "border-amber-500/40"
                    : "border-slate-800 hover:border-cyan-500/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-2">
                    <h4 className="text-base font-bold text-white">{b.category?.name}</h4>
                    <span className="text-xs text-slate-400">Hạn mức tháng</span>
                  </div>
                  {isExceeded ? (
                    <motion.div
                      animate={shouldReduceMotion ? undefined : { scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                      <Badge variant="rose">Vượt mức</Badge>
                    </motion.div>
                  ) : isWarning ? (
                    <motion.div
                      animate={shouldReduceMotion ? undefined : { scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                      <Badge variant="amber">&gt;80%</Badge>
                    </motion.div>
                  ) : (
                    <Badge variant="cyan">{b.percentage}%</Badge>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400">
                      Đã chi:{" "}
                      <strong className="text-white num-tabular font-bold">
                        {formatVND(b.spent)}
                      </strong>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Hạn mức: {formatVND(b.limitAmount)}
                    </div>
                  </div>

                  {/* Progress Ring */}
                  <ProgressRing percentage={b.percentage} size={50} strokeWidth={5} />
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </div>

      {/* Modal Setup Budget */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thiết Lập Ngân Sách"
        description={`Cài đặt hạn mức chi tiêu cho tháng ${month}/${year}.`}
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <div>
            <Select
              label="Áp dụng cho"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">-- Tổng chi tiêu toàn bộ tháng --</option>
              {categories
                .filter((c) => c.type === "EXPENSE")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Danh mục: {c.name}
                  </option>
                ))}
            </Select>
          </div>

          <div>
            <Input
              label="Hạn mức ngân sách (VNĐ)"
              type="number"
              value={limitAmount || ""}
              onChange={(e) => setLimitAmount(Number(e.target.value) || 0)}
              hint={limitAmount > 0 ? `Định dạng: ${formatVND(limitAmount)}` : undefined}
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="cyan" isLoading={isSubmitting}>
              Lưu ngân sách
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
