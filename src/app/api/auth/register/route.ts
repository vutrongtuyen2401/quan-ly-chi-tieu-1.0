import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterSchema } from "@/lib/validations";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`register:${clientIp}`, RATE_LIMIT_CONFIGS.AUTH_REGISTER);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Bạn đã gửi yêu cầu đăng ký quá nhiều lần. Vui lòng thử lại sau ${rateLimit.retryAfterSeconds} giây.`
      );
    }

    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
    const lowerEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email này đã được đăng ký trong hệ thống" },
        { status: 400 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Tạo người dùng mới và khởi tạo 2 ví mặc định (Tiền mặt & Ngân hàng)
    const newUser = await prisma.user.create({
      data: {
        name,
        email: lowerEmail,
        passwordHash,
        role: "USER",
        status: "ACTIVE",
        wallets: {
          create: [
            {
              name: "Tiền mặt",
              type: "CASH",
              balance: BigInt(0),
              initialBalance: BigInt(0),
              color: "#10b981",
              icon: "Banknote",
            },
            {
              name: "Tài khoản Ngân hàng",
              type: "BANK",
              bankName: "Ngân hàng",
              balance: BigInt(0),
              initialBalance: BigInt(0),
              color: "#06b6d4",
              icon: "Building2",
            },
          ],
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Lỗi đăng ký:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi máy chủ trong quá trình đăng ký" },
      { status: 500 }
    );
  }
}
