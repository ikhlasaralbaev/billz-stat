import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/user";
import { createSession, sessionCookieOptions } from "@/lib/session";

function publicBase(req: NextRequest): string {
  // Railway (and other reverse proxies) run the app on an internal port.
  // req.url contains the internal address (e.g. http://localhost:8080/...).
  // Use x-forwarded-* headers to reconstruct the real public URL.
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host  = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

const ALLOWED_REDIRECTS = ["/dashboard", "/admin"];

export async function GET(req: NextRequest) {
  const token    = req.nextUrl.searchParams.get("token");
  const redirect = req.nextUrl.searchParams.get("redirect") ?? "/dashboard";
  const base     = publicBase(req);

  if (!token) {
    return NextResponse.redirect(`${base}/auth/error`);
  }

  const destination = ALLOWED_REDIRECTS.includes(redirect) ? redirect : "/dashboard";

  await connectDB();
  const user = await User.findOne({ webToken: token });

  if (!user) {
    return NextResponse.redirect(`${base}/auth/error`);
  }

  const sessionToken = await createSession(user.telegramId, user.role ?? "USER");
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(sessionToken));

  return NextResponse.redirect(`${base}${destination}`);
}
