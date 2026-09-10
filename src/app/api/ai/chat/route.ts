import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processAiFinancialChat, ChatHistoryItem, AiProviderError } from "@/lib/ai/chatbot";
import { safeAiLog } from "@/lib/ai/gemini-client";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const requestId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rateLimitKey = `ai_chat:${session.user.id || clientIp}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.AI_CHAT);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Trợ lý AI đang tiếp nhận quá nhiều yêu cầu từ bạn. Vui lòng chờ ${rateLimit.retryAfterSeconds} giây trước khi gửi tiếp.`
      );
    }

    const body = await req.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Vui lòng nhập câu hỏi" }, { status: 400 });
    }

    const cleanMessage = message.trim();
    const userId = session.user.id;

    // 1. Tìm hoặc tạo cuộc trò chuyện (Conversation) thuộc về user
    let activeConversationId = conversationId;

    if (activeConversationId) {
      const existingConv = await prisma.chatConversation.findFirst({
        where: { id: activeConversationId, userId },
      });
      if (!existingConv) {
        // Nếu conversationId không hợp lệ hoặc không thuộc user này, reset để tạo mới
        activeConversationId = null;
      }
    }

    if (!activeConversationId) {
      // Tự động đặt tiêu đề tóm tắt từ câu hỏi đầu tiên
      const autoTitle =
        cleanMessage.length > 35 ? cleanMessage.slice(0, 32) + "..." : cleanMessage;

      const newConv = await prisma.chatConversation.create({
        data: {
          userId,
          title: autoTitle,
        },
      });
      activeConversationId = newConv.id;
    }

    // 2. Lấy 12 tin nhắn gần nhất theo thời gian giảm dần (desc), sau đó đảo lại để có thứ tự thời gian tăng dần
    // QUAN TRỌNG: Lấy trước khi lưu tin nhắn mới để không bị trùng lặp câu hỏi hiện tại trong history
    const recentDbMessages = await prisma.chatMessage.findMany({
      where: { conversationId: activeConversationId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { role: true, content: true },
    });

    // Đảo ngược mảng để gửi cho Gemini theo thứ tự thời gian tăng dần (từ cũ đến mới hơn)
    const chronologicalMessages = [...recentDbMessages].reverse();
    const history: ChatHistoryItem[] = chronologicalMessages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content,
    }));

    // 3. Bây giờ mới lưu tin nhắn mới của người dùng vào database
    await prisma.chatMessage.create({
      data: {
        conversationId: activeConversationId,
        role: "USER",
        content: cleanMessage,
      },
    });

    safeAiLog("info", "Processing AI Chat Message", {
      requestId,
      status: "success",
    });

    // 4. Xử lý câu trả lời với Gemini Function Calling và Timeout Cleanup an toàn
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<string>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error("AI_TIMEOUT"));
      }, 90000);
    });

    let reply: string;
    try {
      reply = await Promise.race([
        processAiFinancialChat(userId, cleanMessage, history),
        timeoutPromise,
      ]);
    } finally {
      // Dọn dẹp timeout handle ngay khi promise hoàn thành (dù thành công hay lỗi)
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
    }

    // 5. Lưu tin nhắn phản hồi của Assistant vào database và cập nhật thời gian hội thoại
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        conversationId: activeConversationId,
        role: "ASSISTANT",
        content: reply,
      },
    });

    await prisma.chatConversation.update({
      where: { id: activeConversationId },
      data: { updatedAt: new Date() },
    });

    const durationMs = Date.now() - startTime;
    safeAiLog("info", "AI Chat Message Completed", {
      requestId,
      durationMs,
      status: "success",
    });

    return NextResponse.json({
      reply,
      conversationId: activeConversationId,
      messageId: assistantMessage.id,
    });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    // Bắt lỗi định kiểu từ AI Provider
    if (error instanceof AiProviderError) {
      safeAiLog("error", "AI Provider Typed Error", {
        requestId,
        model: error.model,
        toolMode: error.toolMode,
        durationMs,
        status: "error",
        errorSnippet: error.code,
      });

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          requestId,
        },
        { status: error.statusCode }
      );
    }

    const errorMessage = error?.message || "";
    safeAiLog("error", "AI chat API route unexpected error", {
      requestId,
      durationMs,
      status: "error",
      errorSnippet: errorMessage.slice(0, 100),
    });

    if (errorMessage.includes("AI_TIMEOUT")) {
      return NextResponse.json(
        {
          error: "Yêu cầu xử lý AI bị quá thời gian (Timeout). Vui lòng thử lại sau.",
          code: "AI_TIMEOUT",
          requestId,
        },
        { status: 504 }
      );
    }

    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("404") ||
      errorMessage.includes("unsupported") ||
      errorMessage.includes("GEMINI_MODEL") ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.includes("429")
    ) {
      return NextResponse.json(
        {
          error: "Mô hình AI hiện tạm thời không khả dụng hoặc vượt hạn mức. Vui lòng thử lại sau.",
          code: "AI_SERVICE_UNAVAILABLE",
          requestId,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Không thể nhận phản hồi từ trợ lý AI lúc này. Vui lòng thử lại sau giây lát.",
        code: "AI_GATEWAY_ERROR",
        requestId,
      },
      { status: 502 }
    );
  }
}

