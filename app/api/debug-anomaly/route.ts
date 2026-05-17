import { NextRequest, NextResponse } from "next/server";
import { getDashboardUser } from "@/lib/dashboard";
import { getToken, getShops, getGeneralReport } from "@/lib/billz";
import { decryptBillzToken } from "@/lib/crypto";
import { makeCacheKey, getFromCache } from "@/lib/billzCache";
import { detectShopAnomalies } from "@/services/anomalyDetector";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bypass = req.nextUrl.searchParams.get("bypass") === "1";

  try {
    const user = await getDashboardUser();
    if (!user?.billzToken) return NextResponse.json({ error: "No user / billzToken" });

    const token = await getToken(decryptBillzToken(user.billzToken!));
    const shopIds = user.selectedShopIds?.length
      ? user.selectedShopIds
      : (await getShops(token)).map((s) => s.id);

    const today = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const startDate = new Date(Date.now() + 5 * 60 * 60 * 1000 - 30 * 86400000).toISOString().slice(0, 10);
    const period = `${startDate} – ${today}`;

    const rows = await getGeneralReport(token, shopIds, startDate, today);

    const cacheKey = makeCacheKey(String(user.telegramId), "anomaly::shop", {
      period,
      shopIds: shopIds.join(","),
    });

    // Check what's in cache right now
    const cachedValue = await getFromCache(cacheKey);

    // Run full anomaly detection (pass null cacheKey to bypass cache when ?bypass=1)
    const anomalies = await detectShopAnomalies(
      rows,
      period,
      false,
      String(user.telegramId),
      bypass ? undefined : cacheKey
    );

    return NextResponse.json({
      rowsCount: rows.length,
      firstRow: rows[0] ?? null,
      shopIds,
      anthropicApiKeySet: !!process.env.ANTHROPIC_API_KEY,
      cacheKey,
      cachedValue,          // what was in cache before this call
      anomaliesFound: anomalies.length,
      anomalies,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
