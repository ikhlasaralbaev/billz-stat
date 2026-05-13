"use client";

import { useState, useTransition } from "react";
import { updateReportHour } from "./actions";
import { Clock, Save } from "lucide-react";

export default function ReportHourForm({ current, isRu }: { current: number; isRu: boolean }) {
  const [hour, setHour] = useState(current);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateReportHour(hour);
      setSaved(true);
    });
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
          <Clock size={14} style={{ color: "#6366F1" }} />
          <select
            value={hour}
            onChange={(e) => { setHour(Number(e.target.value)); setSaved(false); }}
            className="bg-transparent text-sm font-medium outline-none cursor-pointer"
            style={{ color: "#E2E8F0" }}
          >
            {hours.map((h) => (
              <option key={h} value={h} style={{ background: "#0A0F1E" }}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={pending || hour === current}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
          style={{ background: "#6366F1", color: "#fff" }}
        >
          <Save size={13} />
          {pending ? (isRu ? "Сохраняем..." : "Saqlanmoqda...") : (isRu ? "Сохранить" : "Saqlash")}
        </button>

        {saved && !pending && (
          <span className="text-xs" style={{ color: "#34D399" }}>
            {isRu ? "Сохранено ✓" : "Saqlandi ✓"}
          </span>
        )}
      </div>

      <p className="text-xs" style={{ color: "#475569" }}>
        {isRu
          ? `Ежедневный отчёт будет отправлен в ${String(hour).padStart(2, "0")}:00 по Ташкентскому времени (UTC+5).`
          : `Kunlik hisobot Toshkent vaqti (UTC+5) bilan ${String(hour).padStart(2, "0")}:00 da yuboriladi.`}
      </p>
    </div>
  );
}
