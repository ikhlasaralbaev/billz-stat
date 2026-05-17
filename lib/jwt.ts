import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "@/models/user";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "billz-stat-dev-secret-change-in-production"
);

export interface SessionPayload {
  telegramId: number;
  role: UserRole;
}

export async function signJwt(telegramId: number, role: UserRole): Promise<string> {
  return new SignJWT({ telegramId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyJwt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      telegramId: payload.telegramId as number,
      role: (payload.role as UserRole) ?? "USER",
    };
  } catch {
    return null;
  }
}
