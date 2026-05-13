"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { runAiCommand, CommandType, ChatMessage } from "./actions";
import { Bot, User, Loader2 } from "lucide-react";

interface Command {
  type: CommandType;
  labelUz: string;
  labelRu: string;
  emoji: string;
}

const COMMANDS: Command[] = [
  { type: "general",   labelUz: "Umumiy tahlil",       labelRu: "Общий анализ",        emoji: "📊" },
  { type: "revenue",   labelUz: "Sotuv dinamikasi",     labelRu: "Динамика продаж",     emoji: "📈" },
  { type: "shops",     labelUz: "Do'konlar taqqoslash", labelRu: "Сравнение магазинов", emoji: "🏪" },
  { type: "sellers",   labelUz: "Xodimlar tahlili",     labelRu: "Анализ сотрудников",  emoji: "👥" },
  { type: "deadstock", labelUz: "Dead stock",           labelRu: "Dead stock",          emoji: "📦" },
  { type: "overstock", labelUz: "Overstock",            labelRu: "Overstock",           emoji: "🏗️" },
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string, isRu: boolean) {
  return new Date(iso).toLocaleDateString(isRu ? "ru-RU" : "uz-UZ", {
    day: "numeric", month: "short",
  });
}

export default function AiChat({
  isRu,
  hasReport,
  initialMessages,
}: {
  isRu: boolean;
  hasReport: boolean;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function send(cmd: Command) {
    if (pending) return;
    const label = `${cmd.emoji} ${isRu ? cmd.labelRu : cmd.labelUz}`;
    // Optimistic user message (no createdAt yet — shown while loading)
    setMessages((prev) => [...prev, { role: "user", text: label, createdAt: new Date().toISOString() }]);

    startTransition(async () => {
      try {
        const saved = await runAiCommand(cmd.type, label);
        // Replace optimistic user msg with persisted pair
        setMessages((prev) => [...prev.slice(0, -1), ...saved]);
      } catch {
        setMessages((prev) => [...prev, {
          role: "ai",
          text: isRu
            ? "Ошибка при получении анализа. Попробуйте ещё раз."
            : "Tahlil olishda xatolik. Qayta urinib ko'ring.",
          createdAt: new Date().toISOString(),
        }]);
      }
    });
  }

  // Group messages by date for date separators
  let lastDate = "";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: "480px" }}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">

        {messages.length === 0 && (
          <div className="flex items-start gap-3">
            <Avatar ai />
            <div>
              <Bubble ai>
                {hasReport
                  ? (isRu
                      ? "Привет! Я анализирую данные вашего последнего отчёта. Выберите тип анализа ниже 👇"
                      : "Salom! Oxirgi hisobotingiz ma'lumotlarini tahlil qilaman. Quyidan tahlil turini tanlang 👇")
                  : (isRu
                      ? "Нет данных для анализа. Сначала создайте отчёт на странице Дашборда."
                      : "Tahlil uchun ma'lumot yo'q. Avval Dashboard sahifasida hisobot yarating.")}
              </Bubble>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const dateStr = fmtDate(msg.createdAt, isRu);
          const showDate = dateStr !== lastDate;
          lastDate = dateStr;
          const isAi = msg.role === "ai";

          return (
            <div key={i}>
              {showDate && (
                <div className="flex justify-center my-3">
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: "#0D1526", color: "#475569" }}>
                    {dateStr}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-2 ${isAi ? "" : "flex-row-reverse"}`}>
                <Avatar ai={isAi} />
                <div className={`flex flex-col gap-1 ${isAi ? "items-start" : "items-end"}`} style={{ maxWidth: "85%" }}>
                  <Bubble ai={isAi}>{msg.text}</Bubble>
                  <div className={`flex items-center gap-2 text-xs px-1 ${isAi ? "" : "flex-row-reverse"}`} style={{ color: "#334155" }}>
                    <span>{fmtTime(msg.createdAt)}</span>
                    {isAi && msg.totalTokens && (
                      <>
                        <span>·</span>
                        <span>{msg.totalTokens} tokens</span>
                        {msg.durationMs && (
                          <>
                            <span>·</span>
                            <span>{(msg.durationMs / 1000).toFixed(1)}s</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {pending && (
          <div className="flex items-end gap-2">
            <Avatar ai />
            <div
              className="rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2"
              style={{ background: "#0D1526", border: "1px solid #1E293B" }}
            >
              <Loader2 size={14} className="animate-spin" style={{ color: "#6366F1" }} />
              <span className="text-sm" style={{ color: "#475569" }}>
                {isRu ? "Анализирую..." : "Tahlil qilinmoqda..."}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Command buttons */}
      <div className="pt-4 mt-4" style={{ borderTop: "1px solid #1E293B" }}>
        <p className="text-xs mb-3" style={{ color: "#475569" }}>
          {isRu ? "Выберите тип анализа:" : "Tahlil turini tanlang:"}
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMANDS.map((cmd) => (
            <button
              key={cmd.type}
              onClick={() => send(cmd)}
              disabled={pending || !hasReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-40"
              style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#94A3B8" }}
            >
              <span>{cmd.emoji}</span>
              <span>{isRu ? cmd.labelRu : cmd.labelUz}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

function Avatar({ ai }: { ai: boolean }) {
  return (
    <div
      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mb-5"
      style={{ background: ai ? "#1E1B4B" : "#1E293B" }}
    >
      {ai
        ? <Bot size={13} style={{ color: "#A5B4FC" }} />
        : <User size={13} style={{ color: "#64748B" }} />}
    </div>
  );
}

function Bubble({ ai, children }: { ai: boolean; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap"
      style={ai
        ? { background: "#0D1526", border: "1px solid #1E293B", color: "#CBD5E1", borderBottomLeftRadius: 4 }
        : { background: "#1E1B4B", color: "#A5B4FC", borderBottomRightRadius: 4 }}
    >
      {children}
    </div>
  );
}
