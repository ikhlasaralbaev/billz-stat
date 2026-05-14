import axios, { AxiosError } from "axios";
import { logRequest } from "@/lib/requestLogger";
import { makeCacheKey, cacheTtl, getFromCache, setCache } from "@/lib/billzCache";

const BASE_V1 = process.env.BILLZ_API_URL_V1!;
const BASE_V2 = process.env.BILLZ_API_URL_V2!;
const BASE_V3 = process.env.BILLZ_API_URL_V3 ?? BASE_V1.replace("/v1", "/v3");

// ── Types ────────────────────────────────────────────────────────────────────

export interface Shop {
  id: string;
  name: string;
}

export interface GeneralReportRow {
  date: string;
  shop_id: string;
  shop_name: string;
  gross_sales: number;
  net_gross_sales: number;
  gross_profit: number;
  discount_sum: number;
  discount_percent: number;
  sales_supply_price: number;
  transactions_count: number;
  orders_count: number;
  returns_count: number;
  products_sold: number;
  average_cheque: number;
  average_extra_charge: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  shop_measurement_values: Array<{
    shop_id: string;
    shop_name: string;
    active_measurement_value: number;
  }>;
  shop_prices: Array<{
    shop_id: string;
    retail_price: number;
    supply_price: number;
  }>;
  product_supplier_stock: Array<{
    shop_id: string;
    min_supply_price: number;
    max_supply_price: number;
    retail_price: number;
  }> | null;
}

export interface ProductSaleRow {
  product_id: string;
  product_name: string;
  product_sku: string;
  net_sold_measurement_value: number;
}

export interface ProductPerformanceRow {
  product_id: string;
  shop_id: string;
  shop_name: string;
  name: string;
  sku: string;
  bar_code: string;
  brand_name: string;
  categories_path: string[];
  is_archived: boolean;
  stock_amount_begin: number;
  stock_amount_end: number;
  stock_supply_sum_begin: number;
  stock_retail_sum_begin: number;
  stock_supply_sum_end: number;
  stock_retail_sum_end: number;
  sold_amount: number;
  sold_sales_sum: number;
  sold_supply_sum: number;
  returned_amount: number;
  returned_sales_sum: number;
  write_off_amount: number;
  write_off_supply_sum: number;
  day_difference: number;
  sellout_in_number: number;
  sellout_by_days: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ── Functions ────────────────────────────────────────────────────────────────

export async function getToken(secretKey: string, userId?: string): Promise<string> {
  const t0 = Date.now();
  const url = `${BASE_V1}/auth/login`;
  try {
    const res = await axios.post(url, {
      secret_token: secretKey,
    });
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "POST",
      url,
      requestParams: { secret_token: "***" },
      responseStatus: res.status,
      responseRowCount: 1,
      responsePreview: { access_token: "***" },
      durationMs: Date.now() - t0,
    });
    return res.data.data.access_token;
  } catch (err) {
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "POST",
      url,
      requestParams: { secret_token: "***" },
      responseStatus: (err as AxiosError)?.response?.status,
      durationMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    });
    console.error("[billz] getToken failed:", err);
    throw err;
  }
}

export async function getShops(token: string, userId?: string): Promise<Shop[]> {
  const url = `${BASE_V1}/shop`;
  const params = { limit: 100, only_allowed: true };
  const cacheKey = makeCacheKey(userId, url, params as Record<string, unknown>);
  const cached = await getFromCache(cacheKey);
  if (cached) return cached as Shop[];

  const t0 = Date.now();
  try {
    const res = await axios.get(url, {
      headers: authHeaders(token),
      params,
    });
    const shops: Shop[] = res.data.shops ?? [];
    void setCache(cacheKey, userId, url, params, shops, 60 * 60_000);
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: params as Record<string, unknown>,
      responseStatus: res.status,
      responseRowCount: shops.length,
      responsePreview: shops[0] as unknown as Record<string, unknown> | undefined,
      durationMs: Date.now() - t0,
    });
    return shops;
  } catch (err) {
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: params as Record<string, unknown>,
      responseStatus: (err as AxiosError)?.response?.status,
      durationMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    });
    console.error("[billz] getShops failed:", err);
    throw err;
  }
}

// Returns per-shop per-day rows for the given date range.
// Pass startDate / endDate as "YYYY-MM-DD".
// Note: date field in rows is "YYYY-MM-DD HH:MM:SS" format.
export async function getGeneralReport(
  token: string,
  shopIds: string[],
  startDate: string,
  endDate: string,
  userId?: string
): Promise<GeneralReportRow[]> {
  const url = `${BASE_V1}/general-report-table`;
  const params = {
    start_date: startDate,
    end_date: endDate,
    shop_ids: shopIds.join(","),
    currency: "UZS",
    detalization: "day",
    limit: 100,
    page: 1,
  };
  const cacheKey = makeCacheKey(userId, url, params as Record<string, unknown>);
  const cached = await getFromCache(cacheKey);
  if (cached) return cached as GeneralReportRow[];

  console.log("[billz] getGeneralReport → URL:", url);
  console.log("[billz] getGeneralReport → params:", params);
  console.log("[billz] getGeneralReport → shop_ids:", shopIds);

  const t0 = Date.now();
  try {
    const res = await axios.get(url, {
      headers: authHeaders(token),
      params,
    });

    console.log("[billz] getGeneralReport → raw response:", JSON.stringify(res.data, null, 2));

    const rows: GeneralReportRow[] = res.data.shop_stats_by_date ?? [];

    console.log("[billz] getGeneralReport → rows count:", rows.length);
    rows.forEach((r) => {
      console.log(`[billz]   date="${r.date}" shop="${r.shop_name}" gross_sales=${r.gross_sales} net_gross_sales=${r.net_gross_sales}`);
    });

    void setCache(cacheKey, userId, url, params, rows, cacheTtl(endDate));
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: params as Record<string, unknown>,
      shopIds,
      responseStatus: res.status,
      responseRowCount: rows.length,
      responsePreview: rows[0] as unknown as Record<string, unknown> | undefined,
      durationMs: Date.now() - t0,
    });

    return rows;
  } catch (err) {
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: params as Record<string, unknown>,
      shopIds,
      responseStatus: (err as AxiosError)?.response?.status,
      durationMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    });
    console.error("[billz] getGeneralReport failed:", err);
    throw err;
  }
}

// Fetches all products across all pages.
export async function getAllProducts(token: string, userId?: string): Promise<Product[]> {
  const url = `${BASE_V2}/products`;
  const cacheKey = makeCacheKey(userId, url, {});
  const cached = await getFromCache(cacheKey);
  if (cached) return cached as Product[];

  const all: Product[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const t0 = Date.now();
    const params = { limit, page };
    try {
      const res = await axios.get(url, {
        headers: authHeaders(token),
        params,
      });
      const products: Product[] = res.data.products ?? [];
      const total: number = res.data.count ?? 0;

      logRequest({
        userTelegramId: userId,
        service: "billz",
        method: "GET",
        url,
        requestParams: params as Record<string, unknown>,
        responseStatus: res.status,
        responseRowCount: products.length,
        responsePreview: products[0] as unknown as Record<string, unknown> | undefined,
        durationMs: Date.now() - t0,
      });

      all.push(...products);
      if (all.length >= total || products.length === 0) break;
      page++;
    } catch (err) {
      logRequest({
        userTelegramId: userId,
        service: "billz",
        method: "GET",
        url,
        requestParams: params as Record<string, unknown>,
        responseStatus: (err as AxiosError)?.response?.status,
        durationMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  void setCache(cacheKey, userId, url, {}, all, 60 * 60_000);
  return all;
}

export async function getProductPerformance(
  token: string,
  shopIds: string[],
  startDate: string,
  endDate: string,
  userId?: string
): Promise<ProductPerformanceRow[]> {
  const url = `${BASE_V1}/report-product-performance-table`;
  const cacheParamsKey = { start_date: startDate, end_date: endDate, shop_ids: shopIds.join(",") };
  const cacheKey = makeCacheKey(userId, url, cacheParamsKey as Record<string, unknown>);
  const cached = await getFromCache(cacheKey);
  if (cached) return cached as ProductPerformanceRow[];

  const all: ProductPerformanceRow[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const t0 = Date.now();
    const params = {
      start_date: startDate,
      end_date: endDate,
      shop_ids: shopIds.join(","),
      currency: "UZS",
      limit,
      page,
    };
    try {
      const res = await axios.get(url, {
        headers: authHeaders(token),
        params,
      });

      const rows: ProductPerformanceRow[] = res.data.table_data ?? [];
      const total: number = res.data.count ?? 0;

      logRequest({
        userTelegramId: userId,
        service: "billz",
        method: "GET",
        url,
        requestParams: params as Record<string, unknown>,
        shopIds,
        responseStatus: res.status,
        responseRowCount: rows.length,
        responsePreview: rows[0] as unknown as Record<string, unknown> | undefined,
        durationMs: Date.now() - t0,
      });

      all.push(...rows);
      if (all.length >= total || rows.length === 0) break;
      page++;
    } catch (err) {
      logRequest({
        userTelegramId: userId,
        service: "billz",
        method: "GET",
        url,
        requestParams: params as Record<string, unknown>,
        shopIds,
        responseStatus: (err as AxiosError)?.response?.status,
        durationMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  void setCache(cacheKey, userId, url, cacheParamsKey, all, cacheTtl(endDate));
  return all;
}

export interface OrderCustomer {
  id: string;
  name: string;
}

export interface OrderUser {
  id: string;
  name: string;
}

export interface OrderDetail {
  customer: OrderCustomer;
  user: OrderUser;
  cashbox_name: string;
  cashbox_id: string;
  shift_id: number;
  shop_id: string;
  shop: { id: string; name: string };
  total_price: number;
  has_discount: boolean;
  total_products_measurement_value: number;
  total_returned_measurement_value: number;
  comment: string;
  loyalty_payment: number;
}

export interface Order {
  id: string;
  parent_id: string;
  order_number: string;
  order_type: string;
  order_detail: OrderDetail;
  debt: unknown;
  deleted: boolean;
  sold_at: string;
  display_sold_at: string;
  finished_at: string;
}

export interface OrdersByDate {
  date: string;
  orders: Order[];
}

export interface GetOrdersParams {
  shopIds?: string[];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export async function getOrders(
  token: string,
  params: GetOrdersParams,
  userId?: string
): Promise<{ count: number; ordersByDate: OrdersByDate[] }> {
  const url = `${BASE_V3}/order-search`;
  const axiosParams = {
    start_date: params.startDate,
    end_date: params.endDate,
    shop_ids: params.shopIds?.join(","),
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    search: params.search,
  };
  const cacheKey = makeCacheKey(userId, url, axiosParams as Record<string, unknown>);
  const cached = await getFromCache(cacheKey);
  if (cached) return cached as { count: number; ordersByDate: OrdersByDate[] };

  const t0 = Date.now();
  try {
    const res = await axios.get(url, {
      headers: authHeaders(token),
      params: axiosParams,
    });

    const ordersByDate: OrdersByDate[] = res.data.orders_sorted_by_date_list ?? [];
    const count: number = res.data.count ?? 0;
    const result = { count, ordersByDate };
    void setCache(cacheKey, userId, url, axiosParams, result, cacheTtl(params.endDate));
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: axiosParams as Record<string, unknown>,
      shopIds: params.shopIds,
      responseStatus: res.status,
      responseRowCount: count,
      responsePreview: ordersByDate[0] as unknown as Record<string, unknown> | undefined,
      durationMs: Date.now() - t0,
    });

    return result;
  } catch (err) {
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: axiosParams as Record<string, unknown>,
      shopIds: params.shopIds,
      responseStatus: (err as AxiosError)?.response?.status,
      durationMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export interface SellerStatRow {
  seller_name: string;
  seller_ids: string[];
  gross_sales: number;
  net_gross_sales: number;
  discount_sum: number;
  discount_percent: number;
  gross_profit: number;
  transactions_count: number;
  sales: number;
  returns_count: number;
  average_cheque: number;
  products_sold: number;
  average_extra_charge: number;
}

export interface SellerDayRow {
  date: string;
  seller_id: string;
  seller_name: string;
  gross_sales: number;
  discount_sum: number;
  discount_percent: number;
  net_gross_sales: number;
  net_gross_profit: number;
  returned_measurement_value: number;
  sold_measurement_value: number;
  transaction_count: number;
  orders_count: number;
  average_cheque: number;
  net_sold_supply_sum: number;
}

// Aggregates an array of per-seller-per-day rows into per-seller totals.
// Exported so the cache layer can reuse it without calling the API.
export function aggregateSellerRows(raw: SellerDayRow[]): SellerStatRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const map = new Map<string, SellerStatRow>();
  for (const r of raw) {
    // Key by normalized name so the same person across multiple shops merges into one row
    const key = (r.seller_name ?? "").trim().toLowerCase() || r.seller_id;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        seller_name: r.seller_name ?? "",
        seller_ids: [r.seller_id],
        gross_sales: r.gross_sales ?? 0,
        net_gross_sales: r.net_gross_sales ?? 0,
        discount_sum: r.discount_sum ?? 0,
        discount_percent: 0,
        gross_profit: r.net_gross_profit ?? 0,
        transactions_count: r.transaction_count ?? 0,
        sales: r.orders_count ?? 0,
        returns_count: r.returned_measurement_value ?? 0,
        average_cheque: 0,
        products_sold: r.sold_measurement_value ?? 0,
        average_extra_charge: 0,
      });
    } else {
      existing.gross_sales += r.gross_sales ?? 0;
      existing.net_gross_sales += r.net_gross_sales ?? 0;
      existing.discount_sum += r.discount_sum ?? 0;
      existing.gross_profit += r.net_gross_profit ?? 0;
      existing.transactions_count += r.transaction_count ?? 0;
      existing.sales += r.orders_count ?? 0;
      existing.returns_count += r.returned_measurement_value ?? 0;
      existing.products_sold += r.sold_measurement_value ?? 0;
    }
  }

  for (const s of map.values()) {
    s.average_cheque = s.sales > 0 ? s.net_gross_sales / s.sales : 0;
    s.discount_percent = s.gross_sales > 0 ? (s.discount_sum / s.gross_sales) * 100 : 0;
  }

  return Array.from(map.values());
}

export async function getSellerStats(
  token: string,
  shopIds: string[],
  startDate: string,
  endDate: string,
  userId?: string
): Promise<SellerStatRow[]> {
  const url = `${BASE_V1}/seller-general-table`;
  const params = {
    start_date: startDate,
    end_date: endDate,
    shop_ids: shopIds.join(","),
    currency: "UZS",
    detalization: "day",
    limit: 1000,
    page: 1,
  };
  const cacheKey = makeCacheKey(userId, url, params as Record<string, unknown>);
  const cached = await getFromCache(cacheKey);
  if (cached) return cached as SellerStatRow[];

  const t0 = Date.now();
  try {
    const res = await axios.get(url, {
      headers: authHeaders(token),
      params,
    });

    const raw: SellerDayRow[] =
      res.data.seller_stats_by_date ??
      res.data.seller_stats ??
      res.data.sellers_stats ??
      res.data.sellers ??
      [];

    const result = aggregateSellerRows(raw);
    void setCache(cacheKey, userId, url, params, result, cacheTtl(endDate));
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: params as Record<string, unknown>,
      shopIds,
      responseStatus: res.status,
      responseRowCount: raw.length,
      responsePreview: raw[0] as unknown as Record<string, unknown> | undefined,
      durationMs: Date.now() - t0,
    });

    return result;
  } catch (err) {
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: params as Record<string, unknown>,
      shopIds,
      responseStatus: (err as AxiosError)?.response?.status,
      durationMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    });
    console.error("[billz] getSellerStats failed:", err);
    throw err;
  }
}

// Returns raw per-seller-per-day rows for the given period (used in detail view).
export async function getSellerDailyRows(
  token: string,
  shopIds: string[],
  startDate: string,
  endDate: string,
  userId?: string
): Promise<SellerDayRow[]> {
  const t0 = Date.now();
  const url = `${BASE_V1}/seller-general-table`;
  const params = {
    start_date: startDate,
    end_date: endDate,
    shop_ids: shopIds.join(","),
    currency: "UZS",
    detalization: "day",
    limit: 2000,
    page: 1,
  };
  try {
    const res = await axios.get(url, {
      headers: authHeaders(token),
      params,
    });
    const raw =
      res.data.seller_stats_by_date ??
      res.data.seller_stats ??
      res.data.sellers_stats ??
      res.data.sellers ??
      [];
    const rows: SellerDayRow[] = Array.isArray(raw) ? raw : [];

    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: params as Record<string, unknown>,
      shopIds,
      responseStatus: res.status,
      responseRowCount: rows.length,
      responsePreview: rows[0] as unknown as Record<string, unknown> | undefined,
      durationMs: Date.now() - t0,
    });

    return rows;
  } catch (err) {
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: params as Record<string, unknown>,
      shopIds,
      responseStatus: (err as AxiosError)?.response?.status,
      durationMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    });
    console.error("[billz] getSellerDailyRows failed:", err);
    throw err;
  }
}

// Returns rows from the product sales report for the given date range.
// Each row = one product that was sold at least once in the period.
export async function getProductSaleRows(
  token: string,
  shopIds: string[],
  startDate: string,
  endDate: string,
  userId?: string
): Promise<ProductSaleRow[]> {
  const url = `${BASE_V1}/product-general-table`;
  const params = {
    start_date: startDate,
    end_date: endDate,
    shop_ids: shopIds.join(","),
    currency: "UZS",
    limit: 1000,
    page: 1,
  };
  const cacheKey = makeCacheKey(userId, url, params as Record<string, unknown>);
  const cached = await getFromCache(cacheKey);
  if (cached) return cached as ProductSaleRow[];

  const t0 = Date.now();
  try {
    const res = await axios.get(url, {
      headers: authHeaders(token),
      params,
    });
    const rows = res.data.products_stats_by_date ?? [];
    const result: ProductSaleRow[] = Array.isArray(rows) ? rows : [];
    void setCache(cacheKey, userId, url, params, result, cacheTtl(endDate));
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: params as Record<string, unknown>,
      shopIds,
      responseStatus: res.status,
      responseRowCount: result.length,
      responsePreview: result[0] as unknown as Record<string, unknown> | undefined,
      durationMs: Date.now() - t0,
    });

    return result;
  } catch (err) {
    logRequest({
      userTelegramId: userId,
      service: "billz",
      method: "GET",
      url,
      requestParams: params as Record<string, unknown>,
      shopIds,
      responseStatus: (err as AxiosError)?.response?.status,
      durationMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    });
    console.error("[billz] getProductSaleRows failed:", err);
    throw err;
  }
}
