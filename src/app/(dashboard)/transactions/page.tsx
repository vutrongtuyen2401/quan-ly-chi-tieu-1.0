"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Trash2,
  Sparkles,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatVND, formatDateVI } from "@/lib/formatters";
import { TransactionFormModal } from "@/components/transactions/transaction-form-modal";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedWallet) params.append("walletId", selectedWallet);
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (selectedType) params.append("type", selectedType);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedWallet, selectedCategory, selectedType]);

  useEffect(() => {
    Promise.all([
      fetch("/api/wallets").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([wData, cData]) => {
      setWallets(wData.wallets || []);
      setCategories(cData.categories || []);
    });
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này? Số dư ví sẽ được tự động hoàn tác.")) {
      return;
    }

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Đã xóa giao dịch và hoàn tất cập nhật lại số dư ví");
        loadTransactions();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("transaction-updated"));
        }
      }
    } catch (e) {
      console.error("Lỗi xóa giao dịch:", e);
    }
  };

  // Tổng hợp nhanh cho kết quả đang lọc
  const totalFilteredExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount), 0);

  const totalFilteredIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-6 pb-16 relative">
      {/* Toast Notification with AnimatePresence */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-50 p-3.5 rounded-xl bg-slate-900/95 border border-cyan-500/50 shadow-2xl shadow-cyan-500/20 text-white text-xs font-semibold flex items-center gap-2.5 backdrop-blur-xl"
          >
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Sổ Giao Dịch</h2>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý, tìm kiếm và phân loại mọi khoản thu, chi và chuyển tiền nội bộ.
          </p>
        </div>
        <Button
          onClick={() => setIsFormModalOpen(true)}
          variant="shimmer"
          className="shadow-lg shadow-purple-500/20"
        >
          <Plus className="h-4 w-4 mr-1" />
          <span>Thêm giao dịch mới</span>
        </Button>
      </div>

      {/* Overview Filter Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl glass-card border border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-emerald-400 font-medium">Tổng thu hiển thị:</span>
          <span className="text-base font-bold text-emerald-400">
            +<NumberTicker value={totalFilteredIncome} isCurrency />
          </span>
        </div>
        <div className="p-4 rounded-xl glass-card border border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-rose-400 font-medium">Tổng chi hiển thị:</span>
          <span className="text-base font-bold text-rose-400">
            -<NumberTicker value={totalFilteredExpense} isCurrency />
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="glass-card p-4 border border-slate-800/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Tìm theo mô tả, người nhận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
          </div>

          {/* Wallet Filter */}
          <div>
            <Select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
            >
              <option value="">-- Tất cả các ví --</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">-- Tất cả danh mục --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "EXPENSE" ? "Chi" : "Thu"})
                </option>
              ))}
            </Select>
          </div>

          {/* Type Filter */}
          <div>
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">-- Tất cả loại --</option>
              <option value="EXPENSE">Chi tiêu</option>
              <option value="INCOME">Thu nhập</option>
              <option value="TRANSFER">Chuyển khoản</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Transactions Table Card with Staggered Entrance */}
      <Card className="glass-card p-0 overflow-hidden border border-slate-800/80 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Ngày</th>
                <th className="px-5 py-3.5">Mô tả & Nguồn</th>
                <th className="px-5 py-3.5">Ví</th>
                <th className="px-5 py-3.5">Danh mục</th>
                <th className="px-5 py-3.5 text-right">Số tiền (VNĐ)</th>
                <th className="px-5 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <span className="h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải dữ liệu giao dịch...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    Không tìm thấy giao dịch nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isExpense = tx.type === "EXPENSE";
                  const isIncome = tx.type === "INCOME";
                  const isTransfer = tx.type === "TRANSFER";

                  return (
                    <motion.tr
                      key={tx.id}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-slate-900/40 transition-colors group"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400">
                        {formatDateVI(tx.date)}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {tx.description}
                          </span>
                          {tx.source && tx.source.startsWith("AI") && (
                            <Badge variant="cyan" size="sm">
                              <Sparkles className="h-2.5 w-2.5" />
                              <span>{tx.source.replace("AI_", "")}</span>
                            </Badge>
                          )}
                          {tx.source === "RECURRING" && (
                            <Badge variant="purple" size="sm">
                              Định kỳ
                            </Badge>
                          )}
                        </div>
                        {tx.note && <p className="text-xs text-slate-500 mt-0.5">{tx.note}</p>}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-300">
                        {tx.wallet?.name}
                        {isTransfer && tx.destinationWallet && (
                          <span className="text-cyan-400 font-medium">
                            {" "}
                            ➔ {tx.destinationWallet.name}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                        {tx.category ? (
                          <Badge variant="outline" size="sm">
                            {tx.category.name}
                          </Badge>
                        ) : (
                          <span className="text-slate-500">Chưa phân loại</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-black num-tabular">
                        <span
                          className={
                            isExpense
                              ? "text-rose-400"
                              : isIncome
                              ? "text-emerald-400"
                              : "text-cyan-400"
                          }
                        >
                          {isExpense ? "-" : isIncome ? "+" : ""}
                          {formatVND(tx.amount)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Xóa giao dịch"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction Form Modal */}
      <TransactionFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => {
          showToast("Đã thêm giao dịch thành công vào sổ!");
          loadTransactions();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("transaction-updated"));
          }
        }}
      />
    </div>
  );
}
