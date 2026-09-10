"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Phone,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatVND, formatDateVI } from "@/lib/formatters";

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"LEND" | "BORROW">("LEND");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);

  // Form add debt
  const [personName, setPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form repay
  const [repayAmount, setRepayAmount] = useState<number>(0);
  const [repayWalletId, setRepayWalletId] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [isRepaying, setIsRepaying] = useState(false);
  const [repayError, setRepayError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [dRes, wRes] = await Promise.all([
        fetch("/api/debts").then((r) => r.json()),
        fetch("/api/wallets").then((r) => r.json()),
      ]);
      setDebts(dRes.debts || []);
      setWallets(wRes.wallets || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setError("Vui lòng nhập tên người nợ / cho vay");
      return;
    }
    if (totalAmount <= 0) {
      setError("Số tiền phải lớn hơn 0");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          personName: personName.trim(),
          phone: phone.trim() || null,
          totalAmount,
          dueDate: dueDate || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tạo bản ghi nợ");
      } else {
        setPersonName("");
        setPhone("");
        setTotalAmount(0);
        setDueDate("");
        setNotes("");
        setIsAddModalOpen(false);
        loadData();
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRepayModal = (debt: any) => {
    setSelectedDebt(debt);
    setRepayAmount(debt.remaining || 0);
    setRepayWalletId(wallets[0]?.id || "");
    setRepayNote("");
    setRepayError("");
    setIsRepayModalOpen(true);
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    if (repayAmount <= 0) {
      setRepayError("Số tiền trả phải lớn hơn 0");
      return;
    }

    setIsRepaying(true);
    setRepayError("");

    try {
      const res = await fetch(`/api/debts/${selectedDebt.id}/repay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: repayAmount,
          walletId: repayWalletId || null,
          note: repayNote || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRepayError(data.error || "Lỗi ghi nhận trả nợ");
      } else {
        setIsRepayModalOpen(false);
        loadData();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("transaction-updated"));
        }
      }
    } catch {
      setRepayError("Lỗi kết nối máy chủ");
    } finally {
      setIsRepaying(false);
    }
  };

  const filteredDebts = debts.filter((d) => d.type === activeTab);

  const totalLend = debts
    .filter((d) => d.type === "LEND")
    .reduce((s, d) => s + Number(d.remaining || 0), 0);

  const totalBorrow = debts
    .filter((d) => d.type === "BORROW")
    .reduce((s, d) => s + Number(d.remaining || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Sổ Nợ & Cho Vay</h2>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi chi tiết các khoản cho vay và đi vay, hạn thanh toán và lịch sử trả dần.
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} variant="cyan">
          <Plus className="h-4 w-4" />
          <span>Thêm khoản nợ mới</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="glass-card border border-purple-500/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Tổng tiền đang cho vay (Cần thu hồi)
            </span>
            <ArrowUpRight className="h-5 w-5 text-purple-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white num-tabular mt-2">
            {formatVND(totalLend)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Từ {debts.filter((d) => d.type === "LEND" && d.computedStatus !== "SETTLED").length} người vay
          </p>
        </Card>

        <Card className="glass-card border border-rose-500/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Tổng tiền đang đi vay (Cần trả)
            </span>
            <ArrowDownLeft className="h-5 w-5 text-rose-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white num-tabular mt-2">
            {formatVND(totalBorrow)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Bao gồm trả góp & vay ngân hàng/bạn bè
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 max-w-xs">
        <button
          type="button"
          onClick={() => setActiveTab("LEND")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "LEND"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Tôi cho vay
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("BORROW")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "BORROW"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Tôi đi vay
        </button>
      </div>

      {/* Debts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDebts.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-slate-400 text-xs">
            Không có khoản nợ nào trong mục này. Bấm &quot;Thêm khoản nợ mới&quot; để ghi sổ!
          </div>
        ) : (
          filteredDebts.map((debt) => {
            const isSettled = debt.computedStatus === "SETTLED";
            const isOverdue = debt.computedStatus === "OVERDUE";

            return (
              <Card
                key={debt.id}
                className="glass-card border border-slate-800 hover:border-cyan-500/40 transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{debt.personName}</span>
                        {debt.phone && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{debt.phone}</span>
                          </span>
                        )}
                      </h4>
                      {debt.dueDate && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Hạn trả: {formatDateVI(debt.dueDate)}</span>
                        </p>
                      )}
                    </div>

                    <Badge
                      variant={isSettled ? "emerald" : isOverdue ? "rose" : "amber"}
                      size="sm"
                    >
                      {isSettled ? "Đã tất toán" : isOverdue ? "Quá hạn!" : "Đang nợ"}
                    </Badge>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Tổng số tiền:</span>
                      <strong className="text-white num-tabular">{formatVND(debt.totalAmount)}</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Đã thanh toán:</span>
                      <span className="text-emerald-400 font-semibold num-tabular">
                        {formatVND(debt.paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800 font-bold">
                      <span>Số còn lại:</span>
                      <span className="text-cyan-400 num-tabular">{formatVND(debt.remaining)}</span>
                    </div>
                  </div>

                  {debt.notes && (
                    <p className="text-xs text-slate-400 mt-3 flex items-start gap-1">
                      <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{debt.notes}</span>
                    </p>
                  )}
                </div>

                {!isSettled && (
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                    <Button
                      type="button"
                      variant="cyan"
                      size="sm"
                      onClick={() => openRepayModal(debt)}
                      className="text-xs"
                    >
                      <span>Ghi nhận trả tiền</span>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Modal Add Debt */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={activeTab === "LEND" ? "Thêm Khoản Cho Vay Mới" : "Thêm Khoản Đi Vay Mới"}
        description="Ghi nhận thông tin người vay/chủ nợ và kỳ hạn trả."
      >
        <form onSubmit={handleCreateDebt} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <div>
            <Input
              label="Tên đối tác / Người vay / Chủ nợ"
              placeholder="Ví dụ: Trần Minh Tuấn, Ngân hàng VPBank..."
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Số điện thoại (Tùy chọn)"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Số tiền (VNĐ)"
                type="number"
                value={totalAmount || ""}
                onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                hint={totalAmount > 0 ? `Định dạng: ${formatVND(totalAmount)}` : undefined}
                required
              />
            </div>
          </div>

          <div>
            <Input
              label="Hạn thanh toán (Tùy chọn)"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <Input
              label="Ghi chú thêm"
              placeholder="Lý do vay, thỏa thuận lãi suất nếu có..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="cyan" isLoading={isSubmitting}>
              Lưu khoản nợ
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Repay */}
      <Modal
        isOpen={isRepayModalOpen}
        onClose={() => setIsRepayModalOpen(false)}
        title="Ghi Nhận Thanh Toán Trả Nợ"
        description={`Cập nhật số tiền trả nợ cho "${selectedDebt?.personName}".`}
      >
        <form onSubmit={handleRepaySubmit} className="space-y-4">
          {repayError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              ⚠️ {repayError}
            </div>
          )}

          <div>
            <Input
              label="Số tiền thanh toán (VNĐ)"
              type="number"
              value={repayAmount || ""}
              onChange={(e) => setRepayAmount(Number(e.target.value) || 0)}
              hint={repayAmount > 0 ? `Định dạng: ${formatVND(repayAmount)}` : undefined}
              required
            />
          </div>

          <div>
            <Select
              label={selectedDebt?.type === "LEND" ? "Nhận tiền vào ví" : "Trích tiền trả từ ví"}
              value={repayWalletId}
              onChange={(e) => setRepayWalletId(e.target.value)}
            >
              <option value="">-- Không cập nhật số dư ví --</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatVND(w.balance)})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Input
              label="Ghi chú đợt trả"
              placeholder="Ví dụ: Trả đợt 1 qua chuyển khoản..."
              value={repayNote}
              onChange={(e) => setRepayNote(e.target.value)}
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsRepayModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="cyan" isLoading={isRepaying}>
              Xác nhận trả nợ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
