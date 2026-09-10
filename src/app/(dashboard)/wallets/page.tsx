"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  ArrowRightLeft,
  Banknote,
  Building2,
  Smartphone,
  PiggyBank,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatVND } from "@/lib/formatters";
import { motion, useReducedMotion } from "motion/react";

export default function WalletsPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Form thêm ví
  const [name, setName] = useState("");
  const [type, setType] = useState("BANK");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [balance, setBalance] = useState<number>(0);
  const [color, setColor] = useState("#06b6d4");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form chuyển tiền nội bộ
  const [sourceWalletId, setSourceWalletId] = useState("");
  const [destWalletId, setDestWalletId] = useState("");
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNote, setTransferNote] = useState("");
  const [transferError, setTransferError] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const loadWallets = useCallback(async () => {
    try {
      const res = await fetch("/api/wallets");
      const data = await res.json();
      const list = data.wallets || [];
      setWallets(list);
      if (list.length >= 2) {
        setSourceWalletId((prev) => prev || list[0].id);
        setDestWalletId((prev) => prev || list[1].id);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên ví");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          bankName: bankName.trim() || null,
          accountNumber: accountNumber.trim() || null,
          balance: Number(balance) || 0,
          color,
          icon: type === "BANK" ? "Building2" : type === "CASH" ? "Banknote" : type === "SAVINGS" ? "PiggyBank" : "Smartphone",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể tạo ví");
      } else {
        setName("");
        setBalance(0);
        setBankName("");
        setAccountNumber("");
        setIsAddModalOpen(false);
        loadWallets();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("transaction-updated"));
        }
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceWalletId === destWalletId) {
      setTransferError("Ví nguồn và ví nhận không thể trùng nhau");
      return;
    }
    if (transferAmount <= 0) {
      setTransferError("Số tiền chuyển phải lớn hơn 0");
      return;
    }

    setIsTransferring(true);
    setTransferError("");

    try {
      const res = await fetch("/api/wallets/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWalletId,
          destWalletId,
          amount: transferAmount,
          note: transferNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTransferError(data.error || "Không thể chuyển tiền");
      } else {
        setIsTransferModalOpen(false);
        setTransferAmount(0);
        setTransferNote("");
        loadWallets();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("transaction-updated"));
        }
      }
    } catch {
      setTransferError("Lỗi kết nối máy chủ");
    } finally {
      setIsTransferring(false);
    }
  };

  const totalAssets = wallets
    .filter((w) => !w.isExcludedFromTotal)
    .reduce((sum, w) => sum + Number(w.balance), 0);

  const sourceWallet = wallets.find((w) => w.id === sourceWalletId);
  const destWallet = wallets.find((w) => w.id === destWalletId);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Ví & Tài Khoản</h2>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý số dư tiền mặt, ngân hàng, ví điện tử MoMo/ZaloPay và tài khoản tích lũy.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setIsTransferModalOpen(true)}
            variant="purple"
            disabled={wallets.length < 2}
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Chuyển tiền nội bộ</span>
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} variant="cyan">
            <Plus className="h-4 w-4" />
            <span>Thêm ví mới</span>
          </Button>
        </div>
      </div>

      {/* Total Balance Overview Card */}
      <Card className="glass-card relative overflow-hidden p-6 border-cyan-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tổng giá trị tài sản ròng
            </span>
            <div className="text-3xl lg:text-4xl font-black text-white num-tabular mt-1">
              <NumberTicker value={totalAssets} isCurrency />
            </div>
            <p className="text-xs text-cyan-400 mt-1">
              Bao gồm {wallets.length} tài khoản thanh toán và tích lũy
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="cyan" size="md">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Đã đồng bộ thời gian thực</span>
            </Badge>
          </div>
        </div>
      </Card>

      {/* Wallets Grid with 3D Tilt on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map((wallet) => {
          const isBank = wallet.type === "BANK";
          const isCash = wallet.type === "CASH";
          const isSavings = wallet.type === "SAVINGS";

          return (
            <SpotlightCard
              key={wallet.id}
              enableTilt={true}
              spotlightColor={wallet.color ? `${wallet.color}25` : "rgba(6, 182, 212, 0.15)"}
              className="p-6 relative overflow-hidden shadow-xl"
              style={{
                borderLeft: `4px solid ${wallet.color || "#06b6d4"}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: wallet.color || "#06b6d4" }}
                  >
                    {isBank ? (
                      <Building2 className="h-6 w-6" />
                    ) : isCash ? (
                      <Banknote className="h-6 w-6" />
                    ) : isSavings ? (
                      <PiggyBank className="h-6 w-6" />
                    ) : (
                      <Smartphone className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {wallet.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {isBank
                        ? wallet.bankName || "Ngân hàng"
                        : isCash
                        ? "Tiền mặt"
                        : isSavings
                        ? "Tiết kiệm tích lũy"
                        : "Ví điện tử"}
                    </span>
                  </div>
                </div>

                <Badge variant={wallet.isExcludedFromTotal ? "amber" : "cyan"} size="sm">
                  {wallet.isExcludedFromTotal ? "Không tính tổng" : "Đang dùng"}
                </Badge>
              </div>

              {wallet.accountNumber && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Số tài khoản:</span>
                  <span className="font-mono text-slate-300 tracking-wider">
                    •••• {wallet.accountNumber.slice(-4)}
                  </span>
                </div>
              )}

              <div className="mt-4">
                <span className="text-[11px] text-slate-400 block uppercase tracking-wider">
                  Số dư hiện tại
                </span>
                <div className="text-2xl font-black text-white num-tabular mt-0.5">
                  <NumberTicker value={Number(wallet.balance)} isCurrency />
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>

      {/* Modal: Thêm ví mới */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Ví Hoặc Tài Khoản Mới"
        description="Quản lý tiền mặt, thẻ ngân hàng, tài khoản tiết kiệm hoặc ví điện tử."
      >
        <form onSubmit={handleCreateWallet} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <div>
            <Input
              label="Tên ví / Tài khoản"
              placeholder="Ví dụ: Techcombank, MoMo, Tiền mặt tiêu vặt..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Loại ví"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="BANK">Tài khoản Ngân hàng</option>
                <option value="E_WALLET">Ví điện tử (MoMo, ZaloPay...)</option>
                <option value="CASH">Tiền mặt</option>
                <option value="SAVINGS">Sổ tiết kiệm</option>
              </Select>
            </div>
            <div>
              <Input
                label="Số dư ban đầu (VNĐ)"
                type="number"
                placeholder="0"
                value={balance || ""}
                onChange={(e) => setBalance(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {type === "BANK" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Tên ngân hàng"
                  placeholder="Vietcombank, MB, Techcombank..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Số tài khoản"
                  placeholder="0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
              Màu đại diện
            </label>
            <div className="flex gap-2">
              {["#06b6d4", "#8b5cf6", "#10b981", "#ec4899", "#f59e0b", "#3b82f6"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-all cursor-pointer ${
                    color === c ? "border-white scale-110 shadow-lg" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="cyan" isLoading={isSubmitting}>
              Tạo ví
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Chuyển tiền nội bộ with Visual Cashflow Animation */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Chuyển Tiền Nội Bộ"
        description="Điều chuyển số dư giữa các ví của bạn mà không tính là chi phí."
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          {transferError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              ⚠️ {transferError}
            </div>
          )}

          {/* Interactive Cashflow Stream Visual Motion */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between relative overflow-hidden shadow-inner">
            {/* Source Wallet Box */}
            <div className="flex flex-col items-center z-10 w-24">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md"
                style={{ backgroundColor: sourceWallet?.color || "#06b6d4" }}
              >
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-white mt-1 max-w-[90px] truncate text-center">
                {sourceWallet?.name || "Ví nguồn"}
              </span>
              <span className="text-[10px] text-slate-400 num-tabular">
                {sourceWallet ? formatVND(sourceWallet.balance) : "0 ₫"}
              </span>
            </div>

            {/* Cashflow Stream Beam */}
            <div className="flex-1 mx-3 flex flex-col items-center justify-center relative">
              <div className="text-xs font-bold text-cyan-400 num-tabular mb-1.5 flex items-center gap-1">
                <span>{transferAmount > 0 ? formatVND(transferAmount) : "0 ₫"}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
                <motion.div
                  animate={shouldReduceMotion ? undefined : { x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                  className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full shadow-[0_0_10px_#06b6d4]"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Dòng tiền nội bộ</span>
            </div>

            {/* Destination Wallet Box */}
            <div className="flex flex-col items-center z-10 w-24">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md"
                style={{ backgroundColor: destWallet?.color || "#8b5cf6" }}
              >
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-white mt-1 max-w-[90px] truncate text-center">
                {destWallet?.name || "Ví nhận"}
              </span>
              <span className="text-[10px] text-slate-400 num-tabular">
                {destWallet ? formatVND(destWallet.balance) : "0 ₫"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select
                label="Từ ví nguồn"
                value={sourceWalletId}
                onChange={(e) => setSourceWalletId(e.target.value)}
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
                label="Sang ví nhận"
                value={destWalletId}
                onChange={(e) => setDestWalletId(e.target.value)}
                required
              >
                {wallets
                  .filter((w) => w.id !== sourceWalletId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatVND(w.balance)})
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          <div>
            <Input
              label="Số tiền chuyển (VNĐ)"
              type="number"
              value={transferAmount || ""}
              onChange={(e) => setTransferAmount(Number(e.target.value) || 0)}
              hint={transferAmount > 0 ? `Định dạng: ${formatVND(transferAmount)}` : undefined}
              required
            />
          </div>

          <div>
            <Input
              label="Ghi chú chuyển tiền"
              placeholder="Ví dụ: Rút tiền mặt, nạp tiền vào MoMo..."
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
            />
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsTransferModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="purple" isLoading={isTransferring}>
              Xác nhận chuyển
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
