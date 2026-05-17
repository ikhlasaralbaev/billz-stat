"use client";

import { useEffect, useState } from "react";
import { getSyncStats, syncAllClients } from "./clientsSyncAction";

type Status = "idle" | "loading" | "done" | "error";

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export default function ClientsSyncButton({ isRu }: { isRu: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [count, setCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSyncStats().then(({ count, lastSyncedAt }) => {
      setCount(count);
      setLastSyncedAt(lastSyncedAt ? new Date(lastSyncedAt) : null);
      if (count > 0) setStatus("done");
    });
  }, []);

  async function handleSync() {
    setStatus("loading");
    setError(null);
    try {
      const { count: newCount } = await syncAllClients();
      setCount(newCount);
      setLastSyncedAt(new Date());
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <div
        className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm"
        style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#A5B4FC" }}
      >
        <span
          style={{
            display: "inline-block",
            width: 13,
            height: 13,
            borderRadius: "50%",
            border: "2px solid #1E293B",
            borderTopColor: "#6366F1",
            animation: "spin 0.7s linear infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ color: "#64748B" }}>
          {isRu ? "Загружается... (займёт пару минут)" : "Yuklanmoqda... (bir necha daqiqa)"}
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span style={{ color: "#F87171" }}>
          {isRu ? "Ошибка синхронизации" : "Sinxronlash xatosi"}
        </span>
        <button
          onClick={handleSync}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "#0D1526", border: "1px solid #3B1111", color: "#F87171" }}
        >
          {isRu ? "Повторить" : "Qayta"}
        </button>
        {error && <span className="text-xs" style={{ color: "#475569" }}>{error}</span>}
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "#475569" }}>
          {count}{isRu ? " клиентов" : " ta mijoz"}
          {lastSyncedAt ? ` · ${fmtDate(lastSyncedAt)}` : ""}
        </span>
        <button
          onClick={handleSync}
          className="px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#64748B" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#94A3B8")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
        >
          {isRu ? "Обновить" : "Yangilash"}
        </button>
      </div>
    );
  }

  // idle — never synced before
  return (
    <button
      onClick={handleSync}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
      style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#A5B4FC" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6366F1")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1E293B")}
    >
      <span style={{ fontSize: 13 }}>↓</span>
      {isRu ? "Загрузить данные клиентов" : "Mijozlar ma'lumotlarini yuklash"}
    </button>
  );
}
