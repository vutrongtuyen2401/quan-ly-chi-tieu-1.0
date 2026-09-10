"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatVND, formatDateVI } from "@/lib/formatters";

export default function RecurringPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [walletId, setWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [isFixedAmount, setIsFixedAmount] = useState(true);
  const [startDate] = useState(new Date().toISOString().split("T")[0]);
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [rRes, wRes, cRes] = await Promise.all([
        fetch("/api/recurring").then((r) => r.json()),
        fetch("/api/wallets").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
      ]);
      setRules(rRes.rules || []);
      const wList = wRes.wallets || [];
      setWallets(wList);
      if (wList.length > 0) setWalletId(wList[0].id);
      setCategories(cRes.categories || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("Số tiền phải lớn hơn 0");
      return;
    }
    if (!walletId) {
      setError("Vui lòng chọn ví");
      return;
    }
    if (!description.trim()) {
      setError("Vui lòng nhập mô tả giao dịch định kỳ");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          categoryId: categoryId || null,
          amount,
          type,
          description: description.trim(),
          frequency,
          isFixedAmount,
          startDate: new Date(startDate).toISOString(),
          nextDueDate: new Date(nextDueDate).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tạo quy tắc định kỳ");
      } else {
        setDescription("");
        setAmount(0);
        setIsModalOpen(false);
        loadData();
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "DAILY":
        return "Hàng ngày";
      case "WEEKLY":
        return "Hàng tuần";
      case "MONTHLY":
        return "Hàng tháng";
      case "YEARLY":
        return "Hàng năm";
      default:
        return freq;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Giao Dịch Định Kỳ</h2>
          <p className="text-xs text-slate-400 mt-1">
            Tự động ghi sổ khoản cố định hoặc tạo bản nháp nhắc bạn xác nhận cho các hóa đơn biến động.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="cyan">
          <Plus className="h-4 w-4" />
          <span>Thêm định kỳ mới</span>
        </Button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-400 text-xs">
            Chưa có giao dịch định kỳ nào được cài đặt. Bấm &quot;Thêm định kỳ mới&quot; để tự động hóa!
          </div>
        ) : (
          rules.map((rule) => {
            const isExpense = rule.type === "EXPENSE";

            return (
              <Card
                key={rule.id}
                className="glass-card border border-slate-800 hover:border-cyan-500/40 transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.isFixedAmount ? "cyan" : "purple"} size="sm">
                          {rule.isFixedAmount ? "Cố định (Tự động)" : "Biến động (Tạo nháp)"}
                        </Badge>
                        <span className="text-xs text-slate-400 font-semibold">
                          {getFrequencyLabel(rule.frequency)}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-2">{rule.description}</h4>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-base font-black num-tabular ${
                          isExpense ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {isExpense ? "-" : "+"}
                        {formatVND(rule.amount)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-1 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Ví áp dụng:</span>
                      <strong className="text-white">{rule.wallet?.name}</strong>
                    </div>
                    {rule.category && (
                      <div className="flex justify-between">
                        <span>Danh mục:</span>
                        <strong className="text-slate-300">{rule.category?.name}</strong>
                      </div>
                    )}
                    <div className="flex justify-between pt-1">
                      <span>Lần chạy tới:</span>
                      <span className="text-cyan-400 font-bold">{formatDateVI(rule.nextDueDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Đang hoạt động</span>
                  </span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal Add Recurring Rule */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thiết Lập Giao Dịch Định Kỳ Mới"
        description="Lập lịch các khoản tiền nhà, lương, internet, netflix..."
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <div>
            <Input
              label="Mô tả giao dịch định kỳ"
              placeholder="Ví dụ: Tiền thuê nhà, Tiền điện nước, Lương hàng tháng..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Loại giao dịch"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="EXPENSE">Chi tiêu định kỳ</option>
                <option value="INCOME">Thu nhập định kỳ</option>
              </Select>
            </div>
            <div>
              <Input
                label="Số tiền ước tính (VNĐ)"
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                hint={amount > 0 ? `Định dạng: ${formatVND(amount)}` : undefined}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Ví áp dụng"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                required
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatVND(w.balance)})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Select
                label="Danh mục"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">-- Chọn danh mục --</option>
                {categories
                  .filter((c) => c.type === type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Tần suất lặp lại"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="DAILY">Hàng ngày (Daily)</option>
                <option value="WEEKLY">Hàng tuần (Weekly)</option>
                <option value="MONTHLY">Hàng tháng (Monthly)</option>
                <option value="YEARLY">Hàng năm (Yearly)</option>
              </Select>
            </div>
            <div>
              <Input
                label="Lần đến hạn đầu tiên"
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Hình thức ghi sổ:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input
                  type="radio"
                  name="rule_type"
                  checked={isFixedAmount}
                  onChange={() => setIsFixedAmount(true)}
                  className="text-cyan-500"
                />
                <span>Cố định (Tự động tạo giao dịch)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input
                  type="radio"
                  name="rule_type"
                  checked={!isFixedAmount}
                  onChange={() => setIsFixedAmount(false)}
                  className="text-purple-500"
                />
                <span>Biến động (Tạo nháp nhắc xác nhận)</span>
              </label>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="cyan" isLoading={isSubmitting}>
              Lưu quy tắc
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
