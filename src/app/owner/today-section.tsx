"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Language } from "@/lib/i18n";
import { TODAY_TEXT, type TodayText } from "@/lib/today-text";

type TicketService = {
  name: string;
  listed_pence: number;
  final_pence: number | null;
  is_from: boolean;
};

type TodayTicket = {
  entry_id: string;
  ticket_number: number;
  first_name: string;
  status: "waiting" | "in_service" | "done" | "cancelled";
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  technician_name: string | null;
  requested_technician_name: string | null;
  services: TicketService[];
  listed_total_pence: number;
  extra_charge_pence: number;
  extra_charge_reason: string | null;
  extra_charge_note: string | null;
  total_paid_pence: number | null;
  cash_pence: number | null;
  card_pence: number | null;
  notes: string | null;
  cancelled_by: string | null;
  transfer_count: number;
};

type ActivityRow = {
  happened_at: string;
  actor_name: string;
  actor_type: "staff" | "owner";
  action: string;
  ticket_number: number | null;
  target_name: string | null;
  details: Record<string, unknown> | null;
};

type TabKey = "live" | "done" | "noShows" | "activity";

const REFRESH_SECONDS = 30;

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function minutesSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

// How much more than the listed price the services were sold for (not counting extras)
function aboveListedPence(ticket: TodayTicket) {
  const finalServices = ticket.services.reduce(
    (sum, s) => sum + (s.final_pence ?? s.listed_pence),
    0
  );
  return Math.max(0, finalServices - ticket.listed_total_pence);
}

function isFlagged(ticket: TodayTicket) {
  return ticket.extra_charge_pence > 0 || aboveListedPence(ticket) > 0 || ticket.transfer_count > 0;
}

function describeActivity(row: ActivityRow, t: TodayText) {
  const who = row.actor_name;
  const ticket = row.ticket_number ?? 0;
  const target = row.target_name ?? "";
  const a = t.activity;

  switch (row.action) {
    case "start":
      return a.start(who, ticket);
    case "finish": {
      const total = Number(row.details?.total_pence ?? 0);
      return a.finish(who, ticket, formatPrice(total));
    }
    case "no_show":
      return a.no_show(who, ticket);
    case "change_technician":
      return a.change_technician(who, ticket, target || t.firstAvailable);
    case "hand_over":
      return a.hand_over(who, ticket, target);
    case "add_technician":
      return a.add_technician(who, target);
    case "update_technician":
      return a.update_technician(who, target);
    case "change_pin":
      return a.change_pin(who, target);
    case "lock_technician":
      return a.lock_technician(who, target);
    case "unlock_technician":
      return a.unlock_technician(who, target);
    case "restore_entry":
      return a.restore_entry(who, ticket, target);
    default:
      return `${who}: ${row.action}`;
  }
}

function SummaryCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">
        {icon} {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function DoneTicketCard({ ticket, t }: { ticket: TodayTicket; t: TodayText }) {
  const above = aboveListedPence(ticket);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold text-gray-900">
          #{ticket.ticket_number} {ticket.first_name}
          <span className="font-normal text-gray-500">
            {" "}
            · {ticket.technician_name ?? "—"}
            {ticket.finished_at && ` · ${formatTime(ticket.finished_at)}`}
          </span>
        </p>
        {ticket.total_paid_pence !== null && (
          <p className="text-lg font-bold text-gray-900">{formatPrice(ticket.total_paid_pence)}</p>
        )}
      </div>

      {(ticket.extra_charge_pence > 0 || above > 0 || ticket.transfer_count > 0) && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
          {ticket.extra_charge_pence > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">{t.flagExtra}</span>
          )}
          {above > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
              {t.flagAboveListed(formatPrice(above))}
            </span>
          )}
          {ticket.transfer_count > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">{t.flagTransfer}</span>
          )}
        </div>
      )}

      <div className="mt-3 space-y-1 text-sm">
        {ticket.services.map((s, i) => {
          const final = s.final_pence ?? s.listed_pence;
          return (
            <div key={i} className="flex justify-between gap-2 text-gray-800">
              <span>
                {s.name}
                {s.is_from && final !== s.listed_pence && (
                  <span className="text-gray-500"> ({t.listed(formatPrice(s.listed_pence))})</span>
                )}
              </span>
              <span>{formatPrice(final)}</span>
            </div>
          );
        })}
        {ticket.extra_charge_pence > 0 && (
          <div className="flex justify-between gap-2 text-gray-800">
            <span>
              {t.extraCharge}
              {ticket.extra_charge_reason &&
                ` (${t.extraReasons[ticket.extra_charge_reason] ?? ticket.extra_charge_reason})`}
              {ticket.extra_charge_note && (
                <span className="text-gray-500"> · {ticket.extra_charge_note}</span>
              )}
            </span>
            <span>{formatPrice(ticket.extra_charge_pence)}</span>
          </div>
        )}
      </div>

      {ticket.total_paid_pence === null ? (
        <p className="mt-2 text-xs text-gray-500">{t.notPriced}</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-3 border-t border-gray-100 pt-2 text-sm text-gray-700">
          {(ticket.cash_pence ?? 0) > 0 && <span>💵 {formatPrice(ticket.cash_pence ?? 0)}</span>}
          {(ticket.card_pence ?? 0) > 0 && <span>💳 {formatPrice(ticket.card_pence ?? 0)}</span>}
        </div>
      )}

      {ticket.notes && (
        <p className="mt-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
          📝 {t.customerNote}: {ticket.notes}
        </p>
      )}
    </div>
  );
}

export function TodaySection({
  salonId,
  salonSlug,
  language,
}: {
  salonId: string;
  salonSlug: string;
  language: Language;
}) {
  const t = TODAY_TEXT[language];

  const [tickets, setTickets] = useState<TodayTicket[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState<TabKey>("live");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState(false);

  const load = useCallback(async () => {
    const [ticketsResult, activityResult] = await Promise.all([
      supabase.rpc("owner_today_tickets", { p_salon_id: salonId }),
      supabase.rpc("owner_today_activity", { p_salon_id: salonId }),
    ]);

    setIsLoading(false);
    if (ticketsResult.error || activityResult.error) {
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    setTickets((ticketsResult.data ?? []) as TodayTicket[]);
    setActivity((activityResult.data ?? []) as ActivityRow[]);
  }, [salonId]);

  // Instant updates when the queue changes, reload when the screen wakes up, regular backup refresh
  useEffect(() => {
    load();

    const channel = supabase
      .channel(`queue:${salonSlug}`)
      .on("broadcast", { event: "queue_changed" }, () => {
        load();
      })
      .subscribe();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const timer = setInterval(load, REFRESH_SECONDS * 1000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(timer);
    };
  }, [salonSlug, load]);

  async function handleRestore(ticket: TodayTicket) {
    if (!window.confirm(t.confirmRestore(ticket.ticket_number, ticket.first_name))) return;

    setRestoringId(ticket.entry_id);
    setRestoreError(false);
    const { error } = await supabase.rpc("owner_restore_entry", { p_entry_id: ticket.entry_id });
    setRestoringId(null);
    if (error) {
      setRestoreError(true);
      return;
    }
    load();
  }

  if (isLoading) {
    return <p className="text-center text-gray-600">{t.loading}</p>;
  }

  const waiting = tickets.filter((x) => x.status === "waiting");
  const inService = tickets.filter((x) => x.status === "in_service");
  const done = tickets
    .filter((x) => x.status === "done")
    .sort((a, b) => (b.finished_at ?? "").localeCompare(a.finished_at ?? ""));
  const noShows = tickets.filter((x) => x.status === "cancelled");

  const revenue = done.reduce((sum, x) => sum + (x.total_paid_pence ?? 0), 0);
  const cash = done.reduce((sum, x) => sum + (x.cash_pence ?? 0), 0);
  const card = done.reduce((sum, x) => sum + (x.card_pence ?? 0), 0);

  const shownDone = onlyFlagged ? done.filter(isFlagged) : done;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "live", label: t.tabs.live, count: waiting.length + inService.length },
    { key: "done", label: t.tabs.done, count: done.length },
    { key: "noShows", label: t.tabs.noShows, count: noShows.length },
    { key: "activity", label: t.tabs.activity },
  ];

  return (
    <div className="space-y-6">
      {loadFailed && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{t.loadFailed}</p>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard icon="💷" label={t.summary.revenue} value={formatPrice(revenue)} />
        <SummaryCard icon="💵" label={t.summary.cash} value={formatPrice(cash)} />
        <SummaryCard icon="💳" label={t.summary.card} value={formatPrice(card)} />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard icon="✅" label={t.summary.done} value={String(done.length)} />
        <SummaryCard icon="⏳" label={t.summary.waiting} value={String(waiting.length)} />
        <SummaryCard icon="💅" label={t.summary.inService} value={String(inService.length)} />
        <SummaryCard icon="🚶" label={t.summary.noShows} value={String(noShows.length)} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === item.key ? "bg-pink-600 text-white" : "bg-white text-gray-700 shadow-sm"
            }`}
          >
            {item.label}
            {item.count !== undefined && ` (${item.count})`}
          </button>
        ))}
      </div>

      {/* Live */}
      {tab === "live" && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              💅 {t.inServiceTitle}
            </h2>
            {inService.length === 0 ? (
              <p className="text-sm text-gray-500">{t.nobodyInService}</p>
            ) : (
              <div className="space-y-2">
                {inService.map((x) => (
                  <div
                    key={x.entry_id}
                    className="flex justify-between gap-2 rounded-xl bg-white px-4 py-3 text-sm shadow-sm"
                  >
                    <span className="text-gray-900">
                      <b>{x.technician_name ?? "—"}</b> · #{x.ticket_number} {x.first_name}
                      <span className="text-gray-500">
                        {" "}
                        · {x.services.map((s) => s.name).join(", ")}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-gray-600">
                      ⏱ {x.started_at ? t.servingFor(minutesSince(x.started_at)) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              ⏳ {t.waitingTitle}
            </h2>
            {waiting.length === 0 ? (
              <p className="text-sm text-gray-500">{t.nobodyWaiting}</p>
            ) : (
              <div className="space-y-2">
                {waiting.map((x) => {
                  const minutes = minutesSince(x.created_at);
                  return (
                    <div
                      key={x.entry_id}
                      className={`flex justify-between gap-2 rounded-xl px-4 py-3 text-sm shadow-sm ${
                        minutes >= 30 ? "bg-red-50" : "bg-white"
                      }`}
                    >
                      <span className="text-gray-900">
                        #{x.ticket_number} <b>{x.first_name}</b>
                        <span className="text-gray-500">
                          {" "}
                          · {x.services.map((s) => s.name).join(", ")}
                          {x.requested_technician_name &&
                            ` · ${t.askedFor(x.requested_technician_name)}`}
                        </span>
                      </span>
                      <span
                        className={`whitespace-nowrap ${
                          minutes >= 30 ? "font-semibold text-red-700" : "text-gray-600"
                        }`}
                      >
                        {t.waitingFor(minutes)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Done */}
      {tab === "done" && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyFlagged}
              onChange={(e) => setOnlyFlagged(e.target.checked)}
              className="h-5 w-5 accent-pink-600"
            />
            {t.onlyFlagged}
          </label>
          {shownDone.length === 0 ? (
            <p className="text-sm text-gray-500">
              {onlyFlagged ? t.noFlaggedTickets : t.noDoneTickets}
            </p>
          ) : (
            shownDone.map((x) => <DoneTicketCard key={x.entry_id} ticket={x} t={t} />)
          )}
        </div>
      )}

      {/* No-shows */}
      {tab === "noShows" && (
        <div className="space-y-3">
          {restoreError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{t.restoreFailed}</p>
          )}
          {noShows.length === 0 ? (
            <p className="text-sm text-gray-500">{t.noNoShows}</p>
          ) : (
            noShows.map((x) => (
              <div
                key={x.entry_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    #{x.ticket_number} {x.first_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {x.cancelled_by && x.finished_at
                      ? t.markedBy(x.cancelled_by, formatTime(x.finished_at))
                      : x.finished_at
                        ? formatTime(x.finished_at)
                        : ""}
                  </p>
                </div>
                <button
                  disabled={restoringId === x.entry_id}
                  onClick={() => handleRestore(x)}
                  className="rounded-full bg-pink-600 px-5 py-2 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
                >
                  ↩ {t.restore}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Activity */}
      {tab === "activity" && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          {activity.length === 0 ? (
            <p className="text-sm text-gray-500">{t.noActivity}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {activity.map((row, i) => (
                <li key={i} className="flex gap-3 py-2 text-sm">
                  <span className="whitespace-nowrap text-gray-500">{formatTime(row.happened_at)}</span>
                  <span className={row.action === "no_show" ? "text-red-700" : "text-gray-800"}>
                    {describeActivity(row, t)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-400">{t.liveUpdates}</p>
    </div>
  );
}