"use client";

import Link from "next/link";

const PERIODS = [
  { key: "today", labelUz: "Bugun", labelRu: "Сегодня" },
  { key: "7d",    labelUz: "7 kun",  labelRu: "7 дней" },
  { key: "30d",   labelUz: "30 kun", labelRu: "30 дней" },
];

export default function PeriodTabs({ period, isRu }: { period: string; isRu: boolean }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl shrink-0" style={{ background: "#0D1526" }}>
      {PERIODS.map(({ key, labelUz, labelRu }) => {
        const active = period === key;
        return (
          <Link
            key={key}
            href={`/dashboard/employees?period=${key}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={
              active
                ? { background: "#6366F1", color: "#fff" }
                : { background: "transparent", color: "#475569" }
            }
          >
            {isRu ? labelRu : labelUz}
          </Link>
        );
      })}
    </div>
  );
}
