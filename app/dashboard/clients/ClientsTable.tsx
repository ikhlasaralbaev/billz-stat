"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type ClientSnapshotRow = {
  id: string;
  clientId: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumbers: string[];
  balance: number;
  lastTransactionDate: string | null;
  firstTransactionDate: string | null;
  totalSpend: number;
  orderCount: number;
  returnCount: number;
  avgOrderValue: number;
};

type SortKey =
  | "name"
  | "totalSpend"
  | "orderCount"
  | "avgOrderValue"
  | "balance"
  | "lastTransactionDate"
  | "firstTransactionDate";

type SortDir = "asc" | "desc";

const fmt = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " UZS";

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function daysColor(days: number | null) {
  if (days === null) return "#475569";
  if (days > 90) return "#F87171";
  if (days > 30) return "#FB923C";
  return "#34D399";
}

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown size={11} style={{ color: "#334155" }} />;
  return dir === "desc"
    ? <ArrowDown size={11} style={{ color: "#A5B4FC" }} />
    : <ArrowUp size={11} style={{ color: "#A5B4FC" }} />;
}

export default function ClientsTable({
  clients,
  isRu,
}: {
  clients: ClientSnapshotRow[];
  isRu: boolean;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("totalSpend");
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
    switch (sortKey) {
      case "name":
        va = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim().toLowerCase();
        vb = `${b.firstName ?? ""} ${b.lastName ?? ""}`.trim().toLowerCase();
        break;
      case "totalSpend":
        va = a.totalSpend; vb = b.totalSpend; break;
      case "orderCount":
        va = a.orderCount; vb = b.orderCount; break;
      case "avgOrderValue":
        va = a.avgOrderValue; vb = b.avgOrderValue; break;
      case "balance":
        va = a.balance; vb = b.balance; break;
      case "lastTransactionDate":
        va = a.lastTransactionDate ?? ""; vb = b.lastTransactionDate ?? ""; break;
      case "firstTransactionDate":
        va = a.firstTransactionDate ?? ""; vb = b.firstTransactionDate ?? ""; break;
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const SortTh = ({ col, label, right }: { col: SortKey; label: string; right?: boolean }) => (
    <th
      className={`px-4 py-3 text-xs font-medium cursor-pointer select-none ${right ? "text-right" : "text-left"}`}
      style={{ color: sortKey === col ? "#A5B4FC" : "#475569" }}
      onClick={() => toggleSort(col)}
    >
      <div className={`flex items-center gap-1 ${right ? "justify-end" : ""}`}>
        {label}
        <SortIcon col={col} sortKey={sortKey} dir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>

        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#0D1526", borderBottom: "1px solid #1E293B" }}>
                <th className="px-4 py-3 text-left text-xs font-medium w-10" style={{ color: "#475569" }}>#</th>
                <SortTh col="name" label={isRu ? "Клиент" : "Mijoz"} />
                <SortTh col="totalSpend" label={isRu ? "Сумма" : "Jami summa"} right />
                <SortTh col="orderCount" label={isRu ? "Заказы" : "Orderlar"} right />
                <SortTh col="avgOrderValue" label={isRu ? "Ср. чек" : "O'rt. chek"} right />
                <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: "#475569" }}>
                  {isRu ? "Возвраты" : "Qaytarish"}
                </th>
                <SortTh col="balance" label={isRu ? "Кешбек" : "Keshbek"} right />
                <SortTh col="lastTransactionDate" label={isRu ? "Посл. покупка" : "Oxirgi xarid"} />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((client, i) => {
                const globalIdx = (page - 1) * pageSize + i;
                const name = [client.firstName, client.lastName].filter(Boolean).join(" ") || "—";
                const phone = client.phoneNumbers?.[0] ?? "—";
                const days = daysSince(client.lastTransactionDate);
                const dc = daysColor(days);

                return (
                  <tr
                    key={client.id}
                    className="cursor-pointer"
                    style={{ background: i % 2 === 0 ? "#0A0F1E" : "#070B14", borderBottom: "1px solid #0D1526" }}
                    onClick={() => router.push(`/dashboard/clients/${client.clientId}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#0D1526")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#0A0F1E" : "#070B14")}
                  >
                    <td className="px-4 py-3">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                        style={{
                          background: globalIdx === 0 ? "#6366F1" : globalIdx === 1 ? "#7C3AED" : globalIdx === 2 ? "#4F46E5" : "#1E293B",
                          color: globalIdx < 3 ? "#fff" : "#64748B",
                        }}
                      >
                        {globalIdx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#475569" }}>{phone}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold" style={{ color: "#A5B4FC" }}>
                        {client.totalSpend > 0 ? fmt(client.totalSpend) : <span style={{ color: "#334155" }}>—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span style={{ color: "#94A3B8" }}>{client.orderCount > 0 ? client.orderCount : "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span style={{ color: "#64748B" }}>
                        {client.avgOrderValue > 0 ? fmt(client.avgOrderValue) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {client.returnCount > 0 ? (
                        <span style={{ color: "#F87171" }}>{client.returnCount}</span>
                      ) : (
                        <span style={{ color: "#334155" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {client.balance > 0 ? (
                        <span style={{ color: "#34D399" }}>{fmt(client.balance)}</span>
                      ) : (
                        <span style={{ color: "#334155" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div style={{ color: "#94A3B8" }}>{fmtDate(client.lastTransactionDate)}</div>
                      {days !== null && (
                        <div className="text-xs mt-0.5 font-medium" style={{ color: dc }}>
                          {days} {isRu ? "дн." : "kun"}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile + tablet */}
        <div className="lg:hidden">
          {/* Sort bar */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto"
            style={{ borderBottom: "1px solid #1E293B", background: "#0D1526" }}
          >
            <span className="text-xs shrink-0" style={{ color: "#475569" }}>
              {isRu ? "Сортировка:" : "Saralash:"}
            </span>
            {(
              [
                { key: "totalSpend", label: isRu ? "Сумма" : "Summa" },
                { key: "orderCount", label: isRu ? "Заказы" : "Order" },
                { key: "lastTransactionDate", label: isRu ? "Посл. покупка" : "Oxirgi" },
                { key: "balance", label: isRu ? "Кешбек" : "Keshbek" },
              ] as { key: SortKey; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs shrink-0"
                style={{
                  background: sortKey === key ? "#1E1B4B" : "#1E293B",
                  color: sortKey === key ? "#A5B4FC" : "#64748B",
                  border: `1px solid ${sortKey === key ? "#4338CA" : "#1E293B"}`,
                }}
              >
                {label}
                <SortIcon col={key} sortKey={sortKey} dir={sortDir} />
              </button>
            ))}
          </div>

          <div className="divide-y" style={{ borderColor: "#1E293B" }}>
            {pageRows.map((client, i) => {
              const globalIdx = (page - 1) * pageSize + i;
              const name = [client.firstName, client.lastName].filter(Boolean).join(" ") || "—";
              const phone = client.phoneNumbers?.[0] ?? "—";
              const days = daysSince(client.lastTransactionDate);
              const dc = daysColor(days);

              return (
                <div
                  key={client.id}
                  className="px-4 py-3.5 cursor-pointer active:opacity-70"
                  onClick={() => router.push(`/dashboard/clients/${client.clientId}`)}
                  style={{ background: i % 2 === 0 ? "#0A0F1E" : "#070B14" }}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: globalIdx < 3 ? "#6366F1" : "#1E293B",
                          color: globalIdx < 3 ? "#fff" : "#64748B",
                        }}
                      >
                        {globalIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{name}</div>
                        <div className="text-xs" style={{ color: "#475569" }}>{phone}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold" style={{ color: "#A5B4FC" }}>
                        {client.totalSpend > 0 ? fmt(client.totalSpend) : "—"}
                      </div>
                      {days !== null && (
                        <div className="text-xs font-medium" style={{ color: dc }}>
                          {days} {isRu ? "дн." : "kun"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-x-3 text-xs">
                    <div>
                      <span style={{ color: "#475569" }}>{isRu ? "Заказы: " : "Order: "}</span>
                      <span style={{ color: "#94A3B8" }}>{client.orderCount || "—"}</span>
                    </div>
                    <div>
                      <span style={{ color: "#475569" }}>{isRu ? "Ср. чек: " : "O'rt: "}</span>
                      <span style={{ color: "#64748B" }}>
                        {client.avgOrderValue > 0 ? fmt(client.avgOrderValue) : "—"}
                      </span>
                    </div>
                    {client.balance > 0 && (
                      <div>
                        <span style={{ color: "#475569" }}>{isRu ? "Кешбек: " : "Keshbek: "}</span>
                        <span style={{ color: "#34D399" }}>{fmt(client.balance)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: "#475569" }}>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} / {sorted.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
              style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#94A3B8" }}
            >←</button>
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
            >→</button>
          </div>
        </div>
      )}
    </div>
  );
}
