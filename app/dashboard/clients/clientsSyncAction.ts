"use server";

import { getDashboardUser } from "@/lib/dashboard";
import { connectDB } from "@/lib/db";
import {
  getToken,
  getShops,
  getClients,
  fetchAllPurchaseRows,
  groupPurchasesByOrder,
  CustomerPurchaseRow,
} from "@/lib/billz";
import ClientSnapshot from "@/models/ClientSnapshot";
import ClientOrderSnapshot from "@/models/ClientOrderSnapshot";
import BillzApiLog from "@/models/BillzApiLog";
import { runWithTracking } from "@/lib/requestTracker";
import { clearUserCache } from "@/lib/billzCache";
import { decryptBillzToken } from "@/lib/crypto";
import { getLang } from "@/lib/i18n";
import { analyzeClientsForUser } from "./clientsAnalysisAction";

function isSaleOrder(orderType: string) {
  return orderType === "Продажа" || orderType === "SALE";
}

export async function getSyncStats(): Promise<{ count: number; lastSyncedAt: Date | null }> {
  const user = await getDashboardUser();
  if (!user?.billzToken) return { count: 0, lastSyncedAt: null };

  await connectDB();
  const count = await ClientSnapshot.countDocuments({
    telegramId: user.telegramId,
    billzToken: user.billzToken,
  });
  const latest = await ClientSnapshot.findOne({
    telegramId: user.telegramId,
    billzToken: user.billzToken,
  })
    .sort({ syncedAt: -1 })
    .lean();

  return { count, lastSyncedAt: latest?.syncedAt ?? null };
}

export async function syncAllClients(): Promise<{ count: number }> {
  const user = await getDashboardUser();
  if (!user?.billzToken) throw new Error("Auth error");

  const uid = String(user.telegramId);
  const startedAt = new Date();

  // Clear Billz API cache so all requests hit the real API and are captured by the tracker
  await clearUserCache(uid);

  const { result, requests } = await runWithTracking(async () => {
    const token = await getToken(decryptBillzToken(user.billzToken!), uid);
    const shops = await getShops(token, uid);
    const shopIds = user.selectedShopIds?.length
      ? user.selectedShopIds
      : shops.map((s) => s.id);

    // Phase 1: Fetch all client pages
    const allClients: Awaited<ReturnType<typeof getClients>>["clients"] = [];
    let page = 1;
    while (true) {
      const { clients, count } = await getClients(token, uid, 200, page);
      allClients.push(...clients);
      if (allClients.length >= count || clients.length === 0) break;
      page++;
    }

    // Phase 2: Fetch all purchase rows (one bulk call, batched internally)
    const allPurchaseRows: CustomerPurchaseRow[] = await fetchAllPurchaseRows(token, shopIds, uid);

    // Phase 3: Group rows by customer_id
    const purchaseMap = new Map<string, CustomerPurchaseRow[]>();
    for (const row of allPurchaseRows) {
      const existing = purchaseMap.get(row.customer_id);
      if (existing) existing.push(row);
      else purchaseMap.set(row.customer_id, [row]);
    }

    // Phase 4: Bulk upsert into MongoDB
    await connectDB();
    const ops = allClients.map((client) => {
      const rows = purchaseMap.get(client.id) ?? [];
      const orders = groupPurchasesByOrder(rows);
      const saleOrders = orders.filter((o) => isSaleOrder(o.order_type));
      const returnOrders = orders.filter((o) => !isSaleOrder(o.order_type));
      const totalSpend = saleOrders.reduce((sum, o) => sum + (o.net_sales ?? 0), 0);
      const orderCount = saleOrders.length;
      const avgOrderValue = orderCount > 0 ? totalSpend / orderCount : 0;

      return {
        updateOne: {
          filter: {
            telegramId: user.telegramId,
            billzToken: user.billzToken,
            clientId: client.id,
          },
          update: {
            $set: {
              firstName: client.first_name ?? null,
              lastName: client.last_name ?? null,
              phoneNumbers: client.phone_numbers ?? [],
              balance: client.balance ?? 0,
              lastTransactionDate: client.last_transaction_date ?? null,
              firstTransactionDate: client.first_transaction_date ?? null,
              registeredAt: client.created_at ?? "",
              totalSpend,
              orderCount,
              returnCount: returnOrders.length,
              avgOrderValue,
              syncedAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    if (ops.length > 0) {
      await ClientSnapshot.bulkWrite(ops, { ordered: false });
    }

    // Phase 5: Build clientRef map (one query)
    const snapshots = await ClientSnapshot.find(
      { telegramId: user.telegramId, billzToken: user.billzToken },
      { clientId: 1 }
    ).lean();
    const clientRefMap = new Map(snapshots.map((s) => [s.clientId, s._id]));

    // Phase 6: Bulk upsert ClientOrderSnapshot (batched by 500)
    const orderOps: Parameters<typeof ClientOrderSnapshot.bulkWrite>[0] = [];
    let totalOrders = 0;

    for (const client of allClients) {
      const rows = purchaseMap.get(client.id) ?? [];
      const orders = groupPurchasesByOrder(rows);
      const clientRef = clientRefMap.get(client.id);
      if (!clientRef) continue;

      for (const order of orders) {
        totalOrders++;
        orderOps.push({
          updateOne: {
            filter: {
              telegramId: user.telegramId,
              billzToken: user.billzToken,
              orderId: order.order_id,
            },
            update: {
              $set: {
                clientId: client.id,
                clientRef,
                orderNumber: order.order_number,
                orderType: order.order_type,
                shopName: order.shop_name,
                sellerName: order.seller_name,
                orderDate: order.created_at,
                netSales: order.net_sales,
                netProfit: order.net_profit,
                discountPercent: order.discount_percent,
                products: order.products.map((p) => ({
                  name: p.name,
                  qty: p.qty,
                  netSales: p.net_sales,
                })),
                syncedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }
    }

    for (let i = 0; i < orderOps.length; i += 500) {
      await ClientOrderSnapshot.bulkWrite(orderOps.slice(i, i + 500), { ordered: false });
    }

    return { count: allClients.length, orderCount: totalOrders };
  });

  const completedAt = new Date();

  // Save API usage log
  await connectDB();
  await BillzApiLog.create({
    telegramId: user.telegramId,
    billzToken: user.billzToken,
    action: "clients_sync",
    requests,
    totalRequests: requests.reduce((s, r) => s + r.count, 0),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    startedAt,
    completedAt,
    meta: { clientCount: result.count, orderCount: result.orderCount },
  });

  // Auto-trigger AI analysis after sync (non-blocking on failure)
  try {
    await analyzeClientsForUser(
      user.telegramId,
      user.billzToken!,
      getLang(user) === "ru"
    );
  } catch {
    // Analysis failure should not fail the sync
  }

  return { count: result.count };
}
