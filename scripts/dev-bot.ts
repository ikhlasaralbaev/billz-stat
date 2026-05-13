import "dotenv/config";
import { bot } from "../lib/bot";

bot.launch({ dropPendingUpdates: true });

console.log("Bot is running in polling mode...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
