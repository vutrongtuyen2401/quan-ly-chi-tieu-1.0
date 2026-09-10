"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Sparkles, Mic, MicOff, Camera, MessageSquare, Upload, Lightbulb } from "lucide-react";
import { cn } from "@/components/ui/button";
import { springConfig } from "@/lib/animations";

interface AiQuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDraftCreated: (draftId: string, suggestedData: any) => void;
}

export function AiQuickEntryModal({
  isOpen,
  onClose,
  onDraftCreated,
}: AiQuickEntryModalProps) {
  const [activeTab, setActiveTab] = useState<"text" | "voice" | "receipt">("text");
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Receipt upload state
  const [receiptImageBase64, setReceiptImageBase64] = useState<string>("");
  const [receiptImageName, setReceiptImageName] = useState<string>("");

  // Kiểm tra hỗ trợ Web Speech API
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
          setError("Không thể thu âm hoặc nhận diện giọng nói, vui lòng thử lại hoặc gõ văn bản.");
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
      setError("Trình duyệt hiện tại chưa hỗ trợ Web Speech API tiếng Việt.");
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
      } catch (e) {
        console.error(e);
        setIsListening(false);
      }
    }
  };

  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) {
      setError("Vui lòng nhập nội dung câu nói");
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
        onClose();
        setTextInput("");
        onDraftCreated(data.draftId, data.suggestedData);
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImageBase64(reader.result as string);
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
          imageBase64: receiptImageBase64,
          ocrText: receiptImageName ? `Hóa đơn mua sắm ${receiptImageName}` : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Không thể bóc tách hóa đơn");
      } else {
        onClose();
        setReceiptImageBase64("");
        setReceiptImageName("");
        onDraftCreated(data.draftId, data.suggestedData);
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsProcessing(false);
    }
  };

  const samplePrompts = [
    "Trưa nay ăn bún chả 55k bằng ví MoMo",
    "Nhận thưởng dự án 5 triệu chuyển vào Vietcombank",
    "Đổ xăng xe máy 80 nghìn tiền mặt",
    "Mua đồ siêu thị WinMart hết 320k",
    "Chuyển 1.5 triệu từ Vietcombank sang MoMo",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nhập liệu Tài chính Thông minh (AI)"
      description="Ghi sổ cực nhanh qua câu nói tự nhiên, giọng nói tiếng Việt hoặc ảnh chụp hóa đơn."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("text");
              setError("");
            }}
            className={cn(
              "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === "text"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow"
                : "text-slate-400 hover:text-white"
            )}
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
            className={cn(
              "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === "voice"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow"
                : "text-slate-400 hover:text-white"
            )}
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
            className={cn(
              "flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === "receipt"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Camera className="h-4 w-4" />
            <span>Hóa đơn / OCR</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Tab 1: Natural Language Text Input */}
        {activeTab === "text" && (
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Nói hoặc gõ bằng ngôn ngữ tự nhiên:
              </label>
              <textarea
                rows={3}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ví dụ: Tối qua đi siêu thị hết 350k quẹt thẻ Vietcombank..."
                className="w-full rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            {/* Quick sample prompt chips */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                <span>Gợi ý mẫu câu phổ biến:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((p, i) => (
                  <motion.button
                    key={i}
                    type="button"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springConfig.snappy}
                    onClick={() => setTextInput(p)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors text-left"
                  >
                    {p}
                  </motion.button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="cyan"
              className="w-full"
              isLoading={isProcessing}
            >
              <Sparkles className="h-4 w-4" />
              <span>Phân tích & Tạo bản nháp</span>
            </Button>
          </form>
        )}

        {/* Tab 2: Voice Input */}
        {activeTab === "voice" && (
          <div className="text-center py-6 space-y-4">
            <div className="relative inline-flex items-center justify-center">
              {isListening && (
                <>
                  <span className="absolute h-24 w-24 rounded-full bg-purple-500/20 animate-ping" />
                  <span className="absolute h-32 w-32 rounded-full bg-cyan-500/10 animate-pulse" />
                </>
              )}
              <button
                type="button"
                onClick={toggleListening}
                className={cn(
                  "relative h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer",
                  isListening
                    ? "bg-rose-600 text-white shadow-rose-600/50 scale-110"
                    : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-500/40 hover:scale-105"
                )}
              >
                {isListening ? (
                  <MicOff className="h-8 w-8 animate-pulse" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>
            </div>

            {/* Futuristic Audio Waveform Animation when listening */}
            {isListening ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 h-10 px-4 py-2 rounded-full bg-purple-950/40 border border-purple-500/30">
                  <span className="w-1 bg-cyan-400 rounded-full animate-wave-1" />
                  <span className="w-1 bg-cyan-300 rounded-full animate-wave-2" />
                  <span className="w-1 bg-purple-400 rounded-full animate-wave-3" />
                  <span className="w-1 bg-purple-300 rounded-full animate-wave-4" />
                  <span className="w-1 bg-indigo-400 rounded-full animate-wave-5" />
                  <span className="w-1 bg-cyan-400 rounded-full animate-wave-2" />
                  <span className="w-1 bg-purple-400 rounded-full animate-wave-1" />
                </div>
                <p className="text-sm font-bold text-white">Đang lắng nghe câu nói của bạn...</p>
                <p className="text-xs text-purple-300">Nói tự nhiên, ví dụ: &quot;Ăn trưa 45 nghìn tiền mặt&quot;</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-white">Nhấn vào micro để bắt đầu nói</p>
                <p className="text-xs text-slate-400 mt-1">
                  Ví dụ: &quot;Ăn sáng bánh cuốn 35 nghìn tiền mặt&quot;
                </p>
              </div>
            )}

            {textInput && (
              <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/30 text-left">
                <span className="text-[11px] text-purple-400 font-bold uppercase block">
                  Văn bản nhận diện được:
                </span>
                <p className="text-sm text-white mt-0.5">{textInput}</p>
                <Button
                  type="button"
                  variant="purple"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => handleTextSubmit()}
                  isLoading={isProcessing}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Tạo bản nháp từ câu này</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Receipt Scanner */}
        {activeTab === "receipt" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-colors">
              <input
                type="file"
                id="receipt-file-input"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <label
                htmlFor="receipt-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-white">
                  {receiptImageName ? receiptImageName : "Tải lên ảnh chụp hóa đơn"}
                </div>
                <p className="text-xs text-slate-400">
                  Hỗ trợ định dạng JPG, PNG từ nhà hàng, siêu thị, cây xăng...
                </p>
              </label>
            </div>

            {receiptImageBase64 && (
              <div className="rounded-xl overflow-hidden border border-slate-800 max-h-48 flex justify-center bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receiptImageBase64}
                  alt="Hóa đơn"
                  className="object-contain max-h-48"
                />
              </div>
            )}

            <Button
              type="button"
              variant="cyan"
              className="w-full"
              onClick={handleReceiptSubmit}
              isLoading={isProcessing}
            >
              <Camera className="h-4 w-4" />
              <span>Bóc tách & Nhận diện Hóa đơn</span>
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
