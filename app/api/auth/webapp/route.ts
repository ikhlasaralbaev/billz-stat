import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { createSession, sessionCookieOptions } from "@/lib/session";
import { cookies } from "next/headers";

function validateInitData(initData: string): number | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const expectedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (hash !== expectedHash) return null;

    const userStr = params.get("user");
    if (!userStr) return null;

    const user = JSON.parse(userStr) as { id: number };
    return user.id;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { initData } = (await req.json()) as { initData: string };

    const telegramId = validateInitData(initData);
    if (!telegramId) {
      return NextResponse.json(
        { ok: false, error: "initData noto'g'ri yoki eskirgan." },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findOne({ telegramId });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Foydalanuvchi topilmadi. Avval botni ishga tushiring: /start" },
        { status: 404 }
      );
    }

    const sessionToken = await createSession(telegramId);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(sessionToken));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server xatosi." },
      { status: 500 }
    );
  }
}
