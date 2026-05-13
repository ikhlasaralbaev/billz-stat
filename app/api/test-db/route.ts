import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/user";

export async function GET() {
  try {
    await connectDB();

    let user = await User.findOne({ telegramId: 0 });

    if (!user) {
      user = await User.create({
        telegramId: 0,
        billzToken: "test-token",
      });
    }

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
