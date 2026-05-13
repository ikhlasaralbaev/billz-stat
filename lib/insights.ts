import { GeneralReportRow, Product, ProductSaleRow } from "@/lib/billz";
import { t, Lang } from "@/lib/i18n";

function getProductPrices(p: Product): { supplyCost: number; retailValue: number } {
  const supplyCost = p.shop_measurement_values?.reduce((sum, s) => {
    const stock = s.active_measurement_value ?? 0;
    const entry = p.product_supplier_stock?.find((ps) => ps.shop_id === s.shop_id);
    const supplyPrice = entry?.min_supply_price
      ?? p.shop_prices?.find((sp) => sp.shop_id === s.shop_id)?.supply_price
      ?? 0;
    return sum + stock * supplyPrice;
  }, 0) ?? 0;

  const retailValue = p.shop_measurement_values?.reduce((sum, s) => {
    const stock = s.active_measurement_value ?? 0;
    const price = p.shop_prices?.find((sp) => sp.shop_id === s.shop_id)?.retail_price ?? 0;
    return sum + stock * price;
  }, 0) ?? 0;

  return { supplyCost, retailValue };
}

// ── Overstock ─────────────────────────────────────────────────────────────────

export interface OverstockItem {
  name: string;
  sku: string;
  totalStock: number;
  soldLast30d: number;
  daysOfStock: number;
  totalSupplyCost: number;
  totalRetailValue: number;
  shopNames: string[];
}

export function calculateOverstock(
  products: Product[],
  saleRows30d: ProductSaleRow[]
): OverstockItem[] {
  const soldById = new Map<string, number>();
  const soldBySku = new Map<string, number>();

  for (const row of saleRows30d) {
    if (row.product_id) {
      soldById.set(row.product_id, (soldById.get(row.product_id) ?? 0) + row.net_sold_measurement_value);
    }
    if (row.product_sku) {
      soldBySku.set(row.product_sku, (soldBySku.get(row.product_sku) ?? 0) + row.net_sold_measurement_value);
    }
  }

  return products
    .flatMap((p) => {
      const totalStock = p.shop_measurement_values?.reduce(
        (sum, s) => sum + (s.active_measurement_value ?? 0), 0
      ) ?? 0;
      if (totalStock <= 0) return [];

      const soldLast30d = soldById.get(p.id) ?? soldBySku.get(p.sku) ?? 0;
      const daysOfStock = soldLast30d > 0
        ? Math.round((totalStock / soldLast30d) * 30)
        : Number.POSITIVE_INFINITY;

      if (daysOfStock <= 30) return [];

      const { supplyCost: totalSupplyCost, retailValue: totalRetailValue } = getProductPrices(p);
      const shopNames = (p.shop_measurement_values ?? [])
        .filter((s) => (s.active_measurement_value ?? 0) > 0 && s.shop_name)
        .map((s) => s.shop_name);

      return [{ name: p.name, sku: p.sku, totalStock, soldLast30d, daysOfStock, totalSupplyCost, totalRetailValue, shopNames }];
    })
    .sort((a, b) => b.daysOfStock - a.daysOfStock)
    .slice(0, 10);
}

export function formatOverstock(items: OverstockItem[], lang: Lang = "uz"): string {
  const l = t[lang];
  if (items.length === 0) return `✅ ${l.overstockEmpty}`;

  const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

  const lines = items.map((item, i) => {
    const days = item.daysOfStock === Number.POSITIVE_INFINITY ? "∞" : `${item.daysOfStock}`;
    return `${i + 1}. ${item.name}${item.sku ? ` (${item.sku})` : ""} — ${item.totalStock} ${l.pcs} (${l.daysStock(days)})`;
  });

  const totalQty = items.reduce((sum, i) => sum + i.totalStock, 0);
  const totalSupply = items.reduce((sum, i) => sum + i.totalSupplyCost, 0);
  const totalRetail = items.reduce((sum, i) => sum + i.totalRetailValue, 0);

  return (
    `🏭 ${l.overstockTitle}\n\n` +
    lines.join("\n") +
    `\n\n${l.totalSummary(items.length, totalQty)}\n` +
    `${l.supplyTotal}: ${fmt(totalSupply)}\n` +
    `${l.retailTotal}: ${fmt(totalRetail)}`
  );
}

const REVENUE_DROP_THRESHOLD = 0.2; // 20%

export interface RevenueDrop {
  triggered: boolean;
  todayRevenue: number;
  yesterdayRevenue: number;
  dropPercent: number;
}

// Sums gross_sales across all shops for a given date prefix "YYYY-MM-DD"
function sumRevenueForDate(rows: GeneralReportRow[], datePrefix: string): number {
  return rows
    .filter((r) => r.date.startsWith(datePrefix))
    .reduce((sum, r) => sum + (r.gross_sales ?? 0), 0);
}

export function calculateRevenueDrop(
  rows: GeneralReportRow[],
  todayDate: string,
  yesterdayDate: string
): RevenueDrop {
  console.log("[insights] calculateRevenueDrop → todayDate:", todayDate, "yesterdayDate:", yesterdayDate);
  console.log("[insights] calculateRevenueDrop → total rows:", rows.length);
  console.log("[insights] calculateRevenueDrop → row dates:", rows.map((r) => r.date));

  const todayRevenue = sumRevenueForDate(rows, todayDate);
  const yesterdayRevenue = sumRevenueForDate(rows, yesterdayDate);

  console.log("[insights] calculateRevenueDrop → todayRevenue:", todayRevenue, "yesterdayRevenue:", yesterdayRevenue);

  if (yesterdayRevenue === 0) {
    return { triggered: false, todayRevenue, yesterdayRevenue, dropPercent: 0 };
  }

  const dropPercent =
    (yesterdayRevenue - todayRevenue) / yesterdayRevenue;

  return {
    triggered: dropPercent > REVENUE_DROP_THRESHOLD,
    todayRevenue,
    yesterdayRevenue,
    dropPercent,
  };
}

// ── Dead Stock ────────────────────────────────────────────────────────────────

export interface DeadStockItem {
  name: string;
  sku: string;
  totalStock: number;
  totalSupplyCost: number;
  totalRetailValue: number;
  shopNames: string[];
}

export function calculateDeadStock(
  products: Product[],
  saleRows: ProductSaleRow[]
): DeadStockItem[] {
  // Build a set of product_ids and skus that were sold recently
  const soldIds = new Set(saleRows.map((r) => r.product_id).filter(Boolean));
  const soldSkus = new Set(saleRows.map((r) => r.product_sku).filter(Boolean));

  return products
    .filter((p) => {
      const totalStock = p.shop_measurement_values?.reduce(
        (sum, s) => sum + (s.active_measurement_value ?? 0),
        0
      ) ?? 0;
      if (totalStock <= 0) return false;

      // Skip if sold by id or sku
      if (soldIds.has(p.id)) return false;
      if (p.sku && soldSkus.has(p.sku)) return false;

      return true;
    })
    .map((p) => {
      const totalStock = p.shop_measurement_values?.reduce(
        (sum, s) => sum + (s.active_measurement_value ?? 0), 0
      ) ?? 0;
      const { supplyCost: totalSupplyCost, retailValue: totalRetailValue } = getProductPrices(p);
      const shopNames = (p.shop_measurement_values ?? [])
        .filter((s) => (s.active_measurement_value ?? 0) > 0 && s.shop_name)
        .map((s) => s.shop_name);
      return { name: p.name, sku: p.sku, totalStock, totalSupplyCost, totalRetailValue, shopNames };
    })
    .sort((a, b) => b.totalStock - a.totalStock)
    .slice(0, 10);
}

export function formatDeadStock(items: DeadStockItem[], lang: Lang = "uz"): string {
  const l = t[lang];
  if (items.length === 0) return `✅ ${l.deadStockEmpty}`;

  const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

  const lines = items.map(
    (item, i) =>
      `${i + 1}. ${item.name}${item.sku ? ` (${item.sku})` : ""} — ${item.totalStock} ${l.pcs}`
  );

  const totalQty = items.reduce((sum, i) => sum + i.totalStock, 0);
  const totalSupply = items.reduce((sum, i) => sum + i.totalSupplyCost, 0);
  const totalRetail = items.reduce((sum, i) => sum + i.totalRetailValue, 0);

  return (
    `📦 ${l.deadStockTitle}\n\n` +
    lines.join("\n") +
    `\n\n${l.totalSummary(items.length, totalQty)}\n` +
    `${l.supplyTotal}: ${fmt(totalSupply)}\n` +
    `${l.retailTotal}: ${fmt(totalRetail)}`
  );
}

export function formatRevenueDrop(insight: RevenueDrop): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

  const pct = (insight.dropPercent * 100).toFixed(1);

  if (insight.yesterdayRevenue === 0) {
    return `📊 Bugungi daromad: ${fmt(insight.todayRevenue)}\n\nKechagi ma'lumot mavjud emas.`;
  }

  if (insight.triggered) {
    return (
      `🔴 Daromad pasaydi!\n\n` +
      `Bugun:   ${fmt(insight.todayRevenue)}\n` +
      `Kecha:   ${fmt(insight.yesterdayRevenue)}\n` +
      `Pasayish: ${pct}%\n\n` +
      `⚠️ Daromad 20% dan ko'proq tushdi.`
    );
  }

  return (
    `✅ Daromad normal\n\n` +
    `Bugun:   ${fmt(insight.todayRevenue)}\n` +
    `Kecha:   ${fmt(insight.yesterdayRevenue)}\n` +
    `Farq:    ${pct}%`
  );
}
