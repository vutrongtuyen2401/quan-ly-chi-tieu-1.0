"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { formatVND } from "@/lib/formatters";
import { CheckCircle2, XCircle, Sparkles, Receipt, ShieldCheck } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface AiDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId: string | null;
  suggestedData: any;
  onConfirmed?: () => void;
  onRejected?: () => void;
}

export function AiDraftModal({
  isOpen,
  onClose,
  draftId,
  suggestedData,
  onConfirmed,
  onRejected,
}: AiDraftModalProps) {
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<string>("EXPENSE");
  const [walletId, setWalletId] = useState<string>("");
  const [destinationWalletId, setDestinationWalletId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Tải danh sách ví và danh mục
  useEffect(() => {
    if (isOpen) {
      Promise.all([
        fetch("/api/wallets").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
      ]).then(([wData, cData]) => {
        const wList = wData.wallets || [];
        const cList = cData.categories || [];
        setWallets(wList);
        setCategories(cList);

        // Khởi tạo giá trị từ suggestedData của AI
        if (suggestedData) {
          setAmount(Number(suggestedData.amount) || 0);
          setType(suggestedData.type || "EXPENSE");
          setDescription(suggestedData.description || "");
          if (suggestedData.date) {
            setDate(new Date(suggestedData.date).toISOString().split("T")[0]);
          }

          // Khớp ví
          if (suggestedData.walletId) {
            setWalletId(suggestedData.walletId);
          } else if (suggestedData.walletName && wList.length > 0) {
            const match = wList.find((w: any) =>
              w.name.toLowerCase().includes(suggestedData.walletName.toLowerCase())
            );
            setWalletId(match ? match.id : wList[0].id);
          } else if (wList.length > 0) {
            setWalletId(wList[0].id);
          }

          // Khớp danh mục
          if (suggestedData.categoryId) {
            setCategoryId(suggestedData.categoryId);
          } else if (suggestedData.categoryName && cList.length > 0) {
            const match = cList.find((c: any) =>
              c.name.toLowerCase().includes(suggestedData.categoryName.toLowerCase())
            );
            if (match) setCategoryId(match.id);
          }
        }
      });
    }
  }, [isOpen, suggestedData]);

  const handleConfirm = async () => {
    if (!draftId) return;
    if (amount <= 0) {
      setError("Số tiền phải lớn hơn 0");
      return;
    }
    if (!walletId) {
      setError("Vui lòng chọn ví thanh toán");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/ai/drafts/${draftId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          type,
          walletId,
          destinationWalletId: type === "TRANSFER" ? destinationWalletId : null,
          categoryId: type !== "TRANSFER" ? categoryId : null,
          description,
          note,
          date: new Date(date).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể xác nhận giao dịch");
      } else {
        onClose();
        if (onConfirmed) onConfirmed();
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!draftId) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/ai/drafts/${draftId}/reject`, { method: "POST" });
      onClose();
      if (onRejected) onRejected();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confidenceScore = suggestedData?.confidence ? Math.round(suggestedData.confidence * 100) : 96;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận Bản nháp AI (Draft)"
      description="AI đã phân tích dữ liệu bên dưới. Hãy kiểm tra hoặc chỉnh sửa trước khi ghi sổ chính thức."
      maxWidth="lg"
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {/* AI Guarantee Badge & Confidence Indicator */}
        <motion.div
          variants={staggerItem}
          className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs text-slate-300">
              <span className="font-bold text-cyan-300">Quy tắc An toàn Dữ liệu: </span>
              Hệ thống không bao giờ tự ghi đè số dư. Giao dịch chỉ có hiệu lực khi bạn bấm nút{" "}
              <span className="text-white font-semibold">&quot;Xác nhận ghi sổ&quot;</span>.
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-bold text-cyan-300">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span>Độ tin cậy: {confidenceScore}%</span>
          </div>
        </motion.div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Amount Display & Input */}
        <motion.div
          variants={staggerItem}
          className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
        >
          <div>
            <span className="text-xs text-slate-400 font-medium">Số tiền ước tính:</span>
            <div className="text-2xl font-black text-cyan-400 num-tabular mt-0.5">
              {formatVND(amount)}
            </div>
          </div>
          <div className="w-40">
            <Input
              label="Sửa số tiền (VNĐ)"
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              required
            />
          </div>
        </motion.div>

        {/* Type & Date */}
        <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3">
          <div>
            <Select
              label="Loại giao dịch"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="EXPENSE">Chi tiêu (Expense)</option>
              <option value="INCOME">Thu nhập (Income)</option>
              <option value="TRANSFER">Chuyển tiền nội bộ (Transfer)</option>
            </Select>
          </div>
          <div>
            <Input
              label="Ngày giao dịch"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Wallets */}
        <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3">
          <div>
            <Select
              label="Ví / Tài khoản nguồn"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
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
                label="Ví đích nhận tiền"
                value={destinationWalletId}
                onChange={(e) => setDestinationWalletId(e.target.value)}
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
                <option value="">-- Chưa phân loại --</option>
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
        </motion.div>

        {/* Description & Note */}
        <motion.div variants={staggerItem}>
          <Input
            label="Mô tả giao dịch"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ví dụ: Ăn phở bò sáng tại Lò Đúc"
            required
          />
        </motion.div>

        <motion.div variants={staggerItem}>
          <Input
            label="Ghi chú thêm (Tùy chọn)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú đối tác, hoá đơn số..."
          />
        </motion.div>

        {/* Receipt items breakdown if available */}
        {suggestedData?.items && suggestedData.items.length > 0 && (
          <motion.div
            variants={staggerItem}
            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
          >
            <span className="font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
              <Receipt className="h-3.5 w-3.5 text-cyan-400" />
              <span>Chi tiết các món bóc tách từ hóa đơn:</span>
            </span>
            <div className="space-y-1">
              {suggestedData.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-slate-400">
                  <span>
                    • {item.name} {item.quantity ? `(x${item.quantity})` : ""}
                  </span>
                  <span className="font-medium text-slate-200">
                    {item.price ? formatVND(item.price) : ""}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          variants={staggerItem}
          className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3"
        >
          <Button
            type="button"
            variant="ghost"
            onClick={handleReject}
            disabled={isSubmitting}
            className="text-rose-400 hover:bg-rose-950/30"
          >
            <XCircle className="h-4 w-4" />
            <span>Hủy bỏ bản nháp</span>
          </Button>

          <Button
            type="button"
            variant="cyan"
            onClick={handleConfirm}
            isLoading={isSubmitting}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Xác nhận ghi sổ</span>
          </Button>
        </motion.div>
      </motion.div>
    </Modal>
  );
}
