"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "motion/react";
import { ArrowRight, ShieldCheck, UserCheck, Coins, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { fadeInUp, springConfig } from "@/lib/animations";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Email hoặc mật khẩu không chính xác");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Không thể kết nối đến máy chủ xác thực");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (type: "demo" | "admin") => {
    if (type === "demo") {
      setEmail("demo@quanlychitieu.vn");
      setPassword("demo123456");
    } else {
      setEmail("admin@quanlychitieu.vn");
      setPassword("admin123456");
    }
    setError("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#080808] bg-metal-grid relative overflow-hidden">
      {/* Ambient gold orbs */}
      <div className="absolute top-1/4 left-1/5 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute bottom-1/4 right-1/5 w-[550px] h-[550px] bg-yellow-600/4 rounded-full blur-3xl pointer-events-none animate-float-slow-reverse" />
      <div className="absolute top-2/3 left-1/2 w-80 h-80 bg-amber-500/3 rounded-full blur-2xl pointer-events-none animate-float-slow" />

      {/* Radial vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, #080808 100%)" }} />

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={springConfig.gentle}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-[#f5c842] to-[#92692a] items-center justify-center shadow-2xl shadow-yellow-500/30 mb-5 neon-glow-gold">
            <Coins className="h-8 w-8 text-[#080808]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient-gold mb-1">
            QuanLyChiTieu
          </h1>
          <p className="text-sm text-[#5a5a5a] font-medium">
            Quản lý thông minh mọi đồng tiền
          </p>
        </div>

        {/* Login Form */}
        <SpotlightCard
          spotlightColor="rgba(245, 200, 66, 0.08)"
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: "rgba(10, 9, 8, 0.92)", backdropFilter: "blur(24px)", border: "1px solid rgba(245, 200, 66, 0.15)" }}
        >
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-6 flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#9a8050]" />
            Đăng nhập tài khoản
          </h2>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/8 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4a4a4a] pointer-events-none z-10 mt-3" />
              <div className="pl-9">
                <Input
                  label="Địa chỉ Email"
                  type="email"
                  placeholder="tenban@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Input
                label="Mật khẩu"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              variant="shimmer"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              <span>Đăng nhập hệ thống</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick Demo */}
          <div className="mt-6 pt-5 border-t border-[rgba(245,200,66,0.08)]">
            <p className="text-[10px] font-bold text-[#4a4030] text-center mb-3 uppercase tracking-widest">
              Tài khoản mẫu thử nghiệm
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("demo")}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#0f0f0f] border border-[rgba(245,200,66,0.15)] text-[#9a8050] hover:bg-[rgba(245,200,66,0.06)] hover:border-[rgba(245,200,66,0.30)] hover:text-[#f5c842] text-xs font-medium transition-all cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Demo User</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("admin")}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#0f0f0f] border border-[rgba(245,200,66,0.15)] text-[#9a8050] hover:bg-[rgba(245,200,66,0.06)] hover:border-[rgba(245,200,66,0.30)] hover:text-[#f5c842] text-xs font-medium transition-all cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Admin User</span>
              </button>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-5 text-center text-xs text-[#5a5a5a]">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="text-[#c0a035] hover:text-[#f5c842] font-semibold underline underline-offset-4 transition-colors"
            >
              Đăng ký ngay
            </Link>
          </div>
        </SpotlightCard>
      </motion.div>
    </div>
  );
}
