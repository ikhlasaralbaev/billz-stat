"use client";

import { useRouter } from "next/navigation";
import { SellerStatRow } from "@/lib/billz";

function fmt(n: number): string {
  const abs = Math.abs(Math.round(n));
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return Math.round(n / 1_000) + "K";
  return String(Math.round(n));
}
function fmtFull(n: number): string {
  const s = String(Math.round(n));
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) {
    parts.unshift(s.slice(Math.max(0, i - 3), i));
  }
  return parts.join(" ") + " UZS";
}

export default function EmployeeTable({
  rows,
  isRu,
  period = "30d",
}: {
  rows: SellerStatRow[];
  isRu: boolean;
  period?: string;
}) {
  const router = useRouter();
  const maxSales = Math.max(...rows.map((r) => r.net_gross_sales), 1);

  const headers = isRu
    ? ["#", "Продавец", "Продажи", "Прибыль", "Ср. чек", "Скидка %", "Возвраты", "Чеки"]
    : ["#", "Sotuvchi", "Sotuv", "Foyda", "O'rt. chek", "Chegirma %", "Qaytarish", "Cheklar"];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>
      {/* Mobile cards */}
      <div className="sm:hidden divide-y" style={{ borderColor: "#1E293B" }}>
        {rows.map((row, i) => {
          const margin = row.net_gross_sales > 0
            ? ((row.gross_profit / row.net_gross_sales) * 100).toFixed(1)
            : "0.0";
          const barW = Math.round((row.net_gross_sales / maxSales) * 100);

          return (
            <div
            key={i}
            className="px-4 py-3.5 cursor-pointer active:opacity-70"
            style={{ background: i % 2 === 0 ? "#0A0F1E" : "#070B14" }}
            onClick={() => router.push(`/dashboard/employees/${row.seller_ids[0]}?period=${period}`)}
          >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: i === 0 ? "#6366F1" : i === 1 ? "#7C3AED" : "#1E293B",
                      color: i < 2 ? "#fff" : "#64748B",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-white">{row.seller_name || "—"}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: "#A5B4FC" }}>
                  {fmt(row.net_gross_sales)} UZS
                </span>
              </div>

              <div className="w-full rounded-full h-1 mb-3" style={{ background: "#1E293B" }}>
                <div
                  className="h-1 rounded-full"
                  style={{ width: `${barW}%`, background: "linear-gradient(90deg, #6366F1, #8B5CF6)" }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <Stat label={isRu ? "Прибыль" : "Foyda"} value={`${fmt(row.gross_profit)} UZS`} sub={`${margin}%`} />
                <Stat label={isRu ? "Ср. чек" : "O'rt. chek"} value={`${fmt(row.average_cheque)} UZS`} />
                <Stat label={isRu ? "Чеки" : "Cheklar"} value={String(row.sales ?? row.transactions_count ?? 0)} sub={`↩ ${row.returns_count ?? 0}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#0D1526", borderBottom: "1px solid #1E293B" }}>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium"
                  style={{ color: "#475569" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const margin = row.net_gross_sales > 0
                ? ((row.gross_profit / row.net_gross_sales) * 100).toFixed(1)
                : "0.0";
              const barW = Math.round((row.net_gross_sales / maxSales) * 100);

              return (
                <tr
                  key={i}
                  className="cursor-pointer transition-colors"
                  style={{
                    background: i % 2 === 0 ? "#0A0F1E" : "#070B14",
                    borderBottom: "1px solid #0D1526",
                  }}
                  onClick={() => router.push(`/dashboard/employees/${row.seller_ids[0]}?period=${period}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#0D1526")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#0A0F1E" : "#070B14")}
                >
                  <td className="px-4 py-3">
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                      style={{
                        background: i === 0 ? "#6366F1" : i === 1 ? "#7C3AED" : "#1E293B",
                        color: i < 2 ? "#fff" : "#64748B",
                      }}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{row.seller_name || "—"}</div>
                    <div className="mt-1.5 w-32 rounded-full h-1" style={{ background: "#1E293B" }}>
                      <div
                        className="h-1 rounded-full"
                        style={{
                          width: `${barW}%`,
                          background: "linear-gradient(90deg, #6366F1, #8B5CF6)",
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold" style={{ color: "#A5B4FC" }}>
                      {fmtFull(row.net_gross_sales)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white">{fmtFull(row.gross_profit)}</span>
                    <span className="ml-1.5 text-xs" style={{ color: "#64748B" }}>
                      {margin}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">{fmtFull(row.average_cheque)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-sm"
                      style={{
                        color: row.discount_percent > 10 ? "#F87171" : "#64748B",
                      }}
                    >
                      {(row.discount_percent ?? 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-sm"
                      style={{
                        color: (row.returns_count ?? 0) > 5 ? "#F87171" : "#64748B",
                      }}
                    >
                      {row.returns_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">
                    {row.sales ?? row.transactions_count ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p style={{ color: "#475569" }}>{label}</p>
      <p className="font-medium text-white mt-0.5">{value}</p>
      {sub && <p style={{ color: "#334155" }}>{sub}</p>}
    </div>
  );
}
