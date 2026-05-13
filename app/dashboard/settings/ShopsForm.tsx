"use client";

import { useState, useTransition } from "react";
import { updateShops } from "./actions";
import { Store, Save, CheckSquare, Square } from "lucide-react";

interface Shop { id: string; name: string }

export default function ShopsForm({
  shops,
  selectedIds,
  isRu,
}: {
  shops: Shop[];
  selectedIds: string[];
  isRu: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(selectedIds.length ? selectedIds : shops.map((s) => s.id))
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(id: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSaved(false);
    if (selected.size === shops.length) setSelected(new Set());
    else setSelected(new Set(shops.map((s) => s.id)));
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      const selectedShops = shops.filter((s) => selected.has(s.id));
      await updateShops(selectedShops);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {/* Select all */}
        <button
          onClick={toggleAll}
          className="flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-sm transition-all cursor-pointer text-left"
          style={{ background: "#0A0F1E", border: "1px solid #1E293B", color: "#64748B" }}
        >
          {selected.size === shops.length
            ? <CheckSquare size={15} style={{ color: "#6366F1" }} />
            : <Square size={15} style={{ color: "#475569" }} />}
          <span style={{ color: "#94A3B8" }}>
            {isRu ? "Выбрать все" : "Hammasini tanlash"}
          </span>
        </button>

        {shops.map((shop) => {
          const isOn = selected.has(shop.id);
          return (
            <button
              key={shop.id}
              onClick={() => toggle(shop.id)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer text-left"
              style={{
                background: isOn ? "#6366F10D" : "#0D1526",
                border: `1px solid ${isOn ? "#6366F130" : "#1E293B"}`,
                color: isOn ? "#A5B4FC" : "#64748B",
              }}
            >
              <Store size={14} style={{ color: isOn ? "#6366F1" : "#334155" }} />
              <span className="flex-1">{shop.name}</span>
              {isOn
                ? <CheckSquare size={15} style={{ color: "#6366F1" }} />
                : <Square size={15} style={{ color: "#334155" }} />}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending || selected.size === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
          style={{ background: "#6366F1", color: "#fff" }}
        >
          <Save size={13} />
          {pending
            ? (isRu ? "Сохраняем..." : "Saqlanmoqda...")
            : (isRu ? `Сохранить (${selected.size})` : `Saqlash (${selected.size})`)}
        </button>
        {saved && !pending && (
          <span className="text-xs" style={{ color: "#34D399" }}>
            {isRu ? "Сохранено ✓" : "Saqlandi ✓"}
          </span>
        )}
        {selected.size === 0 && (
          <span className="text-xs" style={{ color: "#F87171" }}>
            {isRu ? "Выберите хотя бы 1 магазин" : "Kamida 1 ta do'kon tanlang"}
          </span>
        )}
      </div>
    </div>
  );
}
