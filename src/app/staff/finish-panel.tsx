"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Language } from "@/lib/i18n";
import { FINISH_TEXT, translateFinishError } from "@/lib/finish-text";

type EntryService = {
  service_id: string;
  service_name: string;
  price_pence: number;
  price_is_from: boolean;
};

type ExtraReason = "long_nails" | "complex_design" | "repair" | "other";
type PaymentMethod = "cash" | "card" | "split";

const EXTRA_REASONS: ExtraReason[] = ["long_nails", "complex_design", "repair", "other"];

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

// "28" or "28.5" or "28.50" -> 2850. Anything else -> null.
function parsePounds(text: string): number | null {
  const value = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  return Math.round(parseFloat(value) * 100);
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-pink-500 focus:outline-none";

export function FinishPanel({
  sessionToken,
  entryId,
  language,
  onFinished,
  onCancel,
}: {
  sessionToken: string;
  entryId: string;
  language: Language;
  onFinished: () => void;
  onCancel: () => void;
}) {
  const t = FINISH_TEXT[language];

  const [services, setServices] = useState<EntryService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [fromPrices, setFromPrices] = useState<Record<string, string>>({});
  const [extraText, setExtraText] = useState("");
  const [extraReason, setExtraReason] = useState<ExtraReason | "">("");
  const [extraNote, setExtraNote] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [cashText, setCashText] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Load the services of this ticket
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error: loadError } = await supabase.rpc("staff_get_entry_services", {
        p_session_token: sessionToken,
        p_entry_id: entryId,
      });
      if (cancelled) return;
      setIsLoading(false);
      if (loadError) {
        setLoadFailed(true);
        return;
      }
      const list = (data ?? []) as EntryService[];
      setServices(list);

      // Start "from" prices at their starting price
      const initial: Record<string, string> = {};
      for (const s of list) {
        if (s.price_is_from) initial[s.service_id] = (s.price_pence / 100).toFixed(2);
      }
      setFromPrices(initial);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionToken, entryId]);

  // Work out every price and the total
  const servicePrices = services.map((s) =>
    s.price_is_from ? parsePounds(fromPrices[s.service_id] ?? "") : s.price_pence
  );
  const extraPence = extraText.trim() ? parsePounds(extraText) : 0;
  const allPricesValid =
    servicePrices.every((p) => p !== null) &&
    services.every((s, i) => !s.price_is_from || (servicePrices[i] ?? 0) >= s.price_pence) &&
    extraPence !== null;
  const totalPence = allPricesValid
    ? (servicePrices as number[]).reduce((sum, p) => sum + p, 0) + (extraPence as number)
    : null;

  const splitCashPence = parsePounds(cashText);
  const splitValid =
    payment !== "split" ||
    (splitCashPence !== null && totalPence !== null && splitCashPence <= totalPence);

  const needsReason = (extraPence ?? 0) > 0 && !extraReason;
  const canConfirm = totalPence !== null && splitValid && !needsReason && !isSaving;

  async function handleConfirm() {
    if (totalPence === null || !canConfirm) return;

    let cashPence = 0;
    let cardPence = 0;
    if (payment === "cash") cashPence = totalPence;
    if (payment === "card") cardPence = totalPence;
    if (payment === "split") {
      cashPence = splitCashPence ?? 0;
      cardPence = totalPence - cashPence;
    }

    const pricesForFromServices: Record<string, number> = {};
    services.forEach((s, i) => {
      if (s.price_is_from) pricesForFromServices[s.service_id] = servicePrices[i] as number;
    });

    setIsSaving(true);
    setError("");

    const { error: saveError } = await supabase.rpc("staff_finish_service", {
      p_session_token: sessionToken,
      p_entry_id: entryId,
      p_service_prices: pricesForFromServices,
      p_extra_charge_pence: extraPence ?? 0,
      p_extra_charge_reason: (extraPence ?? 0) > 0 ? extraReason : null,
      p_extra_charge_note: (extraPence ?? 0) > 0 ? extraNote.trim() || null : null,
      p_cash_pence: cashPence,
      p_card_pence: cardPence,
    });

    setIsSaving(false);
    if (saveError) {
      setError(translateFinishError(saveError.message, t));
      return;
    }
    onFinished();
  }

  if (isLoading) {
    return <p className="rounded-xl bg-gray-50 p-4 text-gray-600">{t.loading}</p>;
  }

  if (loadFailed) {
    return (
      <div className="rounded-xl bg-gray-50 p-4">
        <p className="text-red-700">{t.loadFailed}</p>
        <button onClick={onCancel} className="mt-3 text-sm text-gray-600 underline">
          {t.cancel}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-green-500 bg-green-50 p-4">
      <p className="text-lg font-bold text-gray-900">💷 {t.title}</p>

      {/* Services */}
      <div className="mt-3 space-y-3">
        {services.map((s, i) => (
          <div key={s.service_id} className="rounded-lg bg-white p-3">
            <div className="flex justify-between gap-2">
              <span className="font-medium text-gray-900">{s.service_name}</span>
              {!s.price_is_from && (
                <span className="text-gray-900">{formatPrice(s.price_pence)}</span>
              )}
            </div>
            {s.price_is_from ? (
              <>
                <p className="text-xs text-gray-500">{t.fromPrice(formatPrice(s.price_pence))}</p>
                <label className="mt-2 block text-sm text-gray-700">{t.finalPrice}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fromPrices[s.service_id] ?? ""}
                  onChange={(e) =>
                    setFromPrices((prev) => ({ ...prev, [s.service_id]: e.target.value }))
                  }
                  className={`${inputClass} ${
                    servicePrices[i] === null || (servicePrices[i] ?? 0) < s.price_pence
                      ? "border-red-400"
                      : ""
                  }`}
                />
              </>
            ) : (
              <p className="text-xs text-gray-500">{t.fixedPrice}</p>
            )}
          </div>
        ))}
      </div>

      {/* Extra charge */}
      <div className="mt-3 rounded-lg bg-white p-3">
        <label className="block text-sm text-gray-700">{t.extraCharge}</label>
        <input
          type="text"
          inputMode="decimal"
          value={extraText}
          onChange={(e) => setExtraText(e.target.value)}
          placeholder="0"
          className={`${inputClass} ${extraPence === null ? "border-red-400" : ""}`}
        />
        {(extraPence ?? 0) > 0 && (
          <>
            <label className="mt-3 block text-sm text-gray-700">{t.reason}</label>
            <select
              value={extraReason}
              onChange={(e) => setExtraReason(e.target.value as ExtraReason)}
              className={`${inputClass} ${needsReason ? "border-red-400" : ""}`}
            >
              <option value="">{t.chooseReason}</option>
              {EXTRA_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t.reasons[r]}
                </option>
              ))}
            </select>
            <label className="mt-3 block text-sm text-gray-700">{t.note}</label>
            <input
              type="text"
              value={extraNote}
              maxLength={300}
              onChange={(e) => setExtraNote(e.target.value)}
              className={inputClass}
            />
          </>
        )}
      </div>

      {/* Total */}
      <div className="mt-3 flex justify-between rounded-lg bg-white p-3 text-xl font-bold text-gray-900">
        <span>{t.total}</span>
        <span>{totalPence === null ? "—" : formatPrice(totalPence)}</span>
      </div>

      {/* Payment */}
      <p className="mt-4 text-sm font-medium text-gray-700">{t.payment}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["cash", "card", "split"] as PaymentMethod[]).map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => setPayment(method)}
            className={`rounded-lg border-2 py-3 font-semibold ${
              payment === method
                ? "border-pink-600 bg-pink-600 text-white"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            {method === "cash" ? `💵 ${t.cash}` : method === "card" ? `💳 ${t.card}` : `➗ ${t.split}`}
          </button>
        ))}
      </div>

      {payment === "split" && (
        <div className="mt-3 rounded-lg bg-white p-3">
          <label className="block text-sm text-gray-700">{t.cashAmount}</label>
          <input
            type="text"
            inputMode="decimal"
            value={cashText}
            onChange={(e) => setCashText(e.target.value)}
            className={`${inputClass} ${!splitValid ? "border-red-400" : ""}`}
          />
          {totalPence !== null && splitCashPence !== null && splitCashPence <= totalPence && (
            <p className="mt-2 font-medium text-gray-900">
              {t.cardRemaining(formatPrice(totalPence - splitCashPence))}
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-600">{t.customerSees}</p>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          disabled={!canConfirm}
          onClick={handleConfirm}
          className="flex-[2] rounded-full bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isSaving ? t.saving : `✓ ${t.confirm}`}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-gray-300 bg-white py-4 text-gray-700 hover:bg-gray-100"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}