import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({}, {
    telegramId: 1,
    firstName: 1,
    lastName: 1,
    username: 1,
    role: 1,
    createdAt: 1,
  }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ users });
}
