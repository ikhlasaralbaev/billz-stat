import { connectDB } from "@/lib/db";
import {
  getSellerDailyRows,
  aggregateSellerRows,
  SellerDayRow,
  SellerStatRow,
} from "@/lib/billz";
import SellerDayStat, { ISellerDayStat } from "@/models/SellerDayStat";
import { IUser } from "@/models/user";

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Current date in UTC+5 as YYYY-MM-DD */
function toUTC5DateStr(d: Date): string {
  return new Date(d.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Add n days to a YYYY-MM-DD string (positive or negative) */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── DB helpers ────────────────────────────────────────────────────────────────

/** Upsert a batch of raw API rows for the given user into MongoDB. */
async function upsertRows(user: IUser, rows: SellerDayRow[]): Promise<void> {
  if (rows.length === 0) return;

  const ops = rows.map((r) => ({
    updateOne: {
      filter: {
        telegramId: user.telegramId,
        billzToken: user.billzToken ?? null,
        sellerId: r.seller_id,
        date: r.date.slice(0, 10), // normalize "2026-04-14 00:00:00" → "2026-04-14"
      },
      update: {
        $set: {
          sellerName: r.seller_name ?? "",
          grossSales: r.gross_sales ?? 0,
          netGrossSales: r.net_gross_sales ?? 0,
          netGrossProfit: r.net_gross_profit ?? 0,
          discountSum: r.discount_sum ?? 0,
          discountPercent: r.discount_percent ?? 0,
          returnedMeasurementValue: r.returned_measurement_value ?? 0,
          soldMeasurementValue: r.sold_measurement_value ?? 0,
          transactionCount: r.transaction_count ?? 0,
          ordersCount: r.orders_count ?? 0,
        },
      },
      upsert: true,
    },
  }));

  await SellerDayStat.bulkWrite(ops, { ordered: false });
}

/** Convert a MongoDB SellerDayStat document back to the SellerDayRow shape. */
function docToRow(doc: ISellerDayStat): SellerDayRow {
  return {
    date: doc.date,
    seller_id: doc.sellerId,
    seller_name: doc.sellerName,
    gross_sales: doc.grossSales,
    net_gross_sales: doc.netGrossSales,
    net_gross_profit: doc.netGrossProfit,
    discount_sum: doc.discountSum,
    discount_percent: doc.discountPercent,
    returned_measurement_value: doc.returnedMeasurementValue,
    sold_measurement_value: doc.soldMeasurementValue,
    transaction_count: doc.transactionCount,
    orders_count: doc.ordersCount,
    // These fields are not stored; derive them or default to 0
    average_cheque: doc.ordersCount > 0 ? doc.netGrossSales / doc.ordersCount : 0,
    net_sold_supply_sum: 0,
  };
}

// ── Main cache function ───────────────────────────────────────────────────────

/**
 * Smart delta-sync cache for seller daily rows.
 *
 * Strategy:
 *   - Historical dates (before today) are cached permanently; only missing
 *     gaps are fetched from the API.
 *   - Today's data is always re-fetched because it changes throughout the day.
 */
export async function getCachedSellerRows(
  user: IUser,
  token: string,
  shopIds: string[],
  startDate: string,
  endDate: string
): Promise<SellerDayRow[]> {
  await connectDB();

  const today = toUTC5DateStr(new Date());
  const yesterday = addDays(today, -1);

  // The historical window is [startDate, min(yesterday, endDate)].
  // "today" is handled separately because it changes throughout the day.
  const histEnd = endDate < today ? endDate : yesterday;

  const userId = String(user.telegramId);

  // ── Historical window ──────────────────────────────────────────────────────
  if (startDate <= histEnd) {
    const baseFilter = {
      telegramId: user.telegramId,
      billzToken: user.billzToken ?? null,
      date: { $gte: startDate, $lte: histEnd },
    };

    // Find the earliest and latest dates already cached for this user/range
    const [minDoc, maxDoc] = await Promise.all([
      SellerDayStat.findOne(baseFilter).sort({ date: 1 }).select("date").lean(),
      SellerDayStat.findOne(baseFilter).sort({ date: -1 }).select("date").lean(),
    ]);

    if (!minDoc || !maxDoc) {
      // Nothing cached at all — fetch the entire historical window
      const apiRows = await getSellerDailyRows(token, shopIds, startDate, histEnd, userId);
      await upsertRows(user, apiRows);
    } else {
      const minCached = (minDoc as { date: string }).date;
      const maxCached = (maxDoc as { date: string }).date;

      // Fill gap before the earliest cached date
      if (startDate < minCached) {
        const gapEnd = addDays(minCached, -1);
        const apiRows = await getSellerDailyRows(token, shopIds, startDate, gapEnd, userId);
        await upsertRows(user, apiRows);
      }

      // Fill gap after the latest cached date
      if (maxCached < histEnd) {
        const gapStart = addDays(maxCached, 1);
        const apiRows = await getSellerDailyRows(token, shopIds, gapStart, histEnd, userId);
        await upsertRows(user, apiRows);
      }
    }
  }

  // ── Always re-fetch today ──────────────────────────────────────────────────
  if (endDate >= today) {
    const todayRows = await getSellerDailyRows(token, shopIds, today, today, userId);
    await upsertRows(user, todayRows);
  }

  // ── Return all docs from DB for [startDate, endDate] ──────────────────────
  const docs = await SellerDayStat.find({
    telegramId: user.telegramId,
    billzToken: user.billzToken ?? null,
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  return (docs as unknown as ISellerDayStat[]).map(docToRow);
}

/**
 * Cached variant of getSellerStats — fetches rows via the cache then
 * aggregates them into per-seller totals.
 */
export async function getCachedSellerStats(
  user: IUser,
  token: string,
  shopIds: string[],
  startDate: string,
  endDate: string
): Promise<SellerStatRow[]> {
  const rows = await getCachedSellerRows(user, token, shopIds, startDate, endDate);
  return aggregateSellerRows(rows);
}
