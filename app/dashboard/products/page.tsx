import { getDashboardUser, getLatestReport } from "@/lib/dashboard";
import { redirect } from "next/navigation";
import { getLang } from "@/lib/i18n";
import { Package, Warehouse, AlertTriangle, CheckCircle } from "lucide-react";

const fmtNum = (n: number) => new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " UZS";
const fmtQty = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);

export default async function ProductsPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/auth/error");

  const lang = getLang(user);
  const isRu = lang === "ru";
  const report = await getLatestReport(user.telegramId, user.billzToken);

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#1E293B" }}>
          <Package size={28} style={{ color: "#475569" }} />
        </div>
        <p className="text-white font-semibold">{isRu ? "Нет данных" : "Ma'lumot yo'q"}</p>
        <p className="text-sm text-center max-w-xs" style={{ color: "#64748B" }}>
          {isRu ? "Сначала создайте отчёт через бота (/report)." : "Botda /report buyrug'ini yuboring."}
        </p>
      </div>
    );
  }

  const shopFilter = user.selectedShopNames?.length ? new Set(user.selectedShopNames) : null;
  const reportDate = new Date(report.createdAt ?? Date.now());
  const hoursAgo = Math.floor((Date.now() - reportDate.getTime()) / 3600000);
  const isStale = hoursAgo >= 24;
  const deadStock = shopFilter
    ? report.deadStock.filter((i) => i.shopNames?.some((n) => shopFilter.has(n)))
    : report.deadStock;
  const overstock = shopFilter
    ? report.overstock.filter((i) => i.shopNames?.some((n) => shopFilter.has(n)))
    : report.overstock;
  const totalDeadCost = deadStock.reduce((s, i) => s + i.totalSupplyCost, 0);
  const totalDeadRetail = deadStock.reduce((s, i) => s + i.totalRetailValue, 0);
  const totalDeadQty = deadStock.reduce((s, i) => s + i.totalStock, 0);
  const totalOverCost = overstock.reduce((s, i) => s + i.totalSupplyCost, 0);
  const totalOverRetail = overstock.reduce((s, i) => s + i.totalRetailValue, 0);
  const totalOverQty = overstock.reduce((s, i) => s + i.totalStock, 0);

  return (
    <div className="space-y-8">

      {isStale && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: "#1C1207", border: "1px solid #92400E", color: "#FCD34D" }}
        >
          <AlertTriangle size={15} className="shrink-0" />
          <span>
            {isRu
              ? `Данные устарели — последний отчёт ${hoursAgo} ч. назад. Отправьте /report в боте.`
              : `Ma'lumotlar eskirgan — so'nggi hisobot ${hoursAgo} soat oldin. Botda /report yuboring.`}
          </span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">{isRu ? "Товары" : "Mahsulotlar"}</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
          {isRu ? "Dead stock и оверсток из последнего отчёта" : "Oxirgi hisobotdagi dead stock va overstock"}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: isRu ? "Dead stock (видов)" : "Dead stock (xil)", value: deadStock.length, color: "#F87171", bg: "#2D1219" },
          { label: isRu ? "Dead stock (шт.)" : "Dead stock (dona)", value: fmtQty(totalDeadQty), color: "#F87171", bg: "#2D1219" },
          { label: isRu ? "Оверсток (видов)" : "Overstock (xil)", value: overstock.length, color: "#FB923C", bg: "#1C1207" },
          { label: isRu ? "Оверсток (шт.)" : "Overstock (dona)", value: fmtQty(totalOverQty), color: "#FB923C", bg: "#1C1207" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl p-4" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
            <p className="text-xs mb-1" style={{ color: "#64748B" }}>{c.label}</p>
            <p className="text-xl font-bold" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Dead Stock table */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#F8717118" }}>
            <Package size={14} style={{ color: "#F87171" }} />
          </div>
          <h2 className="text-base font-semibold text-white">Dead Stock</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#2D1219", color: "#F87171" }}>
            {isRu ? "не продавались 7 дней" : "7 kunda sotilmagan"}
          </span>
        </div>

        {deadStock.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
            <CheckCircle size={16} style={{ color: "#34D399" }} />
            <span className="text-sm" style={{ color: "#34D399" }}>
              {isRu ? "Нет dead stock — отлично!" : "Dead stock yo'q — ajoyib!"}
            </span>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden rounded-2xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>
              <div className="divide-y" style={{ borderColor: "#0F172A" }}>
                {deadStock.map((item, i) => (
                  <div key={item.sku || item.name} className="px-4 py-3.5" style={{ background: i % 2 === 0 ? "#0D1526" : "#0A0F1E" }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        {item.sku && <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{item.sku}</p>}
                      </div>
                      <span className="text-sm font-bold shrink-0" style={{ color: "#F87171" }}>
                        {fmtQty(item.totalStock)} {isRu ? "шт." : "dona"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <p style={{ color: "#475569" }}>{isRu ? "Себестоимость" : "Tannarx"}</p>
                        <p className="font-medium text-white mt-0.5">{fmtNum(item.totalSupplyCost)}</p>
                      </div>
                      <div>
                        <p style={{ color: "#475569" }}>{isRu ? "Цена продажи" : "Sotish narxi"}</p>
                        <p className="font-medium text-white mt-0.5">{fmtNum(item.totalRetailValue)}</p>
                      </div>
                    </div>
                    {(item.shopNames ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(item.shopNames ?? []).map((s) => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#1E293B", color: "#94A3B8" }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 flex justify-between items-center text-xs" style={{ background: "#0A0F1E", borderTop: "1px solid #1E293B" }}>
                <span style={{ color: "#64748B" }}>{isRu ? `Итого: ${deadStock.length} вид(а)` : `Jami: ${deadStock.length} xil`}</span>
                <span className="font-semibold" style={{ color: "#F87171" }}>{fmtNum(totalDeadCost)}</span>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block rounded-2xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#0A0F1E", borderBottom: "1px solid #1E293B" }}>
                    {[isRu ? "Товар" : "Mahsulot", isRu ? "Кол-во" : "Miqdor", isRu ? "Себестоимость" : "Tannarx", isRu ? "Цена продажи" : "Sotish narxi", isRu ? "Магазины" : "Do'konlar"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "#475569" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deadStock.map((item, i) => (
                    <tr key={item.sku || item.name} style={{ background: i % 2 === 0 ? "#0D1526" : "#0A0F1E", borderBottom: "1px solid #0F172A" }}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{item.name}</p>
                        {item.sku && <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{item.sku}</p>}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#F87171" }}>{fmtQty(item.totalStock)} {isRu ? "шт." : "dona"}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{fmtNum(item.totalSupplyCost)}</td>
                      <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{fmtNum(item.totalRetailValue)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(item.shopNames ?? []).map((s) => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#1E293B", color: "#94A3B8" }}>{s}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#0A0F1E", borderTop: "1px solid #1E293B" }}>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: "#64748B" }}>{isRu ? `Итого: ${deadStock.length} вид(а)` : `Jami: ${deadStock.length} xil`}</td>
                    <td className="px-4 py-3 font-semibold text-xs" style={{ color: "#F87171" }}>{fmtQty(totalDeadQty)}</td>
                    <td className="px-4 py-3 font-semibold text-xs" style={{ color: "#F87171" }}>{fmtNum(totalDeadCost)}</td>
                    <td className="px-4 py-3 font-semibold text-xs" style={{ color: "#F87171" }}>{fmtNum(totalDeadRetail)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Overstock table */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#FB923C18" }}>
            <Warehouse size={14} style={{ color: "#FB923C" }} />
          </div>
          <h2 className="text-base font-semibold text-white">{isRu ? "Оверсток" : "Overstock"}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#1C1207", color: "#FB923C" }}>
            {isRu ? "запас более 30 дней" : "30 kundan ortiq zaxira"}
          </span>
        </div>

        {overstock.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl" style={{ background: "#0D1526", border: "1px solid #1E293B" }}>
            <CheckCircle size={16} style={{ color: "#34D399" }} />
            <span className="text-sm" style={{ color: "#34D399" }}>
              {isRu ? "Нет овертока — отлично!" : "Overstock yo'q — ajoyib!"}
            </span>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden rounded-2xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>
              <div className="divide-y" style={{ borderColor: "#0F172A" }}>
                {overstock.map((item, i) => {
                  const days = item.daysOfStock === Infinity ? "∞" : `${item.daysOfStock}`;
                  const color = item.daysOfStock === Infinity || item.daysOfStock > 180 ? "#F87171"
                    : item.daysOfStock > 60 ? "#FB923C" : "#FCD34D";
                  return (
                    <div key={item.sku || item.name} className="px-4 py-3.5" style={{ background: i % 2 === 0 ? "#0D1526" : "#0A0F1E" }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{item.name}</p>
                          {item.sku && <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{item.sku}</p>}
                        </div>
                        <span className="text-sm font-bold shrink-0" style={{ color }}>
                          {days} {isRu ? "дн." : "kun"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div>
                          <p style={{ color: "#475569" }}>{isRu ? "Остаток" : "Qoldiq"}</p>
                          <p className="font-medium text-white mt-0.5">{fmtQty(item.totalStock)} {isRu ? "шт." : "dona"}</p>
                        </div>
                        <div>
                          <p style={{ color: "#475569" }}>{isRu ? "Прод./мес" : "Sotuv/oy"}</p>
                          <p className="font-medium text-white mt-0.5">{fmtQty(item.soldLast30d)}</p>
                        </div>
                        <div>
                          <p style={{ color: "#475569" }}>{isRu ? "Себест." : "Tannarx"}</p>
                          <p className="font-medium text-white mt-0.5">{fmtNum(item.totalSupplyCost)}</p>
                        </div>
                      </div>
                      {(item.shopNames ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(item.shopNames ?? []).map((s) => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#1E293B", color: "#94A3B8" }}>{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 flex justify-between items-center text-xs" style={{ background: "#0A0F1E", borderTop: "1px solid #1E293B" }}>
                <span style={{ color: "#64748B" }}>{isRu ? `Итого: ${overstock.length} вид(а)` : `Jami: ${overstock.length} xil`}</span>
                <span className="font-semibold" style={{ color: "#FB923C" }}>{fmtNum(totalOverCost)}</span>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block rounded-2xl overflow-hidden" style={{ border: "1px solid #1E293B" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#0A0F1E", borderBottom: "1px solid #1E293B" }}>
                    {[isRu ? "Товар" : "Mahsulot", isRu ? "Остаток" : "Qoldiq", isRu ? "Продаж/мес" : "Sotuv/oy", isRu ? "Запас (дней)" : "Zaxira (kun)", isRu ? "Себестоимость" : "Tannarx", isRu ? "Магазины" : "Do'konlar"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "#475569" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overstock.map((item, i) => {
                    const days = item.daysOfStock === Infinity ? "∞" : `${item.daysOfStock}`;
                    const color = item.daysOfStock === Infinity || item.daysOfStock > 180 ? "#F87171"
                      : item.daysOfStock > 60 ? "#FB923C" : "#FCD34D";
                    return (
                      <tr key={item.sku || item.name} style={{ background: i % 2 === 0 ? "#0D1526" : "#0A0F1E", borderBottom: "1px solid #0F172A" }}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{item.name}</p>
                          {item.sku && <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{item.sku}</p>}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color }}>{fmtQty(item.totalStock)} {isRu ? "шт." : "dona"}</td>
                        <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{fmtQty(item.soldLast30d)}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold" style={{ color }}>{days}</span>
                          {item.daysOfStock !== Infinity && (
                            <div className="mt-1 h-1 rounded-full w-16" style={{ background: "#1E293B" }}>
                              <div className="h-1 rounded-full" style={{ width: `${Math.min((30 / item.daysOfStock) * 100, 100)}%`, background: color }} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{fmtNum(item.totalSupplyCost)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(item.shopNames ?? []).map((s) => (
                              <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#1E293B", color: "#94A3B8" }}>{s}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#0A0F1E", borderTop: "1px solid #1E293B" }}>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: "#64748B" }}>{isRu ? `Итого: ${overstock.length} вид(а)` : `Jami: ${overstock.length} xil`}</td>
                    <td className="px-4 py-3 font-semibold text-xs" style={{ color: "#FB923C" }}>{fmtQty(totalOverQty)}</td>
                    <td /><td />
                    <td className="px-4 py-3 font-semibold text-xs" style={{ color: "#FB923C" }}>{fmtNum(totalOverCost)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {overstock.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "#475569" }}>
            <AlertTriangle size={12} />
            {isRu
              ? `Заморожено в овертоке: ${fmtNum(totalOverCost)} (продажная цена: ${fmtNum(totalOverRetail)})`
              : `Overstockda muzlatilgan: ${fmtNum(totalOverCost)} (sotish narxi: ${fmtNum(totalOverRetail)})`}
          </div>
        )}
      </section>

    </div>
  );
}
