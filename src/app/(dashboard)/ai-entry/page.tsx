"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  Mic,
  MicOff,
  Camera,
  MessageSquare,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Lightbulb,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatVND, formatDateTimeVI } from "@/lib/formatters";
import { AiDraftModal } from "@/components/ai/ai-draft-modal";

export default function AiEntryPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"text" | "voice" | "receipt">("text");
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Receipt state
  const [receiptBase64, setReceiptBase64] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");

  // Modal confirm draft
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedDraftData, setSelectedDraftData] = useState<any>(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/drafts");
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Init Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "vi-VN";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setTextInput(transcript);
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
          setError("Lỗi nhận diện âm thanh, vui lòng kiểm tra micro hoặc gõ văn bản.");
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported) {
      setError("Trình duyệt không hỗ trợ Web Speech API tiếng Việt.");
      return;
    }
    setError("");
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTextInput("");
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) {
      setError("Vui lòng nhập nội dung");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/ai/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể phân tích dữ liệu");
      } else {
        setTextInput("");
        loadDrafts();
        // Mở ngay modal xác nhận cho người dùng duyệt
        setSelectedDraftId(data.draftId);
        setSelectedDraftData(data.suggestedData);
        setIsDraftModalOpen(true);
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReceiptSubmit = async () => {
    setIsProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/ai/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: receiptBase64,
          ocrText: receiptFileName ? `Hóa đơn ${receiptFileName}` : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể bóc tách hóa đơn");
      } else {
        setReceiptBase64("");
        setReceiptFileName("");
        loadDrafts();
        setSelectedDraftId(data.draftId);
        setSelectedDraftData(data.suggestedData);
        setIsDraftModalOpen(true);
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewDraft = (draft: any) => {
    setSelectedDraftId(draft.id);
    setSelectedDraftData(draft.suggestedData);
    setIsDraftModalOpen(true);
  };

  const handleRejectDraft = async (id: string) => {
    try {
      await fetch(`/api/ai/drafts/${id}/reject`, { method: "POST" });
      loadDrafts();
    } catch (e) {
      console.error(e);
    }
  };

  const samplePrompts = [
    "Ăn sáng phở bò 45k bằng ví MoMo",
    "Đổ xăng Honda 70k tiền mặt trong ví",
    "Nhận lương tháng này 35 triệu qua Vietcombank",
    "Mua đồ siêu thị WinMart 280k",
    "Chuyển 2 triệu từ Vietcombank sang MoMo",
  ];

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-cyan-400 animate-pulse" />
          <span>Trung Tâm Nhập Liệu AI Thông Minh</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Hỗ trợ bóc tách giao dịch từ câu nói tự nhiên, giọng nói tiếng Việt và ảnh chụp hóa đơn.
          Tất cả kết quả đều tạo bản nháp chờ bạn xác nhận.
        </p>
      </div>

      {/* Main AI Input Studio Card */}
      <Card className="glass-card border-cyan-500/30 shadow-2xl p-6">
        {/* Sub-tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-900/90 border border-slate-800 max-w-md mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab("text");
              setError("");
            }}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "text"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Câu tự nhiên</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("voice");
              setError("");
            }}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "voice"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Mic className="h-4 w-4" />
            <span>Giọng nói</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("receipt");
              setError("");
            }}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "receipt"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>Hóa đơn / OCR</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Tab 1: Text */}
        {activeTab === "text" && (
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <textarea
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Nhập câu chi tiêu bằng tiếng Việt (ví dụ: 'Trưa nay ăn cơm tấm 45k trả bằng ví MoMo')..."
              className="w-full rounded-2xl bg-slate-900/90 border border-slate-800 p-4 text-base text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors shadow-inner"
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                <span>Thử nhanh:</span>
              </span>
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTextInput(p)}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            <Button
              type="submit"
              variant="cyan"
              size="lg"
              className="w-full sm:w-auto"
              isLoading={isProcessing}
            >
              <Sparkles className="h-4 w-4" />
              <span>Phân tích & Tạo bản nháp</span>
            </Button>
          </form>
        )}

        {/* Tab 2: Voice */}
        {activeTab === "voice" && (
          <div className="text-center py-8 space-y-4">
            <div className="relative inline-flex items-center justify-center">
              {isListening && (
                <span className="absolute h-28 w-28 rounded-full bg-purple-500/20 animate-ping" />
              )}
              <button
                type="button"
                onClick={toggleListening}
                className={`relative h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                  isListening
                    ? "bg-rose-600 text-white shadow-rose-600/50 scale-110"
                    : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-500/40 hover:scale-105"
                }`}
              >
                {isListening ? (
                  <MicOff className="h-8 w-8 animate-pulse" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
            </div>

            <div>
              <p className="text-sm font-bold text-white">
                {isListening ? "Đang lắng nghe... Hãy nói chi tiêu của bạn" : "Nhấn nút micro để nói"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ngôn ngữ: Tiếng Việt (vi-VN). Độ chính xác cao, nhận diện tức thì.
              </p>
            </div>

            {textInput && (
              <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/30 text-left max-w-lg mx-auto">
                <span className="text-xs text-purple-400 font-bold block uppercase">
                  Văn bản nhận diện:
                </span>
                <p className="text-sm text-white mt-1">{textInput}</p>
                <Button
                  type="button"
                  variant="purple"
                  className="w-full mt-3"
                  onClick={() => handleTextSubmit()}
                  isLoading={isProcessing}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Xác nhận & Bóc tách câu này</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Receipt */}
        {activeTab === "receipt" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-8 text-center transition-colors">
              <input
                type="file"
                id="receipt-main-upload"
                accept="image/*"
                onChange={handleReceiptUpload}
                className="hidden"
              />
              <label
                htmlFor="receipt-main-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                  <Upload className="h-7 w-7" />
                </div>
                <div className="text-base font-bold text-white">
                  {receiptFileName || "Kéo thả hoặc bấm để chọn ảnh hóa đơn"}
                </div>
                <p className="text-xs text-slate-400">
                  Hỗ trợ hóa đơn siêu thị (WinMart, Co.opmart), cafe (Highlands, Phúc Long), cây xăng Petrolimex...
                </p>
              </label>
            </div>

            {receiptBase64 && (
              <div className="rounded-xl overflow-hidden border border-slate-800 max-h-56 flex justify-center bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptBase64}
                  alt="Ảnh hóa đơn"
                  className="object-contain max-h-56"
                />
              </div>
            )}

            <Button
              type="button"
              variant="cyan"
              className="w-full sm:w-auto"
              onClick={handleReceiptSubmit}
              isLoading={isProcessing}
            >
              <Camera className="h-4 w-4" />
              <span>Bóc tách hóa đơn & Tạo bản nháp</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Pending Drafts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>Hàng đợi Bản nháp chờ xác nhận</span>
              <Badge variant="cyan">{drafts.length}</Badge>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tất cả dữ liệu AI bắt buộc phải được bạn xem lại và bấm &quot;Xác nhận&quot; mới ghi vào sổ.
            </p>
          </div>
        </div>

        {drafts.length === 0 ? (
          <Card className="glass-card text-center py-12">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-slate-800 border border-slate-700 items-center justify-center text-slate-500 mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-white">Không có bản nháp nào đang chờ duyệt</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Bạn đã xác nhận toàn bộ giao dịch. Hãy nhập thêm bằng câu tự nhiên, giọng nói hoặc ảnh hóa đơn ở phía trên!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drafts.map((draft) => {
              const data = draft.suggestedData || {};
              const isExpense = data.type === "EXPENSE";

              return (
                <Card
                  key={draft.id}
                  className="glass-card border border-cyan-500/30 hover:border-cyan-500/60 transition-all p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="purple" size="sm">
                          {draft.sourceType === "VOICE"
                            ? "Giọng nói"
                            : draft.sourceType === "RECEIPT"
                            ? "Ảnh hóa đơn"
                            : "Câu tự nhiên"}
                        </Badge>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTimeVI(draft.createdAt)}</span>
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mt-2">
                        {data.description || draft.rawInput}
                      </h4>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-lg font-black num-tabular ${
                          isExpense ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {formatVND(data.amount)}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {isExpense ? "Chi tiêu" : "Thu nhập"}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
                      Ví: <strong className="text-cyan-400">{data.walletName || "Tiền mặt"}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
                      Danh mục: <strong className="text-purple-400">{data.categoryName || "Khác"}</strong>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRejectDraft(draft.id)}
                      className="text-rose-400 hover:bg-rose-950/30 text-xs"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Hủy</span>
                    </Button>
                    <Button
                      type="button"
                      variant="cyan"
                      size="sm"
                      onClick={() => handleReviewDraft(draft)}
                      className="text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Xem lại & Ghi sổ</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AiDraftModal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        draftId={selectedDraftId}
        suggestedData={selectedDraftData}
        onConfirmed={() => {
          loadDrafts();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("transaction-updated"));
          }
        }}
        onRejected={() => {
          loadDrafts();
        }}
      />
    </div>
  );
}
