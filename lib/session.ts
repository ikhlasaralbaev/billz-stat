import { cookies } from "next/headers";
import { signJwt, verifyJwt, SessionPayload } from "@/lib/jwt";
import { UserRole } from "@/models/user";

export type { SessionPayload };

const COOKIE_NAME = "billz_session";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function createSession(telegramId: number, role: UserRole): Promise<string> {
  return signJwt(telegramId, role);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: MAX_AGE,
    path: "/",
  };
}
