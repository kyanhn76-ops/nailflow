"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Language } from "@/lib/i18n";
import { REPORTS_TEXT, type ReportsText } from "@/lib/reports-text";

type Report = {
  summary: {
    customers: number;
    revenue_pence: number;
    cash_pence: number;
    card_pence: number;
    discount_pence: number;
    reward_pence: number;
    extra_pence: number;
  };
  no_shows: number;
  by_day: { day: string; revenue_pence: number; customers: number }[];
  by_technician: { name: string; customers: number; revenue_pence: number; discount_pence: number }[];
  by_service: { name: string; count: number; revenue_pence: number }[];
  by_hour: { hour: number; customers: number }[];
};

type PresetKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear"
  | "custom";

const PRESETS: PresetKey[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
  "thisYear",
  "lastYear",
  "custom",
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function shortDay(iso: string) {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

function longDay(iso: string, language: Language) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(language === "vi" ? "vi-VN" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Today's date in the UK, as YYYY-MM-DD
function londonToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000
  );
}

// Same date one year earlier (29 Feb becomes 28 Feb)
function oneYearEarlier(iso: string) {
  const year = Number(iso.slice(0, 4)) - 1;
  const monthDay = iso.slice(5) === "02-29" ? "02-28" : iso.slice(5);
  return `${year}-${monthDay}`;
}

function rangeFor(preset: Exclude<PresetKey, "custom">) {
  const today = londonToday();
  const year = Number(today.slice(0, 4));
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const yesterday = addDays(today, -1);
      return { from: yesterday, to: yesterday };
    }
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "thisMonth":
      return { from: firstOfMonth, to: today };
    case "lastMonth": {
      const lastOfPrev = addDays(firstOfMonth, -1);
      return { from: `${lastOfPrev.slice(0, 7)}-01`, to: lastOfPrev };
    }
    case "thisYear":
      return { from: `${year}-01-01`, to: today };
    case "lastYear":
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
  }
}

// Long periods are shown by month instead of by day
function groupByMonth(days: Report["by_day"]) {
  const months: { key: string; revenue_pence: number }[] = [];
  for (const d of days) {
    const key = d.day.slice(0, 7);
    const last = months.at(-1);
    if (last && last.key === key) {
      last.revenue_pence += d.revenue_pence;
    } else {
      months.push({ key, revenue_pence: d.revenue_pence });
    }
  }
  return months;
}

function ChangeBadge({ current, previous, t }: { current: number; previous: number | null; t: ReportsText }) {
  if (previous === null || previous === 0) {
    return <p className="mt-1 text-xs text-gray-400">{t.noComparison}</p>;
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  const up = percent >= 0;
  return (
    <p className={`mt-1 text-xs font-medium ${up ? "text-green-700" : "text-red-700"}`}>
      {up ? "▲" : "▼"} {Math.abs(percent)}% {t.vsLastYear}
    </p>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  children,
}: {
  icon: string;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">
        {icon} {label}
      </p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      {children}
    </div>
  );
}

function BarChart({
  title,
  bars,
}: {
  title: string;
  bars: { label: string; value: number; display: string }[];
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-gray-900">{title}</h2>
      <div className="overflow-x-auto">
        <div className="flex h-44 min-w-full items-end gap-1">
          {bars.map((b) => (
            <div key={b.label} className="flex min-w-[28px] flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[10px] text-gray-500">{b.value > 0 ? b.display : ""}</span>
              <div
                className="w-full rounded-t bg-pink-500"
                style={{ height: `${Math.max((b.value / max) * 120, b.value > 0 ? 4 : 1)}px` }}
              />
              <span className="mt-1 whitespace-nowrap text-[10px] text-gray-600">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportBody({
  report,
  previous,
  t,
}: {
  report: Report;
  previous: Report | null;
  t: ReportsText;
}) {
  const s = report.summary;
  const average = s.customers > 0 ? Math.round(s.revenue_pence / s.customers) : 0;
  const prevRevenue = previous ? previous.summary.revenue_pence : null;
  const prevCustomers = previous ? previous.summary.customers : null;
  const byMonth = report.by_day.length > 62;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard icon="💷" label={t.revenue} value={formatPrice(s.revenue_pence)}>
          <ChangeBadge current={s.revenue_pence} previous={prevRevenue} t={t} />
        </SummaryCard>
        <SummaryCard icon="✅" label={t.customers} value={String(s.customers)}>
          <ChangeBadge current={s.customers} previous={prevCustomers} t={t} />
        </SummaryCard>
        <SummaryCard icon="🧾" label={t.averageTicket} value={formatPrice(average)} />
        <SummaryCard icon="💵" label={t.cash} value={formatPrice(s.cash_pence)} />
        <SummaryCard icon="💳" label={t.card} value={formatPrice(s.card_pence)} />
        <SummaryCard icon="🚶" label={t.noShows} value={String(report.no_shows)} />
        <SummaryCard icon="🏷️" label={t.discounts} value={formatPrice(s.discount_pence)} />
        <SummaryCard icon="🎁" label={t.rewards} value={formatPrice(s.reward_pence)} />
        <SummaryCard icon="➕" label={t.extras} value={formatPrice(s.extra_pence)} />
      </div>

      {s.customers === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-gray-600 shadow-sm">{t.noData}</p>
      ) : (
        <>
          {byMonth ? (
            <BarChart
              title={t.byMonth}
              bars={groupByMonth(report.by_day).map((m) => ({
                label: `${MONTHS[Number(m.key.slice(5, 7)) - 1]} ${m.key.slice(2, 4)}`,
                value: m.revenue_pence,
                display: `£${Math.round(m.revenue_pence / 100)}`,
              }))}
            />
          ) : (
            report.by_day.length > 1 && (
              <BarChart
                title={t.byDay}
                bars={report.by_day.map((d) => ({
                  label: shortDay(d.day),
                  value: d.revenue_pence,
                  display: `£${Math.round(d.revenue_pence / 100)}`,
                }))}
              />
            )
          )}

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900">👩‍🔧 {t.byTechnician}</h2>
            <p className="mt-1 text-xs text-gray-500">{t.creditNote}</p>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2">{t.colName}</th>
                  <th className="py-2 text-right">{t.colCustomers}</th>
                  <th className="py-2 text-right">{t.colRevenue}</th>
                  <th className="py-2 text-right">{t.colDiscounts}</th>
                </tr>
              </thead>
              <tbody>
                {report.by_technician.map((row) => (
                  <tr key={row.name} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-900">{row.name}</td>
                    <td className="py-2 text-right text-gray-800">{row.customers}</td>
                    <td className="py-2 text-right text-gray-800">{formatPrice(row.revenue_pence)}</td>
                    <td className="py-2 text-right text-gray-800">{formatPrice(row.discount_pence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900">💅 {t.byService}</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2">{t.colName}</th>
                  <th className="py-2 text-right">{t.colCount}</th>
                  <th className="py-2 text-right">{t.colRevenue}</th>
                </tr>
              </thead>
              <tbody>
                {report.by_service.map((row) => (
                  <tr key={row.name} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-900">{row.name}</td>
                    <td className="py-2 text-right text-gray-800">{row.count}</td>
                    <td className="py-2 text-right text-gray-800">{formatPrice(row.revenue_pence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {report.by_hour.length > 0 && (
            <BarChart
              title={`⏰ ${t.byHour}`}
              bars={report.by_hour.map((h) => ({
                label: `${String(h.hour).padStart(2, "0")}:00`,
                value: h.customers,
                display: String(h.customers),
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}

export function ReportsSection({
  salonId,
  role,
  language,
}: {
  salonId: string;
  role: "owner" | "manager";
  language: Language;
}) {
  const t = REPORTS_TEXT[language];
  const today = londonToday();

  const [preset, setPreset] = useState<PresetKey>("last7");
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [previous, setPrevious] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const { from, to } =
    preset === "custom" ? { from: customFrom, to: customTo } : rangeFor(preset);
  const rangeValid = !!from && !!to && from <= to && daysBetween(from, to) <= 366;
  const isSingleDay = from === to;

  const load = useCallback(async () => {
    if (role !== "owner" || !rangeValid) return;
    setIsLoading(true);

    // This period and the same period one year earlier
    const [current, lastYear] = await Promise.all([
      supabase.rpc("owner_report", { p_salon_id: salonId, p_from: from, p_to: to }),
      supabase.rpc("owner_report", {
        p_salon_id: salonId,
        p_from: oneYearEarlier(from),
        p_to: oneYearEarlier(to),
      }),
    ]);

    setIsLoading(false);
    if (current.error || !current.data) {
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    setReport(current.data as Report);
    setPrevious(lastYear.error || !lastYear.data ? null : (lastYear.data as Report));
  }, [salonId, from, to, role, rangeValid]);

  useEffect(() => {
    load();
  }, [load]);

  // Step one day back or forward from the day being shown
  function moveDay(step: number) {
    const day = addDays(from, step);
    setCustomFrom(day);
    setCustomTo(day);
    setPreset("custom");
  }

  function choosePreset(p: PresetKey) {
    if (p === "custom") {
      setCustomFrom(from);
      setCustomTo(to);
    }
    setPreset(p);
  }

  if (role !== "owner") {
    return <p className="rounded-2xl bg-white p-6 text-center text-gray-600 shadow-sm">{t.ownerOnly}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => choosePreset(p)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              preset === p ? "bg-pink-600 text-white" : "bg-white text-gray-700 shadow-sm"
            }`}
          >
            {t.presets[p]}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <label className="text-sm text-gray-700">
            {t.fromDate}
            <input
              type="date"
              value={customFrom}
              max={today}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
            />
          </label>
          <label className="text-sm text-gray-700">
            {t.toDate}
            <input
              type="date"
              value={customTo}
              max={today}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
            />
          </label>
        </div>
      )}

      {isSingleDay ? (
        <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
          <button
            onClick={() => moveDay(-1)}
            aria-label={t.prevDay}
            className="rounded-full border border-gray-300 px-4 py-2 text-lg text-gray-700 hover:bg-gray-100"
          >
            ◀
          </button>
          <p className="text-center font-semibold capitalize text-gray-900">{longDay(from, language)}</p>
          <button
            onClick={() => moveDay(1)}
            disabled={from >= today}
            aria-label={t.nextDay}
            className="rounded-full border border-gray-300 px-4 py-2 text-lg text-gray-700 hover:bg-gray-100 disabled:opacity-30"
          >
            ▶
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {shortDay(from)} {from.slice(0, 4)} – {shortDay(to)} {to.slice(0, 4)}
        </p>
      )}

      {!rangeValid ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{t.invalidRange}</p>
      ) : isLoading ? (
        <p className="text-center text-gray-600">{t.loading}</p>
      ) : loadFailed || !report ? (
        <p className="text-center text-red-700">{t.loadFailed}</p>
      ) : (
        <ReportBody report={report} previous={previous} t={t} />
      )}
    </div>
  );
}