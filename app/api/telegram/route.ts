import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/bot";

const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");

  if (secret !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  await bot.handleUpdate(body);

  return NextResponse.json({ ok: true });
}
