"use client";

import { useState, useTransition } from "react";
import { updateLanguage } from "./actions";
import { Check } from "lucide-react";

const OPTIONS = [
  { value: "uz", label: "🇺🇿 O'zbek" },
  { value: "ru", label: "🇷🇺 Русский" },
];

export default function LanguageForm({ current, isRu }: { current: string; isRu: boolean }) {
  const [selected, setSelected] = useState(current);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSelect(val: string) {
    setSelected(val);
    setSaved(false);
    startTransition(async () => {
      await updateLanguage(val as "uz" | "ru");
      setSaved(true);
    });
  }

  return (
    <div className="flex items-center gap-3">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleSelect(value)}
          disabled={pending}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-60"
          style={{
            background: selected === value ? "#6366F11A" : "#0D1526",
            border: `1px solid ${selected === value ? "#6366F150" : "#1E293B"}`,
            color: selected === value ? "#A5B4FC" : "#64748B",
          }}
        >
          {label}
          {selected === value && <Check size={13} style={{ color: "#A5B4FC" }} />}
        </button>
      ))}
      {saved && !pending && (
        <span className="text-xs" style={{ color: "#34D399" }}>
          {isRu ? "Сохранено" : "Saqlandi"} ✓
        </span>
      )}
    </div>
  );
}
