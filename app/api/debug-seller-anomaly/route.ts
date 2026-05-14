import { NextRequest, NextResponse } from "next/server";
import { getDashboardUser } from "@/lib/dashboard";
import { getToken, getShops } from "@/lib/billz";
import { getCachedSellerStats } from "@/services/sellerCache";
import { makeCacheKey, getFromCache } from "@/lib/billzCache";
import { detectSellerAnomalies } from "@/services/anomalyDetector";

function toDateStr(d: Date) {
  return new Date(d.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = req.nextUrl.searchParams.get("period") ?? "30d";
  const bypass = req.nextUrl.searchParams.get("bypass") === "1";

  try {
    const user = await getDashboardUser();
    if (!user?.billzToken) {
      return NextResponse.json({ error: "No user / billzToken", user: !!user });
    }

    const userId = String(user.telegramId);
    const today = toDateStr(new Date());
    const startDate =
      period === "today"
        ? today
        : period === "7d"
        ? toDateStr(new Date(Date.now() - 7 * 86400000))
        : toDateStr(new Date(Date.now() - 30 * 86400000));

    const token = await getToken(user.billzToken, userId);
    const shopIds = user.selectedShopIds?.length
      ? user.selectedShopIds
      : (await getShops(token, userId)).map((s) => s.id);

    const rows = await getCachedSellerStats(user, token, shopIds, startDate, today);
    const sorted = [...rows].sort((a, b) => b.net_gross_sales - a.net_gross_sales);

    const anomalyCacheKey = makeCacheKey(userId, "anomaly::sellers", {
      period,
      shopIds: shopIds.join(","),
    });

    const cachedValue = await getFromCache(anomalyCacheKey);

    const anomalies = await detectSellerAnomalies(
      sorted,
      period,
      user.language === "ru",
      userId,
      bypass ? undefined : anomalyCacheKey
    );

    return NextResponse.json({
      period,
      startDate,
      today,
      shopIds,
      sellersCount: rows.length,
      sellers: sorted.map((s) => ({
        name: s.seller_name,
        net_sales: Math.round(s.net_gross_sales),
        gross_profit: Math.round(s.gross_profit),
        margin_pct: s.net_gross_sales > 0 ? +((s.gross_profit / s.net_gross_sales) * 100).toFixed(1) : 0,
        discount_pct: +s.discount_percent.toFixed(1),
        returns: s.returns_count,
        products_sold: Math.round(s.products_sold),
        orders: s.sales,
        avg_cheque: Math.round(s.average_cheque),
      })),
      anthropicApiKeySet: !!process.env.ANTHROPIC_API_KEY,
      anomalyCacheKey,
      cachedValue: cachedValue ?? null,
      anomaliesFound: anomalies.length,
      anomalies,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), stack: e instanceof Error ? e.stack : undefined });
  }
}
