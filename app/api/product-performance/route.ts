import { NextResponse } from "next/server";
import { getToken, getShops, getProductPerformance } from "@/lib/billz";

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

    const thirtyDaysAgo = toDateStr(new Date(Date.now() - 30 * 86400000));
    const today = toDateStr(new Date());

    const rows = await getProductPerformance(token, shopIds, thirtyDaysAgo, today);

    return NextResponse.json({ ok: true, count: rows.length, rows });
  } catch (err) {
    console.error("[product-performance]", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
