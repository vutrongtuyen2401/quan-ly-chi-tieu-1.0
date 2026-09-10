"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { formatVND } from "@/lib/formatters";

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionFormModal({
  isOpen,
  onClose,
  onSuccess,
}: TransactionFormModalProps) {
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState<number>(0);
  const [walletId, setWalletId] = useState("");
  const [destinationWalletId, setDestinationWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/wallets").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
      ]).then(([wData, cData]) => {
        const wList = wData.wallets || [];
        setWallets(wList);
        setCategories(cData.categories || []);
        if (wList.length > 0 && !walletId) {
          setWalletId(wList[0].id);
        }
      });
    }
  }, [isOpen, walletId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("Số tiền phải lớn hơn 0");
      return;
    }
    if (!walletId) {
      setError("Vui lòng chọn ví");
      return;
    }
    if (type === "TRANSFER" && (!destinationWalletId || destinationWalletId === walletId)) {
      setError("Vui lòng chọn ví đích khác ví nguồn");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId,
          destinationWalletId: type === "TRANSFER" ? destinationWalletId : null,
          categoryId: type !== "TRANSFER" ? categoryId : null,
          amount,
          type,
          description: description.trim(),
          note: note.trim() || null,
          date: new Date(date).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tạo giao dịch");
      } else {
        // Reset
        setDescription("");
        setNote("");
        setAmount(0);
        onClose();
        onSuccess();
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm Giao Dịch Mới"
      description="Ghi sổ giao dịch thủ công vào ví của bạn."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => setType("EXPENSE")}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              type === "EXPENSE"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Chi tiêu
          </button>
          <button
            type="button"
            onClick={() => setType("INCOME")}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              type === "INCOME"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Thu nhập
          </button>
          <button
            type="button"
            onClick={() => setType("TRANSFER")}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              type === "TRANSFER"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Chuyển tiền
          </button>
        </div>

        {/* Amount */}
        <div>
          <Input
            label="Số tiền (VNĐ)"
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            placeholder="0"
            hint={amount > 0 ? `Định dạng: ${formatVND(amount)}` : undefined}
            required
          />
        </div>

        {/* Wallets */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Select
              label={type === "TRANSFER" ? "Từ ví (Nguồn)" : "Chọn ví"}
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              required
            >
              <option value="">-- Chọn ví --</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatVND(w.balance)})
                </option>
              ))}
            </Select>
          </div>

          {type === "TRANSFER" ? (
            <div>
              <Select
                label="Sang ví (Đích)"
                value={destinationWalletId}
                onChange={(e) => setDestinationWalletId(e.target.value)}
                required
              >
                <option value="">-- Chọn ví đích --</option>
                {wallets
                  .filter((w) => w.id !== walletId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </Select>
            </div>
          ) : (
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
          )}
        </div>

        {/* Description & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="Mô tả"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Ăn trưa, Cà phê..."
              required
            />
          </div>
          <div>
            <Input
              label="Ngày"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <Input
            label="Ghi chú (Tùy chọn)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú thêm..."
          />
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="cyan" isLoading={isLoading}>
            Lưu giao dịch
          </Button>
        </div>
      </form>
    </Modal>
  );
}
