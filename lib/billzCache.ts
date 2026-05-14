import { connectDB } from "@/lib/db";
import BillzRequestCache from "@/models/BillzRequestCache";

/** Build a stable cache key from userId + url + sorted params. */
export function makeCacheKey(
  userId: string | undefined,
  url: string,
  params: Record<string, unknown>
): string {
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => { acc[k] = params[k]; return acc; }, {});
  return `${userId ?? "anon"}::${url}::${JSON.stringify(sorted)}`;
}

/** Returns TTL in ms: 24 h for fully-historical ranges, 5 min if endDate is today. */
export function cacheTtl(endDate?: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return !endDate || endDate >= today ? 5 * 60_000 : 24 * 60 * 60_000;
}

/** Returns cached response data, or null on miss / error. */
export async function getFromCache(key: string): Promise<unknown> {
  try {
    await connectDB();
    const doc = await BillzRequestCache.findOne({
      cacheKey: key,
      expiresAt: { $gt: new Date() },
    }).lean();
    return doc ? doc.responseData : null;
  } catch {
    return null;
  }
}

/** Deletes all cache entries for a given user (call when token changes). */
export async function clearUserCache(userId: string): Promise<void> {
  try {
    await connectDB();
    await BillzRequestCache.deleteMany({ userTelegramId: userId });
  } catch (err) {
    console.error("[billzCache] clearUserCache failed:", err);
  }
}

/** Upserts a cache entry. Fire-and-forget friendly (never throws). */
export async function setCache(
  key: string,
  userId: string | undefined,
  url: string,
  params: unknown,
  data: unknown,
  ttlMs: number
): Promise<void> {
  try {
    await connectDB();
    await BillzRequestCache.findOneAndUpdate(
      { cacheKey: key },
      { $set: { userTelegramId: userId, url, params, responseData: data, expiresAt: new Date(Date.now() + ttlMs) } },
      { upsert: true }
    );
  } catch (err) {
    console.error("[billzCache] set failed:", err);
  }
}
