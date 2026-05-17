import { NextRequest, NextResponse } from "next/server";
import { getDashboardUser } from "@/lib/dashboard";
import { getToken, getShops } from "@/lib/billz";
import { decryptBillzToken } from "@/lib/crypto";
import { getLang } from "@/lib/i18n";
import { getCachedSellerStats } from "@/services/sellerCache";
import { detectSellerAnomalies } from "@/services/anomalyDetector";
import { makeCacheKey, getFromCache } from "@/lib/billzCache";
import Anthropic from "@anthropic-ai/sdk";

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
    if (!user?.billzToken) return NextResponse.json({ error: "No user / billzToken" });

    const isRu = getLang(user) === "ru";
    const userId = String(user.telegramId);
    const today = toDateStr(new Date());
    const startDate =
      period === "today"
        ? today
        : period === "7d"
        ? toDateStr(new Date(Date.now() - 7 * 86400000))
        : toDateStr(new Date(Date.now() - 30 * 86400000));

    let token: string;
    try {
      token = await getToken(decryptBillzToken(user.billzToken), userId);
    } catch (e) {
      return NextResponse.json({ step: "getToken", error: String(e) });
    }

    let shopIds: string[];
    try {
      shopIds = user.selectedShopIds?.length
        ? user.selectedShopIds
        : (await getShops(token, userId)).map((s) => s.id);
    } catch (e) {
      return NextResponse.json({ step: "getShops", error: String(e) });
    }

    let rows;
    try {
      rows = await getCachedSellerStats(user, token, shopIds, startDate, today);
    } catch (e) {
      return NextResponse.json({ step: "getCachedSellerStats", error: String(e) });
    }

    const sorted = [...rows].sort((a, b) => b.net_gross_sales - a.net_gross_sales);

    const anomalyCacheKey = makeCacheKey(userId, "anomaly::sellers", {
      period,
      shopIds: shopIds.join(","),
    });

    const cachedValue = await getFromCache(anomalyCacheKey);

    let anomalies;
    try {
      anomalies = await detectSellerAnomalies(
        sorted,
        period,
        isRu,
        userId,
        bypass ? undefined : anomalyCacheKey
      );
    } catch (e) {
      return NextResponse.json({ step: "detectSellerAnomalies", error: String(e) });
    }

    // Direct Anthropic raw call to see exactly what the model returns
    let rawAnthropicResponse: unknown = null;
    let rawAnthropicError: string | null = null;
    if (bypass) {
      try {
        const fmt = (n: number) =>
          new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";
        const avgNetSales = sorted.reduce((s, r) => s + r.net_gross_sales, 0) / sorted.length;
        const avgDiscount = sorted.reduce((s, r) => s + r.discount_percent, 0) / sorted.length;
        const sellerLines = sorted.slice(0, 5).map((s) => {
          const returnRate = s.sales > 0 ? ((s.returns_count / s.sales) * 100).toFixed(1) : "0.0";
          const profitMargin = s.net_gross_sales > 0 ? ((s.gross_profit / s.net_gross_sales) * 100).toFixed(1) : "0.0";
          return `- ${s.seller_name}: net_sales=${fmt(s.net_gross_sales)}, profit=${fmt(s.gross_profit)} (margin=${profitMargin}%), discount=${s.discount_percent.toFixed(1)}%, return_rate=${returnRate}% (${s.returns_count}/${s.sales}), avg_cheque=${fmt(s.average_cheque)}`;
        }).join("\n");

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const msg = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          tools: [{
            name: "report_anomalies",
            description: "Report detected anomalies",
            input_schema: {
              type: "object" as const,
              properties: { anomalies: { type: "array", items: { type: "object" } } },
              required: ["anomalies"],
            },
          }],
          tool_choice: { type: "tool", name: "report_anomalies" },
          messages: [{
            role: "user",
            content: `Analyze these 5 sellers (of ${sorted.length} total) for period: ${period}.\nGroup averages: avg_net_sales=${fmt(avgNetSales)}, avg_discount=${avgDiscount.toFixed(1)}%\n\nSellers:\n${sellerLines}\n\nFlag: discount>=20%, return_rate>=20%, margin<10%, net_sales<30% of avg. Report all that match.`,
          }],
        });
        rawAnthropicResponse = {
          stopReason: msg.stop_reason,
          usage: msg.usage,
          contentTypes: msg.content.map((b) => b.type),
          toolInput: msg.content.find((b) => b.type === "tool_use")
            ? (msg.content.find((b) => b.type === "tool_use") as Anthropic.ToolUseBlock).input
            : null,
        };
      } catch (e) {
        rawAnthropicError = String(e);
      }
    }

    return NextResponse.json({
      period,
      startDate,
      today,
      userId,
      shopIds,
      sellersCount: sorted.length,
      firstSeller: sorted[0] ?? null,
      anomalyCacheKey,
      cachedValue,
      anomaliesFound: anomalies.length,
      anomalies,
      anthropicApiKeySet: !!process.env.ANTHROPIC_API_KEY,
      rawAnthropicResponse,
      rawAnthropicError,
    });
  } catch (e) {
    return NextResponse.json({ step: "outer", error: String(e) });
  }
}
