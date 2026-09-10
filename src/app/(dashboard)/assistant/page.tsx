"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  BotMessageSquare,
  Send,
  Sparkles,
  User,
  Lightbulb,
  ShieldCheck,
  Plus,
  Trash2,
  Clock,
  Menu,
  X,
  MessageSquare,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, useReducedMotion } from "motion/react";
import { chatBubbleVariants } from "@/lib/animations";

interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  lastMessage?: string | null;
  messageCount: number;
}

/**
 * Trình render Markdown an toàn, hỗ trợ tiêu đề, danh sách, in đậm, bảng và khối ghi chú
 */
function SafeMarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let isTable = false;

  const parseInline = (text: string): React.ReactNode => {
    // Tách bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={i} className="italic text-cyan-200">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-xs">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const flushTable = (keyIndex: number) => {
    if (tableRows.length === 0) return;
    const header = tableRows[0];
    const rows = tableRows.slice(1);

    elements.push(
      <div key={`table-${keyIndex}`} className="overflow-x-auto my-3 rounded-xl border border-slate-800">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-slate-900/80 text-cyan-300 border-b border-slate-800 font-bold">
            <tr>
              {header.map((col, ci) => (
                <th key={ci} className="px-3 py-2">{parseInline(col.trim())}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
            {rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-slate-900/40 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-slate-300">{parseInline(cell.trim())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    isTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Xử lý Table markdown: | Col1 | Col2 |
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      // Bỏ qua dòng phân cách |---|---|
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        continue;
      }
      isTable = true;
      tableRows.push(cells);
      continue;
    } else if (isTable) {
      flushTable(i);
    }

    // Tiêu đề ###
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="text-sm font-bold text-cyan-300 mt-3 mb-1.5 flex items-center gap-1.5">
          <span>{parseInline(line.slice(4))}</span>
        </h4>
      );
      continue;
    }
    // Tiêu đề ##
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="text-base font-bold text-white mt-4 mb-2 flex items-center gap-2">
          <span>{parseInline(line.slice(3))}</span>
        </h3>
      );
      continue;
    }

    // Bullet points: - hoặc •
    if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-1 my-1">
          <span className="text-cyan-400 mt-1 shrink-0 text-xs">◆</span>
          <span className="text-slate-200">{parseInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Blockquote >
    if (line.startsWith("> ")) {
      elements.push(
        <div key={i} className="p-3 my-2 rounded-xl bg-cyan-950/20 border-l-4 border-cyan-500 text-cyan-200 text-xs italic">
          {parseInline(line.slice(2))}
        </div>
      );
      continue;
    }

    // Dòng trống
    if (!line) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Đoạn văn thường
    elements.push(
      <p key={i} className="my-1 text-slate-200">
        {parseInline(line)}
      </p>
    );
  }

  if (isTable) {
    flushTable(lines.length);
  }

  return <div className="space-y-0.5 text-sm leading-relaxed">{elements}</div>;
}

export default function AssistantPage() {
  const shouldReduceMotion = useReducedMotion();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Xin chào! Tôi là **Trợ lý Tài chính Cá nhân AI** của bạn.

Tôi được trang bị **9 công cụ đọc dữ liệu an toàn (Read-Only)** để phân tích số dư ví, đối soát ngân sách, theo dõi mục tiêu tiết kiệm và sổ nợ thực tế của bạn.

Bạn có thể bấm vào các gợi ý bên dưới hoặc hỏi bất cứ điều gì!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 1. Tải danh sách các cuộc trò chuyện của user
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (e) {
      console.error("Lỗi tải hội thoại:", e);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 2. Chuyển đổi cuộc trò chuyện
  const handleSelectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setIsSidebarOpen(false);
    setErrorBanner(null);

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.conversation?.messages && data.conversation.messages.length > 0) {
          setMessages(data.conversation.messages);
        } else {
          setMessages([
            {
              role: "assistant",
              content: "Cuộc trò chuyện này chưa có tin nhắn nào. Bạn có thể bắt đầu đặt câu hỏi ngay!",
            },
          ]);
        }
      }
    } catch (e) {
      console.error("Lỗi tải tin nhắn hội thoại:", e);
    }
  };

  // 3. Tạo cuộc trò chuyện mới
  const handleCreateNewConversation = () => {
    setActiveConversationId(null);
    setIsSidebarOpen(false);
    setErrorBanner(null);
    setMessages([
      {
        role: "assistant",
        content: `Xin chào! Tôi là **Trợ lý Tài chính Cá nhân AI** của bạn.

Tôi có thể giúp bạn kiểm tra chi tiêu, kiểm soát ngân sách, tính toán tiết kiệm hoặc giải đáp kiến thức tài chính theo yêu cầu. Hãy đặt câu hỏi nhé!`,
      },
    ]);
  };

  // 4. Xóa cuộc trò chuyện
  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa cuộc trò chuyện này?")) return;

    try {
      const res = await fetch(`/api/ai/conversations/${convId}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConversationId === convId) {
          handleCreateNewConversation();
        }
      }
    } catch (e) {
      console.error("Lỗi xóa hội thoại:", e);
    }
  };

  // 5. Gửi tin nhắn
  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    setErrorBanner(null);
    const newMessages: Message[] = [...messages, { role: "user", content: textToSend.trim() }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          conversationId: activeConversationId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setLastFailedMessage(null);
        setErrorBanner(null);
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
        if (data.conversationId && data.conversationId !== activeConversationId) {
          setActiveConversationId(data.conversationId);
          loadConversations();
        }
      } else {
        const errorMsg = data.error || "Máy chủ AI tạm thời không khả dụng. Vui lòng thử lại sau.";
        setLastFailedMessage(textToSend.trim());
        setErrorBanner(errorMsg);
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: `⚠️ **Phản hồi không hoàn tất:** ${errorMsg}`,
          },
        ]);
      }
    } catch {
      const netError = "Lỗi kết nối mạng, vui lòng kiểm tra đường truyền và thử lại.";
      setLastFailedMessage(textToSend.trim());
      setErrorBanner(netError);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `⚠️ **Lỗi kết nối:** ${netError}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      loadConversations();
    }
  };

  const sampleQuestions = [
    "Tổng quan tài chính tháng này của tôi ra sao?",
    "Danh mục nào tôi chi nhiều nhất tháng này?",
    "Kiểm tra tình trạng các ngân sách của tôi",
    "Số dư chi tiết từng ví của tôi hiện tại?",
    "Các mục tiêu tiết kiệm của tôi tiến độ thế nào?",
    "Tình hình sổ nợ (cho vay & đi vay)?",
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BotMessageSquare className="h-7 w-7 text-cyan-400" />
            <span>Trợ Lý Tài Chính AI</span>
            <Badge variant="cyan" size="sm" className="hidden sm:inline-flex">
              Gemini 3.6 Flash + Search & Tools
            </Badge>
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Công cụ đọc an toàn Read-Only theo tài khoản, bảo vệ quyền riêng tư 100%.</span>
          </p>
        </div>

        {/* Mobile Sidebar Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="lg:hidden text-slate-300"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="ml-1 text-xs">Lịch sử</span>
        </Button>
      </div>

      {/* Error Banner with Retry Button */}
      {errorBanner && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="truncate">{errorBanner}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lastFailedMessage && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSend(lastFailedMessage)}
                disabled={isLoading}
                className="h-7 px-2.5 text-xs text-rose-200 border-rose-500/40 hover:bg-rose-500/20"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                <span>Thử lại</span>
              </Button>
            )}
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-400 hover:text-white text-xs font-bold px-1.5 py-0.5"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Main Container with Sidebar + Chat Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar: Lịch sử hội thoại */}
        <div
          className={`lg:col-span-4 xl:col-span-3 transition-all duration-300 ${
            isSidebarOpen
              ? "fixed inset-0 z-50 bg-slate-950/90 p-6 lg:static lg:p-0 lg:bg-transparent"
              : "hidden lg:block"
          }`}
        >
          <Card className="glass-card p-4 border border-slate-800 flex flex-col h-[680px] shadow-2xl">
            {/* Header Sidebar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Lịch sử trò chuyện</span>
              </span>
              <Button
                type="button"
                variant="cyan"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleCreateNewConversation}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Hội thoại mới</span>
              </Button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {conversations.length === 0 ? (
                <div className="text-center py-12 px-3 text-slate-500 text-xs">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Chưa có cuộc trò chuyện nào.</p>
                  <p className="mt-1 text-[11px] text-slate-600">Bắt đầu đặt câu hỏi để tạo hội thoại đầu tiên!</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isActive
                          ? "bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-500/10"
                          : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className={`text-xs font-bold line-clamp-1 flex-1 ${
                            isActive ? "text-cyan-300" : "text-slate-200 group-hover:text-white"
                          }`}
                        >
                          {conv.title || "Cuộc trò chuyện"}
                        </h4>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteConversation(e, conv.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition-opacity shrink-0"
                          title="Xóa cuộc trò chuyện này"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {conv.lastMessage && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">
                          {conv.lastMessage}
                        </p>
                      )}

                      <span className="text-[10px] text-slate-500 block mt-1.5 font-mono">
                        {new Date(conv.updatedAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Card className="glass-card p-0 overflow-hidden border border-slate-800 flex flex-col h-[680px] shadow-2xl">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 custom-scrollbar">
              {messages.map((m, idx) => {
                const isUser = m.role === "user";

                return (
                  <motion.div
                    key={idx}
                    variants={shouldReduceMotion ? undefined : chatBubbleVariants}
                    initial="hidden"
                    animate="visible"
                    className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                        isUser
                          ? "bg-purple-600 text-white shadow-purple-500/20"
                          : "bg-gradient-to-tr from-cyan-500 to-purple-600 text-white shadow-cyan-500/20"
                      }`}
                    >
                      {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl p-4 max-w-[88%] shadow-lg ${
                        isUser
                          ? "bg-purple-600/20 text-white border border-purple-500/30 rounded-tr-none shadow-purple-950/20"
                          : "bg-slate-900/95 text-slate-200 border border-slate-800 rounded-tl-none shadow-black/40 backdrop-blur-sm"
                      }`}
                    >
                      {isUser ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      ) : (
                        <SafeMarkdownRenderer content={m.content} />
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Dynamic Analyzing Indicator with Radar Scan and Typing Dots */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="relative h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg overflow-hidden">
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/30 to-transparent animate-radar" />
                    <Sparkles className="h-4 w-4 relative z-10 animate-pulse" />
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/30 rounded-tl-none text-xs text-cyan-300 shadow-xl shadow-cyan-950/20 space-y-2">
                    <div className="flex items-center gap-2">
                      {/* Bouncing 3 dots typing indicator */}
                      <div className="flex items-center gap-1 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" />
                      </div>
                      <span className="font-bold">AI đang phân tích và truy vấn dữ liệu...</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Đang tra cứu số liệu thực tế qua công cụ đọc an toàn (Read-Only) để giải đáp chính xác nhất.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Inline Retry Option when previous request failed */}
              {lastFailedMessage && !isLoading && (
                <div className="flex items-center gap-2 ml-12 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  <span>Câu hỏi chưa được hoàn tất. Bạn có muốn thử lại không?</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend(lastFailedMessage)}
                    className="h-7 px-3 text-xs text-amber-200 border-amber-500/40 hover:bg-amber-500/20"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    <span>Thử lại câu hỏi</span>
                  </Button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion Chips with motion */}
            <div className="px-4 py-2.5 border-t border-slate-800/60 bg-slate-950/50 flex items-center gap-2 overflow-x-auto custom-scrollbar">
              <span className="text-[11px] text-slate-500 font-bold shrink-0 flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-amber-400" />
                <span>Gợi ý:</span>
              </span>
              {sampleQuestions.map((q, i) => (
                <motion.button
                  key={i}
                  type="button"
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.03, y: -1 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
                  className="text-[11px] px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 whitespace-nowrap transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {q}
                </motion.button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/90">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hỏi về số dư, chi tiêu nhiều nhất, ngân sách, sổ nợ..."
                  className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  variant="cyan"
                  className="h-11 px-5 shrink-0"
                  isLoading={isLoading}
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Gửi câu hỏi</span>
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
