import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "billz-stat-dev-secret-change-in-production"
);

export interface SessionPayload {
  telegramId: number;
}

export async function signJwt(telegramId: number): Promise<string> {
  return new SignJWT({ telegramId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyJwt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { telegramId: payload.telegramId as number };
  } catch {
    return null;
  }
}
