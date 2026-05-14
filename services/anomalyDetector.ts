import Anthropic from "@anthropic-ai/sdk";
import { getFromCache, setCache } from "@/lib/billzCache";
import { logRequest } from "@/lib/requestLogger";
import type { SellerStatRow, GeneralReportRow } from "@/lib/billz";
import type { Anomaly } from "@/types/anomaly";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const REPORT_ANOMALIES_TOOL: Anthropic.Tool = {
  name: "report_anomalies",
  description:
    "Report detected anomalies in the retail sales data. Only report genuine issues that need attention.",
  input_schema: {
    type: "object" as const,
    properties: {
      anomalies: {
        type: "array",
        items: {
          type: "object",
          required: [
            "type",
            "severity",
            "entityName",
            "message",
            "recommendation",
          ],
          properties: {
            type: {
              type: "string",
              enum: [
                "discount_spike",
                "high_returns",
                "revenue_drop",
                "low_margin",
                "seller_underperformance",
                "zero_sales_days",
                "avg_cheque_drop",
              ],
            },
            severity: {
              type: "string",
              enum: ["critical", "warning", "info"],
            },
            entityName: { type: "string" },
            message: { type: "string" },
            recommendation: { type: "string" },
            value: { type: "number" },
          },
        },
      },
    },
    required: ["anomalies"],
  },
};

export async function detectSellerAnomalies(
  sellers: SellerStatRow[],
  period: string,
  isRu: boolean,
  userId?: string,
  cacheKey?: string
): Promise<Anomaly[]> {
  if (sellers.length === 0) return [];

  try {
    if (cacheKey) {
      const cached = await getFromCache(cacheKey);
      if (cached) return cached as Anomaly[];
    }

    const fmt = (n: number) =>
      new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

    const sellerLines = sellers
      .map(
        (s) =>
          `- ${s.seller_name}: net_sales=${fmt(s.net_gross_sales)}, profit=${fmt(s.gross_profit)}, discount=${s.discount_percent.toFixed(1)}%, returns=${s.returns_count}, avg_cheque=${fmt(s.average_cheque)}, orders=${s.sales}`
      )
      .join("\n");

    const langInstruction = isRu
      ? "Пиши message и recommendation на РУССКОМ языке."
      : "message va recommendation ni O'ZBEK tilida yoz.";

    const nowUzt = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const todayStr = nowUzt.toISOString().slice(0, 10);
    const currentHourUzt = nowUzt.getUTCHours();
    const todayNote = `IMPORTANT: Today is ${todayStr}, current time is ${currentHourUzt}:00 UZT. If the period includes today, seller data for today is INCOMPLETE. Low today-only figures are expected in the morning. Do not penalize sellers for low numbers if the period is "today" and it is before 14:00 UZT.`;

    const prompt = `You are a retail analytics expert. Analyze seller performance data for the period: ${period}.

${todayNote}

Total sellers: ${sellers.length}

Seller data:
${sellerLines}

Compare sellers against each other and against healthy retail benchmarks. Detect:
- Who is significantly below average in sales or profit
- Who has high discount percentages (>15% is concerning, >25% is critical)
- Who has many returns compared to peers
- Who has low profit margin (<10% is concerning)
- Who has unusually low average cheque compared to peers

${langInstruction}

Only report anomalies that genuinely need attention — not every small difference. Maximum 6 anomalies.`;

    const t0 = Date.now();
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      tools: [REPORT_ANOMALIES_TOOL],
      tool_choice: { type: "tool", name: "report_anomalies" },
      messages: [{ role: "user", content: prompt }],
    });
    const durationMs = Date.now() - t0;

    logRequest({
      userTelegramId: userId,
      service: "anthropic",
      method: "POST",
      url: "anthropic/messages",
      requestParams: {
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        sellersCount: sellers.length,
      },
      responsePreview: {
        usage: message.usage,
        anomalyCount:
          (
            message.content.find((b) => b.type === "tool_use") as
              | Anthropic.ToolUseBlock
              | undefined
          )?.input != null
            ? (
                (
                  message.content.find((b) => b.type === "tool_use") as
                    | Anthropic.ToolUseBlock
                    | undefined
                )?.input as { anomalies?: unknown[] }
              )?.anomalies?.length ?? 0
            : 0,
      },
      durationMs,
    });

    const toolBlock = message.content.find(
      (b) => b.type === "tool_use"
    ) as Anthropic.ToolUseBlock | undefined;
    const result = toolBlock?.input as
      | { anomalies: Anomaly[] }
      | undefined;
    const anomalies = result?.anomalies ?? [];

    if (cacheKey) {
      void setCache(
        cacheKey,
        userId,
        "anthropic/messages",
        { sellersCount: sellers.length, period },
        anomalies,
        15 * 60_000
      );
    }

    return anomalies;
  } catch (err) {
    console.error("[anomalyDetector] detectSellerAnomalies failed:", err);
    return [];
  }
}

export async function detectShopAnomalies(
  rows: GeneralReportRow[],
  period: string,
  isRu: boolean,
  userId?: string,
  cacheKey?: string
): Promise<Anomaly[]> {
  if (rows.length === 0) return [];

  try {
    if (cacheKey) {
      const cached = await getFromCache(cacheKey);
      if (cached) return cached as Anomaly[];
    }

    const fmt = (n: number) =>
      new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

    // Current time in Uzbekistan (UTC+5)
    const nowUzt = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const todayStr = nowUzt.toISOString().slice(0, 10);
    const currentHourUzt = nowUzt.getUTCHours();

    const dailyLines = rows
      .map((r) => {
        const dateStr = r.date.slice(0, 10);
        const isToday = dateStr === todayStr;
        const label = isToday
          ? `- ${dateStr} (PARTIAL — ${currentHourUzt}:00 UZT, day not finished): net_sales=${fmt(r.net_gross_sales)}, orders=${r.orders_count}`
          : `- ${dateStr}: net_sales=${fmt(r.net_gross_sales)}, orders=${r.orders_count}`;
        return label;
      })
      .join("\n");

    const todayNote = `IMPORTANT: Today is ${todayStr}. Current time is ${currentHourUzt}:00 UZT (UTC+5). Today's data is INCOMPLETE — the day has not ended. Do NOT flag today as zero_sales_days or revenue_drop. If today has low sales, it may simply be because the day just started (especially if it's morning). Analyze today proportionally only if it's past 18:00 UZT.`;

    const totalNetSales = rows.reduce((s, r) => s + r.net_gross_sales, 0);
    const totalProfit = rows.reduce((s, r) => s + r.gross_profit, 0);
    const totalOrders = rows.reduce((s, r) => s + r.orders_count, 0);
    const totalReturns = rows.reduce((s, r) => s + r.returns_count, 0);
    const avgCheque = totalOrders > 0 ? totalNetSales / totalOrders : 0;
    const avgDiscount =
      rows.length > 0
        ? rows.reduce((s, r) => s + r.discount_percent, 0) / rows.length
        : 0;

    const langInstruction = isRu
      ? "Пиши message и recommendation на РУССКОМ языке."
      : "message va recommendation ni O'ZBEK tilida yoz.";

    const prompt = `You are a retail analytics expert. Analyze shop sales data for the period: ${period}.

${todayNote}

Daily sales trend:
${dailyLines}

Totals for the period:
- Gross sales: ${fmt(totalNetSales)}
- Gross profit: ${fmt(totalProfit)}
- Average cheque: ${fmt(avgCheque)}
- Total orders: ${totalOrders}
- Total returns: ${totalReturns}
- Average discount: ${avgDiscount.toFixed(1)}%

Detect: revenue drops between PAST days, zero-sales days in the PAST (not today), declining trend in historical data, days with very high discounts, unusually low order counts.

${langInstruction}

Only report anomalies that genuinely need attention. Maximum 5 anomalies.`;

    const t0 = Date.now();
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      tools: [REPORT_ANOMALIES_TOOL],
      tool_choice: { type: "tool", name: "report_anomalies" },
      messages: [{ role: "user", content: prompt }],
    });
    const durationMs = Date.now() - t0;

    logRequest({
      userTelegramId: userId,
      service: "anthropic",
      method: "POST",
      url: "anthropic/messages",
      requestParams: {
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        daysCount: rows.length,
      },
      responsePreview: {
        usage: message.usage,
        anomalyCount:
          (
            message.content.find((b) => b.type === "tool_use") as
              | Anthropic.ToolUseBlock
              | undefined
          )?.input != null
            ? (
                (
                  message.content.find((b) => b.type === "tool_use") as
                    | Anthropic.ToolUseBlock
                    | undefined
                )?.input as { anomalies?: unknown[] }
              )?.anomalies?.length ?? 0
            : 0,
      },
      durationMs,
    });

    const toolBlock = message.content.find(
      (b) => b.type === "tool_use"
    ) as Anthropic.ToolUseBlock | undefined;
    const result = toolBlock?.input as
      | { anomalies: Anomaly[] }
      | undefined;
    const anomalies = result?.anomalies ?? [];

    if (cacheKey) {
      void setCache(
        cacheKey,
        userId,
        "anthropic/messages",
        { daysCount: rows.length, period },
        anomalies,
        15 * 60_000
      );
    }

    return anomalies;
  } catch (err) {
    console.error("[anomalyDetector] detectShopAnomalies failed:", err);
    return [];
  }
}
