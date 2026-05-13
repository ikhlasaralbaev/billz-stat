import Anthropic from "@anthropic-ai/sdk";
import { DailyStats, ShopSummary } from "./reportService";
import { DeadStockItem, OverstockItem } from "@/lib/insights";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AiInsightsInput {
  shops: ShopSummary[];
  deadStock: DeadStockItem[];
  overstock: OverstockItem[];
  userName?: string;
  language?: "uz" | "ru";
}

function buildSystemPrompt(data: AiInsightsInput): string {
  const isRu = data.language === "ru";
  const owner = data.userName ?? null;

  const intro = isRu
    ? `Вы опытный бизнес-консультант по розничной торговле.${owner ? ` Имя владельца магазина: ${owner}.` : ""} Дайте КРАТКИЙ анализ по каждому магазину — только самое важное.`
    : `Siz tajribali savdo biznes maslahatchiсиз.${owner ? ` Do'kon egasi ismi: ${owner}.` : ""} Har bir do'kon uchun QISQA tahlil bering — faqat eng muhimi.`;

  const conclusionPrompt = isRu
    ? `В конце обратись ${owner ? `к ${owner}` : "к владельцу"} и напиши 1-2 предложения итога`
    : `Oxirida ${owner ? `${owner}ga` : "do'kon egasiga"} murojaat qilib 1-2 jumlada xulosa yoz`;

  const langLine = isRu ? "Отвечай на РУССКОМ языке" : "Javob O'ZBEK tilida";

  const shopLabel = isRu ? "МАГАЗИН" : "DO'KON";
  const formatRules = isRu
    ? `ПРАВИЛА ФОРМАТА (строго):
- НЕ используй Markdown: #, ##, **, __, ---, \`\`\`
- Только эмодзи и обычный текст
- Каждый магазин: "🏪 [Название]" — статус одним предложением
- Максимум 2-3 рекомендации на магазин, каждая с "→"
- ${conclusionPrompt}
- ${langLine}`
    : `FORMAT QOIDALARI (qat'iy):
- Markdown ISHLATMA: #, ##, **, __, ---, \`\`\` YOZMA
- Faqat emoji va oddiy matn
- Har bir do'kon: "🏪 [Nom]" — holat bitta jumlada
- Do'kon boshiga maksimum 2-3 tavsiya, har biri "→" bilan
- ${conclusionPrompt}
- ${langLine}`;

  void shopLabel;
  return `${intro}\n\n${buildPrompt(data)}\n\n${formatRules}`;
}

function buildPrompt(data: AiInsightsInput): string {
  const fmt = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";
  const lines: string[] = [];

  // Per-shop stats
  data.shops.forEach((shop) => {
    const t = shop.today;
    const y = shop.yesterday;
    const diff = y.netGrossSales > 0
      ? ((t.netGrossSales - y.netGrossSales) / y.netGrossSales * 100).toFixed(1)
      : null;

    lines.push(`DO'KON: ${shop.shopName}`);
    lines.push(`  Bugun:  sotuv ${fmt(t.netGrossSales)}, foyda ${fmt(t.grossProfit)} (${t.profitMargin.toFixed(1)}%), ${t.ordersCount} ta chek`);
    lines.push(`  Kecha:  sotuv ${fmt(y.netGrossSales)}, foyda ${fmt(y.grossProfit)} (${y.profitMargin.toFixed(1)}%), ${y.ordersCount} ta chek`);
    if (diff !== null) lines.push(`  O'zgarish: ${Number(diff) >= 0 ? "+" : ""}${diff}%`);
    lines.push(``);
  });

  if (data.deadStock.length > 0) {
    lines.push(`DEAD STOCK — 7 kunda sotilmagan (barcha do'konlar):`);
    data.deadStock.forEach((item) => {
      lines.push(
        `- ${item.name}${item.sku ? ` (${item.sku})` : ""}: ${item.totalStock} dona | tannarx ${fmt(item.totalSupplyCost)} | sotish narxi ${fmt(item.totalRetailValue)}`
      );
    });
    lines.push(``);
  }

  if (data.overstock.length > 0) {
    lines.push(`OVERSTOCK — 30 kunlik sotuvdan ortiq zaxira:`);
    data.overstock.forEach((item) => {
      const days = item.daysOfStock === Infinity ? "∞" : `${item.daysOfStock}`;
      lines.push(
        `- ${item.name}${item.sku ? ` (${item.sku})` : ""}: ${item.totalStock} dona | ${days} kun zaxira | oyiga ~${item.soldLast30d} dona`
      );
    });
    lines.push(``);
  }

  return lines.join("\n");
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")        // # ## ### sarlavhalar
    .replace(/\*\*(.+?)\*\*/g, "$1")  // **qalin**
    .replace(/\*(.+?)\*/g, "$1")      // *kursiv*
    .replace(/__(.+?)__/g, "$1")      // __qalin__
    .replace(/_(.+?)_/g, "$1")        // _kursiv_
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // `kod` va ```blok```
    .replace(/^---+$/gm, "")          // --- ajratgichlar
    .replace(/^\s*[-*]\s+/gm, "→ ")   // - yoki * ro'yxat → →
    .replace(/\n{3,}/g, "\n\n")       // 3+ qator oraliq → 2 ga
    .trim();
}

export interface AiInsightsResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
}

export async function generateAiInsights(data: AiInsightsInput): Promise<AiInsightsResult> {
  const prompt = buildPrompt(data);
  const startedAt = Date.now();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: buildSystemPrompt(data),
      },
    ],
  });

  const content = message.content[0];
  const raw = content.type === "text" ? content.text : "AI tahlil topilmadi.";
  return {
    text: cleanMarkdown(raw),
    model: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    totalTokens: message.usage.input_tokens + message.usage.output_tokens,
    durationMs: Date.now() - startedAt,
  };
}
