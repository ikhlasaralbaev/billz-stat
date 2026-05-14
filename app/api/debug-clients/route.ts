import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import axios from "axios";

// Usage:
//   /api/debug-clients                  → first client + its detail
//   /api/debug-clients?id=<customerId>  → detail + order search attempts for that client
export async function GET(req: NextRequest) {
  try {
    const secretKey = process.env.BILLZ_SECRET_KEY;
    const BASE_V1 = process.env.BILLZ_API_URL_V1;
    const BASE_V3 = process.env.BILLZ_API_URL_V3 ?? BASE_V1?.replace("/v1", "/v3");
    if (!secretKey || !BASE_V1 || !BASE_V3) {
      return NextResponse.json({ ok: false, error: "Missing env vars" }, { status: 500 });
    }

    const authRes = await axios.post(`${BASE_V1}/auth/login`, { secret_token: secretKey });
    const token: string = authRes.data.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };

    const clientId = req.nextUrl.searchParams.get("id");

    if (clientId) {
      // ── Mode 2: debug orders for a specific client ──────────────────────────
      const detailRes = await axios.get(`${BASE_V1}/customer/${clientId}`, { headers });
      const detail = detailRes.data;
      const phone: string | undefined = detail?.phone_numbers?.[0];
      const name: string = [detail?.first_name, detail?.last_name].filter(Boolean).join(" ");

      const orderAttempts: Record<string, unknown> = {};

      // Try 1: search by phone
      if (phone) {
        try {
          const r = await axios.get(`${BASE_V3}/order-search`, {
            headers,
            params: { search: phone, limit: 10, page: 1 },
          });
          orderAttempts.by_phone = {
            search_term: phone,
            count: r.data.count,
            dates: (r.data.orders_sorted_by_date_list ?? []).map((d: { date: string; orders: unknown[] }) => ({
              date: d.date,
              order_count: d.orders?.length,
              sample_customer_ids: d.orders?.slice(0, 3).map((o) => {
                const row = o as Record<string, unknown>;
                return {
                  customer_id: row.customer_id,
                  order_type: row.order_type,
                  total_price: (row.order_detail as Record<string, unknown>)?.total_price,
                };
              }),
            })),
          };
        } catch (e) {
          orderAttempts.by_phone = { error: String(e) };
        }
      }

      // Try 2: search by name
      if (name) {
        try {
          const r = await axios.get(`${BASE_V3}/order-search`, {
            headers,
            params: { search: name, limit: 10, page: 1 },
          });
          orderAttempts.by_name = {
            search_term: name,
            count: r.data.count,
            sample: (r.data.orders_sorted_by_date_list ?? []).slice(0, 2),
          };
        } catch (e) {
          orderAttempts.by_name = { error: String(e) };
        }
      }

      // Try 3: search by customer_id directly
      try {
        const r = await axios.get(`${BASE_V3}/order-search`, {
          headers,
          params: { search: clientId, limit: 10, page: 1 },
        });
        orderAttempts.by_customer_id = {
          search_term: clientId,
          count: r.data.count,
          sample: (r.data.orders_sorted_by_date_list ?? []).slice(0, 2),
        };
      } catch (e) {
        orderAttempts.by_customer_id = { error: String(e) };
      }

      // Try 3b: order-search with customer_id param (v3)
      try {
        const r = await axios.get(`${BASE_V3}/order-search`, {
          headers,
          params: { customer_id: clientId, limit: 10, page: 1 },
        });
        orderAttempts.by_customer_id_param = {
          count: r.data.count,
          response_keys: Object.keys(r.data),
          sample: (r.data.orders_sorted_by_date_list ?? []).slice(0, 2),
        };
      } catch (e) {
        orderAttempts.by_customer_id_param = { error: String(e) };
      }

      // Try 3c: GET /v1/sale with customer_id
      try {
        const r = await axios.get(`${BASE_V1}/sale`, {
          headers,
          params: { customer_id: clientId, limit: 10, page: 1 },
        });
        orderAttempts.v1_sale_by_customer = {
          response_keys: Object.keys(r.data),
          count: r.data.count,
          sample_keys: r.data.sales?.[0] ? Object.keys(r.data.sales[0]) : (r.data.data?.[0] ? Object.keys(r.data.data[0]) : []),
          first_row: r.data.sales?.[0] ?? r.data.data?.[0] ?? null,
        };
      } catch (e) {
        orderAttempts.v1_sale_by_customer = { error: String(e) };
      }

      // Try 3d: GET /v1/order with customer_id
      try {
        const r = await axios.get(`${BASE_V1}/order`, {
          headers,
          params: { customer_id: clientId, limit: 10, page: 1 },
        });
        orderAttempts.v1_order_by_customer = {
          response_keys: Object.keys(r.data),
          count: r.data.count,
          sample_keys: r.data.orders?.[0] ? Object.keys(r.data.orders[0]) : [],
          first_row: r.data.orders?.[0] ?? null,
        };
      } catch (e) {
        orderAttempts.v1_order_by_customer = { error: String(e) };
      }

      // Try 4: customer-purchases-table with shop_ids + customer_id filter
      try {
        // Fetch ALL shops (no only_allowed restriction) to find purchases across all shops
        const shopsAllRes = await axios.get(`${BASE_V1}/shop`, {
          headers,
          params: { limit: 100 },
        });
        const shopsAllowed = await axios.get(`${BASE_V1}/shop`, {
          headers,
          params: { limit: 100, only_allowed: true },
        });
        const allShopIds: string[] = (shopsAllRes.data.shops ?? []).map((s: { id: string }) => s.id);
        const allowedShopIds: string[] = (shopsAllowed.data.shops ?? []).map((s: { id: string }) => s.id);
        orderAttempts.shops_comparison = {
          all_count: allShopIds.length,
          allowed_count: allowedShopIds.length,
          all_ids: allShopIds,
          allowed_ids: allowedShopIds,
        };
        const shopIds = allShopIds.length > 0 ? allShopIds : allowedShopIds;

        const today = new Date().toISOString().slice(0, 10);
        const since2020 = "2020-01-01";

        const r = await axios.get(`${BASE_V1}/customer-purchases-table`, {
          headers,
          params: {
            start_date: since2020,
            end_date: today,
            limit: 50,
            page: 1,
            with_customers: true,
            currency: "UZS",
            shop_ids: shopIds.join(","),
            customer_id: clientId,
          },
        });
        const allRows: Record<string, unknown>[] = r.data.purchases ?? r.data.puchases ?? r.data.data ?? [];
        const matchedByPhone = phone
          ? allRows.filter((row) => {
              const phones = row.phone_numbers as string[] | undefined;
              return phones?.some((p) => p === phone);
            })
          : [];
        orderAttempts.customer_purchases_table = {
          shop_ids_used: shopIds.length,
          total_rows_in_page: allRows.length,
          total_count: r.data.count,
          matched_by_phone: matchedByPhone.length,
          matched_sample: matchedByPhone.slice(0, 3),
          first_row_keys: allRows[0] ? Object.keys(allRows[0]) : [],
          raw_first_row: allRows[0] ?? null,
        };
      } catch (e) {
        orderAttempts.customer_purchases_table = { error: String(e) };
      }

      // Try 5: customer-general-table — per-customer aggregated stats
      try {
        const shopsRes = await axios.get(`${BASE_V1}/shop`, {
          headers,
          params: { limit: 100, only_allowed: true },
        });
        const shopIds: string[] = (shopsRes.data.shops ?? []).map((s: { id: string }) => s.id);
        const today = new Date().toISOString().slice(0, 10);

        const r = await axios.get(`${BASE_V1}/customer-general-table`, {
          headers,
          params: {
            start_date: "2020-01-01",
            end_date: today,
            limit: 50,
            page: 1,
            currency: "UZS",
            shop_ids: shopIds.join(","),
          },
        });
        const rows: Record<string, unknown>[] =
          r.data.customers ?? r.data.customer_stats ?? r.data.data ?? [];
        const matchedByPhone = phone
          ? rows.filter((row) => {
              const phones = row.phone_numbers as string[] | undefined;
              return phones?.some((p) => p === phone);
            })
          : [];
        orderAttempts.customer_general_table = {
          response_keys: Object.keys(r.data),
          total_count: r.data.count,
          total_rows: rows.length,
          matched_by_phone: matchedByPhone.length,
          matched_sample: matchedByPhone.slice(0, 2),
          first_row_keys: rows[0] ? Object.keys(rows[0]) : [],
          raw_first_row: rows[0] ?? null,
        };
      } catch (e) {
        orderAttempts.customer_general_table = { error: String(e) };
      }

      return NextResponse.json({
        ok: true,
        client_id: clientId,
        client_name: name,
        client_phone: phone,
        client_purchase_amount: detail?.purchase_amount,
        client_visits_count: detail?.visits_count,
        client_balance: detail?.balance,
        order_attempts: orderAttempts,
      });
    }

    // ── Mode 1: default — first client + detail ─────────────────────────────
    const clientsRes = await axios.get(`${BASE_V1}/client`, {
      headers,
      params: { limit: 5, page: 1 },
    });

    const firstId: string | undefined = clientsRes.data.clients?.[0]?.id;
    let detailRes = null;
    if (firstId) {
      try {
        const d = await axios.get(`${BASE_V1}/customer/${firstId}`, { headers });
        detailRes = d.data;
      } catch (e) {
        detailRes = { error: String(e) };
      }
    }

    return NextResponse.json({
      ok: true,
      hint: `To debug orders for a specific client: /api/debug-clients?id=<customerId>`,
      list_raw: clientsRes.data,
      first_client_detail: detailRes,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
