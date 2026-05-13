import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("billz_session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/error", req.url));
  }

  const session = await verifyJwt(token);
  if (!session) {
    return NextResponse.redirect(new URL("/auth/error", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
