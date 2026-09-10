import { NextResponse } from "next/server";
import { checkGeminiHealth, isGeminiConfigured, getGeminiModelName } from "@/lib/ai/gemini-client";

export async function GET() {
  const isConfigured = isGeminiConfigured();
  const model = getGeminiModelName();

  if (!isConfigured) {
    return NextResponse.json({
      ok: false,
      configured: false,
      model,
      message: "Chưa cấu hình GEMINI_API_KEY trong file .env",
    });
  }

  const healthResult = await checkGeminiHealth();

  return NextResponse.json(
    {
      ok: healthResult.ok,
      configured: true,
      model: healthResult.model,
      message: healthResult.message,
    },
    { status: healthResult.ok ? 200 : 503 }
  );
}
