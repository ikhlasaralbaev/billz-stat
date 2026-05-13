import { GeneralReportRow } from "@/lib/billz";
import { t, Lang } from "@/lib/i18n";

export interface DailyStats {
  date: string;
  shopsCount: number;
  grossSales: number;
  netGrossSales: number;
  grossProfit: number;
  profitMargin: number;
  discountSum: number;
  supplyCost: number;
  ordersCount: number;
  returnsCount: number;
  productsSold: number;
  averageCheque: number;
}

export interface ReportSummary {
  today: DailyStats;
  yesterday: DailyStats;
  revenueDiff: number;
  revenueDiffPercent: number;
}

function emptyStats(date: string): DailyStats {
  return {
    date,
    shopsCount: 0,
    grossSales: 0,
    netGrossSales: 0,
    grossProfit: 0,
    profitMargin: 0,
    discountSum: 0,
    supplyCost: 0,
    ordersCount: 0,
    returnsCount: 0,
    productsSold: 0,
    averageCheque: 0,
  };
}

export function buildDailyStats(rows: GeneralReportRow[], datePrefix: string): DailyStats {
  const filtered = rows.filter((r) => r.date.startsWith(datePrefix));
  if (filtered.length === 0) return emptyStats(datePrefix);

  const grossSales = filtered.reduce((s, r) => s + (r.gross_sales ?? 0), 0);
  const netGrossSales = filtered.reduce((s, r) => s + (r.net_gross_sales ?? 0), 0);
  const grossProfit = filtered.reduce((s, r) => s + (r.gross_profit ?? 0), 0);
  const ordersCount = filtered.reduce((s, r) => s + (r.orders_count ?? r.transactions_count ?? 0), 0);

  return {
    date: datePrefix,
    shopsCount: new Set(filtered.map((r) => r.shop_id)).size,
    grossSales,
    netGrossSales,
    grossProfit,
    profitMargin: netGrossSales > 0 ? (grossProfit / netGrossSales) * 100 : 0,
    discountSum: filtered.reduce((s, r) => s + (r.discount_sum ?? 0), 0),
    supplyCost: filtered.reduce((s, r) => s + (r.sales_supply_price ?? 0), 0),
    ordersCount,
    returnsCount: filtered.reduce((s, r) => s + (r.returns_count ?? 0), 0),
    productsSold: filtered.reduce((s, r) => s + (r.products_sold ?? 0), 0),
    averageCheque: ordersCount > 0 ? netGrossSales / ordersCount : 0,
  };
}

export interface ShopSummary {
  shopName: string;
  today: DailyStats;
  yesterday: DailyStats;
}

export function buildShopSummaries(
  rows: GeneralReportRow[],
  todayDate: string,
  yesterdayDate: string
): ShopSummary[] {
  const shopNames = [...new Set(rows.map((r) => r.shop_name).filter(Boolean))];
  return shopNames.map((shopName) => {
    const shopRows = rows.filter((r) => r.shop_name === shopName);
    return {
      shopName,
      today: buildDailyStats(shopRows, todayDate),
      yesterday: buildDailyStats(shopRows, yesterdayDate),
    };
  });
}

export function buildReportSummary(
  rows: GeneralReportRow[],
  todayDate: string,
  yesterdayDate: string
): ReportSummary {
  const today = buildDailyStats(rows, todayDate);
  const yesterday = buildDailyStats(rows, yesterdayDate);

  const revenueDiff = today.netGrossSales - yesterday.netGrossSales;
  const revenueDiffPercent =
    yesterday.netGrossSales > 0
      ? (revenueDiff / yesterday.netGrossSales) * 100
      : 0;

  return { today, yesterday, revenueDiff, revenueDiffPercent };
}

export function formatDailyStats(stats: DailyStats, label: string, lang: Lang = "uz"): string {
  const l = t[lang];
  const fmt = (n: number) =>
    new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

  return [
    `${label} — ${stats.date}`,
    ``,
    `💰 ${l.revenue}: ${fmt(stats.netGrossSales)}`,
    `📈 ${l.profit}: ${fmt(stats.grossProfit)} (${stats.profitMargin.toFixed(1)}%)`,
    `🏷 ${l.discount}: ${fmt(stats.discountSum)}`,
    `📦 ${l.supplyCost}: ${fmt(stats.supplyCost)}`,
    ``,
    `🧾 ${l.receipts}: ${stats.ordersCount} ${l.unit}`,
    `↩️ ${l.returns}: ${stats.returnsCount} ${l.unit}`,
    `📊 ${l.products}: ${stats.productsSold} ${l.pcs}`,
    `💳 ${l.avgReceipt}: ${fmt(stats.averageCheque)}`,
  ].join("\n");
}

export function formatRevenueDiff(summary: ReportSummary, lang: Lang = "uz"): string {
  const l = t[lang];
  const fmt = (n: number) =>
    new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

  if (summary.yesterday.netGrossSales === 0) return "";

  const arrow =
    summary.revenueDiff > 0 ? "📈" : summary.revenueDiff < 0 ? "📉" : "➡️";
  const sign = summary.revenueDiff >= 0 ? "+" : "";

  return `${arrow} ${l.comparedToYesterday(sign, fmt(Math.abs(summary.revenueDiff)), summary.revenueDiffPercent.toFixed(1))}`;
}
