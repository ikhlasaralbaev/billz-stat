import { NextResponse } from "next/server";
import axios from "axios";
import { getToken, getShops } from "@/lib/billz";

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

    const reportRes = await axios.get(
      `${process.env.BILLZ_API_URL_V1}/general-report-table`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          start_date: yesterday,
          end_date: tomorrow,
          shop_ids: shopIds.join(","),
          currency: "UZS",
          detalization: "day",
          limit: 100,
          page: 1,
        },
      }
    );

    return NextResponse.json({ ok: true, shops, rawReport: reportRes.data });
  } catch (err) {
    console.error("[test-billz]", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
