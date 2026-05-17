import { Telegraf } from "telegraf";
import { connectDB } from "@/lib/db";
import User, { IUser } from "@/models/user";
import { getToken, getShops, getGeneralReport, getAllProducts, getProductSaleRows, getProductPerformance, getOrders, Shop } from "@/lib/billz";
import { calculateDeadStock, formatDeadStock, calculateOverstock, formatOverstock } from "@/lib/insights";
import { buildReportSummary, buildShopSummaries, formatDailyStats, formatRevenueDiff } from "@/services/reportService";
import { generateAiInsights } from "@/services/aiInsights";
import Report from "@/models/Report";
import AiAnalysis from "@/models/AiAnalysis";
import { t, getLang, Lang } from "@/lib/i18n";
import { v4 as uuidv4 } from "uuid";
import { clearUserCache } from "@/lib/billzCache";
import { encryptBillzToken, decryptBillzToken } from "@/lib/crypto";

// UTC+5 (Tashkent) offset
function toDateStr(date: Date): string {
  return new Date(date.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not defined");

function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";
}

// Telegram inline buttons require HTTPS. For local dev (http), send URL as plain text.
async function sendWebLink(ctx: { reply: (text: string, extra?: object) => Promise<unknown> }, lang: Lang, url: string) {
  if (url.startsWith("https://")) {
    await ctx.reply(t[lang].weblinkText(), {
      reply_markup: {
        inline_keyboard: [[{ text: t[lang].weblinkBtn, url }]],
      },
    });
  } else {
    await ctx.reply(`${t[lang].weblinkText()}\n\n${url}`);
  }
}

export const bot = new Telegraf(BOT_TOKEN);

// ── In-memory onboarding state ────────────────────────────────────────────────

const awaitingToken = new Set<number>();
const awaitingPhone = new Set<number>();
const pendingShops = new Map<number, Shop[]>();
const pendingSelection = new Map<number, Set<string>>();

// ── Keyboards ─────────────────────────────────────────────────────────────────

const LANG_KEYBOARD = {
  inline_keyboard: [[
    { text: "🇺🇿 O'zbek", callback_data: "lang:uz" },
    { text: "🇷🇺 Русский", callback_data: "lang:ru" },
  ]],
};

function getMainKeyboard(lang: Lang, isAdmin = false) {
  const rows: { text: string }[][] = [
    [{ text: t[lang].reportBtn }, { text: t[lang].weblinkBtn }],
    [{ text: t[lang].changeTokenBtn }],
  ];
  if (isAdmin) {
    rows.push([{ text: t[lang].adminPanelBtn }]);
  }
  return { keyboard: rows, resize_keyboard: true, persistent: true };
}

function getPhoneKeyboard(lang: Lang) {
  return {
    keyboard: [
      [{ text: t[lang].sharePhoneBtn, request_contact: true }],
      [{ text: t[lang].phoneSkip }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function buildShopKeyboard(shops: Shop[], selected: Set<string>) {
  const rows = shops.map((shop) => [
    {
      text: `${selected.has(shop.id) ? "✅" : "☐"} ${shop.name}`,
      callback_data: `ts:${shop.id}`,
    },
  ]);
  rows.push([{ text: "💾 Saqlash / Сохранить", callback_data: "save_shops" }]);
  return { inline_keyboard: rows };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function showShopSelection(
  ctx: { reply: (text: string, extra?: object) => Promise<unknown> },
  shops: Shop[],
  currentIds: string[],
  lang: Lang
) {
  const selected = new Set(currentIds.length ? currentIds : shops.map((s) => s.id));
  const telegramId = (ctx as unknown as { from: { id: number } }).from.id;

  pendingShops.set(telegramId, shops);
  pendingSelection.set(telegramId, selected);

  await ctx.reply(t[lang].chooseShops, {
    reply_markup: buildShopKeyboard(shops, selected),
  });
}

function getEffectiveShopIds(user: IUser, allShops: Shop[]): string[] {
  if (user.selectedShopIds?.length) return user.selectedShopIds;
  return allShops.map((s) => s.id);
}

async function requireUser(ctx: { from: { id: number }; reply: (text: string) => Promise<unknown> }) {
  await connectDB();
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user?.billzToken) {
    const lang = getLang(user);
    await ctx.reply(t[lang].requireToken);
    return null;
  }
  return user;
}

function extractTelegramProfile(from: {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}) {
  const firstName = from.first_name ?? null;
  const lastName = from.last_name ?? null;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;
  const username = from.username ?? null;
  return { firstName, lastName, fullName, username };
}

async function fetchAvatarFileId(telegramId: number): Promise<string | null> {
  try {
    const photos = await bot.telegram.getUserProfilePhotos(telegramId, 0, 1);
    return photos.photos[0]?.[0]?.file_id ?? null;
  } catch {
    return null;
  }
}

// ── /start ────────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const profile = extractTelegramProfile(ctx.from);
  await connectDB();

  let user = await User.findOne({ telegramId });
  if (!user) {
    user = await User.create({ telegramId, ...profile });
  } else {
    await User.findOneAndUpdate({ telegramId }, profile);
  }

  // Fetch and save avatar in background
  fetchAvatarFileId(telegramId).then((avatarFileId) => {
    if (avatarFileId) User.findOneAndUpdate({ telegramId }, { avatarFileId }).catch(() => {});
  });

  // Language not set yet → ask language first
  if (!user.language) {
    await ctx.reply(t.uz.chooseLanguage + "\n" + t.ru.chooseLanguage, {
      reply_markup: LANG_KEYBOARD,
    });
    return;
  }

  const lang = getLang(user);

  if (!user.billzToken) {
    awaitingToken.add(telegramId);
    await ctx.reply(t[lang].greeting(profile.firstName));
    return;
  }

  // Token bor — shop re-selection
  try {
    const token = await getToken(decryptBillzToken(user.billzToken!));
    const shops = await getShops(token, String(telegramId));
    await ctx.reply(t[lang].greetingReturning(profile.firstName));
    await showShopSelection(ctx, shops, user.selectedShopIds ?? [], lang);
  } catch {
    // Token muammoli — DB'dan o'chirib, qayta so'raymiz
    await User.findOneAndUpdate({ telegramId }, { billzToken: null, selectedShopIds: [] });
    awaitingToken.add(telegramId);
    await ctx.reply(t[lang].tokenError);
  }
});

// ── Language selection ────────────────────────────────────────────────────────

bot.action(/^lang:(uz|ru)$/, async (ctx) => {
  const telegramId = ctx.from.id;
  const lang = ctx.match[1] as Lang;

  await connectDB();
  await User.findOneAndUpdate({ telegramId }, { language: lang });
  const user = await User.findOne({ telegramId });

  await ctx.answerCbQuery();
  await ctx.deleteMessage();

  if (!user?.billzToken) {
    awaitingToken.add(telegramId);
    await ctx.reply(t[lang].greeting(user?.firstName ?? null));
    return;
  }

  try {
    const token = await getToken(decryptBillzToken(user.billzToken!));
    const shops = await getShops(token, String(telegramId));
    await ctx.reply(t[lang].greetingReturning(user.firstName ?? null));
    await showShopSelection(ctx, shops, user.selectedShopIds ?? [], lang);
  } catch {
    // Token muammoli — DB'dan o'chirib, qayta so'raymiz
    await User.findOneAndUpdate({ telegramId }, { billzToken: null, selectedShopIds: [] });
    awaitingToken.add(telegramId);
    await ctx.reply(t[lang].tokenError);
  }
});

// ── Do'kon toggle ─────────────────────────────────────────────────────────────

bot.action(/^ts:(.+)$/, async (ctx) => {
  const telegramId = ctx.from.id;
  const shopId = ctx.match[1];

  const selected = pendingSelection.get(telegramId) ?? new Set<string>();
  if (selected.has(shopId)) selected.delete(shopId);
  else selected.add(shopId);
  pendingSelection.set(telegramId, selected);

  const shops = pendingShops.get(telegramId) ?? [];
  await ctx.editMessageReplyMarkup(buildShopKeyboard(shops, selected));
  await ctx.answerCbQuery();
});

// ── Do'konlarni saqlash ───────────────────────────────────────────────────────

bot.action("save_shops", async (ctx) => {
  const telegramId = ctx.from.id;
  const selected = pendingSelection.get(telegramId) ?? new Set<string>();

  await connectDB();
  const user = await User.findOne({ telegramId });
  const lang = getLang(user);

  if (selected.size === 0) {
    await ctx.answerCbQuery(t[lang].atLeastOne);
    return;
  }

  const allShops = pendingShops.get(telegramId) ?? [];
  const selectedNames = allShops
    .filter((s) => selected.has(s.id))
    .map((s) => s.name);

  await User.findOneAndUpdate({ telegramId }, {
    selectedShopIds: Array.from(selected),
    selectedShopNames: selectedNames,
  });

  pendingShops.delete(telegramId);
  pendingSelection.delete(telegramId);

  await ctx.editMessageText(t[lang].shopsSaved(selected.size));
  await ctx.answerCbQuery(t[lang].savedCb);
  await ctx.reply(t[lang].allDone, { reply_markup: getMainKeyboard(lang, user?.role === "ADMIN") });
});

// ── AI Tahlil — do'kon tanlash ────────────────────────────────────────────────

bot.action(/^ai_summary:(.+)$/, async (ctx) => {
  const reportId = ctx.match[1];
  if (!ctx.from?.id) return ctx.answerCbQuery();

  await connectDB();

  const [report, user] = await Promise.all([
    Report.findById(reportId),
    User.findOne({ telegramId: ctx.from.id }),
  ]);

  const lang = getLang(user);

  if (!report) {
    await ctx.answerCbQuery(t[lang].aiReportNotFound);
    await ctx.reply(t[lang].aiReportNotFound);
    return;
  }

  const shopButtons = report.shops.map((shop, i) => [
    { text: `🏪 ${shop.shopName}`, callback_data: `ai_shop:${reportId}:${i}` },
  ]);
  shopButtons.push([{ text: t[lang].aiAllBtn, callback_data: `ai_shop:${reportId}:all` }]);

  await ctx.answerCbQuery();
  await ctx.reply(t[lang].aiChooseShop, { reply_markup: { inline_keyboard: shopButtons } });
});

// ── AI Tahlil — generatsiya ───────────────────────────────────────────────────

bot.action(/^ai_shop:([^:]+):(.+)$/, async (ctx) => {
  const telegramId = ctx.from?.id;
  const reportId = ctx.match[1];
  const shopKey = ctx.match[2];
  if (!telegramId) return ctx.answerCbQuery();

  await ctx.answerCbQuery("⏳");
  await ctx.deleteMessage();

  await connectDB();

  const [report, user] = await Promise.all([
    Report.findById(reportId),
    User.findOne({ telegramId }),
  ]);

  const lang = getLang(user);
  await ctx.reply(t[lang].aiAnalyzing);

  try {
    if (!report) {
      await ctx.reply(t[lang].aiReportNotFound);
      return;
    }

    const isAll = shopKey === "all";
    const shops = isAll
      ? report.shops
      : [report.shops[Number(shopKey)]].filter(Boolean);

    if (shops.length === 0) {
      await ctx.reply(t[lang].shopNotFound);
      return;
    }

    const shopName = isAll ? null : shops[0].shopName;
    const deadStock = isAll
      ? report.deadStock
      : report.deadStock.filter((item) => item.shopNames?.includes(shopName!));
    const overstock = isAll
      ? report.overstock
      : report.overstock.filter((item) => item.shopNames?.includes(shopName!));

    const userName = ctx.from?.first_name ?? user?.firstName ?? undefined;

    const result = await generateAiInsights({
      shops,
      deadStock,
      overstock,
      userName,
      language: lang,
    });

    await AiAnalysis.create({
      reportId: report._id,
      telegramId,
      aiModel: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      totalTokens: result.totalTokens,
      durationMs: result.durationMs,
      responseText: result.text,
    });

    const shopButtons = report.shops.map((shop, i) => [
      { text: `🏪 ${shop.shopName}`, callback_data: `ai_shop:${reportId}:${i}` },
    ]);
    shopButtons.push([{ text: t[lang].aiAllBtn, callback_data: `ai_shop:${reportId}:all` }]);

    await ctx.reply(`${t[lang].aiTitle}\n\n${result.text}`);
    await ctx.reply(t[lang].aiAgainChooseShop, { reply_markup: { inline_keyboard: shopButtons } });
  } catch (err) {
    console.error("[bot] ai_shop failed:", err);
    await ctx.reply(t[lang].aiError);
  }
});

// ── Report flow ───────────────────────────────────────────────────────────────

async function reportFlow(ctx: {
  from: { id: number; first_name?: string };
  reply: (text: string, extra?: object) => Promise<unknown>;
}) {
  const telegramId = ctx.from.id;
  const user = await requireUser(ctx as Parameters<typeof requireUser>[0]);
  if (!user) return;

  const lang = getLang(user);
  const firstName = ctx.from.first_name ?? user.firstName ?? null;
  await ctx.reply(t[lang].reportLoading(firstName));

  const uid = String(telegramId);
  try {
    const token = await getToken(decryptBillzToken(user.billzToken!));
    const allShops = await getShops(token, uid);
    const shopIds = getEffectiveShopIds(user, allShops);

    const today = toDateStr(new Date());
    const tomorrow = toDateStr(new Date(Date.now() + 86400000));
    const yesterday = toDateStr(new Date(Date.now() - 86400000));
    const sevenDaysAgo = toDateStr(new Date(Date.now() - 7 * 86400000));
    const thirtyDaysAgo = toDateStr(new Date(Date.now() - 30 * 86400000));

    const [generalRows, products, saleRows7d, saleRows30d] = await Promise.all([
      getGeneralReport(token, shopIds, yesterday, tomorrow, uid),
      getAllProducts(token, uid),
      getProductSaleRows(token, shopIds, sevenDaysAgo, today, uid),
      getProductSaleRows(token, shopIds, thirtyDaysAgo, today, uid),
    ]);

    const summary = buildReportSummary(generalRows, today, yesterday);
    const shops = buildShopSummaries(generalRows, today, yesterday);
    const deadStock = calculateDeadStock(products, saleRows7d);
    const overstock = calculateOverstock(products, saleRows30d);

    const report = await Report.create({
      userId: user._id,
      telegramId,
      billzToken: user.billzToken,
      source: "command",
      shops,
      today: summary.today,
      yesterday: summary.yesterday,
      deadStock,
      overstock,
    });

    const todayLabel = lang === "ru" ? "📅 Сегодня" : "📅 Bugun";
    const yesterdayLabel = lang === "ru" ? "📅 Вчера" : "📅 Kecha";
    const todayMsg = formatDailyStats(summary.today, todayLabel, lang);
    const diff = formatRevenueDiff(summary, lang);
    await ctx.reply(diff ? `${todayMsg}\n\n${diff}` : todayMsg);
    await ctx.reply(formatDailyStats(summary.yesterday, yesterdayLabel, lang));
    await ctx.reply(formatDeadStock(deadStock, lang));
    await ctx.reply(formatOverstock(overstock, lang));

    await ctx.reply(t[lang].additionalAnalysis, {
      reply_markup: {
        inline_keyboard: [[
          { text: "🤖 AI Tahlil", callback_data: `ai_summary:${report._id}` },
        ]],
      },
    });
  } catch (err) {
    console.error("[bot] report failed:", err);
    await ctx.reply(t[lang].reportError);
  }
}

bot.command("report", (ctx) => reportFlow(ctx));

// ── /weblink ──────────────────────────────────────────────────────────────────

bot.command("weblink", async (ctx) => {
  const telegramId = ctx.from.id;
  await connectDB();
  const user = await User.findOne({ telegramId });
  const lang = getLang(user);

  if (!user?.billzToken) {
    await ctx.reply(t[lang].weblinkRequireToken);
    return;
  }

  const webToken = uuidv4();
  await User.findOneAndUpdate({ telegramId }, { webToken });

  const url = `${getAppBaseUrl()}/auth?token=${webToken}`;
  await sendWebLink(ctx, lang, url);
});

// ── /sales ────────────────────────────────────────────────────────────────────

bot.command("sales", async (ctx) => {
  const user = await requireUser(ctx);
  if (!user) return;

  const uid = String(ctx.from.id);
  await ctx.reply("⏳ Sotuvlar yuklanmoqda...");

  try {
    const token = await getToken(decryptBillzToken(user.billzToken!));
    const allShops = await getShops(token, uid);
    const shopIds = getEffectiveShopIds(user, allShops);

    const today = toDateStr(new Date());
    const sevenDaysAgo = toDateStr(new Date(Date.now() - 7 * 86400000));

    const { count, ordersByDate } = await getOrders(token, {
      shopIds,
      startDate: sevenDaysAgo,
      endDate: today,
      limit: 50,
    });

    if (count === 0) {
      await ctx.reply("📋 So'nggi 7 kunda sotuv topilmadi.");
      return;
    }

    const fmt = (n: number) =>
      new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

    const allOrders = ordersByDate
      .flatMap((d) => d.orders)
      .filter((o) => o.order_type === "SALE" && !o.deleted)
      .sort(
        (a, b) =>
          new Date(b.display_sold_at ?? b.sold_at).getTime() -
          new Date(a.display_sold_at ?? a.sold_at).getTime()
      )
      .slice(0, 15);

    const lines = allOrders.map((o) => {
      const shop = o.order_detail.shop?.name ?? "—";
      const cashier = o.order_detail.user?.name ?? "—";
      const price = fmt(o.order_detail.total_price ?? 0);
      const dt = o.display_sold_at ?? "—";
      const discount = o.order_detail.has_discount ? " 🏷" : "";
      return `📌 #${o.order_number}\n${dt}\n${shop} | ${cashier}\n${price}${discount}`;
    });

    await ctx.reply(
      `🛒 Oxirgi sotuvlar (7 kun)\nJami: ${count} ta sotuv\n\n` + lines.join("\n\n")
    );
  } catch (err) {
    console.error("[bot] /sales failed:", err);
    await ctx.reply("Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.");
  }
});

// ── /orders ───────────────────────────────────────────────────────────────────

bot.command("orders", async (ctx) => {
  const user = await requireUser(ctx);
  if (!user) return;

  const uid = String(ctx.from.id);
  await ctx.reply("⏳ Bugungi buyurtmalar yuklanmoqda...");

  try {
    const token = await getToken(decryptBillzToken(user.billzToken!));
    const allShops = await getShops(token, uid);
    const shopIds = getEffectiveShopIds(user, allShops);

    const today = toDateStr(new Date());
    const tomorrow = toDateStr(new Date(Date.now() + 86400000));

    const { count, ordersByDate } = await getOrders(token, {
      shopIds,
      startDate: today,
      endDate: tomorrow,
      limit: 50,
    });

    if (count === 0) {
      await ctx.reply("📋 Bugun hali buyurtma yo'q.");
      return;
    }

    const allOrders = ordersByDate.flatMap((d) => d.orders);
    const sales = allOrders.filter((o) => o.order_type === "SALE" && !o.deleted);
    const returns = allOrders.filter((o) => o.order_type === "RETURN" && !o.deleted);

    const fmt = (n: number) =>
      new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

    const totalRevenue = sales.reduce((sum, o) => sum + (o.order_detail.total_price ?? 0), 0);
    const totalReturns = returns.reduce((sum, o) => sum + (o.order_detail.total_price ?? 0), 0);

    const lines = sales.slice(0, 10).map((o, i) => {
      const shop = o.order_detail.shop?.name ?? "—";
      const cashier = o.order_detail.user?.name ?? "—";
      const price = fmt(o.order_detail.total_price ?? 0);
      const time = o.display_sold_at?.slice(11, 16) ?? "—";
      return `${i + 1}. [${time}] ${shop} — ${price} (${cashier})`;
    });

    let msg = `📋 Bugun — ${today}\n\nBuyurtmalar: ${sales.length} ta\nJami daromad: ${fmt(totalRevenue)}\n`;
    if (returns.length > 0) msg += `Qaytarishlar: ${returns.length} ta (${fmt(totalReturns)})\n`;
    msg += `\n${lines.join("\n")}`;
    if (sales.length > 10) msg += `\n\n...va yana ${sales.length - 10} ta buyurtma`;

    await ctx.reply(msg);
  } catch (err) {
    console.error("[bot] /orders failed:", err);
    await ctx.reply("Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.");
  }
});

// ── /top ──────────────────────────────────────────────────────────────────────

bot.command("top", async (ctx) => {
  const user = await requireUser(ctx);
  if (!user) return;

  const uid = String(ctx.from.id);
  await ctx.reply("⏳ Mahsulot hisoboti tayyorlanmoqda...");

  try {
    const token = await getToken(decryptBillzToken(user.billzToken!));
    const allShops = await getShops(token, uid);
    const shopIds = getEffectiveShopIds(user, allShops);

    const thirtyDaysAgo = toDateStr(new Date(Date.now() - 30 * 86400000));
    const today = toDateStr(new Date());

    const rows = await getProductPerformance(token, shopIds, thirtyDaysAgo, today, uid);

    if (rows.length === 0) {
      await ctx.reply("📊 So'nggi 30 kunda ma'lumot topilmadi.");
      return;
    }

    const fmt = (n: number) =>
      new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

    const byProduct = new Map<string, {
      name: string; sku: string;
      sold_sales_sum: number; sold_supply_sum: number;
      sold_amount: number; returned_sales_sum: number; write_off_supply_sum: number;
    }>();

    for (const r of rows) {
      if (r.is_archived) continue;
      const e = byProduct.get(r.product_id);
      if (e) {
        e.sold_sales_sum += r.sold_sales_sum;
        e.sold_supply_sum += r.sold_supply_sum;
        e.sold_amount += r.sold_amount;
        e.returned_sales_sum += r.returned_sales_sum;
        e.write_off_supply_sum += r.write_off_supply_sum;
      } else {
        byProduct.set(r.product_id, {
          name: r.name, sku: r.sku,
          sold_sales_sum: r.sold_sales_sum,
          sold_supply_sum: r.sold_supply_sum,
          sold_amount: r.sold_amount,
          returned_sales_sum: r.returned_sales_sum,
          write_off_supply_sum: r.write_off_supply_sum,
        });
      }
    }

    const products = Array.from(byProduct.values());
    const soldProducts = products.filter((p) => p.sold_amount > 0);

    const topRevenue = [...soldProducts]
      .sort((a, b) => (b.sold_sales_sum - b.returned_sales_sum) - (a.sold_sales_sum - a.returned_sales_sum))
      .slice(0, 5);

    if (topRevenue.length > 0) {
      const lines = topRevenue.map((p, i) => {
        const net = p.sold_sales_sum - p.returned_sales_sum;
        const profit = net - p.sold_supply_sum;
        const margin = net > 0 ? ((profit / net) * 100).toFixed(1) : "—";
        return `${i + 1}. ${p.name}${p.sku ? ` (${p.sku})` : ""}\n   Sotuv: ${fmt(net)} | Foyda: ${fmt(profit)} | Marja: ${margin}%`;
      });
      await ctx.reply(`📈 Top 5 mahsulot (so'nggi 30 kun):\n\n` + lines.join("\n\n"));
    }

    const writeOffs = products
      .filter((p) => p.write_off_supply_sum > 0)
      .sort((a, b) => b.write_off_supply_sum - a.write_off_supply_sum)
      .slice(0, 5);

    if (writeOffs.length > 0) {
      const lines = writeOffs.map(
        (p, i) => `${i + 1}. ${p.name}${p.sku ? ` (${p.sku})` : ""} — ${fmt(p.write_off_supply_sum)} yo'qotish`
      );
      await ctx.reply(`🗑 Hisobdan chiqarilganlar (so'nggi 30 kun):\n\n` + lines.join("\n"));
    }
  } catch (err) {
    console.error("[bot] /top failed:", err);
    await ctx.reply("Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.");
  }
});

// ── Text handler — ENG OXIRIDA bo'lishi shart ─────────────────────────────────

bot.on("contact", async (ctx) => {
  const telegramId = ctx.from.id;
  if (!awaitingPhone.has(telegramId)) return;

  const phone = ctx.message.contact.phone_number;
  awaitingPhone.delete(telegramId);

  await connectDB();
  const user = await User.findOneAndUpdate(
    { telegramId },
    { phoneNumber: phone },
    { new: true }
  );
  const lang = getLang(user);

  await ctx.reply(t[lang].phoneSaved, { reply_markup: { remove_keyboard: true } });

  try {
    const token = await getToken(decryptBillzToken(user?.billzToken ?? ""));
    const shops = await getShops(token, String(telegramId));
    await showShopSelection(ctx, shops, user?.selectedShopIds ?? [], lang);
  } catch {
    await ctx.reply(t[lang].tokenError);
    awaitingToken.add(telegramId);
  }
});

bot.on("text", async (ctx) => {
  const telegramId = ctx.from.id;
  const text = ctx.message.text;

  // "📊 Hisobot" yoki "📊 Отчёт" tugmasi
  if (text === t.uz.reportBtn || text === t.ru.reportBtn) {
    return reportFlow(ctx);
  }

  // "🔑 Tokenni almashtirish" yoki "🔑 Сменить токен" tugmasi
  if (text === t.uz.changeTokenBtn || text === t.ru.changeTokenBtn) {
    await connectDB();
    const user = await User.findOne({ telegramId });
    const lang = getLang(user);
    awaitingToken.add(telegramId);
    await ctx.reply(t[lang].changeTokenPrompt, { reply_markup: { remove_keyboard: true } });
    return;
  }

  // "⚙️ Admin panel" tugmasi
  if (text === t.uz.adminPanelBtn || text === t.ru.adminPanelBtn) {
    await connectDB();
    const user = await User.findOne({ telegramId });
    const lang = getLang(user);
    if (user?.role !== "ADMIN") return;
    const webToken = uuidv4();
    await User.findOneAndUpdate({ telegramId }, { webToken });
    const url = `${getAppBaseUrl()}/auth?token=${webToken}&redirect=/admin`;
    await sendWebLink(ctx, lang, url);
    return;
  }

  // "🌐 Dashboard ochish" yoki "🌐 Открыть Dashboard" tugmasi
  if (text === t.uz.weblinkBtn || text === t.ru.weblinkBtn) {
    await connectDB();
    const user = await User.findOne({ telegramId });
    const lang = getLang(user);
    if (!user?.billzToken) {
      await ctx.reply(t[lang].weblinkRequireToken);
      return;
    }
    const webToken = uuidv4();
    await User.findOneAndUpdate({ telegramId }, { webToken });
    const url = `${getAppBaseUrl()}/auth?token=${webToken}`;
    await sendWebLink(ctx, lang, url);
    return;
  }

  // Telefon o'tkazib yuborish
  if (awaitingPhone.has(telegramId) && (text === t.uz.phoneSkip || text === t.ru.phoneSkip)) {
    awaitingPhone.delete(telegramId);
    await connectDB();
    const user = await User.findOne({ telegramId });
    const lang = getLang(user);

    await ctx.reply(t[lang].chooseShops, { reply_markup: { remove_keyboard: true } });

    try {
      const token = await getToken(decryptBillzToken(user?.billzToken ?? ""));
      const shops = await getShops(token, String(telegramId));
      await showShopSelection(ctx, shops, user?.selectedShopIds ?? [], lang);
    } catch {
      await ctx.reply(t[lang].tokenError);
      awaitingToken.add(telegramId);
    }
    return;
  }

  if (!awaitingToken.has(telegramId)) return;

  // Token qabul qilish
  const billzToken = text.trim();
  if (!billzToken) return;
  await connectDB();

  try {
    const token = await getToken(billzToken);
    // Clear old cache before validating — ensures fresh data for new token
    await clearUserCache(String(telegramId));
    await getShops(token, String(telegramId)); // validate + warm cache for new token

    const profile = extractTelegramProfile(ctx.from);
    await User.findOneAndUpdate(
      { telegramId },
      { billzToken: encryptBillzToken(billzToken), ...profile, selectedShopIds: [] },
      { upsert: true }
    );
    awaitingToken.delete(telegramId);

    const user = await User.findOne({ telegramId });
    const lang = getLang(user);

    awaitingPhone.add(telegramId);
    await ctx.reply(t[lang].tokenSaved, { reply_markup: getPhoneKeyboard(lang) });
  } catch {
    const user = await User.findOne({ telegramId });
    const lang = getLang(user);
    await ctx.reply(t[lang].invalidToken);
  }
});
