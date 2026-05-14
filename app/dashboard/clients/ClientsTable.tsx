"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientRow } from "@/lib/billz";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortKey = "last_transaction_date" | "first_transaction_date" | "balance" | "name";
type SortDir = "asc" | "desc";

const fmt = (n: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function fmtDate(dateStr: string | null, isRu: boolean): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(isRu ? "ru-RU" : "uz-UZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={12} style={{ color: "#334155" }} />;
  return dir === "desc"
    ? <ArrowDown size={12} style={{ color: "#A5B4FC" }} />
    : <ArrowUp size={12} style={{ color: "#A5B4FC" }} />;
}

export default function ClientsTable({
  clients,
  isRu,
}: {
  clients: ClientRow[];
  isRu: boolean;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("last_transaction_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  const sorted = [...clients].sort((a, b) => {
    let va: string | number, vb: string | number;
    if (sortKey === "name") {
      va = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
      vb = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
    } else if (sortKey === "balance") {
      va = a.balance ?? 0;
      vb = b.balance ?? 0;
    } else {
      va = a[sortKey] ?? "";
      vb = b[sortKey] ?? "";
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const SortTh = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium cursor-pointer select-none"
      style={{ color: sortKey === col ? "#A5B4FC" : "#475569" }}
      onClick={() => toggleSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortKey={sortKey} dir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#0D1526", borderBottom: "1px solid #1E293B" }}>
                <th className="px-4 py-3 text-left text-xs font-medium w-10" style={{ color: "#475569" }}>#</th>
                <SortTh col="name" label={isRu ? "Клиент" : "Mijoz"} />
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "#475569" }}>
                  {isRu ? "Телефон" : "Telefon"}
                </th>
                <SortTh col="balance" label={isRu ? "Кешбек" : "Keshbek"} />
                <SortTh col="first_transaction_date" label={isRu ? "Первая покупка" : "Birinchi xarid"} />
                <SortTh col="last_transaction_date" label={isRu ? "Последняя покупка" : "Oxirgi xarid"} />
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "#475569" }}>
                  {isRu ? "Дней неактивен" : "Faolsiz kun"}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((client, i) => {
                const globalIdx = (page - 1) * pageSize + i;
                const name = [client.first_name, client.last_name].filter(Boolean).join(" ") || "—";
                const phone = client.phone_numbers?.[0] ?? "—";
                const days = daysSince(client.last_transaction_date);
                const daysColor = days === null ? "#475569" : days > 90 ? "#F87171" : days > 30 ? "#FB923C" : "#34D399";

                return (
                  <tr
                    key={client.id}
                    className="cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                    style={{
                      background: i % 2 === 0 ? "#0A0F1E" : "#070B14",
                      borderBottom: "1px solid #0D1526",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#0D1526")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#0A0F1E" : "#070B14")}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                        style={{
                          background: globalIdx === 0 ? "#6366F1" : globalIdx === 1 ? "#7C3AED" : "#1E293B",
                          color: globalIdx < 2 ? "#fff" : "#64748B",
                        }}
                      >
                        {globalIdx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{name}</td>
                    <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{phone}</td>
                    <td className="px-4 py-3">
                      {client.balance > 0 ? (
                        <span style={{ color: "#34D399" }}>{fmt(client.balance)}</span>
                      ) : (
                        <span style={{ color: "#334155" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#64748B" }}>
                      {fmtDate(client.first_transaction_date, isRu)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#94A3B8" }}>
                      {fmtDate(client.last_transaction_date, isRu)}
                    </td>
                    <td className="px-4 py-3">
                      {days !== null ? (
                        <span className="text-sm font-medium" style={{ color: daysColor }}>
                          {days} {isRu ? "дн." : "kun"}
                        </span>
                      ) : (
                        <span style={{ color: "#334155" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y" style={{ borderColor: "#1E293B" }}>
          {pageRows.map((client, i) => {
            const globalIdx = (page - 1) * pageSize + i;
            const name = [client.first_name, client.last_name].filter(Boolean).join(" ") || "—";
            const phone = client.phone_numbers?.[0] ?? "—";
            const days = daysSince(client.last_transaction_date);
            const daysColor = days === null ? "#475569" : days > 90 ? "#F87171" : days > 30 ? "#FB923C" : "#34D399";

            return (
              <div
                key={client.id}
                className="px-4 py-3.5 cursor-pointer active:opacity-70"
                onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                style={{ background: i % 2 === 0 ? "#0A0F1E" : "#070B14" }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: globalIdx === 0 ? "#6366F1" : globalIdx === 1 ? "#7C3AED" : "#1E293B",
                        color: globalIdx < 2 ? "#fff" : "#64748B",
                      }}
                    >
                      {globalIdx + 1}
                    </span>
                    <span className="text-sm font-medium text-white">{name}</span>
                  </div>
                  {days !== null && (
                    <span className="text-xs font-medium shrink-0" style={{ color: daysColor }}>
                      {days} {isRu ? "дн." : "kun"}
                    </span>
                  )}
                </div>
                <div className="text-xs mb-2" style={{ color: "#64748B" }}>{phone}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {client.balance > 0 && (
                    <div>
                      <span style={{ color: "#475569" }}>{isRu ? "Кешбек: " : "Keshbek: "}</span>
                      <span style={{ color: "#34D399" }}>{fmt(client.balance)}</span>
                    </div>
                  )}
                  <div>
                    <span style={{ color: "#475569" }}>{isRu ? "Первая: " : "Birinchi: "}</span>
                    <span style={{ color: "#94A3B8" }}>{fmtDate(client.first_transaction_date, isRu)}</span>
                  </div>
                  <div>
                    <span style={{ color: "#475569" }}>{isRu ? "Последняя: " : "Oxirgi: "}</span>
                    <span style={{ color: "#94A3B8" }}>{fmtDate(client.last_transaction_date, isRu)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: "#475569" }}>
            {isRu
              ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, sorted.length)} из ${sorted.length}`
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, sorted.length)} / ${sorted.length}`}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
              style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#94A3B8" }}
            >
              ←
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + idx;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-8 py-1.5 rounded-lg text-xs"
                  style={{
                    background: p === page ? "#6366F1" : "#0D1526",
                    border: "1px solid #1E293B",
                    color: p === page ? "#fff" : "#94A3B8",
                  }}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
              style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#94A3B8" }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
