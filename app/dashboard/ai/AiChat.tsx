"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { runAiCommand, sendCustomMessage, CommandType, ChatMessage } from "./actions";
import { Bot, User, Loader2, SendHorizontal } from "lucide-react";

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

const TYPING_STEP = 10;  // chars per tick
const TYPING_INTERVAL = 8; // ms per tick → ~1250 chars/sec

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
  const [inputText, setInputText] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typing animation state
  const [streamingAiMsg, setStreamingAiMsg] = useState<ChatMessage | null>(null);
  const [shownChars, setShownChars] = useState(0);
  const isTyping = streamingAiMsg !== null && shownChars < streamingAiMsg.text.length;

  useEffect(() => {
    if (!streamingAiMsg) return;
    if (shownChars >= streamingAiMsg.text.length) {
      setMessages((prev) => [...prev, streamingAiMsg]);
      setStreamingAiMsg(null);
      setShownChars(0);
      return;
    }
    const timer = setTimeout(() => {
      setShownChars((n) => Math.min(n + TYPING_STEP, streamingAiMsg.text.length));
    }, TYPING_INTERVAL);
    return () => clearTimeout(timer);
  }, [streamingAiMsg, shownChars]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending, shownChars]);

  function appendOptimistic(userText: string) {
    setMessages((prev) => [...prev, { role: "user", text: userText, createdAt: new Date().toISOString() }]);
  }

  function startTyping(saved: ChatMessage[]) {
    const userMsg = saved[0];
    const aiMsg = saved[1];
    setMessages((prev) => [...prev.slice(0, -1), userMsg]);
    setStreamingAiMsg(aiMsg);
    setShownChars(0);
  }

  function onAiError() {
    setMessages((prev) => [...prev, {
      role: "ai",
      text: isRu
        ? "Ошибка при получении анализа. Попробуйте ещё раз."
        : "Tahlil olishda xatolik. Qayta urinib ko'ring.",
      createdAt: new Date().toISOString(),
    }]);
  }

  function send(cmd: Command) {
    if (pending || isTyping) return;
    const label = `${cmd.emoji} ${isRu ? cmd.labelRu : cmd.labelUz}`;
    appendOptimistic(label);
    startTransition(async () => {
      try {
        const saved = await runAiCommand(cmd.type, label);
        startTyping(saved);
      } catch {
        onAiError();
      }
    });
  }

  function sendCustom() {
    const text = inputText.trim();
    if (!text || pending || isTyping) return;
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    appendOptimistic(text);
    startTransition(async () => {
      try {
        const saved = await sendCustomMessage(text);
        startTyping(saved);
      } catch {
        onAiError();
      }
    });
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCustom();
    }
  }

  const messagesWithSep = messages.reduce<Array<{ msg: ChatMessage; showDate: boolean; dateStr: string }>>(
    (acc, msg) => {
      const dateStr = fmtDate(msg.createdAt, isRu);
      const prev = acc[acc.length - 1];
      return [...acc, { msg, showDate: !prev || prev.dateStr !== dateStr, dateStr }];
    },
    []
  );

  const streamingDateStr = streamingAiMsg ? fmtDate(streamingAiMsg.createdAt, isRu) : "";
  const lastDateStr = messagesWithSep[messagesWithSep.length - 1]?.dateStr ?? "";
  const showStreamingDate = !!streamingAiMsg && streamingDateStr !== lastDateStr;

  const isBusy = pending || isTyping;

  return (
    <div className="flex flex-col w-full h-full" style={{ minHeight: "480px" }}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ overflowX: "hidden", width: "100%" }}>

        {messages.length === 0 && !streamingAiMsg && (
          <div className="flex items-start gap-3">
            <Avatar ai />
            <div>
              <Bubble ai>
                {hasReport
                  ? (isRu
                      ? "Привет! Я анализирую данные вашего последнего отчёта. Выберите тип анализа ниже или напишите свой вопрос 👇"
                      : "Salom! Oxirgi hisobotingiz ma'lumotlarini tahlil qilaman. Quyidan tahlil turini tanlang yoki o'z savolingizni yozing 👇")
                  : (isRu
                      ? "Нет данных для анализа. Сначала создайте отчёт на странице Дашборда."
                      : "Tahlil uchun ma'lumot yo'q. Avval Dashboard sahifasida hisobot yarating.")}
              </Bubble>
            </div>
          </div>
        )}

        {messagesWithSep.map(({ msg, showDate, dateStr }, i) => {
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
              <div className={`flex items-end gap-2 w-full ${isAi ? "" : "flex-row-reverse"}`}>
                <Avatar ai={isAi} />
                <div
                  className={`flex flex-col gap-1 min-w-0 ${isAi ? "items-start" : "items-end"}`}
                  style={{ maxWidth: "calc(100% - 44px)" }}
                >
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

        {/* Typing animation message */}
        {streamingAiMsg && (
          <div>
            {showStreamingDate && (
              <div className="flex justify-center my-3">
                <span className="text-xs px-3 py-1 rounded-full" style={{ background: "#0D1526", color: "#475569" }}>
                  {streamingDateStr}
                </span>
              </div>
            )}
            <div className="flex items-end gap-2 w-full">
              <Avatar ai />
              <div className="flex flex-col gap-1 min-w-0 items-start" style={{ maxWidth: "calc(100% - 44px)" }}>
                <Bubble ai>
                  {streamingAiMsg.text.slice(0, shownChars)}
                  {isTyping && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 2,
                        height: "1em",
                        background: "#6366F1",
                        marginLeft: 2,
                        verticalAlign: "text-bottom",
                        animation: "blink 0.7s step-end infinite",
                      }}
                    />
                  )}
                </Bubble>
                <div className="flex items-center gap-2 text-xs px-1" style={{ color: "#334155" }}>
                  <span>{fmtTime(streamingAiMsg.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

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

      {/* Bottom: command shortcuts + input */}
      <div className="pt-3 mt-3 shrink-0 space-y-2" style={{ borderTop: "1px solid #1E293B" }}>

        {/* Command shortcuts */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {COMMANDS.map((cmd) => (
            <button
              key={cmd.type}
              onClick={() => send(cmd)}
              disabled={isBusy || !hasReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-40 shrink-0"
              style={{ background: "#0D1526", border: "1px solid #1E293B", color: "#94A3B8" }}
            >
              <span>{cmd.emoji}</span>
              <span>{isRu ? cmd.labelRu : cmd.labelUz}</span>
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
            placeholder={isRu ? "Напишите вопрос... (Enter — отправить)" : "Savol yozing... (Enter — yuborish)"}
            rows={1}
            className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm"
            style={{
              background: "#0D1526",
              border: "1px solid #1E293B",
              color: "#E2E8F0",
              outline: "none",
              minHeight: "40px",
              maxHeight: "96px",
              lineHeight: "1.5",
            }}
          />
          <button
            onClick={sendCustom}
            disabled={isBusy || !inputText.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-opacity disabled:opacity-30"
            style={{ background: "#6366F1" }}
          >
            <SendHorizontal size={16} color="#fff" />
          </button>
        </div>

      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
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
      className="rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap break-words max-w-full"
      style={ai
        ? { background: "#0D1526", border: "1px solid #1E293B", color: "#CBD5E1", borderBottomLeftRadius: 4 }
        : { background: "#1E1B4B", color: "#A5B4FC", borderBottomRightRadius: 4 }}
    >
      {children}
    </div>
  );
}
