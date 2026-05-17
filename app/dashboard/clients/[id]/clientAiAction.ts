"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getDashboardUser } from "@/lib/dashboard";
import { connectDB } from "@/lib/db";
import { getToken, getShops, getClientDetail, getClientPurchases, groupPurchasesByOrder } from "@/lib/billz";
import { decryptBillzToken } from "@/lib/crypto";
import ClientAiCache from "@/models/ClientAiCache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/^---+$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "→ ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function loadCachedAnalysis(clientId: string): Promise<string | null> {
  const user = await getDashboardUser();
  if (!user?.billzToken) return null;
  await connectDB();
  const cached = await ClientAiCache.findOne({
    telegramId: user.telegramId,
    clientId,
    billzToken: user.billzToken,
  }).lean();
  return cached?.text ?? null;
}

export async function analyzeClient(clientId: string, isRu: boolean): Promise<string> {
  const user = await getDashboardUser();
  if (!user?.billzToken) throw new Error("Auth error");

  const uid = String(user.telegramId);
  const token = await getToken(decryptBillzToken(user.billzToken), uid);

  const [detail, shops] = await Promise.all([
    getClientDetail(token, clientId, uid),
    getShops(token, uid),
  ]);

  if (!detail) throw new Error("Client not found");

  const allShopIds = shops.map((s) => s.id);
  const purchaseRows = await getClientPurchases(token, clientId, allShopIds, uid);
  const orders = groupPurchasesByOrder(purchaseRows);
  const saleOrders = orders
    .filter((o) => o.order_type === "Продажа" || o.order_type === "SALE")
    .slice(0, 20);

  const name = [detail.first_name, detail.last_name].filter(Boolean).join(" ") || "—";
  const daysInactive = daysSince(detail.last_purchase_date);
  const groups = detail.groups?.length
    ? detail.groups.map((g) => `${g.name}${g.discount_percent > 0 ? ` (${g.discount_percent}%)` : ""}`).join(", ")
    : "—";

  const ordersText = saleOrders.length > 0
    ? saleOrders.map((o) => {
        const date = o.created_at.slice(0, 10);
        const total = fmt(o.net_sales ?? 0);
        const discount = o.discount_percent?.toFixed(1) ?? "0";
        const seller = o.seller_name || "—";
        return `${date} | ${seller} | ${total} | chegirma ${discount}%`;
      }).join("\n")
    : isRu ? "Нет данных о покупках" : "Xarid ma'lumotlari yo'q";

  const prompt = isRu
    ? `Проанализируй клиента магазина. Отвечай на РУССКОМ языке. Без Markdown, только обычный текст и эмодзи.

КЛИЕНТ:
Имя: ${name}
Тип: ${detail.client_type || "—"}
Группы: ${groups}
Визиты: ${detail.visits_count ?? 0}
Средняя скидка: ${detail.average_discount?.toFixed(1) ?? 0}%
Кешбек: ${fmt(detail.balance ?? 0)}
Долг: ${fmt(detail.debt_amount ?? 0)}

СТАТИСТИКА ПОКУПОК:
Всего: ${fmt(detail.purchase_amount ?? 0)}
Средний чек: ${fmt(detail.average_purchase_amount ?? 0)}
Первая покупка: ${detail.first_purchase_date?.slice(0, 10) ?? "—"}
Последняя покупка: ${detail.last_purchase_date?.slice(0, 10) ?? "—"}${daysInactive !== null ? ` (${daysInactive} дней назад)` : ""}

ПОСЛЕДНИЕ ПОКУПКИ (дата | продавец | сумма | скидка):
${ordersText}

СТРУКТУРА ОТВЕТА:
1. 👤 Портрет клиента (1-2 предложения)
2. ⚠️ Риск оттока: ВЫСОКИЙ / СРЕДНИЙ / НИЗКИЙ — объясни почему
3. 🛍️ Покупательские привычки (что и когда берёт)
4. 💡 2-3 конкретных рекомендации владельцу магазина`
    : `Do'kon mijozini tahlil qil. Javob O'ZBEK tilida. Markdown ishlatma, faqat oddiy matn va emoji.

MIJOZ:
Ism: ${name}
Tip: ${detail.client_type || "—"}
Guruhlar: ${groups}
Tashriflar: ${detail.visits_count ?? 0} ta
O'rtacha chegirma: ${detail.average_discount?.toFixed(1) ?? 0}%
Keshbek: ${fmt(detail.balance ?? 0)}
Qarz: ${fmt(detail.debt_amount ?? 0)}

XARID STATISTIKASI:
Jami: ${fmt(detail.purchase_amount ?? 0)}
O'rtacha chek: ${fmt(detail.average_purchase_amount ?? 0)}
Birinchi xarid: ${detail.first_purchase_date?.slice(0, 10) ?? "—"}
Oxirgi xarid: ${detail.last_purchase_date?.slice(0, 10) ?? "—"}${daysInactive !== null ? ` (${daysInactive} kun oldin)` : ""}

OXIRGI XARIDLAR (sana | seller | summa | chegirma):
${ordersText}

JAVOB TUZILMASI:
1. 👤 Mijoz portreti (1-2 gap)
2. ⚠️ Churn xavfi: YUQORI / O'RTA / PAST — sababini tushuntir
3. 🛍️ Xaridor odati (nima va qachon sotib oladi)
4. 💡 Do'kon egasiga 2-3 ta aniq tavsiya`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0]?.type === "text" ? message.content[0].text : "";
  const text = cleanMarkdown(raw);

  // Cache saqlash (upsert)
  await connectDB();
  await ClientAiCache.findOneAndUpdate(
    { telegramId: user.telegramId, clientId, billzToken: user.billzToken },
    { text, generatedAt: new Date() },
    { upsert: true },
  );

  return text;
}
