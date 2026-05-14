import { NextResponse } from "next/server";
import { getDashboardUser } from "@/lib/dashboard";
import { getToken, getShops } from "@/lib/billz";
import axios from "axios";

const BASE_V1 = process.env.BILLZ_API_URL_V1!;

// /api/debug-user-purchases?id=<customerId>
// Uses the ACTUAL logged-in user's token (not BILLZ_SECRET_KEY)
export async function GET(req: Request) {
  const user = await getDashboardUser();
  if (!user?.billzToken) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("id");

  const token = await getToken(user.billzToken, String(user.telegramId));
  const shops = await getShops(token, String(user.telegramId));
  const shopIds = shops.map((s) => s.id);
  const today = new Date().toISOString().slice(0, 10);

  const headers = { Authorization: `Bearer ${token}` };

  const results: Record<string, unknown> = {
    user_telegram_id: user.telegramId,
    shops,
    shop_ids: shopIds,
  };

  // Test 1: customer-purchases-table WITHOUT customer_id filter (first 10 rows)
  try {
    const r = await axios.get(`${BASE_V1}/customer-purchases-table`, {
      headers,
      params: {
        start_date: "2020-01-01",
        end_date: today,
        limit: 10,
        page: 1,
        with_customers: true,
        currency: "UZS",
        shop_ids: shopIds.join(","),
      },
    });
    const rows = r.data.purchases ?? r.data.puchases ?? [];
    results.no_filter = {
      total_count: r.data.count,
      rows_in_page: rows.length,
      response_keys: Object.keys(r.data),
      sample_customer_ids: rows.slice(0, 5).map((row: Record<string, unknown>) => ({
        customer_id: row.customer_id,
        customer_name: row.customer_name,
        shop_name: row.shop_name,
        order_id: row.order_id,
      })),
    };
  } catch (e) {
    results.no_filter = { error: String(e) };
  }

  // Test 2: customer-purchases-table WITH customer_id filter
  if (customerId) {
    try {
      const r = await axios.get(`${BASE_V1}/customer-purchases-table`, {
        headers,
        params: {
          start_date: "2020-01-01",
          end_date: today,
          limit: 50,
          page: 1,
          with_customers: true,
          currency: "UZS",
          shop_ids: shopIds.join(","),
          customer_id: customerId,
        },
      });
      const rows = r.data.purchases ?? r.data.puchases ?? [];
      results.with_customer_id_filter = {
        total_count: r.data.count,
        rows_in_page: rows.length,
        rows,
      };
    } catch (e) {
      results.with_customer_id_filter = { error: String(e) };
    }

    // Test 3: GET /v1/customer/{id} to see what stats are stored
    try {
      const r = await axios.get(`${BASE_V1}/customer/${customerId}`, { headers });
      results.customer_detail = {
        purchase_amount: r.data.purchase_amount,
        visits_count: r.data.visits_count,
        registered_shop: r.data.registered_shop,
        first_purchase_date: r.data.first_purchase_date,
        last_purchase_date: r.data.last_purchase_date,
      };
    } catch (e) {
      results.customer_detail = { error: String(e) };
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
