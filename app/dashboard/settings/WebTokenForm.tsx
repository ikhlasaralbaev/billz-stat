"use client";

import { useState, useTransition } from "react";
import { regenerateWebToken } from "./actions";
import { RefreshCw, Copy, Check, Link } from "lucide-react";

export default function WebTokenForm({ isRu }: { isRu: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function handleRegenerate() {
    startTransition(async () => {
      const newUrl = await regenerateWebToken();
      setUrl(newUrl);
      setCopied(false);
    });
  }

  function handleCopy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>
        {isRu
          ? "Сгенерируйте новую ссылку для входа в дашборд. Старая ссылка перестанет работать."
          : "Dashboardga kirish uchun yangi havola yarating. Eski havola o'chadi."}
      </p>

      <button
        onClick={handleRegenerate}
        disabled={pending}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-60"
        style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#94A3B8" }}
      >
        <RefreshCw size={13} className={pending ? "animate-spin" : ""} />
        {pending
          ? (isRu ? "Генерируем..." : "Yaratilmoqda...")
          : (isRu ? "Создать новую ссылку" : "Yangi havola yaratish")}
      </button>

      {url && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: "#0A1020", border: "1px solid #1E293B" }}>
          <div className="flex items-center gap-2">
            <Link size={13} style={{ color: "#6366F1" }} />
            <span className="text-xs font-medium" style={{ color: "#A5B4FC" }}>
              {isRu ? "Ваша ссылка:" : "Havolangiz:"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-xs break-all rounded-lg px-3 py-2"
              style={{ background: "#070B14", color: "#64748B", border: "1px solid #1E293B" }}
            >
              {url}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 p-2 rounded-lg transition-colors cursor-pointer"
              style={{ background: copied ? "#022C22" : "#1E293B", color: copied ? "#34D399" : "#94A3B8" }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-xs" style={{ color: "#F87171" }}>
            ⚠ {isRu ? "Не передавайте эту ссылку другим лицам." : "Bu havolani boshqalarga bermang."}
          </p>
        </div>
      )}
    </div>
  );
}
