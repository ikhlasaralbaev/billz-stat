"use client";

import { useTransition } from "react";
import { generateReportAction } from "../actions";
import { RefreshCw } from "lucide-react";

export default function GenerateReportButton({ isRu }: { isRu: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await generateReportAction();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title={isRu ? "Обновить отчёт" : "Hisobotni yangilash"}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
      style={{ background: "#1E293B", color: "#6366F1" }}
    >
      <RefreshCw size={13} className={pending ? "animate-spin" : ""} />
    </button>
  );
}
