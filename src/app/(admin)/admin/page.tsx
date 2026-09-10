"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  Lock,
  Unlock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatDateVI } from "@/lib/formatters";

export default function AdminPortalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "feedback" | "categories">("stats");

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sRes, uRes, fRes, cRes] = await Promise.all([
        fetch("/api/admin/stats").then((r) => r.json()),
        fetch("/api/admin/users").then((r) => r.json()),
        fetch("/api/admin/feedback").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
      ]);

      setStats(sRes.stats || null);
      setUsers(uRes.users || []);
      setFeedbacks(fRes.feedbacks || []);
      setCategories(cRes.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      if (!isAdmin) {
        router.push("/");
      } else {
        loadAdminData();
      }
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, isAdmin, router, loadAdminData]);

  const handleToggleUserStatus = async (user: any) => {
    const nextStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    const confirmMsg =
      nextStatus === "BLOCKED"
        ? `Bạn có chắc muốn KHÓA tài khoản ${user.email}?`
        : `MỞ KHÓA tài khoản ${user.email}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, status: nextStatus }),
      });

      if (res.ok) {
        loadAdminData();
      } else {
        const d = await res.json();
        alert(d.error || "Không thể cập nhật trạng thái");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateFeedbackStatus = async (id: string, newStatus: string) => {
    try {
      await fetch("/api/admin/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4">
        <div className="p-8 rounded-2xl glass-card text-center max-w-md">
          <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">Truy cập bị từ chối</h2>
          <p className="text-xs text-slate-400 mt-2">
            Khu vực này chỉ dành cho tài khoản có quyền Quản trị viên (Admin).
          </p>
          <Link href="/">
            <Button variant="cyan" className="mt-4">
              Quay lại Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4">
        <div className="text-slate-400 text-sm animate-pulse">Đang tải dữ liệu quản trị...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 p-4 lg:p-8 space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" title="Quay lại ứng dụng">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">
                Cổng Quản Trị Hệ Thống
              </h1>
              <Badge variant="purple">ADMIN ONLY</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Quyền hạn quản trị hệ thống giới hạn - Bảo mật tuyệt đối dữ liệu giao dịch cá nhân.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "stats"
                ? "bg-purple-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Thống kê
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "users"
                ? "bg-purple-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Người dùng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("feedback")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "feedback"
                ? "bg-purple-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Báo cáo & Góp ý
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "categories"
                ? "bg-purple-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Danh mục
          </button>
        </div>
      </div>

      {/* Tab 1: Stats */}
      {activeTab === "stats" && stats && (
        <div className="space-y-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <motion.div variants={staggerItem}>
              <SpotlightCard spotlightColor="rgba(255, 255, 255, 0.08)" className="glass-card p-5">
                <span className="text-xs font-bold uppercase text-slate-400">Tổng người dùng</span>
                <div className="text-3xl font-black text-white num-tabular mt-1.5">
                  <NumberTicker value={Number(stats.totalUsers) || 0} />
                </div>
                <p className="text-xs text-emerald-400 mt-1">
                  {stats.activeUsers} đang hoạt động • {stats.blockedUsers} bị khóa
                </p>
              </SpotlightCard>
            </motion.div>

            <motion.div variants={staggerItem}>
              <SpotlightCard spotlightColor="rgba(6, 182, 212, 0.12)" className="glass-card p-5">
                <span className="text-xs font-bold uppercase text-slate-400">Tổng số ví tài khoản</span>
                <div className="text-3xl font-black text-cyan-400 num-tabular mt-1.5">
                  <NumberTicker value={Number(stats.totalWallets) || 0} />
                </div>
                <p className="text-xs text-slate-500 mt-1">Ngân hàng, ví điện tử, tiền mặt</p>
              </SpotlightCard>
            </motion.div>

            <motion.div variants={staggerItem}>
              <SpotlightCard spotlightColor="rgba(139, 92, 246, 0.12)" className="glass-card p-5">
                <span className="text-xs font-bold uppercase text-slate-400">Tổng giao dịch ghi sổ</span>
                <div className="text-3xl font-black text-purple-400 num-tabular mt-1.5">
                  <NumberTicker value={Number(stats.totalTransactions) || 0} />
                </div>
                <p className="text-xs text-slate-500 mt-1">Giao dịch trên toàn hệ thống</p>
              </SpotlightCard>
            </motion.div>

            <motion.div variants={staggerItem}>
              <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.12)" className="glass-card p-5">
                <span className="text-xs font-bold uppercase text-slate-400">Tỷ lệ chính xác AI</span>
                <div className="text-3xl font-black text-emerald-400 num-tabular mt-1.5">
                  {stats.aiAccuracyRate}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.confirmedAiDrafts}/{stats.totalAiDrafts} bản nháp được xác nhận
                </p>
              </SpotlightCard>
            </motion.div>
          </motion.div>

          <Card className="glass-card border-purple-500/30 p-6">
            <h3 className="text-base font-bold text-white mb-2">Quy chuẩn Bảo mật Dữ liệu Admin</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Theo quy định kiến trúc bảo mật trong <code>docs/DECISIONS.md</code>, Quản trị viên
              chỉ có quyền kiểm soát số liệu thống kê tổng thể, danh mục mặc định của hệ thống và trạng thái
              tài khoản người dùng. Quản trị viên <strong>tuyệt đối không được cấp quyền truy vấn chi tiết các giao dịch cá nhân</strong>{" "}
              hoặc số dư bí mật của bất kỳ thành viên nào.
            </p>
          </Card>
        </div>
      )}

      {/* Tab 2: Users Management */}
      {activeTab === "users" && (
        <Card className="glass-card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <CardTitle>Danh sách Người dùng Hệ thống ({users.length})</CardTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Họ tên & Email</th>
                  <th className="px-5 py-3">Vai trò</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Số ví</th>
                  <th className="px-5 py-3">Ngày tham gia</th>
                  <th className="px-5 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u, idx) => {
                  const isBlocked = u.status === "BLOCKED";
                  const isSelf = u.id === session?.user?.id;

                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                      className="hover:bg-slate-900/40"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={u.role === "ADMIN" ? "purple" : "outline"} size="sm">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={isBlocked ? "rose" : "emerald"} size="sm">
                          {isBlocked ? "Đã khóa" : "Hoạt động"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-300">
                        {u._count?.wallets || 0} ví
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {formatDateVI(u.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {!isSelf && (
                          <Button
                            variant={isBlocked ? "outline" : "danger"}
                            size="sm"
                            onClick={() => handleToggleUserStatus(u)}
                            className="text-xs h-7 px-2.5"
                          >
                            {isBlocked ? (
                              <>
                                <Unlock className="h-3 w-3" />
                                <span>Mở khóa</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                <span>Khóa TK</span>
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Feedback */}
      {activeTab === "feedback" && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Báo cáo Lỗi & Phản hồi ({feedbacks.length})</h3>
          <div className="space-y-3">
            {feedbacks.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có phản hồi nào.</p>
            ) : (
              feedbacks.map((f) => (
                <Card key={f.id} className="glass-card p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={f.type === "BUG" ? "rose" : "cyan"} size="sm">
                          {f.type === "BUG" ? "Báo lỗi" : "Góp ý"}
                        </Badge>
                        <h4 className="text-sm font-bold text-white">{f.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Từ: {f.user?.name} ({f.user?.email}) • {formatDateVI(f.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={f.status}
                        onChange={(e) => handleUpdateFeedbackStatus(f.id, e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-2 py-1 outline-none"
                      >
                        <option value="OPEN">Chờ xử lý (Open)</option>
                        <option value="IN_REVIEW">Đang kiểm tra (In Review)</option>
                        <option value="RESOLVED">Đã giải quyết (Resolved)</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {f.content}
                  </p>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: System Categories */}
      {activeTab === "categories" && (
        <Card className="glass-card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <CardTitle>Danh mục Mặc định Toàn Hệ thống</CardTitle>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories
              .filter((c) => c.isSystemDefault)
              .map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-2.5"
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color || "#8b5cf6" }}
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">{cat.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {cat.type === "EXPENSE" ? "Chi tiêu" : "Thu nhập"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
