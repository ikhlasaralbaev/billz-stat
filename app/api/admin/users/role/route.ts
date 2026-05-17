import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User, { UserRole } from "@/models/user";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const { telegramId, role } = (await req.json()) as { telegramId: number; role: UserRole };

  if (!telegramId || !["USER", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  await connectDB();
  await User.updateOne({ telegramId }, { role });

  return NextResponse.json({ ok: true });
}
