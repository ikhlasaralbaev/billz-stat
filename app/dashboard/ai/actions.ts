"use server";

import { getDashboardUser, getLatestReport } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import { IReport } from "@/models/Report";
import AiMessage from "@/models/AiMessage";
import { connectDB } from "@/lib/db";
import { getToken, getShops, getSellerStats, SellerStatRow } from "@/lib/billz";
import { logRequest } from "@/lib/requestLogger";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type CommandType = "general" | "deadstock" | "overstock" | "shops" | "revenue" | "sellers";

function buildReportContext(report: IReport): string {
  const t = report.today;
  const y = report.yesterday;
  const lines = [
    `Bugungi hisobot (${t.date ?? ""}):`,
    `  Sotuv: ${fmt(t.netGrossSales)}, Foyda: ${fmt(t.grossProfit)} (${t.profitMargin.toFixed(1)}%)`,
    `  Cheklar: ${t.ordersCount} ta, O'rtacha chek: ${fmt(t.averageCheque)}`,
    `  Chegirma: ${fmt(t.discountSum)}, Qaytarish: ${t.returnsCount} ta`,
    `Kechagi hisobot: Sotuv ${fmt(y.netGrossSales)}, Foyda ${fmt(y.grossProfit)}, ${y.ordersCount} chek`,
    `Do'konlar: ${report.shops.map((s) => `${s.shopName} ${fmt(s.today.netGrossSales)}`).join(" | ")}`,
    `Dead stock: ${report.deadStock.length} mahsulot, Overstock: ${report.overstock.length} mahsulot`,
  ];
  return lines.join("\n");
}

const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

function buildPrompt(report: IReport, type: CommandType, isRu: boolean): string {
  const t = report.today;
  const y = report.yesterday;
  const diff = y.netGrossSales > 0
    ? ((t.netGrossSales - y.netGrossSales) / y.netGrossSales * 100).toFixed(1)
    : null;

  const shopLines = report.shops.map((s) => {
    const sd = s.yesterday.netGrossSales > 0
      ? ((s.today.netGrossSales - s.yesterday.netGrossSales) / s.yesterday.netGrossSales * 100).toFixed(1)
      : null;
    return `${s.shopName}: bugun ${fmt(s.today.netGrossSales)}, kecha ${fmt(s.yesterday.netGrossSales)}${sd ? `, o'zgarish ${sd}%` : ""}`;
  }).join("\n");

  const deadLines = report.deadStock.slice(0, 20).map((i) =>
    `- ${i.name}: ${i.totalStock} dona, tannarx ${fmt(i.totalSupplyCost)}`
  ).join("\n");

  const overLines = report.overstock.slice(0, 20).map((i) =>
    `- ${i.name}: ${i.totalStock} dona, ${i.daysOfStock === Infinity ? "∞" : i.daysOfStock} kun zaxira`
  ).join("\n");

  const summary = [
    `Bugun: sotuv ${fmt(t.netGrossSales)}, foyda ${fmt(t.grossProfit)} (${t.profitMargin.toFixed(1)}%), ${t.ordersCount} chek`,
    `Kecha: sotuv ${fmt(y.netGrossSales)}, foyda ${fmt(y.grossProfit)} (${y.profitMargin.toFixed(1)}%), ${y.ordersCount} chek`,
    diff ? `O'zgarish: ${Number(diff) >= 0 ? "+" : ""}${diff}%` : "",
  ].filter(Boolean).join("\n");

  const lang = isRu
    ? "Javobni RUSCHA yoz. Markdown ishlatma (#, **, __). Faqat emoji va oddiy matn. Har bir bo'lim → bilan tavsiyalar."
    : "Javobni O'ZBEKCHA yoz. Markdown ishlatma (#, **, __). Faqat emoji va oddiy matn. Har bir bo'lim → bilan tavsiyalar.";

  const depth = isRu
    ? "Tahlil BATAFSIL bo'lsin: har bir ko'rsatkich uchun sabab-oqibat, raqamli asoslash va KAMIDA 3-5 ta aniq tavsiya. MUHIM: javob 500-600 so'z atrofida bo'lsin va to'liq yakunlansin — o'rtada uzilmasdan xulosa bilan tugasin."
    : "Tahlil BATAFSIL bo'lsin: har bir ko'rsatkich uchun sabab-oqibat, raqamli asoslash va KAMIDA 3-5 ta aniq tavsiya. MUHIM: javob 500-600 so'z atrofida bo'lsin va to'liq yakunlansin — o'rtada uzilmasdan xulosa bilan tugasin.";

  const contexts: Record<Exclude<CommandType, "sellers">, string> = {
    general: `Siz tajribali retail biznes maslahatchiсиз. Quyidagi hisobot asosida KENG QAMROVLI umumiy tahlil bering. Savdo holati, foyda darajasi, chek soni, chegirma va qaytarishlarni alohida ko'rib chiqing. Har bir do'kon uchun alohida bo'lim ajrating:\n\n${summary}\n\nDo'konlar:\n${shopLines}\n\nChegirma: ${fmt(t.discountSum)}, qaytarish: ${t.returnsCount} ta, mahsulot soni: ${t.productsSold} ta\n\n${depth}\n\n${lang}`,
    deadstock: `Siz tajribali retail biznes maslahatchiсиз. Quyidagi dead stock ro'yxatini CHUQUR tahlil qiling. Har bir mahsulot yoki guruh uchun: nima uchun sotilmayotgani, qanday chora ko'rish kerakligi (aksiya, chegirma, qaytarish, boshqa do'konga ko'chirish), moliyaviy zarar hisob-kitobi:\n\n${deadLines || "Dead stock yo'q — ajoyib holat!"}\n\nUmumiy savdo konteksti: ${fmt(t.netGrossSales)}, foyda ${fmt(t.grossProfit)}\n\n${depth}\n\n${lang}`,
    overstock: `Siz tajribali retail biznes maslahatchiсиз. Quyidagi overstock ro'yxatini CHUQUR tahlil qiling. Har bir mahsulot uchun: necha kun zaxira qolishi, aylanma kapital qancha muzlab yotgani, qanday chora ko'rish kerak (buyurtmani to'xtatish, aksiya, transferlar):\n\n${overLines || "Overstock yo'q — ajoyib holat!"}\n\nUmumiy savdo konteksti: ${fmt(t.netGrossSales)}, foyda ${fmt(t.grossProfit)}\n\n${depth}\n\n${lang}`,
    shops: `Siz tajribali retail biznes maslahatchiсиз. Do'konlar bo'yicha BATAFSIL taqqoslama tahlil qiling. Eng yaxshi va eng yomon ko'rsatkich ko'rsatayotgan do'konlarni aniqlang, farq sabablarini tushuntiring, har bir do'kon uchun alohida yo'naltirilgan tavsiyalar bering:\n\n${shopLines || "Do'konlar ma'lumoti yo'q"}\n\nUmumiy: ${fmt(t.netGrossSales)}, ${t.ordersCount} chek\n\n${depth}\n\n${lang}`,
    revenue: `Siz tajribali retail biznes maslahatchiсиз. Savdo dinamikasini BATAFSIL tahlil qiling. O'sish yoki pasayish sabablarini, chegirma va qaytarishlar ta'sirini, sotuv tuzilmasini chuqur ko'rib chiqing. Kelajakka prognoz va aniq tavsiyalar bering:\n\n${summary}\n\nChegirma: ${fmt(t.discountSum)} (${t.netGrossSales > 0 ? ((t.discountSum / t.netGrossSales) * 100).toFixed(1) : 0}%), qaytarish: ${t.returnsCount} ta, o'rt. chek: ${fmt(t.averageCheque)}\n\n${depth}\n\n${lang}`,
  };

  return contexts[type as Exclude<CommandType, "sellers">];
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

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
  createdAt: string; // ISO string — serializable for Server → Client
  aiModel?: string;
  totalTokens?: number;
  durationMs?: number;
}

export async function loadMessages(): Promise<ChatMessage[]> {
  const user = await getDashboardUser();
  if (!user) return [];
  await connectDB();
  const rows = await AiMessage.find(
    { telegramId: user.telegramId, billzToken: user.billzToken ?? null },
    { role: 1, text: 1, createdAt: 1, aiModel: 1, totalTokens: 1, durationMs: 1, _id: 0 }
  ).sort({ createdAt: 1 }).limit(200).lean();
  return rows.map((r) => ({
    role: r.role as "user" | "ai",
    text: r.text,
    createdAt: r.createdAt.toISOString(),
    aiModel: r.aiModel,
    totalTokens: r.totalTokens,
    durationMs: r.durationMs,
  }));
}

function toDateStr(d: Date) {
  return new Date(d.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function buildSellersPrompt(sellers: SellerStatRow[], isRu: boolean): string {
  const fmtUzs = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

  const lines = sellers
    .slice(0, 30)
    .map((s, i) => {
      const margin = s.net_gross_sales > 0
        ? ((s.gross_profit / s.net_gross_sales) * 100).toFixed(1)
        : "0.0";
      return `${i + 1}. ${s.seller_name}: sotuv ${fmtUzs(s.net_gross_sales)}, foyda ${fmtUzs(s.gross_profit)} (${margin}%), o'rt.chek ${fmtUzs(s.average_cheque)}, chegirma ${(s.discount_percent ?? 0).toFixed(1)}%, qaytarish ${s.returns_count ?? 0} ta, cheklar ${s.sales ?? s.transactions_count ?? 0} ta`;
    })
    .join("\n");

  const lang = isRu
    ? "Javobni RUSCHA yoz. Markdown ishlatma (#, **, __). Faqat emoji va oddiy matn."
    : "Javobni O'ZBEKCHA yoz. Markdown ishlatma (#, **, __). Faqat emoji va oddiy matn.";

  const depth = "Tahlil BATAFSIL bo'lsin: har bir sotuvchi uchun kuchli va zaif tomonlar, raqamli asoslash va KAMIDA 3-5 ta aniq tavsiya. MUHIM: javob 500-600 so'z atrofida bo'lsin va to'liq yakunlansin — o'rtada uzilmasdan xulosa bilan tugasin.";

  return `Siz tajribali retail biznes maslahatchiсиз. Quyidagi 30 kunlik sotuvchilar samaradorligi statistikasi bo'yicha BATAFSIL tahlil qiling. Eng yaxshi va eng yomon ko'rsatkich ko'rsatayotgan sotuvchilarni aniqlang, farq sabablarini tushuntiring, chegirma va qaytarish nisbatiga e'tibor bering, har bir sotuvchi uchun yo'naltirilgan tavsiyalar bering:\n\n${lines || "Ma'lumot yo'q"}\n\n${depth}\n\n${lang}`;
}

export async function runAiCommand(type: CommandType, userLabel: string): Promise<ChatMessage[]> {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const isRu = user.language === "ru";
  let prompt: string;

  if (type === "sellers") {
    if (!user.billzToken) throw new Error("no_token");
    const userId = String(user.telegramId);
    const token = await getToken(user.billzToken, userId);
    const shopIds = user.selectedShopIds?.length
      ? user.selectedShopIds
      : (await getShops(token, userId)).map((s) => s.id);
    const today = toDateStr(new Date());
    const startDate = toDateStr(new Date(Date.now() - 30 * 86400000));
    const sellers = await getSellerStats(token, shopIds, startDate, today, userId);
    const sorted = [...sellers].sort((a, b) => b.net_gross_sales - a.net_gross_sales);
    prompt = buildSellersPrompt(sorted, isRu);
  } else {
    const report = await getLatestReport(user.telegramId, user.billzToken);
    if (!report) throw new Error("no_report");
    prompt = buildPrompt(report, type, isRu);
  }

  await connectDB();

  // Save user message BEFORE calling AI — guarantees earlier createdAt
  const userDoc = await AiMessage.create({
    telegramId: user.telegramId,
    billzToken: user.billzToken ?? null,
    role: "user",
    text: userLabel,
  });

  const startedAt = Date.now();
  const aiMessages: Array<{ role: "user"; content: string }> = [{ role: "user", content: prompt }];
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: aiMessages,
  });

  const durationMs = Date.now() - startedAt;
  logRequest({
    userTelegramId: String(user.telegramId),
    service: "anthropic",
    method: "POST",
    url: "anthropic/messages",
    requestParams: { model: "claude-sonnet-4-6", max_tokens: 2048, messageLength: aiMessages[0].content.length },
    responsePreview: { usage: message.usage },
    durationMs,
  });
  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const wasCutOff = message.stop_reason === "max_tokens";
  const suffix = wasCutOff
    ? (isRu ? "\n\n⚠️ Ответ был обрезан из-за лимита. Попробуйте запрос ещё раз." : "\n\n⚠️ Javob limit sababli kesildi. Iltimos, qayta so'rang.")
    : "";
  const aiText = cleanMarkdown(raw) + suffix;

  const aiDoc = await AiMessage.create({
    telegramId: user.telegramId,
    billzToken: user.billzToken ?? null,
    role: "ai",
    text: aiText,
    aiModel: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    totalTokens: message.usage.input_tokens + message.usage.output_tokens,
    durationMs,
  });

  return [
    { role: "user", text: userLabel, createdAt: userDoc.createdAt.toISOString() },
    {
      role: "ai",
      text: aiText,
      createdAt: aiDoc.createdAt.toISOString(),
      aiModel: message.model,
      totalTokens: message.usage.input_tokens + message.usage.output_tokens,
      durationMs,
    },
  ];
}

export async function sendCustomMessage(userText: string): Promise<ChatMessage[]> {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const isRu = user.language === "ru";

  await connectDB();

  const [report, historyDocs] = await Promise.all([
    getLatestReport(user.telegramId, user.billzToken),
    AiMessage.find(
      { telegramId: user.telegramId, billzToken: user.billzToken ?? null },
      { role: 1, text: 1, _id: 0 }
    ).sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const context = report ? buildReportContext(report) : "";
  const systemContent = [
    "Siz retail biznes maslahatchi AI siz. Foydalanuvchining do'koni haqida savollarga javob bering.",
    context ? `Do'kon ma'lumotlari:\n${context}` : "",
    isRu
      ? "Javobni RUSCHA yoz. Markdown ishlatma (#, **, __). Faqat emoji va oddiy matn. Qisqa va aniq bo'l."
      : "Javobni O'ZBEKCHA yoz. Markdown ishlatma (#, **, __). Faqat emoji va oddiy matn. Qisqa va aniq bo'l.",
  ].filter(Boolean).join("\n\n");

  const history = [...historyDocs].reverse();
  const messagesForApi: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history.map((m) => ({
      role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
      content: m.text as string,
    })),
    { role: "user", content: userText },
  ];

  const userDoc = await AiMessage.create({
    telegramId: user.telegramId,
    billzToken: user.billzToken ?? null,
    role: "user",
    text: userText,
  });

  const startedAt = Date.now();
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemContent,
    messages: messagesForApi,
  });
  const durationMs = Date.now() - startedAt;

  logRequest({
    userTelegramId: String(user.telegramId),
    service: "anthropic",
    method: "POST",
    url: "anthropic/messages",
    requestParams: { model: "claude-sonnet-4-6", max_tokens: 1024, customMessage: true },
    responsePreview: { usage: message.usage },
    durationMs,
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const aiText = cleanMarkdown(raw);

  const aiDoc = await AiMessage.create({
    telegramId: user.telegramId,
    billzToken: user.billzToken ?? null,
    role: "ai",
    text: aiText,
    aiModel: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    totalTokens: message.usage.input_tokens + message.usage.output_tokens,
    durationMs,
  });

  return [
    { role: "user", text: userText, createdAt: userDoc.createdAt.toISOString() },
    {
      role: "ai",
      text: aiText,
      createdAt: aiDoc.createdAt.toISOString(),
      aiModel: message.model,
      totalTokens: message.usage.input_tokens + message.usage.output_tokens,
      durationMs,
    },
  ];
}
