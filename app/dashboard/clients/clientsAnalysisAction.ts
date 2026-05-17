"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getDashboardUser } from "@/lib/dashboard";
import { connectDB } from "@/lib/db";
import { getLang } from "@/lib/i18n";
import ClientSnapshot from "@/models/ClientSnapshot";
import ClientOrderSnapshot from "@/models/ClientOrderSnapshot";
import ClientsAnalysis from "@/models/ClientsAnalysis";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ClientsAnalysisResult {
  summary: {
    totalClients: number;
    activeClients30d: number;
    activeClients90d: number;
    newClients30d: number;
    newClients90d: number;
    atRiskClients: number;
    lostClients: number;
    totalRevenue: number;
    avgOrderValue: number;
    avgOrdersPerClient: number;
    repeatPurchaseRate: number;
    returnRate: number;
    overallHealth: "growing" | "stable" | "declining";
    healthScore: number;
  };
  trends: {
    direction: "growing" | "stable" | "declining";
    summary: string;
    monthlyNewClients: Array<{ month: string; count: number }>;
    monthlyRevenue: Array<{ month: string; amount: number }>;
    peakMonth: string;
    lowMonth: string;
    recentGrowthRate: number;
  };
  segments: Array<{
    name: string;
    count: number;
    percentage: number;
    avgSpend: number;
    description: string;
    color: "indigo" | "emerald" | "amber" | "rose" | "slate";
  }>;
  topClients: Array<{
    name: string;
    phone: string;
    totalSpend: number;
    orderCount: number;
    daysSinceLastPurchase: number;
    status: "active" | "at_risk" | "lost";
  }>;
  winbackCandidates: Array<{
    name: string;
    phone: string;
    totalSpend: number;
    orderCount: number;
    daysSinceLastPurchase: number;
    strategy: string;
  }>;
  loyaltyMetrics: {
    repeatPurchaseRate: number;
    vipClientCount: number;
    vipThreshold: number;
    avgPurchaseFrequencyDays: number;
    retentionInsight: string;
  };
  insights: Array<{
    type: "success" | "warning" | "opportunity" | "risk";
    title: string;
    description: string;
  }>;
  recommendations: Array<{
    priority: "critical" | "high" | "medium" | "low";
    category: "retention" | "acquisition" | "reactivation" | "loyalty" | "revenue";
    title: string;
    description: string;
    expectedImpact: string;
    actionSteps: string[];
  }>;
  alerts: Array<{
    severity: "critical" | "high" | "medium";
    type: string;
    message: string;
  }>;
}

export async function getLatestClientsAnalysis(): Promise<{
  result: ClientsAnalysisResult | null;
  analyzedAt: string | null;
  clientCount: number;
}> {
  const user = await getDashboardUser();
  if (!user?.billzToken) return { result: null, analyzedAt: null, clientCount: 0 };

  await connectDB();
  const latest = await ClientsAnalysis.findOne(
    { telegramId: user.telegramId, billzToken: user.billzToken },
    {},
    { sort: { analyzedAt: -1 } }
  ).lean();

  if (!latest) return { result: null, analyzedAt: null, clientCount: 0 };

  return {
    result: latest.result as unknown as ClientsAnalysisResult,
    analyzedAt: new Date(latest.analyzedAt).toISOString(),
    clientCount: latest.clientCount ?? 0,
  };
}

export async function runClientsAnalysis(): Promise<ClientsAnalysisResult> {
  const user = await getDashboardUser();
  if (!user?.billzToken) throw new Error("Auth error");
  return analyzeClientsForUser(
    user.telegramId,
    user.billzToken,
    getLang(user) === "ru"
  );
}

// Repair common AI JSON issues: literal newlines/tabs inside string values
function repairJson(str: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      result += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
    }
    result += ch;
  }
  return result;
}

export async function analyzeClientsForUser(
  telegramId: number,
  billzToken: string,
  isRu: boolean
): Promise<ClientsAnalysisResult> {
  const startedAt = Date.now();
  await connectDB();

  const filter = { telegramId, billzToken };
  const now = Date.now();
  const d30 = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
  const d60 = new Date(now - 60 * 86400000).toISOString().slice(0, 10);
  const d90 = new Date(now - 90 * 86400000).toISOString().slice(0, 10);

  const [facet] = await ClientSnapshot.aggregate([
    { $match: filter },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalRevenue: { $sum: "$totalSpend" },
              totalOrders: { $sum: "$orderCount" },
              totalReturns: { $sum: "$returnCount" },
              repeatClients: {
                $sum: { $cond: [{ $gt: ["$orderCount", 1] }, 1, 0] },
              },
            },
          },
        ],
        buckets: [
          {
            $group: {
              _id: null,
              active30d: {
                $sum: { $cond: [{ $gte: ["$lastTransactionDate", d30] }, 1, 0] },
              },
              active90d: {
                $sum: { $cond: [{ $gte: ["$lastTransactionDate", d90] }, 1, 0] },
              },
              atRisk: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ["$lastTransactionDate", d60] },
                        { $lt: ["$lastTransactionDate", d30] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              lost: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$lastTransactionDate", null] },
                        { $lt: ["$lastTransactionDate", d90] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              newLast30d: {
                $sum: { $cond: [{ $gte: ["$firstTransactionDate", d30] }, 1, 0] },
              },
              newLast90d: {
                $sum: { $cond: [{ $gte: ["$firstTransactionDate", d90] }, 1, 0] },
              },
            },
          },
        ],
        monthlyNew: [
          { $match: { firstTransactionDate: { $exists: true, $ne: null } } },
          { $addFields: { month: { $substr: ["$firstTransactionDate", 0, 7] } } },
          { $group: { _id: "$month", count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
          { $limit: 12 },
          { $project: { month: "$_id", count: 1, _id: 0 } },
        ],
        top20: [
          { $match: { totalSpend: { $gt: 0 } } },
          { $sort: { totalSpend: -1 } },
          { $limit: 20 },
          {
            $project: {
              firstName: 1,
              lastName: 1,
              phoneNumbers: 1,
              totalSpend: 1,
              orderCount: 1,
              lastTransactionDate: 1,
            },
          },
        ],
        winback: [
          {
            $match: {
              totalSpend: { $gt: 0 },
              lastTransactionDate: { $exists: true, $ne: null, $lt: d60 },
            },
          },
          { $sort: { totalSpend: -1 } },
          { $limit: 12 },
          {
            $project: {
              firstName: 1,
              lastName: 1,
              phoneNumbers: 1,
              totalSpend: 1,
              orderCount: 1,
              lastTransactionDate: 1,
            },
          },
        ],
        vipData: [
          { $match: { totalSpend: { $gt: 0 } } },
          { $sort: { totalSpend: -1 } },
          { $group: { _id: null, spends: { $push: "$totalSpend" }, total: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const monthlyRevRaw = await ClientOrderSnapshot.aggregate([
    { $match: { ...filter, orderType: { $in: ["Продажа", "SALE"] } } },
    { $addFields: { month: { $substr: ["$orderDate", 0, 7] } } },
    { $group: { _id: "$month", amount: { $sum: "$netSales" } } },
    { $sort: { _id: -1 } },
    { $limit: 12 },
    { $project: { month: "$_id", amount: 1, _id: 0 } },
  ]);

  const totalOrdersCount = await ClientOrderSnapshot.countDocuments(filter);

  const overall = facet?.overall?.[0] ?? {};
  const buckets = facet?.buckets?.[0] ?? {};
  const monthlyNew = [...(facet?.monthlyNew ?? [])].sort((a, b) => (a.month < b.month ? -1 : 1));
  const monthlyRev = [...monthlyRevRaw].sort(
    (a: { month: string }, b: { month: string }) => (a.month < b.month ? -1 : 1)
  );
  const top20 = facet?.top20 ?? [];
  const winback = facet?.winback ?? [];

  const totalClients = overall.total ?? 0;
  const totalRevenue = overall.totalRevenue ?? 0;
  const totalOrders = overall.totalOrders ?? 0;
  const totalReturns = overall.totalReturns ?? 0;
  const repeatClients = overall.repeatClients ?? 0;

  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgOrdersPerClient = totalClients > 0 ? totalOrders / totalClients : 0;
  const repeatPurchaseRate = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;
  const returnRate =
    totalOrders + totalReturns > 0 ? (totalReturns / (totalOrders + totalReturns)) * 100 : 0;

  const vipData = facet?.vipData?.[0];
  let vipThreshold = 0;
  let vipCount = 0;
  if (vipData?.spends?.length) {
    const sorted = [...vipData.spends].sort((a: number, b: number) => b - a);
    vipCount = Math.max(1, Math.ceil(sorted.length * 0.2));
    vipThreshold = sorted[vipCount - 1] ?? 0;
  }

  function daysSince(dateStr: string | null): number {
    if (!dateStr) return 0;
    const d = new Date(dateStr.replace(" ", "T"));
    return isNaN(d.getTime()) ? 0 : Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  // Pre-compute all list data in code — AI never repeats these, only writes text
  type TopClient = ClientsAnalysisResult["topClients"][number];
  type WinbackCandidate = Omit<ClientsAnalysisResult["winbackCandidates"][number], "strategy">;

  const computedTopClients: TopClient[] = top20.map((c: Record<string, unknown>) => {
    const firstName = c.firstName as string | null;
    const lastName = c.lastName as string | null;
    const phone = (c.phoneNumbers as string[])?.[0] ?? "—";
    const days = daysSince(c.lastTransactionDate as string | null);
    return {
      name: [firstName, lastName].filter(Boolean).join(" ") || "—",
      phone,
      totalSpend: Math.round(c.totalSpend as number),
      orderCount: c.orderCount as number,
      daysSinceLastPurchase: days,
      status: (days > 90 ? "lost" : days > 30 ? "at_risk" : "active") as TopClient["status"],
    };
  });

  const computedWinback: WinbackCandidate[] = winback.map((c: Record<string, unknown>) => {
    const firstName = c.firstName as string | null;
    const lastName = c.lastName as string | null;
    const phone = (c.phoneNumbers as string[])?.[0] ?? "—";
    return {
      name: [firstName, lastName].filter(Boolean).join(" ") || "—",
      phone,
      totalSpend: Math.round(c.totalSpend as number),
      orderCount: c.orderCount as number,
      daysSinceLastPurchase: daysSince(c.lastTransactionDate as string | null),
    };
  });

  const lang = isRu ? "Russian" : "Uzbek";
  const pct = (n: number) =>
    totalClients > 0 ? Math.round((n / totalClients) * 100) : 0;

  // Compact text summary of clients for the prompt (no duplicating data AI must output)
  const topClientsSummary = computedTopClients
    .slice(0, 10)
    .map((c, i) => `${i + 1}. ${c.name} | ${c.totalSpend.toLocaleString()} UZS | ${c.orderCount} orders | ${c.daysSinceLastPurchase}d inactive | ${c.status}`)
    .join("\n");

  const winbackSummary = computedWinback
    .map((c, i) => `${i + 1}. ${c.name} | ${c.totalSpend.toLocaleString()} UZS | ${c.orderCount} orders | ${c.daysSinceLastPurchase}d inactive`)
    .join("\n");

  const monthlyNewSummary = monthlyNew
    .map((m: { month: string; count: number }) => `${m.month}: ${m.count}`)
    .join(", ");

  const monthlyRevSummary = monthlyRev
    .map((m: { month: string; amount: number }) => `${m.month}: ${Math.round(m.amount / 1000)}K`)
    .join(", ");

  // AI is asked for ONLY text/analytical fields — no large lists to repeat
  const prompt = `You are a senior retail analytics expert. Analyze this store's client data and return ONLY the JSON structure shown below. Write ALL strings in ${lang}.

STORE DATA:
- Total clients: ${totalClients} | Active 30d: ${buckets.active30d ?? 0} (${pct(buckets.active30d ?? 0)}%) | Active 90d: ${buckets.active90d ?? 0}
- New last 30d: ${buckets.newLast30d ?? 0} | New last 90d: ${buckets.newLast90d ?? 0}
- At-risk (30-90d inactive): ${buckets.atRisk ?? 0} (${pct(buckets.atRisk ?? 0)}%) | Lost 90d+: ${buckets.lost ?? 0} (${pct(buckets.lost ?? 0)}%)
- Revenue: ${Math.round(totalRevenue / 1000000).toLocaleString()}M UZS | Avg order: ${Math.round(avgOrderValue / 1000)}K UZS | Avg orders/client: ${avgOrdersPerClient.toFixed(1)}
- Repeat purchase rate: ${repeatPurchaseRate.toFixed(1)}% | Return rate: ${returnRate.toFixed(1)}%
- VIP (top 20%): ${vipCount} clients, threshold ${Math.round(vipThreshold / 1000)}K UZS

MONTHLY NEW CLIENTS: ${monthlyNewSummary || "No data"}
MONTHLY REVENUE (K UZS): ${monthlyRevSummary || "No data"}

TOP CLIENTS (context): ${topClientsSummary || "No data"}

WIN-BACK CANDIDATES (need personalized strategies):
${winbackSummary || "No data"}

Return ONLY this JSON, no markdown, no extra text:
{
  "overallHealth": "<growing|stable|declining>",
  "healthScore": <0-100>,
  "trendDirection": "<growing|stable|declining>",
  "trendSummary": "<2-3 sentences about overall trends>",
  "peakMonth": "<YYYY-MM>",
  "lowMonth": "<YYYY-MM>",
  "recentGrowthRate": <% change new clients last 30d vs prior 30d>,
  "segments": [
    {"name":"<string>","count":<number>,"percentage":<number>,"avgSpend":<number UZS>,"description":"<1-2 sentences>","color":"<indigo|emerald|amber|rose|slate>"}
  ],
  "winbackStrategies": [<one string per candidate in order, personalized re-engagement strategy>],
  "avgPurchaseFrequencyDays": <estimate>,
  "retentionInsight": "<2-3 sentences about loyalty patterns>",
  "insights": [
    {"type":"<success|warning|opportunity|risk>","title":"<short>","description":"<1-2 sentences>"}
  ],
  "recommendations": [
    {"priority":"<critical|high|medium|low>","category":"<retention|acquisition|reactivation|loyalty|revenue>","title":"<string>","description":"<2 sentences>","expectedImpact":"<string>","actionSteps":["<step>","<step>","<step>"]}
  ],
  "alerts": [
    {"severity":"<critical|high|medium>","type":"<string>","message":"<string>"}
  ]
}

Rules:
- segments: create 4-5 meaningful segments (VIP/Regular/New/At-Risk/Lost) with realistic counts summing to ~${totalClients}
- winbackStrategies: exactly ${computedWinback.length} strings, one per candidate
- insights: 4-6 items
- recommendations: 4-6 items sorted by priority
- alerts: empty array [] if no critical issues`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";

  // Extract JSON from response
  const jsonStr = (() => {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (fenced) return fenced[1];
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    return start !== -1 && end !== -1 ? raw.slice(start, end + 1) : raw;
  })();

  interface AiInsights {
    overallHealth: ClientsAnalysisResult["summary"]["overallHealth"];
    healthScore: number;
    trendDirection: ClientsAnalysisResult["trends"]["direction"];
    trendSummary: string;
    peakMonth: string;
    lowMonth: string;
    recentGrowthRate: number;
    segments: ClientsAnalysisResult["segments"];
    winbackStrategies: string[];
    avgPurchaseFrequencyDays: number;
    retentionInsight: string;
    insights: ClientsAnalysisResult["insights"];
    recommendations: ClientsAnalysisResult["recommendations"];
    alerts: ClientsAnalysisResult["alerts"];
  }

  const repairedJson = repairJson(jsonStr);
  let ai: AiInsights;
  try {
    ai = JSON.parse(repairedJson) as AiInsights;
  } catch (err) {
    const pos = err instanceof SyntaxError
      ? Number((err.message.match(/position (\d+)/) ?? [])[1] ?? -1)
      : -1;
    const snippet = pos >= 0
      ? repairedJson.slice(Math.max(0, pos - 120), pos + 120)
      : repairedJson.slice(0, 400);
    console.error("[clientsAnalysis] JSON parse failed at pos", pos);
    console.error("[clientsAnalysis] raw length:", raw.length, "| repaired length:", repairedJson.length);
    console.error("[clientsAnalysis] snippet around error:\n---\n" + snippet + "\n---");
    throw err;
  }

  // Assemble final result by merging AI text with code-computed data
  const result: ClientsAnalysisResult = {
    summary: {
      totalClients,
      activeClients30d: buckets.active30d ?? 0,
      activeClients90d: buckets.active90d ?? 0,
      newClients30d: buckets.newLast30d ?? 0,
      newClients90d: buckets.newLast90d ?? 0,
      atRiskClients: buckets.atRisk ?? 0,
      lostClients: buckets.lost ?? 0,
      totalRevenue: Math.round(totalRevenue),
      avgOrderValue: Math.round(avgOrderValue),
      avgOrdersPerClient: parseFloat(avgOrdersPerClient.toFixed(1)),
      repeatPurchaseRate: parseFloat(repeatPurchaseRate.toFixed(1)),
      returnRate: parseFloat(returnRate.toFixed(1)),
      overallHealth: ai.overallHealth ?? "stable",
      healthScore: ai.healthScore ?? 50,
    },
    trends: {
      direction: ai.trendDirection ?? "stable",
      summary: ai.trendSummary ?? "",
      monthlyNewClients: monthlyNew as { month: string; count: number }[],
      monthlyRevenue: (monthlyRev as { month: string; amount: number }[]).map((m) => ({
        month: m.month,
        amount: Math.round(m.amount),
      })),
      peakMonth: ai.peakMonth ?? "",
      lowMonth: ai.lowMonth ?? "",
      recentGrowthRate: ai.recentGrowthRate ?? 0,
    },
    segments: ai.segments ?? [],
    topClients: computedTopClients,
    winbackCandidates: computedWinback.map((c, i) => ({
      ...c,
      strategy: ai.winbackStrategies?.[i] ?? "",
    })),
    loyaltyMetrics: {
      repeatPurchaseRate: parseFloat(repeatPurchaseRate.toFixed(1)),
      vipClientCount: vipCount,
      vipThreshold: Math.round(vipThreshold),
      avgPurchaseFrequencyDays: ai.avgPurchaseFrequencyDays ?? 0,
      retentionInsight: ai.retentionInsight ?? "",
    },
    insights: ai.insights ?? [],
    recommendations: ai.recommendations ?? [],
    alerts: ai.alerts ?? [],
  };

  await ClientsAnalysis.create({
    telegramId,
    billzToken,
    analyzedAt: new Date(),
    clientCount: totalClients,
    orderCount: totalOrdersCount,
    durationMs: Date.now() - startedAt,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    result: result as unknown as Record<string, unknown>,
  });

  return result;
}
