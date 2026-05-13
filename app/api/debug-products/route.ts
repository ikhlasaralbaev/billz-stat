import { NextResponse } from "next/server";
import { getToken, getShops } from "@/lib/billz";
import axios from "axios";

export async function GET() {
  try {
    const secretKey = process.env.BILLZ_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ ok: false, error: "BILLZ_SECRET_KEY not set" }, { status: 500 });
    }

    const token = await getToken(secretKey);
    await getShops(token);

    const res = await axios.get(`${process.env.BILLZ_API_URL_V2}/products`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 1, page: 1 },
    });

    const first = res.data.products?.[0];

    return NextResponse.json({
      ok: true,
      rawKeys: first ? Object.keys(first) : [],
      shop_prices: first?.shop_prices,
      shop_measurement_values: first?.shop_measurement_values,
      first,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
