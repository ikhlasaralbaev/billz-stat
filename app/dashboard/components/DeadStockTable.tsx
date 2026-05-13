import { Package, AlertTriangle } from "lucide-react";
import { DeadStockItem } from "@/lib/insights";

const fmtNum = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n));

export default function DeadStockTable({ items, isRu }: { items: DeadStockItem[]; isRu: boolean }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: "#0D1526", border: "1px solid #1E293B" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#F8717118" }}
          >
            <Package size={14} style={{ color: "#F87171" }} />
          </div>
          <h3 className="text-sm font-semibold text-white">Dead Stock</h3>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: "#2D1219", color: "#F87171" }}
        >
          {items.length} {isRu ? "вид(а)" : "xil"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: "#334155" }}>
          {isRu ? "Нет dead stock — отлично!" : "Dead stock yo'q — ajoyib!"}
        </p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 6).map((item) => (
            <div
              key={item.sku || item.name}
              className="flex items-center justify-between gap-2 py-2"
              style={{ borderBottom: "1px solid #0F172A" }}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{item.name}</p>
                {item.sku && <p className="text-xs" style={{ color: "#475569" }}>{item.sku}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold" style={{ color: "#F87171" }}>
                  {item.totalStock} {isRu ? "шт." : "dona"}
                </p>
                <p className="text-xs" style={{ color: "#475569" }}>
                  {fmtNum(item.totalSupplyCost)} UZS
                </p>
              </div>
            </div>
          ))}
          {items.length > 6 && (
            <p className="text-xs text-center pt-1" style={{ color: "#475569" }}>
              +{items.length - 6} {isRu ? "ещё" : "ta yana"}
            </p>
          )}
        </div>
      )}

      {items.length > 0 && (
        <div
          className="rounded-lg px-3 py-2 flex justify-between items-center text-xs"
          style={{ background: "#0A1020" }}
        >
          <div className="flex items-center gap-1.5" style={{ color: "#64748B" }}>
            <AlertTriangle size={11} />
            <span>{isRu ? "Итого заморожено" : "Jami muzlatilgan"}</span>
          </div>
          <span className="font-semibold" style={{ color: "#F87171" }}>
            {fmtNum(items.reduce((s, i) => s + i.totalSupplyCost, 0))} UZS
          </span>
        </div>
      )}
    </div>
  );
}
