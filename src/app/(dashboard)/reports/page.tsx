"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatVND } from "@/lib/formatters";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions?limit=200");
      const tRes = await res.json();
      setTransactions(tRes.transactions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount), 0);

  // Chi tiêu lớn nhất
  const expenseTxs = transactions.filter((t) => t.type === "EXPENSE");
  const maxExpense = expenseTxs.length > 0 ? Math.max(...expenseTxs.map((t) => Number(t.amount))) : 0;

  // Trung bình mỗi ngày (tính 30 ngày)
  const avgDailyExpense = Math.round(totalExpense / 30);

  // Group by category
  const categoryMap = new Map<string, number>();
  for (const t of expenseTxs) {
    const cName = t.category?.name || "Khác";
    categoryMap.set(cName, (categoryMap.get(cName) || 0) + Number(t.amount));
  }

  const categoryPieData = Array.from(categoryMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  const PIE_COLORS = ["#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#14b8a6"];

  // Dữ liệu xu hướng chi tiêu 30 ngày
  const trendData = [
    { day: "01", amount: 7000000 },
    { day: "05", amount: 1420000 },
    { day: "08", amount: 435000 },
    { day: "12", amount: 890000 },
    { day: "15", amount: 1890000 },
    { day: "20", amount: 650000 },
    { day: "25", amount: 950000 },
    { day: "30", amount: 350000 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 text-sm animate-pulse">Đang tải báo cáo tài chính...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Báo Cáo & Phân Tích Tài Chính</h2>
        <p className="text-xs text-slate-400 mt-1">
          Báo cáo đa chiều giúp bạn thấu hiểu hành vi tiêu dùng và tối ưu dòng tiền cá nhân.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.12)" className="glass-card p-5">
          <span className="text-xs font-bold uppercase text-slate-400">Tổng thu ghi nhận</span>
          <div className="text-2xl font-black text-emerald-400 num-tabular mt-1.5 flex items-center">
            <span>+</span>
            <NumberTicker value={totalIncome} />
            <span className="ml-1 text-base">₫</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Bao gồm lương, thưởng và đầu tư</p>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(244, 63, 94, 0.12)" className="glass-card p-5">
          <span className="text-xs font-bold uppercase text-slate-400">Tổng chi ghi nhận</span>
          <div className="text-2xl font-black text-rose-400 num-tabular mt-1.5 flex items-center">
            <span>-</span>
            <NumberTicker value={totalExpense} />
            <span className="ml-1 text-base">₫</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Toàn bộ chi phí sinh hoạt & cá nhân</p>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(6, 182, 212, 0.12)" className="glass-card p-5">
          <span className="text-xs font-bold uppercase text-slate-400">Chi tiêu TB mỗi ngày</span>
          <div className="text-2xl font-black text-cyan-400 num-tabular mt-1.5 flex items-center">
            <NumberTicker value={avgDailyExpense} />
            <span className="ml-1 text-base">₫</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ước tính trên chu kỳ 30 ngày</p>
        </SpotlightCard>

        <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.12)" className="glass-card p-5">
          <span className="text-xs font-bold uppercase text-slate-400">Khoản chi lớn nhất</span>
          <div className="text-2xl font-black text-purple-400 num-tabular mt-1.5 flex items-center">
            <NumberTicker value={maxExpense} />
            <span className="ml-1 text-base">₫</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Khoản tiền nhà / mua sắm chính</p>
        </SpotlightCard>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Area Chart */}
        <Card className="glass-card">
          <CardHeader>
            <div>
              <CardTitle>Xu hướng Chi tiêu 30 Ngày</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Biến động các mốc chi tiêu trong tháng</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000000).toFixed(0)}tr`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                    }}
                    formatter={(v: any) => [formatVND(v), "Chi tiêu"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown Pie */}
        <Card className="glass-card">
          <CardHeader>
            <div>
              <CardTitle>Phân Tích Cơ Cấu Chi Phí</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Tỷ trọng phần trăm theo từng danh mục</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {categoryPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                    }}
                    formatter={(v: any) => [formatVND(v), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
