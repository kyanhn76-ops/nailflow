"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage, type Language } from "@/lib/i18n";
import { STAFF_TEXT, translateStaffError, type StaffText } from "@/lib/staff-text";

type QueueRow = {
  entry_id: string;
  ticket_number: number;
  first_name: string;
  status: "waiting" | "in_service";
  service_names: string | null;
  total_duration_minutes: number;
  notes: string | null;
  requested_technician_id: string | null;
  assigned_technician_id: string | null;
  needs_lead: boolean;
  created_at: string;
  started_at: string | null;
};

type Technician = {
  technician_id: string;
  display_name: string;
  level: "lead" | "assistant";
  is_busy: boolean;
};

type StaffAction =
  | "staff_start_service"
  | "staff_finish_service"
  | "staff_cancel_entry"
  | "staff_change_requested_technician"
  | "staff_hand_over";

type HandOverReason = keyof StaffText["reasons"];

const SALON_SLUG = "demo-salon";
const REFRESH_SECONDS = 10;
const PIN_STORAGE_KEY = "nailflow-staff-pin";
const TECHNICIAN_STORAGE_KEY = "nailflow-staff-technician";
const ANY_TECHNICIAN = "any";
const HAND_OVER_REASONS: HandOverReason[] = [
  "customer_request",
  "technician_unavailable",
  "other",
];

function readSession(key: string) {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeSession(key: string, value: string) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // Storage can be blocked (e.g. private mode). The page still works without it.
  }
}

function minutesSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function LanguageToggle({
  language,
  onChange,
}: {
  language: Language;
  onChange: (language: Language) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-full border border-gray-300 text-sm">
      {(["vi", "en"] as Language[]).map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`px-3 py-1 ${
            language === lang ? "bg-pink-600 text-white" : "bg-white text-gray-700"
          }`}
        >
          {lang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
        </button>
      ))}
    </div>
  );
}

function CustomerCard({
  row,
  t,
  technicianName,
  highlight,
  children,
}: {
  row: QueueRow;
  t: StaffText;
  technicianName: (id: string | null) => string;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 shadow-sm ${
        highlight ? "border-2 border-pink-500" : "border border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">#{row.ticket_number}</p>
          <p className="text-2xl font-bold text-gray-900">{row.first_name}</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          {row.status === "waiting" ? (
            <p>⏱ {t.waitingMinutes(minutesSince(row.created_at))}</p>
          ) : (
            row.started_at && <p>⏱ {t.startedMinutesAgo(minutesSince(row.started_at))}</p>
          )}
          <p>{t.aboutMinutes(row.total_duration_minutes)}</p>
        </div>
      </div>

      <p className="mt-3 text-gray-800">💅 {row.service_names ?? t.noServices}</p>

      {row.status === "waiting" && row.requested_technician_id && (
        <p className="mt-2 text-sm font-medium text-pink-700">
          👤 {t.askedFor(technicianName(row.requested_technician_id))}
        </p>
      )}

      {row.notes && (
        <p className="mt-3 rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-900">
          📝 {t.note}: {row.notes}
        </p>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

function HandOverPanel({
  row,
  t,
  freeTechnicians,
  isBusy,
  onConfirm,
  onCancel,
}: {
  row: QueueRow;
  t: StaffText;
  freeTechnicians: Technician[];
  isBusy: boolean;
  onConfirm: (toTechnicianId: string, reason: HandOverReason, note: string) => void;
  onCancel: () => void;
}) {
  const [toTechnicianId, setToTechnicianId] = useState("");
  const [reason, setReason] = useState<HandOverReason>(HAND_OVER_REASONS[0]);
  const [note, setNote] = useState("");

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="font-semibold text-gray-900">
        {t.handOverTitle(row.ticket_number, row.first_name)}
      </p>

      {freeTechnicians.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">{t.noFreeTechnician}</p>
      ) : (
        <>
          <label className="mt-3 block text-sm font-medium text-gray-700">{t.toTechnician}</label>
          <select
            value={toTechnicianId}
            onChange={(e) => setToTechnicianId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
          >
            <option value="">{t.choose}</option>
            {freeTechnicians.map((tech) => (
              <option key={tech.technician_id} value={tech.technician_id}>
                {tech.display_name}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-sm font-medium text-gray-700">{t.reason}</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as HandOverReason)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
          >
            {HAND_OVER_REASONS.map((r) => (
              <option key={r} value={r}>
                {t.reasons[r]}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-sm font-medium text-gray-700">{t.noteOptional}</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
          />
        </>
      )}

      <div className="mt-4 flex gap-3">
        {freeTechnicians.length > 0 && (
          <button
            disabled={!toTechnicianId || isBusy}
            onClick={() => onConfirm(toTechnicianId, reason, note)}
            className="flex-1 rounded-full bg-pink-600 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
          >
            {t.confirmHandOver}
          </button>
        )}
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-gray-300 bg-white py-3 text-gray-700 hover:bg-gray-100"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

function ChangeRequestPanel({
  row,
  t,
  eligibleTechnicians,
  isBusy,
  onConfirm,
  onCancel,
}: {
  row: QueueRow;
  t: StaffText;
  eligibleTechnicians: Technician[];
  isBusy: boolean;
  onConfirm: (technicianId: string | null) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState(row.requested_technician_id ?? ANY_TECHNICIAN);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <label className="block text-sm font-medium text-gray-700">{t.customerWants}</label>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
      >
        <option value={ANY_TECHNICIAN}>{t.firstAvailable}</option>
        {eligibleTechnicians.map((tech) => (
          <option key={tech.technician_id} value={tech.technician_id}>
            {tech.display_name}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-gray-500">{t.keepsPlace}</p>
      <div className="mt-4 flex gap-3">
        <button
          disabled={isBusy}
          onClick={() => onConfirm(selected === ANY_TECHNICIAN ? null : selected)}
          className="flex-1 rounded-full bg-pink-600 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
        >
          {t.save}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-gray-300 bg-white py-3 text-gray-700 hover:bg-gray-100"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const { language, setLanguage } = useLanguage("vi");
  const t = STAFF_TEXT[language];

  const [isReady, setIsReady] = useState(false);
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  // Errors are stored as a key or raw message, then shown in the chosen language
  const [error, setError] = useState<{ kind: "wrongPin" | "loadFailed" | "action"; message?: string } | null>(null);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [handOverEntryId, setHandOverEntryId] = useState<string | null>(null);
  const [changeEntryId, setChangeEntryId] = useState<string | null>(null);

  // Restore PIN and technician after a page refresh
  useEffect(() => {
    setPin(readSession(PIN_STORAGE_KEY));
    setTechnicianId(readSession(TECHNICIAN_STORAGE_KEY));
    setIsReady(true);
  }, []);

  const logOut = useCallback(() => {
    setPin("");
    setTechnicianId("");
    setQueue([]);
    setTechnicians([]);
    setHasLoaded(false);
    writeSession(PIN_STORAGE_KEY, "");
    writeSession(TECHNICIAN_STORAGE_KEY, "");
  }, []);

  // Loads the queue and technicians. Returns false if the PIN is wrong or the network failed.
  const loadAll = useCallback(
    async (pinToUse: string) => {
      const [queueResult, techResult] = await Promise.all([
        supabase.rpc("staff_get_queue", { p_salon_slug: SALON_SLUG, p_pin: pinToUse }),
        supabase.rpc("staff_get_technicians", { p_salon_slug: SALON_SLUG, p_pin: pinToUse }),
      ]);

      const loadError = queueResult.error ?? techResult.error;
      if (loadError) {
        if (loadError.message.includes("Invalid salon or PIN")) {
          logOut();
          setError({ kind: "wrongPin" });
        } else {
          setError({ kind: "loadFailed" });
        }
        return false;
      }

      setQueue((queueResult.data ?? []) as QueueRow[]);
      setTechnicians((techResult.data ?? []) as Technician[]);
      setHasLoaded(true);
      setError((prev) => (prev?.kind === "action" ? prev : null));
      return true;
    },
    [logOut]
  );

  // Keep everything up to date while logged in:
  // 1) instant updates when the queue changes, 2) reload when the screen wakes up,
  // 3) a regular refresh as a backup if the connection drops
  useEffect(() => {
    if (!pin) return;

    loadAll(pin);

    const channel = supabase
      .channel(`queue:${SALON_SLUG}`)
      .on("broadcast", { event: "queue_changed" }, () => {
        loadAll(pin);
      })
      .subscribe();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadAll(pin);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const timer = setInterval(() => loadAll(pin), REFRESH_SECONDS * 1000);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(timer);
    };
  }, [pin, loadAll]);

  async function handlePinSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = pinInput.trim();
    if (!value) return;
    const ok = await loadAll(value);
    if (ok) {
      setPin(value);
      writeSession(PIN_STORAGE_KEY, value);
      setPinInput("");
      setError(null);
    }
  }

  function chooseTechnician(id: string) {
    setTechnicianId(id);
    writeSession(TECHNICIAN_STORAGE_KEY, id);
  }

  async function runAction(
    entryId: string,
    action: StaffAction,
    extraParams: Record<string, string | null> = {}
  ) {
    setBusyEntryId(entryId);
    setError(null);

    const { error: actionError } = await supabase.rpc(action, {
      p_salon_slug: SALON_SLUG,
      p_pin: pin,
      p_entry_id: entryId,
      ...extraParams,
    });

    if (actionError) {
      setError({ kind: "action", message: actionError.message });
    } else {
      setHandOverEntryId(null);
      setChangeEntryId(null);
    }

    await loadAll(pin);
    setBusyEntryId(null);
  }

  function handleNoShow(row: QueueRow) {
    if (window.confirm(t.confirmNoShow(row.ticket_number, row.first_name))) {
      runAction(row.entry_id, "staff_cancel_entry");
    }
  }

  const technicianName = (id: string | null) => {
    if (!id) return t.any;
    return technicians.find((tech) => tech.technician_id === id)?.display_name ?? t.unknown;
  };

  const eligibleFor = (row: QueueRow) =>
    technicians.filter((tech) => !row.needs_lead || tech.level === "lead");

  const errorText = !error
    ? ""
    : error.kind === "wrongPin"
      ? t.wrongPin
      : error.kind === "loadFailed"
        ? t.loadFailed
        : translateStaffError(error.message ?? "", t);

  const toggle = <LanguageToggle language={language} onChange={setLanguage} />;

  // ----- Screens -----

  if (!isReady) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{t.loading}</p>
      </main>
    );
  }

  // Screen 1: enter PIN
  if (!pin) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="mb-4 flex w-full max-w-sm justify-end">{toggle}</div>
        <form
          onSubmit={handlePinSubmit}
          className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-md"
        >
          <h1 className="text-2xl font-bold text-pink-600">{t.staffTitle}</h1>
          <p className="mt-1 text-gray-600">{t.enterPin}</p>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            maxLength={6}
            className="mt-6 w-full rounded-lg border border-gray-300 px-4 py-4 text-center text-3xl tracking-widest text-gray-900 focus:border-pink-500 focus:outline-none"
          />
          {errorText && <p className="mt-3 text-sm text-red-700">{errorText}</p>}
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-pink-600 py-4 text-lg font-semibold text-white hover:bg-pink-700"
          >
            {t.continue}
          </button>
        </form>
      </main>
    );
  }

  if (!hasLoaded) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{t.loadingQueue}</p>
      </main>
    );
  }

  const me = technicians.find((tech) => tech.technician_id === technicianId);

  // Screen 2: choose who you are
  if (!me) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="mb-4 flex w-full max-w-sm justify-end">{toggle}</div>
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-md">
          <h1 className="text-2xl font-bold text-gray-900">{t.whoAreYou}</h1>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {technicians.map((tech) => (
              <button
                key={tech.technician_id}
                onClick={() => chooseTechnician(tech.technician_id)}
                className="rounded-xl border-2 border-pink-200 py-6 text-xl font-semibold text-gray-900 hover:border-pink-500 hover:bg-pink-50"
              >
                {tech.display_name}
              </button>
            ))}
          </div>
          <button onClick={logOut} className="mt-6 text-sm text-gray-500 underline">
            {t.logOut}
          </button>
        </div>
      </main>
    );
  }

  // Screen 3: the technician's queue
  const canServe = (row: QueueRow) =>
    (!row.needs_lead || me.level === "lead") &&
    (!row.requested_technician_id || row.requested_technician_id === me.technician_id);

  const myCurrent = queue.find(
    (row) => row.status === "in_service" && row.assigned_technician_id === me.technician_id
  );
  const waiting = queue.filter((row) => row.status === "waiting");
  const suggested = myCurrent ? undefined : waiting.find(canServe);
  const othersInService = queue.filter(
    (row) => row.status === "in_service" && row.assigned_technician_id !== me.technician_id
  );
  const freeTechnicians = technicians.filter((tech) => !tech.is_busy);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">{t.loggedInAs}</p>
            <p className="text-xl font-bold text-gray-900">{me.display_name}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {toggle}
            <div className="flex gap-3 text-sm">
              <button onClick={() => chooseTechnician("")} className="text-pink-700 underline">
                {t.switchTechnician}
              </button>
              <button onClick={logOut} className="text-gray-500 underline">
                {t.logOut}
              </button>
            </div>
          </div>
        </div>

        {errorText && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorText}</p>
        )}

        {/* Current customer or next suggested customer */}
        <section className="mt-6">
          {myCurrent ? (
            <>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-700">
                {t.currentCustomer}
              </h2>
              <CustomerCard row={myCurrent} t={t} technicianName={technicianName} highlight>
                {handOverEntryId === myCurrent.entry_id ? (
                  <HandOverPanel
                    row={myCurrent}
                    t={t}
                    freeTechnicians={eligibleFor(myCurrent).filter(
                      (tech) => !tech.is_busy && tech.technician_id !== me.technician_id
                    )}
                    isBusy={busyEntryId === myCurrent.entry_id}
                    onConfirm={(toId, reason, note) =>
                      runAction(myCurrent.entry_id, "staff_hand_over", {
                        p_to_technician_id: toId,
                        p_reason: reason,
                        p_note: note.trim() || null,
                      })
                    }
                    onCancel={() => setHandOverEntryId(null)}
                  />
                ) : (
                  <div className="space-y-3">
                    <button
                      disabled={busyEntryId === myCurrent.entry_id}
                      onClick={() => runAction(myCurrent.entry_id, "staff_finish_service")}
                      className="w-full rounded-full bg-green-600 py-5 text-2xl font-bold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      ✓ {t.doneBig}
                    </button>
                    <button
                      onClick={() => setHandOverEntryId(myCurrent.entry_id)}
                      className="w-full rounded-full border border-gray-300 py-3 text-gray-700 hover:bg-gray-100"
                    >
                      ⇄ {t.handOverButton}
                    </button>
                  </div>
                )}
              </CustomerCard>
            </>
          ) : suggested ? (
            <>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pink-700">
                {t.nextCustomer}
              </h2>
              <CustomerCard row={suggested} t={t} technicianName={technicianName} highlight>
                <button
                  disabled={busyEntryId === suggested.entry_id}
                  onClick={() =>
                    runAction(suggested.entry_id, "staff_start_service", {
                      p_technician_id: me.technician_id,
                    })
                  }
                  className="w-full rounded-full bg-pink-600 py-5 text-2xl font-bold text-white hover:bg-pink-700 disabled:opacity-60"
                >
                  ▶ {t.startBig}
                </button>
              </CustomerCard>
            </>
          ) : (
            <div className="rounded-2xl bg-white p-6 text-center text-gray-600 shadow-sm">
              {t.noCustomersForYou}
            </div>
          )}
        </section>

        {/* Everyone waiting */}
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t.waitingCount(waiting.length)}
          </h2>
          <div className="space-y-3">
            {waiting.length === 0 && <p className="text-sm text-gray-500">{t.nobodyWaiting}</p>}
            {waiting.map((row) => (
              <CustomerCard key={row.entry_id} row={row} t={t} technicianName={technicianName}>
                {changeEntryId === row.entry_id ? (
                  <ChangeRequestPanel
                    row={row}
                    t={t}
                    eligibleTechnicians={eligibleFor(row)}
                    isBusy={busyEntryId === row.entry_id}
                    onConfirm={(newTechId) =>
                      runAction(row.entry_id, "staff_change_requested_technician", {
                        p_technician_id: newTechId,
                      })
                    }
                    onCancel={() => setChangeEntryId(null)}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {!myCurrent && canServe(row) && row.entry_id !== suggested?.entry_id && (
                      <button
                        disabled={busyEntryId === row.entry_id}
                        onClick={() =>
                          runAction(row.entry_id, "staff_start_service", {
                            p_technician_id: me.technician_id,
                          })
                        }
                        className="flex-1 rounded-full border-2 border-pink-600 py-3 font-semibold text-pink-700 hover:bg-pink-50 disabled:opacity-60"
                      >
                        {t.start}
                      </button>
                    )}
                    <button
                      onClick={() => setChangeEntryId(row.entry_id)}
                      className="flex-1 rounded-full border border-gray-300 py-3 text-gray-700 hover:bg-gray-100"
                    >
                      {t.changeTechnician}
                    </button>
                    <button
                      disabled={busyEntryId === row.entry_id}
                      onClick={() => handleNoShow(row)}
                      className="flex-1 rounded-full border border-gray-300 py-3 text-gray-600 hover:bg-gray-100 disabled:opacity-60"
                    >
                      {t.noShow}
                    </button>
                  </div>
                )}
              </CustomerCard>
            ))}
          </div>
        </section>

        {/* Other technicians */}
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t.otherTechnicians}
          </h2>
          <div className="space-y-2">
            {othersInService.map((row) => (
              <div
                key={row.entry_id}
                className="flex justify-between rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              >
                <span>
                  {technicianName(row.assigned_technician_id)}: #{row.ticket_number}{" "}
                  {row.first_name}
                </span>
                <span>{row.started_at && `⏱ ${minutesSince(row.started_at)}′`}</span>
              </div>
            ))}
            {freeTechnicians
              .filter((tech) => tech.technician_id !== me.technician_id)
              .map((tech) => (
                <div
                  key={tech.technician_id}
                  className="flex justify-between rounded-xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
                >
                  <span>{tech.display_name}</span>
                  <span className="font-medium text-green-700">● {t.free}</span>
                </div>
              ))}
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-gray-400">{t.liveUpdates}</p>
      </div>
    </main>
  );
}