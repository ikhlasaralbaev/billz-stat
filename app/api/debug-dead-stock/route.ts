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
      return NextResponse.json({ ok: false, error: "BILLZ_SECRET_KEY not set" }, { status: 500 });
    }

    const token = await getToken(secretKey);
    const shops = await getShops(token);
    const shopIds = shops.map((s) => s.id);

    const today = toDateStr(new Date());
    const sevenDaysAgo = toDateStr(new Date(Date.now() - 7 * 86400000));

    const res = await axios.get(`${process.env.BILLZ_API_URL_V1}/product-general-table`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        start_date: sevenDaysAgo,
        end_date: today,
        shop_ids: shopIds.join(","),
        currency: "UZS",
        limit: 1000,
        page: 1,
      },
    });

    return NextResponse.json({
      ok: true,
      params: { start_date: sevenDaysAgo, end_date: today },
      rawKeys: Object.keys(res.data),
      raw: res.data,
    });
  } catch (err) {
    console.error("[debug-dead-stock]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
