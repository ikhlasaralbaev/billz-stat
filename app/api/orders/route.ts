import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getToken, getShops } from "@/lib/billz";

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const secretKey = process.env.BILLZ_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { ok: false, error: "BILLZ_SECRET_KEY is not set in .env" },
        { status: 500 }
      );
    }

    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get("start_date") ?? toDateStr(new Date(Date.now() - 30 * 86400000));
    const endDate = searchParams.get("end_date") ?? toDateStr(new Date());
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "50");
    const search = searchParams.get("search") ?? undefined;

    const token = await getToken(secretKey);
    const shops = await getShops(token);
    const shopIds = shops.map((s) => s.id);

    const baseV3 = process.env.BILLZ_API_URL_V3 ??
      process.env.BILLZ_API_URL_V1!.replace("/v1", "/v3");

    const res = await axios.get(`${baseV3}/order-search`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        start_date: startDate,
        end_date: endDate,
        shop_ids: shopIds.join(","),
        page,
        limit,
        search,
      },
    });

    return NextResponse.json({
      ok: true,
      debug: { url: `${baseV3}/order-search`, startDate, endDate, shopIds },
      rawKeys: Object.keys(res.data),
      raw: res.data,
    });
  } catch (err) {
    console.error("[orders]", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
