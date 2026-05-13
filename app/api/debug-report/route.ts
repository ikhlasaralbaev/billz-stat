import { NextResponse } from "next/server";
import { getToken, getShops, getGeneralReport } from "@/lib/billz";
import { buildReportSummary, formatDailyStats, formatRevenueDiff } from "@/services/reportService";

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const secretKey = process.env.BILLZ_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { ok: false, error: "BILLZ_SECRET_KEY is not set in .env" },
        { status: 500 }
      );
    }

    const token = await getToken(secretKey);
    const shops = await getShops(token);
    const shopIds = shops.map((s) => s.id);

    const today = toDateStr(new Date());
    const tomorrow = toDateStr(new Date(Date.now() + 86400000));
    const yesterday = toDateStr(new Date(Date.now() - 86400000));

    const rows = await getGeneralReport(token, shopIds, yesterday, tomorrow);
    const summary = buildReportSummary(rows, today, yesterday);

    return NextResponse.json({
      ok: true,
      summary,
      todayFormatted: formatDailyStats(summary.today, "Bugun"),
      yesterdayFormatted: formatDailyStats(summary.yesterday, "Kecha"),
      diff: formatRevenueDiff(summary),
      rows,
    });
  } catch (err) {
    console.error("[debug-report]", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
