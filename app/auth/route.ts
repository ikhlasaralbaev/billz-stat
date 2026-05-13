import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { createSession, sessionCookieOptions } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/auth/error", req.url));
  }

  await connectDB();
  const user = await User.findOne({ webToken: token });

  if (!user) {
    return NextResponse.redirect(new URL("/auth/error", req.url));
  }

  const sessionToken = await createSession(user.telegramId);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(sessionToken));

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
