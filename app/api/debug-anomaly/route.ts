import { NextRequest, NextResponse } from "next/server";
import { getDashboardUser } from "@/lib/dashboard";
import { getToken, getShops, getGeneralReport } from "@/lib/billz";
import { makeCacheKey } from "@/lib/billzCache";
import Anthropic from "@anthropic-ai/sdk";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getDashboardUser();
    if (!user?.billzToken) return NextResponse.json({ error: "No user/token" });

    const token = await getToken(user.billzToken);
    const shopIds = user.selectedShopIds?.length
      ? user.selectedShopIds
      : (await getShops(token)).map((s) => s.id);

    const today = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const startDate = new Date(Date.now() + 5 * 60 * 60 * 1000 - 30 * 86400000).toISOString().slice(0, 10);
    const rows = await getGeneralReport(token, shopIds, startDate, today);

    // Test Anthropic call directly
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `Test: say {"anomalies":[]}`;

    let anthropicOk = false;
    let anthropicError = "";
    try {
      await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 64,
        messages: [{ role: "user", content: prompt }],
      });
      anthropicOk = true;
    } catch (e) {
      anthropicError = String(e);
    }

    const cacheKey = makeCacheKey(String(user.telegramId), "anomaly::shop", {
      period: `${startDate}–${today}`,
      shopIds: shopIds.join(","),
    });

    return NextResponse.json({
      rowsCount: rows.length,
      shopIds,
      anthropicOk,
      anthropicError,
      anthropicApiKeySet: !!process.env.ANTHROPIC_API_KEY,
      cacheKey,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
