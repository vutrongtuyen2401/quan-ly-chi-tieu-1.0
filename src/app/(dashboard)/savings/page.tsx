"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Target,
  Plus,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { formatVND, formatDateVI } from "@/lib/formatters";
import confetti from "canvas-confetti";
import { motion, useReducedMotion } from "motion/react";

export default function SavingsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const shouldReduceMotion = useReducedMotion();

  // Form add goal
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [currentAmount, setCurrentAmount] = useState<number>(0);
  const [deadline, setDeadline] = useState("");
  const [walletId, setWalletId] = useState("");
  const [color] = useState("#10b981");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form deposit/withdraw
  const [depositType, setDepositType] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositWalletId, setDepositWalletId] = useState("");
  const [depositError, setDepositError] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [gRes, wRes] = await Promise.all([
        fetch("/api/savings").then((r) => r.json()),
        fetch("/api/wallets").then((r) => r.json()),
      ]);
      setGoals(gRes.goals || []);
      setWallets(wRes.wallets || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetAmount <= 0) {
      setError("Mục tiêu tiền phải lớn hơn 0");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetAmount,
          currentAmount,
          deadline: deadline || null,
          walletId: walletId || null,
          color,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tạo mục tiêu");
      } else {
        setName("");
        setTargetAmount(0);
        setCurrentAmount(0);
        setDeadline("");
        setIsAddModalOpen(false);
        loadData();
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDepositModal = (goal: any, type: "DEPOSIT" | "WITHDRAW") => {
    setSelectedGoal(goal);
    setDepositType(type);
    setDepositAmount(0);
    setDepositWalletId(wallets[0]?.id || "");
    setDepositError("");
    setIsDepositModalOpen(true);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || depositAmount <= 0) {
      setDepositError("Số tiền phải lớn hơn 0");
      return;
    }

    setIsDepositing(true);
    setDepositError("");

    try {
      const res = await fetch(`/api/savings/${selectedGoal.id}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: depositType,
          amount: depositAmount,
          walletId: depositWalletId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDepositError(data.error || "Không thể thực hiện giao dịch tích lũy");
      } else {
        // Trigger celebratory confetti if goal completed or milestone reached
        const newTotal =
          depositType === "DEPOSIT"
            ? selectedGoal.currentAmount + depositAmount
            : selectedGoal.currentAmount - depositAmount;

        if (newTotal >= selectedGoal.targetAmount && !shouldReduceMotion) {
          confetti({
            particleCount: 45,
            spread: 70,
            origin: { y: 0.7 },
            colors: ["#10b981", "#06b6d4", "#8b5cf6"],
          });
        }

        setIsDepositModalOpen(false);
        loadData();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("transaction-updated"));
        }
      }
    } catch {
      setDepositError("Lỗi kết nối máy chủ");
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Mục Tiêu Tiết Kiệm</h2>
          <p className="text-xs text-slate-400 mt-1">
            Đặt kế hoạch tích lũy tài sản, quỹ khẩn cấp, du lịch và theo dõi các cột mốc hoàn thành.
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} variant="cyan">
          <Plus className="h-4 w-4" />
          <span>Thêm mục tiêu</span>
        </Button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const isDone = goal.percentage >= 100;

          return (
            <SpotlightCard
              key={goal.id}
              spotlightColor={isDone ? "rgba(16, 185, 129, 0.18)" : "rgba(6, 182, 212, 0.12)"}
              className={`p-6 relative overflow-hidden flex flex-col justify-between border ${
                isDone ? "border-emerald-500/40" : "border-slate-800 hover:border-emerald-500/40"
              }`}
            >
              {isDone && (
                <BorderBeam size={200} duration={8} colorFrom="#10b981" colorTo="#06b6d4" />
              )}

              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                      style={{ backgroundColor: goal.color || "#10b981" }}
                    >
                      <Target className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{goal.name}</h4>
                      {goal.deadline && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>Hạn: {formatDateVI(goal.deadline)}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <Badge variant={isDone ? "emerald" : "cyan"} size="sm">
                    {isDone ? "Hoàn thành 🎉" : `${goal.percentage}%`}
                  </Badge>
                </div>

                {/* Progress Bar with Milestone Checkpoints Timeline */}
                <div className="mt-6 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>
                      Hiện có:{" "}
                      <strong className="text-white num-tabular">
                        <NumberTicker value={goal.currentAmount} isCurrency />
                      </strong>
                    </span>
                    <span>Mục tiêu: {formatVND(goal.targetAmount)}</span>
                  </div>

                  {/* Visual timeline milestones: 25%, 50%, 75%, 100% */}
                  <div className="relative pt-1">
                    <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden relative">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, goal.percentage)}%` }}
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
                        }
                      />
                    </div>

                    {/* Milestone Dots */}
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 px-0.5">
                      <span className={goal.percentage >= 25 ? "text-emerald-400 font-bold" : ""}>
                        25%
                      </span>
                      <span className={goal.percentage >= 50 ? "text-emerald-400 font-bold" : ""}>
                        50%
                      </span>
                      <span className={goal.percentage >= 75 ? "text-emerald-400 font-bold" : ""}>
                        75%
                      </span>
                      <span className={goal.percentage >= 100 ? "text-emerald-400 font-bold" : ""}>
                        100%
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2">
                    {isDone ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 inline" />
                        Đã đạt 100% kế hoạch tích lũy đề ra!
                      </span>
                    ) : (
                      `Còn thiếu: ${formatVND(goal.remaining)}`
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Nạp / Rút */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openDepositModal(goal, "WITHDRAW")}
                  className="text-xs"
                >
                  <ArrowDownCircle className="h-3.5 w-3.5" />
                  <span>Rút tiền</span>
                </Button>
                <Button
                  type="button"
                  variant="cyan"
                  size="sm"
                  onClick={() => openDepositModal(goal, "DEPOSIT")}
                  className="text-xs"
                >
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  <span>Nạp thêm</span>
                </Button>
              </div>
            </SpotlightCard>
          );
        })}
      </div>

      {/* Modal Add Goal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Mục Tiêu Tiết Kiệm Mới"
        description="Đặt tên, số tiền cần đạt và kỳ hạn hoàn thành."
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <div>
            <Input
              label="Tên mục tiêu"
              placeholder="Ví dụ: Quỹ khẩn cấp, Mua xe máy, Du lịch Đà Nẵng..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Số tiền cần đạt (VNĐ)"
                type="number"
                placeholder="10000000"
                value={targetAmount || ""}
                onChange={(e) => setTargetAmount(Number(e.target.value) || 0)}
                hint={targetAmount > 0 ? `Định dạng: ${formatVND(targetAmount)}` : undefined}
                required
              />
            </div>
            <div>
              <Input
                label="Đã có sẵn (VNĐ)"
                type="number"
                placeholder="0"
                value={currentAmount || ""}
                onChange={(e) => setCurrentAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Hạn hoàn thành (Tùy chọn)"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div>
              <Select
                label="Gắn với ví tích lũy"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
              >
                <option value="">-- Không bắt buộc --</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatVND(w.balance)})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="cyan" isLoading={isSubmitting}>
              Tạo mục tiêu
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Deposit / Withdraw */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title={depositType === "DEPOSIT" ? "Nạp Tiền Vào Mục Tiêu" : "Rút Tiền Khỏi Mục Tiêu"}
        description={`Mục tiêu: ${selectedGoal?.name || ""}`}
      >
        <form onSubmit={handleDepositSubmit} className="space-y-4">
          {depositError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              ⚠️ {depositError}
            </div>
          )}

          <div>
            <Input
              label={`Số tiền ${depositType === "DEPOSIT" ? "nạp thêm" : "cần rút"} (VNĐ)`}
              type="number"
              value={depositAmount || ""}
              onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
              hint={depositAmount > 0 ? `Định dạng: ${formatVND(depositAmount)}` : undefined}
              required
            />
          </div>

          <div>
            <Select
              label={depositType === "DEPOSIT" ? "Trích từ ví" : "Chuyển về ví"}
              value={depositWalletId}
              onChange={(e) => setDepositWalletId(e.target.value)}
              required
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Số dư: {formatVND(w.balance)})
                </option>
              ))}
            </Select>
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsDepositModalOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant={depositType === "DEPOSIT" ? "cyan" : "danger"}
              isLoading={isDepositing}
            >
              {depositType === "DEPOSIT" ? "Xác nhận nạp" : "Xác nhận rút"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
