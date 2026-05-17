"use client";

import { useState } from "react";
import { analyzeClient } from "./clientAiAction";

type Status = "idle" | "loading" | "done" | "error";

export default function ClientAiAnalysis({
  clientId,
  isRu,
  initialResult,
}: {
  clientId: string;
  isRu: boolean;
  initialResult?: string | null;
}) {
  const [status, setStatus] = useState<Status>(initialResult ? "done" : "idle");
  const [result, setResult] = useState<string>(initialResult ?? "");

  async function handleClick() {
    setStatus("loading");
    try {
      const text = await analyzeClient(clientId, isRu);
      setResult(text);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "idle") {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#A5B4FC" }}
      >
        <span style={{ fontSize: 15 }}>✦</span>
        {isRu ? "AI анализ клиента" : "AI tahlil"}
      </button>
    );
  }

  if (status === "loading") {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3 mb-4"
        style={{ background: "#0D1526", border: "1px solid #1E293B" }}
      >
        <span
          style={{
            display: "inline-block",
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid #1E293B",
            borderTopColor: "#6366F1",
            animation: "spin 0.7s linear infinite",
            flexShrink: 0,
          }}
        />
        <span className="text-sm" style={{ color: "#A5B4FC" }}>
          {isRu ? "AI анализирует клиента..." : "AI mijozni tahlil qilmoqda..."}
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3"
        style={{ background: "#1A0A0A", border: "1px solid #3B1111", color: "#F87171" }}
      >
        <span>{isRu ? "Ошибка анализа. Попробуйте снова." : "Tahlil xatosi. Qayta urinib ko'ring."}</span>
        <button onClick={handleClick} className="text-xs underline shrink-0" style={{ color: "#F87171" }}>
          {isRu ? "Повторить" : "Qayta"}
        </button>
      </div>
    );
  }

  // done
  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{ background: "#0D1526", border: "1px solid #1E293B" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15 }}>✦</span>
          <span className="text-sm font-semibold" style={{ color: "#A5B4FC" }}>
            {isRu ? "AI Анализ" : "AI Tahlil"}
          </span>
        </div>
        <button
          onClick={handleClick}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: "#1E293B", color: "#64748B", border: "1px solid #1E293B" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#94A3B8")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
        >
          {isRu ? "Обновить" : "Yangilash"}
        </button>
      </div>
      <p
        className="text-sm leading-relaxed whitespace-pre-wrap"
        style={{ color: "#CBD5E1" }}
      >
        {result}
      </p>
    </div>
  );
}
