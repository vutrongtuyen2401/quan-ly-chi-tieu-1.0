"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Coins, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { fadeInUp, springConfig } from "@/lib/animations";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có tối thiểu 6 ký tự");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đăng ký không thành công");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    } catch {
      setError("Lỗi kết nối máy chủ, vui lòng thử lại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#080808] bg-metal-grid relative overflow-hidden">
      {/* Ambient gold orbs */}
      <div className="absolute top-1/3 left-1/3 w-[480px] h-[480px] bg-yellow-500/5 rounded-full blur-3xl pointer-events-none animate-float-slow" />
      <div className="absolute bottom-1/3 right-1/4 w-[520px] h-[520px] bg-yellow-600/4 rounded-full blur-3xl pointer-events-none animate-float-slow-reverse" />
      <div className="absolute top-2/3 left-1/4 w-80 h-80 bg-amber-500/3 rounded-full blur-2xl pointer-events-none animate-float-slow" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, #080808 100%)" }} />

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={springConfig.gentle}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-[#f5c842] to-[#92692a] items-center justify-center shadow-2xl shadow-yellow-500/30 mb-5 neon-glow-gold">
            <Coins className="h-8 w-8 text-[#080808]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient-gold mb-1">
            QuanLyChiTieu
          </h1>
          <p className="text-sm text-[#5a5a5a] font-medium">
            Bắt đầu hành trình tự do tài chính
          </p>
        </div>

        <SpotlightCard
          spotlightColor="rgba(245, 200, 66, 0.08)"
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: "rgba(10, 9, 8, 0.92)", backdropFilter: "blur(24px)", border: "1px solid rgba(245, 200, 66, 0.15)" } as React.CSSProperties}
        >
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/8 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Đăng ký thành công! Đang chuyển hướng sang đăng nhập...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Họ và tên"
                placeholder="Ví dụ: Nguyễn Văn An"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                label="Địa chỉ Email"
                type="email"
                placeholder="tenban@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                label="Mật khẩu"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <Input
                label="Xác nhận mật khẩu"
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              variant="shimmer"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              disabled={success}
            >
              <span>Đăng ký tài khoản</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-[#5a5a5a]">
            Đã có tài khoản?{" "}
            <Link
              href="/login"
              className="text-[#c0a035] hover:text-[#f5c842] font-semibold underline underline-offset-4 transition-colors"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </SpotlightCard>
      </motion.div>
    </div>
  );
}
