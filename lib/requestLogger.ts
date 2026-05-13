import { connectDB } from "@/lib/db";
import RequestLog from "@/models/RequestLog";

export interface LogData {
  userTelegramId?: string;
  service: "billz" | "anthropic";
  method: "GET" | "POST";
  url: string;
  requestParams?: Record<string, unknown>;
  shopIds?: string[];
  responseStatus?: number;
  responseRowCount?: number;
  responsePreview?: Record<string, unknown>;
  durationMs: number;
  error?: string;
}

export function logRequest(data: LogData): void {
  // Fire-and-forget — never awaited at call site
  (async () => {
    try {
      await connectDB();
      await RequestLog.create(data);
    } catch (err) {
      console.error("[requestLogger] failed to save log:", err);
    }
  })();
}
