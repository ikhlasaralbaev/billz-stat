import { getDashboardUser } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { getToken, getShops } from "@/lib/billz";
import { decryptBillzToken } from "@/lib/crypto";
import { Settings, User, Globe, Clock, Store, Shield, KeyRound } from "lucide-react";
import LanguageForm from "./LanguageForm";
import ReportHourForm from "./ReportHourForm";
import ShopsForm from "./ShopsForm";
import WebTokenForm from "./WebTokenForm";

function Section({
  icon: Icon,
  title,
  description,
  children,
  accent = "#6366F1",
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl p-6 space-y-5" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}18` }}
        >
          <Icon size={16} style={{ color: accent }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description && <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{description}</p>}
        </div>
      </div>
      <div style={{ borderTop: "1px solid #1E293B", paddingTop: "1.25rem" }}>
        {children}
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #0F172A" }}>
      <span className="text-xs" style={{ color: "#475569" }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: value ? "#CBD5E1" : "#334155" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

export default async function SettingsPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";

  let shops: { id: string; name: string }[] = [];
  let shopError = false;
  if (user.billzToken) {
    try {
      const userId = String(user.telegramId);
      const token = await getToken(decryptBillzToken(user.billzToken), userId);
      shops = await getShops(token, userId);
    } catch {
      shopError = true;
    }
  }

  const maskedToken = user.billzToken
    ? user.billzToken.slice(0, 6) + "••••••••••••" + user.billzToken.slice(-4)
    : null;

  return (
    <div className="space-y-8 max-w-2xl">

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings size={22} style={{ color: "#6366F1" }} />
          {isRu ? "Настройки" : "Sozlamalar"}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
          {isRu ? "Управление профилем и конфигурацией" : "Profil va konfiguratsiyani boshqarish"}
        </p>
      </div>

      {/* Profile */}
      <Section
        icon={User}
        title={isRu ? "Профиль" : "Profil"}
        description={isRu ? "Данные синхронизируются с Telegram" : "Ma'lumotlar Telegram'dan sinxronlanadi"}
        accent="#8B5CF6"
      >
        <div className="space-y-0">
          <ProfileField label={isRu ? "Имя" : "Ism"} value={user.firstName} />
          <ProfileField label={isRu ? "Фамилия" : "Familiya"} value={user.lastName} />
          <ProfileField label={isRu ? "Полное имя" : "To'liq ism"} value={user.fullName} />
          <ProfileField label={isRu ? "Username" : "Username"} value={user.username ? `@${user.username}` : null} />
          <ProfileField label={isRu ? "Телефон" : "Telefon"} value={user.phoneNumber} />
          <ProfileField label="Telegram ID" value={String(user.telegramId)} />
        </div>
      </Section>

      {/* Language */}
      <Section
        icon={Globe}
        title={isRu ? "Язык интерфейса" : "Interfeys tili"}
        description={isRu ? "Влияет на все сообщения бота и дашборд" : "Bot xabarlari va dashboard tiliga ta'sir qiladi"}
        accent="#6366F1"
      >
        <LanguageForm current={lang} isRu={isRu} />
      </Section>

      {/* Report hour */}
      <Section
        icon={Clock}
        title={isRu ? "Время ежедневного отчёта" : "Kunlik hisobot vaqti"}
        description={isRu ? "Во сколько присылать автоматический отчёт в Telegram" : "Telegram'ga avtomatik hisobot qaysi soatda yuborilsin"}
        accent="#F59E0B"
      >
        <ReportHourForm current={user.reportHour ?? 20} isRu={isRu} />
      </Section>

      {/* Shops */}
      <Section
        icon={Store}
        title={isRu ? "Магазины" : "Do'konlar"}
        description={
          shopError
            ? (isRu ? "Не удалось загрузить магазины — проверьте токен" : "Do'konlar yuklanmadi — tokenni tekshiring")
            : isRu
            ? "Выберите магазины для отчётов и анализа"
            : "Hisobot va tahlilga kiritiladigan do'konlarni tanlang"
        }
        accent="#10B981"
      >
        {shops.length > 0 ? (
          <ShopsForm
            shops={shops}
            selectedIds={user.selectedShopIds ?? []}
            isRu={isRu}
          />
        ) : shopError ? (
          <div className="text-sm py-2" style={{ color: "#F87171" }}>
            {isRu ? "Ошибка загрузки. Обновите токен через бота (/start)." : "Yuklashda xatolik. Botda /start orqali tokenni yangilang."}
          </div>
        ) : (
          <div className="text-sm py-2" style={{ color: "#475569" }}>
            {isRu ? "Сначала подключите Billz токен через бота." : "Avval botda Billz tokenni ulang."}
          </div>
        )}
      </Section>

      {/* Billz token */}
      <Section
        icon={KeyRound}
        title="Billz Token"
        description={isRu ? "Токен для доступа к Billz API. Менять через бота (/start)." : "Billz API ga kirish uchun token. Botda (/start) orqali almashtiriladi."}
        accent="#64748B"
      >
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "#0A1020", border: "1px solid #1E293B" }}
        >
          <KeyRound size={14} style={{ color: "#475569" }} />
          <code className="text-sm flex-1" style={{ color: maskedToken ? "#94A3B8" : "#334155" }}>
            {maskedToken ?? (isRu ? "Не подключён" : "Ulanmagan")}
          </code>
          {maskedToken && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "#022C22", color: "#34D399" }}
            >
              {isRu ? "Активен" : "Faol"}
            </span>
          )}
        </div>
      </Section>

      {/* Web access */}
      <Section
        icon={Shield}
        title={isRu ? "Доступ к дашборду" : "Dashboard kirish"}
        description={isRu ? "Ссылка для входа. Используйте /weblink в боте для получения." : "Kirish havolasi. Botda /weblink orqali oling."}
        accent="#F43F5E"
      >
        <WebTokenForm isRu={isRu} />
      </Section>

    </div>
  );
}
