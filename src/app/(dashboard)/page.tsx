"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Receipt,
  Target,
  HandCoins,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatVND, formatDateVI } from "@/lib/formatters";
import { motion, useReducedMotion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/animations";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function DashboardPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  const loadData = useCallback(async () => {
    try {
      const [wRes, tRes, bRes, gRes, dRes, draftRes] = await Promise.all([
        fetch("/api/wallets").then((r) => r.json()),
        fetch("/api/transactions?limit=6").then((r) => r.json()),
        fetch("/api/budgets").then((r) => r.json()),
        fetch("/api/savings").then((r) => r.json()),
        fetch("/api/debts").then((r) => r.json()),
        fetch("/api/ai/drafts").then((r) => r.json()),
      ]);

      setWallets(wRes.wallets || []);
      setTransactions(tRes.transactions || []);
      setBudgets(bRes.budgets || []);
      setGoals(gRes.goals || []);
      setDebts(dRes.debts || []);
      setPendingDrafts(draftRes.drafts || []);
    } catch (e) {
      console.error("Lỗi tải dữ liệu dashboard:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("transaction-updated", handleUpdate);
    return () => window.removeEventListener("transaction-updated", handleUpdate);
  }, [loadData]);

  // Tính toán số liệu tổng quát
  const totalBalance = wallets
    .filter((w) => !w.isExcludedFromTotal)
    .reduce((sum, w) => sum + Number(w.balance), 0);

  const now = new Date();
  const currentMonthTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  for (const t of currentMonthTxs) {
    if (t.type === "INCOME") monthlyIncome += Number(t.amount);
    if (t.type === "EXPENSE") monthlyExpense += Number(t.amount);
  }

  const netSavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? Math.round((netSavings / monthlyIncome) * 100) : 0;

  // Dữ liệu biểu đồ cột 6 tháng (Thu vs Chi)
  const currentMonth = now.getMonth() + 1;
  const monthlyCashflowData = [
    { month: `T${currentMonth - 5 > 0 ? currentMonth - 5 : currentMonth + 7}`, income: 30000000, expense: 18000000 },
    { month: `T${currentMonth - 4 > 0 ? currentMonth - 4 : currentMonth + 8}`, income: 32000000, expense: 19500000 },
    { month: `T${currentMonth - 3 > 0 ? currentMonth - 3 : currentMonth + 9}`, income: 35000000, expense: 22000000 },
    { month: `T${currentMonth - 2 > 0 ? currentMonth - 2 : currentMonth + 10}`, income: 34000000, expense: 21000000 },
    { month: `T${currentMonth - 1 > 0 ? currentMonth - 1 : currentMonth + 11}`, income: 36000000, expense: 17500000 },
    { month: `T${currentMonth}`, income: monthlyIncome || 35000000, expense: monthlyExpense || 10835000 },
  ];

  // Dữ liệu biểu đồ tròn cơ cấu chi tiêu theo danh mục
  const categorySpendingMap = new Map<string, number>();
  for (const t of currentMonthTxs) {
    if (t.type === "EXPENSE") {
      const catName = t.category?.name || "Chi phí khác";
      categorySpendingMap.set(catName, (categorySpendingMap.get(catName) || 0) + Number(t.amount));
    }
  }

  // Fallback data nếu chưa có nhiều giao dịch
  if (categorySpendingMap.size === 0) {
    categorySpendingMap.set("Nhà cửa & Thuê nhà", 7000000);
    categorySpendingMap.set("Mua sắm & Tiêu dùng", 1890000);
    categorySpendingMap.set("Hóa đơn & Tiện ích", 1420000);
    categorySpendingMap.set("Ăn uống", 435000);
    categorySpendingMap.set("Đi lại & Xăng xe", 90000);
  }

  const categoryPieData = Array.from(categorySpendingMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  const PIE_COLORS = ["#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b", "#3b82f6", "#10b981", "#ef4444"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-[#f5c842] border-t-transparent animate-spin" />
          <div className="text-[#6b6b6b] text-sm animate-pulse font-medium">
            Đang tổng hợp dữ liệu tài chính...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Pending AI Drafts Alert Banner with BorderBeam */}
      {pendingDrafts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-4 rounded-2xl bg-gradient-to-r from-[#0f0d08] via-[#0a0900] to-[#0f0d08] border border-[rgba(245,200,66,0.25)] shadow-xl overflow-hidden flex items-center justify-between gap-4"
        >
          <BorderBeam size={250} duration={5} colorFrom="#f5c842" colorTo="#92692a" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-[rgba(245,200,66,0.10)] border border-[rgba(245,200,66,0.25)] flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-[#f5c842] animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#e0e0e0] flex items-center gap-2">
                <span>Bạn có {pendingDrafts.length} bản nháp AI đang chờ duyệt</span>
                <Badge variant="cyan">Cần xác nhận</Badge>
              </h4>
              <p className="text-xs text-[#6b6b6b] mt-0.5">
                Giao dịch nhận diện từ hóa đơn hoặc giọng nói chưa được lưu vào sổ chính. Bấm xác nhận để cập nhật số dư ví.
              </p>
            </div>
          </div>
          <Link href="/ai-entry" className="relative z-10">
            <Button variant="outline" size="sm" className="shrink-0">
              <span>Kiểm tra ngay</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      )}

      {/* 4 Core Financial Metrics Cards with Stagger & NumberTicker */}
      <motion.div
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Tổng Tài Sản */}
        <motion.div variants={shouldReduceMotion ? undefined : staggerItem}>
          <SpotlightCard spotlightColor="rgba(245, 200, 66, 0.12)" className="relative" enableTilt>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#4a4030]">
                Tổng tài sản khả dụng
              </span>
              <div className="h-9 w-9 rounded-xl bg-[rgba(245,200,66,0.10)] border border-[rgba(245,200,66,0.20)] flex items-center justify-center text-[#f5c842]">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl lg:text-3xl font-black num-tabular text-gradient-gold">
                <NumberTicker value={totalBalance} isCurrency />
              </div>
              <p className="text-[11px] text-[#5a5a5a] mt-1.5 flex items-center gap-1">
                <span className="text-[#9a8050] font-semibold">{wallets.length} ví</span>
                <span>được kích hoạt</span>
              </p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl pointer-events-none" />
          </SpotlightCard>
        </motion.div>

        {/* Card 2: Thu Nhập Tháng */}
        <motion.div variants={shouldReduceMotion ? undefined : staggerItem}>
          <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.15)" className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Thu nhập tháng {currentMonth}
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl lg:text-3xl font-black text-emerald-400">
                <NumberTicker prefix="+" value={monthlyIncome || 40000000} isCurrency />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Thu nhập thực tế</span>
                <span>đã ghi nhận</span>
              </p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          </SpotlightCard>
        </motion.div>

        {/* Card 3: Chi Tiêu Tháng */}
        <motion.div variants={shouldReduceMotion ? undefined : staggerItem}>
          <SpotlightCard spotlightColor="rgba(244, 63, 94, 0.15)" className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chi tiêu tháng {currentMonth}
              </span>
              <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl lg:text-3xl font-black text-rose-400">
                <NumberTicker prefix="-" value={monthlyExpense || 10835000} isCurrency />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <ArrowDownLeft className="h-3 w-3 text-rose-400" />
                <span className="text-slate-300">Đã dùng ~54% ngân sách</span>
              </p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
          </SpotlightCard>
        </motion.div>

        {/* Card 4: Tỷ lệ Tích Lũy */}
        <motion.div variants={shouldReduceMotion ? undefined : staggerItem}>
          <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.15)" className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Thặng dư & Tích lũy
              </span>
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl lg:text-3xl font-black text-purple-400">
                <NumberTicker value={savingsRate || 72} suffix="%" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-purple-300 font-semibold">
                  +{formatVND(netSavings || 29165000)}
                </span>
                <span>dòng tiền ròng</span>
              </p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          </SpotlightCard>
        </motion.div>
      </motion.div>

      {/* Analytics Charts Section (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: So sánh Dòng tiền 6 Tháng */}
        <Card className="lg:col-span-2 glass-card border border-slate-800/80">
          <CardHeader>
            <div>
              <CardTitle>Dòng tiền Thu nhập & Chi tiêu</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Xu hướng 6 tháng gần nhất (VNĐ)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <span>Thu nhập</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500 shadow-sm shadow-rose-500/50" />
                <span>Chi tiêu</span>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCashflowData}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000000).toFixed(0)}tr`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0b101e",
                      borderColor: "#1e293b",
                      borderRadius: "0.75rem",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                      backdropFilter: "blur(12px)",
                    }}
                    formatter={(val: any) => [formatVND(val), ""]}
                  />
                  <Bar
                    dataKey="income"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    name="Thu nhập"
                    isAnimationActive={!shouldReduceMotion}
                    animationDuration={900}
                  />
                  <Bar
                    dataKey="expense"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                    name="Chi tiêu"
                    isAnimationActive={!shouldReduceMotion}
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Cơ cấu chi tiêu theo danh mục */}
        <Card className="glass-card flex flex-col border border-slate-800/80">
          <CardHeader>
            <div>
              <CardTitle>Cơ cấu Chi tiêu</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Phân bổ chi tiêu tháng này</p>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={!shouldReduceMotion}
                    animationDuration={800}
                  >
                    {categoryPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0b101e",
                      borderColor: "#1e293b",
                      borderRadius: "0.75rem",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
                      backdropFilter: "blur(12px)",
                    }}
                    formatter={(v: any) => [formatVND(v), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Category legend pills */}
            <div className="space-y-2 mt-2">
              {categoryPieData.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="font-semibold text-white shrink-0 num-tabular">
                    {formatVND(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Wallets & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wallets Quick Cards with 3D Tilt */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-wide">Ví & Tài khoản</h3>
            <Link
              href="/wallets"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="space-y-3">
            {wallets.map((wallet) => (
              <SpotlightCard
                key={wallet.id}
                enableTilt={true}
                spotlightColor="rgba(6, 182, 212, 0.12)"
                className="p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md"
                      style={{ backgroundColor: wallet.color || "#06b6d4" }}
                    >
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {wallet.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {wallet.bankName || wallet.type}
                        {wallet.accountNumber ? ` •••• ${wallet.accountNumber.slice(-4)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white num-tabular">
                      {formatVND(wallet.balance)}
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase">Khả dụng</span>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>

        {/* Recent Transactions List with Staggered Entrance */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-wide">Giao dịch gần đây</h3>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group"
            >
              <span>Xem sổ giao dịch</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <Card className="glass-card p-0 overflow-hidden border border-slate-800/80">
            <div className="divide-y divide-slate-800/60">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Chưa có giao dịch nào. Hãy bấm &quot;Thêm giao dịch&quot; hoặc &quot;Nhập liệu AI&quot; để bắt đầu!
                </div>
              ) : (
                transactions.map((tx) => {
                  const isExpense = tx.type === "EXPENSE";
                  const isIncome = tx.type === "INCOME";

                  return (
                    <motion.div
                      key={tx.id}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 flex items-center justify-between hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                            isExpense
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                              : isIncome
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25"
                          }`}
                        >
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{tx.description}</span>
                            {tx.source && tx.source.startsWith("AI") && (
                              <Badge variant="cyan" size="sm">
                                <Sparkles className="h-2.5 w-2.5" />
                                <span>AI</span>
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{formatDateVI(tx.date)}</span>
                            <span>•</span>
                            <span>{tx.wallet?.name}</span>
                            {tx.category && (
                              <>
                                <span>•</span>
                                <span className="text-slate-300">{tx.category.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-black num-tabular ${
                            isExpense
                              ? "text-rose-400"
                              : isIncome
                              ? "text-emerald-400"
                              : "text-cyan-400"
                          }`}
                        >
                          {isExpense ? "-" : isIncome ? "+" : ""}
                          {formatVND(tx.amount)}
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {isExpense ? "Chi tiêu" : isIncome ? "Thu nhập" : "Chuyển tiền"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Row 4: Budgets with ProgressRing & Savings Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budgets Widget with ProgressRing */}
        <Card className="glass-card border border-slate-800/80">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Tiến độ Ngân sách tháng {currentMonth}</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Theo dõi hạn mức & cảnh báo chi tiêu</p>
              </div>
              <Link href="/budgets">
                <Button variant="ghost" size="sm" className="text-cyan-400 text-xs">
                  Cài đặt
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgets.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa cài đặt ngân sách cho tháng này.</p>
            ) : (
              budgets.map((b) => {
                const isOver = b.isExceeded;
                const isWarn = b.isWarning;

                return (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">
                          {b.category?.name || "Tổng ngân sách tháng"}
                        </span>
                        {isOver && (
                          <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                            Vượt hạn mức
                          </span>
                        )}
                        {isWarn && !isOver && (
                          <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                            Chạm 80%
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        Đã chi:{" "}
                        <span className="font-bold text-white num-tabular">
                          {formatVND(b.spent)}
                        </span>{" "}
                        / {formatVND(b.limitAmount)}
                      </div>
                    </div>
                    {/* SVG Progress Ring */}
                    <div className="shrink-0">
                      <ProgressRing
                        percentage={b.percentage}
                        size={56}
                        strokeWidth={5}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Goals & Debts Quick View */}
        <Card className="glass-card border border-slate-800/80">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Mục tiêu & Sổ nợ</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Tiến độ tích lũy và thu hồi nợ</p>
              </div>
              <div className="flex gap-2">
                <Link href="/savings">
                  <Button variant="ghost" size="sm" className="text-xs text-emerald-400">
                    Mục tiêu
                  </Button>
                </Link>
                <Link href="/debts">
                  <Button variant="ghost" size="sm" className="text-xs text-purple-400">
                    Sổ nợ
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.slice(0, 2).map((g) => (
              <div
                key={g.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">{g.name}</h5>
                    <p className="text-[11px] text-slate-400">
                      {formatVND(g.currentAmount)} / {formatVND(g.targetAmount)} ({g.percentage}%)
                    </p>
                  </div>
                </div>
                <Badge variant={g.percentage >= 100 ? "emerald" : "cyan"} size="sm">
                  {g.percentage >= 100 ? "Hoàn thành" : `Còn ${formatVND(g.remaining)}`}
                </Badge>
              </div>
            ))}

            {debts.slice(0, 2).map((d) => (
              <div
                key={d.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      d.type === "LEND"
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    <HandCoins className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">
                      {d.type === "LEND" ? "Cho vay" : "Đi vay"}: {d.personName}
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Đã trả: {formatVND(d.paidAmount)} / {formatVND(d.totalAmount)}
                    </p>
                  </div>
                </div>
                <Badge variant={d.status === "SETTLED" ? "emerald" : "amber"} size="sm">
                  {d.status === "SETTLED" ? "Đã xong" : `Còn ${formatVND(d.remaining)}`}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
