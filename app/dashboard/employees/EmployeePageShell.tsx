"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Users } from "lucide-react";

const PERIODS = [
  { key: "today", labelUz: "Bugun",  labelRu: "Сегодня" },
  { key: "7d",    labelUz: "7 kun",  labelRu: "7 дней"  },
  { key: "30d",   labelUz: "30 kun", labelRu: "30 дней" },
];

export default function EmployeePageShell({
  period,
  isRu,
  children,
}: {
  period: string;
  isRu: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingPeriod, setPendingPeriod] = useState<string | null>(null);

  function navigate(key: string) {
    if (key === period && !isPending) return;
    setPendingPeriod(key);
    startTransition(() => {
      router.push(`/dashboard/employees?period=${key}`);
    });
  }

  const activePeriod = isPending && pendingPeriod ? pendingPeriod : period;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "#1E1B4B" }}
          >
            <Users size={14} style={{ color: "#A5B4FC" }} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">
              {isRu ? "Сотрудники" : "Xodimlar"}
            </h1>
            <p className="text-xs" style={{ color: "#64748B" }}>
              {isRu ? "Эффективность продавцов" : "Sotuvchilar samaradorligi"}
            </p>
          </div>
        </div>

        {/* Period tabs */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl w-full sm:w-auto shrink-0"
          style={{ background: "#0D1526" }}
        >
          {PERIODS.map(({ key, labelUz, labelRu }) => {
            const active = activePeriod === key;
            const loading = isPending && pendingPeriod === key;
            return (
              <button
                key={key}
                onClick={() => navigate(key)}
                disabled={isPending}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-center"
                style={
                  active
                    ? { background: "#6366F1", color: "#fff" }
                    : { background: "transparent", color: isPending ? "#334155" : "#475569" }
                }
              >
                {loading ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite",
                      verticalAlign: "middle",
                    }}
                  />
                ) : (
                  isRu ? labelRu : labelUz
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content with loading overlay when switching periods */}
      <div className="relative">
        <div
          style={{
            opacity: isPending ? 0.35 : 1,
            transition: "opacity 0.15s ease",
            pointerEvents: isPending ? "none" : "auto",
          }}
        >
          {children}
        </div>

        {isPending && (
          <div
            className="absolute inset-0 flex items-start justify-center pt-16"
            style={{ zIndex: 10 }}
          >
            <div
              className="flex items-center gap-2.5 rounded-2xl px-5 py-3"
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
              <span className="text-sm font-medium" style={{ color: "#A5B4FC" }}>
                {isRu ? "Загрузка данных..." : "Ma'lumotlar yuklanmoqda..."}
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
