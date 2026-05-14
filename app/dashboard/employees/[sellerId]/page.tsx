import { getDashboardUser } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { getToken, getShops, SellerDayRow } from "@/lib/billz";
import { getCachedSellerRows } from "@/services/sellerCache";
import Anthropic from "@anthropic-ai/sdk";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import SalesChart from "./SalesChart";
import { logRequest } from "@/lib/requestLogger";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function toDateStr(d: Date) {
  return new Date(d.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function fmtNum(n: number): string {
  const s = String(Math.round(n));
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) parts.unshift(s.slice(Math.max(0, i - 3), i));
  return parts.join(" ");
}

function fmtCompact(n: number): string {
  const abs = Math.abs(Math.round(n));
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return Math.round(n / 1_000) + "K";
  return String(Math.round(n));
}

interface SellerTotals {
  name: string;
  grossSales: number;
  netSales: number;
  profit: number;
  margin: number;
  avgCheque: number;
  orders: number;
  returns: number;
  discountPct: number;
  productsSold: number;
}

function aggregateRows(rows: SellerDayRow[]): SellerTotals {
  const name = rows[0]?.seller_name ?? "";
  const grossSales = rows.reduce((s, r) => s + (r.gross_sales ?? 0), 0);
  const netSales   = rows.reduce((s, r) => s + (r.net_gross_sales ?? 0), 0);
  const profit     = rows.reduce((s, r) => s + (r.net_gross_profit ?? 0), 0);
  const orders     = rows.reduce((s, r) => s + (r.orders_count ?? 0), 0);
  const returns    = rows.reduce((s, r) => s + (r.returned_measurement_value ?? 0), 0);
  const discSum    = rows.reduce((s, r) => s + (r.discount_sum ?? 0), 0);
  const prodSold   = rows.reduce((s, r) => s + (r.sold_measurement_value ?? 0), 0);
  return {
    name,
    grossSales,
    netSales,
    profit,
    margin: netSales > 0 ? (profit / netSales) * 100 : 0,
    avgCheque: orders > 0 ? netSales / orders : 0,
    orders,
    returns,
    discountPct: grossSales > 0 ? (discSum / grossSales) * 100 : 0,
    productsSold: prodSold,
  };
}

async function generateAiAnalysis(
  totals: SellerTotals,
  dailyRows: SellerDayRow[],
  period: string,
  isRu: boolean,
  userId?: string
): Promise<string> {
  const days = period === "today" ? 1 : period === "7d" ? 7 : 30;

  // Sort by date, pick top 3 and bottom 3 days
  const sorted = [...dailyRows]
    .filter((r) => r.net_gross_sales > 0)
    .sort((a, b) => b.net_gross_sales - a.net_gross_sales);
  const topDays = sorted.slice(0, 3).map(
    (r) => `${r.date.slice(0, 10)}: ${fmtNum(r.net_gross_sales)} UZS (${r.orders_count ?? 0} chek)`
  ).join("\n");
  const bottomDays = sorted.slice(-3).reverse().map(
    (r) => `${r.date.slice(0, 10)}: ${fmtNum(r.net_gross_sales)} UZS (${r.orders_count ?? 0} chek)`
  ).join("\n");

  const stats = [
    `Sotuvchi: ${totals.name}`,
    `Sotuv: ${fmtNum(totals.netSales)} UZS`,
    `Foyda: ${fmtNum(totals.profit)} UZS (${totals.margin.toFixed(1)}%)`,
    `O'rtacha chek: ${fmtNum(totals.avgCheque)} UZS`,
    `Cheklar soni: ${totals.orders} ta`,
    `Qaytarishlar: ${totals.returns} ta`,
    `Chegirma: ${totals.discountPct.toFixed(1)}%`,
    `Sotilgan mahsulotlar: ${totals.productsSold} ta`,
  ].join("\n");

  const dailySection = [
    topDays ? `Eng yaxshi kunlar:\n${topDays}` : "",
    bottomDays && bottomDays !== topDays ? `Eng past kunlar:\n${bottomDays}` : "",
  ].filter(Boolean).join("\n\n");

  const lang = isRu
    ? "Javobni RUSCHA yoz. Markdown ishlatma (#, **, __). Faqat emoji va oddiy matn."
    : "Javobni O'ZBEKCHA yoz. Markdown ishlatma (#, **, __). Faqat emoji va oddiy matn.";

  const prompt = `Siz tajribali retail biznes maslahatchiсиз. Quyidagi sotuvchining so'nggi ${days} kunlik ish ko'rsatkichlari asosida BATAFSIL individual tahlil qiling.

${stats}

${dailySection}

Tahlil qiling:
1. Ushbu sotuvchining kuchli va zaif tomonlari
2. Kunlik trendlar va anomaliyalar (nima uchun ayrim kunlar yuqori/past)
3. Chegirma (${totals.discountPct.toFixed(1)}%) va qaytarish (${totals.returns} ta) nisbatlari — xavfli yoki normal?
4. O'rtacha chek darajasi haqida baho
5. Kamida 4-5 ta KONKRET, SHAXSIY tavsiya — faqat ushbu sotuvchi uchun

MUHIM: javob 400-500 so'z bo'lsin va to'liq yakunlansin.

${lang}`;

  const t0 = Date.now();
  const aiMessages: Array<{ role: "user"; content: string }> = [{ role: "user", content: prompt }];
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: aiMessages,
  });
  logRequest({
    userTelegramId: userId,
    service: "anthropic",
    method: "POST",
    url: "anthropic/messages",
    requestParams: { model: "claude-sonnet-4-6", max_tokens: 2048, messageLength: aiMessages[0].content.length },
    responsePreview: { usage: message.usage },
    durationMs: Date.now() - t0,
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  return raw
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/^---+$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "→ ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default async function SellerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sellerId: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");
  if (!user.billzToken) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";
  const { sellerId } = await params;
  const { period = "30d" } = await searchParams;

  const today = toDateStr(new Date());
  const startDate =
    period === "today"
      ? today
      : period === "7d"
      ? toDateStr(new Date(Date.now() - 7 * 86400000))
      : toDateStr(new Date(Date.now() - 30 * 86400000));

  const userId = String(user.telegramId);
  const token = await getToken(user.billzToken, userId);
  const shopIds = user.selectedShopIds?.length
    ? user.selectedShopIds
    : (await getShops(token, userId)).map((s) => s.id);

  const allRows = await getCachedSellerRows(user, token, shopIds, startDate, today);
  const sellerRows = allRows.filter((r) => r.seller_id === sellerId);

  if (sellerRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Users size={24} style={{ color: "#334155" }} />
        <p className="text-sm" style={{ color: "#475569" }}>
          {isRu ? "Данные не найдены" : "Ma'lumot topilmadi"}
        </p>
        <Link href="/dashboard/employees" className="text-xs" style={{ color: "#6366F1" }}>
          ← {isRu ? "Назад" : "Orqaga"}
        </Link>
      </div>
    );
  }

  const totals = aggregateRows(sellerRows);

  // Sort rows chronologically for chart
  const chronoRows = [...sellerRows].sort((a, b) => a.date.localeCompare(b.date));

  // Generate AI analysis
  const aiText = await generateAiAnalysis(totals, sellerRows, period, isRu, userId);

  const initials = totals.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const statCards = [
    { label: isRu ? "Продажи" : "Sotuv",       value: fmtCompact(totals.netSales),     sub: "UZS",       color: "#A5B4FC" },
    { label: isRu ? "Прибыль" : "Foyda",        value: fmtCompact(totals.profit),        sub: `${totals.margin.toFixed(1)}%`, color: "#34D399" },
    { label: isRu ? "Ср. чек" : "O'rt. chek",  value: fmtCompact(totals.avgCheque),     sub: "UZS",       color: "#F9A8D4" },
    { label: isRu ? "Чеки" : "Cheklar",         value: String(totals.orders),            sub: isRu ? "шт" : "ta",  color: "#E2E8F0" },
    { label: isRu ? "Возвраты" : "Qaytarish",   value: String(Math.round(totals.returns)), sub: isRu ? "шт" : "ta", color: totals.returns > 5 ? "#F87171" : "#64748B" },
    { label: isRu ? "Скидка" : "Chegirma",      value: `${totals.discountPct.toFixed(1)}%`, sub: "",     color: totals.discountPct > 10 ? "#F87171" : "#64748B" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/employees?period=${period}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          style={{ background: "#0D1526", color: "#64748B" }}
        >
          <ArrowLeft size={14} />
        </Link>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff" }}
        >
          {initials || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-white truncate">{totals.name}</h1>
          <p className="text-xs" style={{ color: "#64748B" }}>
            {isRu ? "Индивидуальный анализ" : "Individual tahlil"}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statCards.map(({ label, value, sub, color }) => (
          <div
            key={label}
            className="rounded-xl p-3.5"
            style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}
          >
            <p className="text-xs mb-1" style={{ color: "#475569" }}>{label}</p>
            <p className="text-lg font-bold" style={{ color }}>{value}</p>
            {sub && <p className="text-xs mt-0.5" style={{ color: "#334155" }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Daily trend chart */}
      {chronoRows.length > 1 && (
        <div className="rounded-2xl p-4" style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}>
          <p className="text-xs font-medium mb-4" style={{ color: "#475569" }}>
            {isRu ? "Динамика продаж по дням" : "Kunlik sotuv dinamikasi"}
          </p>
          <SalesChart
            isRu={isRu}
            data={chronoRows.map((r) => ({
              date: r.date,
              sales: r.net_gross_sales ?? 0,
              orders: r.orders_count ?? 0,
            }))}
          />
        </div>
      )}

      {/* AI Analysis */}
      <div className="rounded-2xl p-4" style={{ background: "#0A0F1E", border: "1px solid #1E293B" }}>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
            style={{ background: "#1E1B4B" }}
          >
            <span className="text-xs">🤖</span>
          </div>
          <p className="text-xs font-medium" style={{ color: "#A5B4FC" }}>
            {isRu ? "AI Анализ" : "AI Tahlil"}
          </p>
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "#CBD5E1" }}>
          {aiText}
        </p>
      </div>
    </div>
  );
}
