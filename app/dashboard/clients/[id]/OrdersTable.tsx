"use client";

import React, { useState } from "react";
import { ClientOrderSummary } from "@/lib/billz";

const fmt = (n: number) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " UZS";

function fmtDateTime(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return dateStr;
  const offset = 5 * 60;
  const local = new Date(d.getTime() + offset * 60_000);
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = local.getUTCFullYear();
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const min = String(local.getUTCMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export default function OrdersTable({
  orders,
  isRu,
}: {
  orders: ClientOrderSummary[];
  isRu: boolean;
}) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const pageSize = 15;
  const totalPages = Math.ceil(orders.length / pageSize);
  const pageRows = orders.slice((page - 1) * pageSize, page * pageSize);

  function toggleExpand(orderId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm" style={{ color: "#475569" }}>
        {isRu ? "Покупок не найдено" : "Xaridlar topilmadi"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>
        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#0D1526", borderBottom: "1px solid #1E293B" }}>
                {[
                  isRu ? "Дата / Чек №" : "Sana / Chek №",
                  isRu ? "Магазин" : "Do'kon",
                  isRu ? "Продавец" : "Sotuvchi",
                  isRu ? "Сумма" : "Summa",
                  isRu ? "Прибыль" : "Foyda",
                  isRu ? "Тип" : "Tur",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: "#475569" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((order, i) => {
                const isSale = order.order_type === "Продажа" || order.order_type === "SALE";
                const isExpanded = expanded.has(order.order_id);
                return (
                  <React.Fragment key={order.order_id}>
                    <tr
                      className="cursor-pointer"
                      style={{
                        background: i % 2 === 0 ? "#0A0F1E" : "#070B14",
                        borderBottom: isExpanded ? "none" : "1px solid #0D1526",
                      }}
                      onClick={() => toggleExpand(order.order_id)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#0D1526")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#0A0F1E" : "#070B14")}
                    >
                      <td className="px-4 py-3">
                        <div style={{ color: "#94A3B8" }}>{fmtDateTime(order.created_at)}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#475569" }}>#{order.order_number}</div>
                      </td>
                      <td className="px-4 py-3 text-white">{order.shop_name || "—"}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{order.seller_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold" style={{ color: isSale ? "#A5B4FC" : "#F87171" }}>
                          {isSale ? "" : "−"}{fmt(order.net_sales)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: order.net_profit >= 0 ? "#34D399" : "#F87171" }}>
                          {order.net_profit < 0 ? "−" : ""}{fmt(Math.abs(order.net_profit))}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: isSale ? "#0F2027" : "#2D1219",
                            color: isSale ? "#22D3EE" : "#F87171",
                          }}
                        >
                          {isSale ? (isRu ? "Продажа" : "Sotuv") : (isRu ? "Возврат" : "Qaytarish")}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr
                        key={`${order.order_id}-expanded`}
                        style={{ background: i % 2 === 0 ? "#0A0F1E" : "#070B14", borderBottom: "1px solid #0D1526" }}
                      >
                        <td colSpan={6} className="px-6 pb-3 pt-0">
                          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>
                            <table className="w-full text-xs">
                              <thead>
                                <tr style={{ background: "#070B14" }}>
                                  <th className="px-3 py-2 text-left font-medium" style={{ color: "#334155" }}>
                                    {isRu ? "Товар" : "Mahsulot"}
                                  </th>
                                  <th className="px-3 py-2 text-right font-medium" style={{ color: "#334155" }}>
                                    {isRu ? "Кол-во" : "Soni"}
                                  </th>
                                  <th className="px-3 py-2 text-right font-medium" style={{ color: "#334155" }}>
                                    {isRu ? "Сумма" : "Summa"}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.products.map((p, pi) => (
                                  <tr key={pi} style={{ borderTop: "1px solid #0D1526" }}>
                                    <td className="px-3 py-2" style={{ color: "#94A3B8" }}>{p.name}</td>
                                    <td className="px-3 py-2 text-right" style={{ color: "#64748B" }}>{p.qty}</td>
                                    <td className="px-3 py-2 text-right" style={{ color: "#A5B4FC" }}>{fmt(p.net_sales)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="sm:hidden divide-y" style={{ borderColor: "#1E293B" }}>
          {pageRows.map((order, i) => {
            const isSale = order.order_type === "Продажа" || order.order_type === "SALE";
            const isExpanded = expanded.has(order.order_id);

            return (
              <div key={order.order_id} style={{ background: i % 2 === 0 ? "#0A0F1E" : "#070B14" }}>
                <div
                  className="px-4 py-3 cursor-pointer active:opacity-70"
                  onClick={() => toggleExpand(order.order_id)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs" style={{ color: "#64748B" }}>
                      {fmtDateTime(order.created_at)}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: isSale ? "#0F2027" : "#2D1219",
                        color: isSale ? "#22D3EE" : "#F87171",
                      }}
                    >
                      {isSale ? (isRu ? "Продажа" : "Sotuv") : (isRu ? "Возврат" : "Qaytarish")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm text-white">{order.shop_name || "—"}</span>
                      <span className="ml-2 text-xs" style={{ color: "#475569" }}>#{order.order_number}</span>
                    </div>
                    <span className="font-semibold shrink-0" style={{ color: isSale ? "#A5B4FC" : "#F87171" }}>
                      {isSale ? "" : "−"}{fmt(order.net_sales)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "#475569" }}>
                    {isRu ? "Продавец: " : "Sotuvchi: "}
                    <span style={{ color: "#64748B" }}>{order.seller_name || "—"}</span>
                    {" · "}
                    <span style={{ color: order.net_profit >= 0 ? "#34D399" : "#F87171" }}>
                      {isRu ? "Прибыль: " : "Foyda: "}{order.net_profit < 0 ? "−" : ""}{fmt(Math.abs(order.net_profit))}
                    </span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3">
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>
                      {order.products.map((p, pi) => (
                        <div
                          key={pi}
                          className="flex items-center justify-between px-3 py-2 text-xs"
                          style={{ borderTop: pi > 0 ? "1px solid #0D1526" : undefined }}
                        >
                          <span style={{ color: "#94A3B8" }}>{p.name} × {p.qty}</span>
                          <span style={{ color: "#A5B4FC" }}>{fmt(p.net_sales)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: "#475569" }}>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, orders.length)} / {orders.length}
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
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 py-1.5 rounded-lg text-xs"
                  style={{
                    background: p === page ? "#6366F1" : "#0D1526",
                    border: "1px solid #1E293B",
                    color: p === page ? "#fff" : "#94A3B8",
                  }}
                >{p}</button>
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
