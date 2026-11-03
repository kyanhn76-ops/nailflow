"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Language } from "@/lib/i18n";
import {
  SERVICES_TEXT,
  translateServicesError,
  type ServicesText,
} from "@/lib/services-text";

type OwnerService = {
  service_id: string;
  name: string;
  price_pence: number;
  duration_minutes: number;
  lead_only: boolean;
  price_is_from: boolean;
  group_name: string | null;
  sort_order: number;
  is_active: boolean;
};

type ServiceDraft = {
  name: string;
  price: string;
  duration: string;
  leadOnly: boolean;
  priceIsFrom: boolean;
  group: string;
};

const EMPTY_DRAFT: ServiceDraft = {
  name: "",
  price: "",
  duration: "30",
  leadOnly: false,
  priceIsFrom: false,
  group: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-pink-500 focus:outline-none";

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

// "25" or "25.5" or "25.50" -> 2550. Anything else -> null.
function parsePounds(text: string): number | null {
  const value = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  return Math.round(parseFloat(value) * 100);
}

function parseMinutes(text: string): number | null {
  const value = text.trim();
  if (!/^\d{1,3}$/.test(value)) return null;
  return parseInt(value, 10);
}

function toDraft(s: OwnerService): ServiceDraft {
  return {
    name: s.name,
    price: (s.price_pence / 100).toFixed(2),
    duration: String(s.duration_minutes),
    leadOnly: s.lead_only,
    priceIsFrom: s.price_is_from,
    group: s.group_name ?? "",
  };
}

function ServiceForm({
  initial,
  groups,
  t,
  submitLabel,
  busyLabel,
  isSaving,
  onSubmit,
  onCancel,
}: {
  initial: ServiceDraft;
  groups: string[];
  t: ServicesText;
  submitLabel: string;
  busyLabel: string;
  isSaving: boolean;
  onSubmit: (draft: ServiceDraft) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<ServiceDraft>(initial);
  const priceOk = parsePounds(draft.price) !== null;
  const durationOk = parseMinutes(draft.duration) !== null;
  const canSubmit = draft.name.trim() !== "" && priceOk && durationOk && !isSaving;

  function set<K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">{t.name}</label>
        <input
          type="text"
          value={draft.name}
          maxLength={80}
          onChange={(e) => set("name", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {draft.priceIsFrom ? t.startingPrice : t.price}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={draft.price}
            onChange={(e) => set("price", e.target.value)}
            className={`${inputClass} ${draft.price && !priceOk ? "border-red-400" : ""}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">{t.duration}</label>
          <input
            type="text"
            inputMode="numeric"
            value={draft.duration}
            onChange={(e) => set("duration", e.target.value)}
            className={`${inputClass} ${draft.duration && !durationOk ? "border-red-400" : ""}`}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700">{t.whoCanDo}</p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set("leadOnly", false)}
            className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold ${
              !draft.leadOnly
                ? "border-green-600 bg-green-50 text-green-800"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            👥 {t.bothLevels}
          </button>
          <button
            type="button"
            onClick={() => set("leadOnly", true)}
            className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold ${
              draft.leadOnly
                ? "border-pink-600 bg-pink-50 text-pink-800"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            👑 {t.leadOnly}
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-gray-50 p-3">
        <input
          type="checkbox"
          checked={draft.priceIsFrom}
          onChange={(e) => set("priceIsFrom", e.target.checked)}
          className="mt-1 h-5 w-5 accent-pink-600"
        />
        <span className="text-sm text-gray-800">
          <span className="font-medium">{t.priceIsFrom}</span>
          <br />
          <span className="text-xs text-gray-500">{t.priceIsFromHint}</span>
        </span>
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700">{t.group}</label>
        <input
          type="text"
          value={draft.group}
          maxLength={40}
          list="service-groups"
          onChange={(e) => set("group", e.target.value)}
          className={inputClass}
        />
        <datalist id="service-groups">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-gray-500">{t.groupHint}</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit(draft)}
          className="flex-1 rounded-full bg-pink-600 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
        >
          {isSaving ? busyLabel : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-gray-300 bg-white py-3 text-gray-700 hover:bg-gray-100"
          >
            {t.cancel}
          </button>
        )}
      </div>
    </div>
  );
}

export function ServicesSection({ salonId, language }: { salonId: string; language: Language }) {
  const t = SERVICES_TEXT[language];

  const [services, setServices] = useState<OwnerService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addFormKey, setAddFormKey] = useState(0);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc("owner_list_services", {
      p_salon_id: salonId,
    });
    setIsLoading(false);
    if (loadError) {
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    setServices((data ?? []) as OwnerService[]);
  }, [salonId]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = Array.from(
    new Set(services.map((s) => s.group_name).filter((g): g is string => !!g))
  );

  async function save(draft: ServiceDraft, serviceId: string | null) {
    const busy = serviceId ?? "new";
    setBusyId(busy);
    setError("");
    setSuccessMessage("");

    const { error: saveError } = await supabase.rpc("owner_save_service", {
      p_salon_id: salonId,
      p_service_id: serviceId,
      p_name: draft.name.trim(),
      p_price_pence: parsePounds(draft.price) ?? -1,
      p_duration_minutes: parseMinutes(draft.duration) ?? 0,
      p_lead_only: draft.leadOnly,
      p_price_is_from: draft.priceIsFrom,
      p_group_name: draft.group.trim() || null,
    });

    setBusyId(null);
    if (saveError) {
      setError(translateServicesError(saveError.message, t));
      return;
    }

    if (serviceId) {
      setEditingId(null);
    } else {
      setSuccessMessage(t.added(draft.name.trim()));
      setAddFormKey((k) => k + 1); // clears the add form
    }
    load();
  }

  async function runAction(
    serviceId: string,
    call: () => PromiseLike<{ error: { message: string } | null }>
  ) {
    setBusyId(serviceId);
    setError("");
    const { error: actionError } = await call();
    setBusyId(null);
    if (actionError) {
      setError(translateServicesError(actionError.message, t));
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">➕ {t.addTitle}</h2>
        <ServiceForm
          key={addFormKey}
          initial={EMPTY_DRAFT}
          groups={groups}
          t={t}
          submitLabel={t.add}
          busyLabel={t.adding}
          isSaving={busyId === "new"}
          onSubmit={(draft) => save(draft, null)}
        />
      </div>

      <p className="text-sm text-gray-600">ℹ️ {t.priceNote}</p>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {successMessage && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{successMessage}</p>
      )}

      {isLoading ? (
        <p className="text-center text-gray-600">{t.loading}</p>
      ) : loadFailed ? (
        <p className="text-center text-red-700">{t.loadFailed}</p>
      ) : services.length === 0 ? (
        <p className="text-center text-gray-600">{t.empty}</p>
      ) : (
        <div className="space-y-3">
          {services.map((s, i) => (
            <div
              key={s.service_id}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                s.is_active ? "border-gray-200" : "border-gray-300 opacity-60"
              }`}
            >
              {editingId === s.service_id ? (
                <ServiceForm
                  initial={toDraft(s)}
                  groups={groups}
                  t={t}
                  submitLabel={t.save}
                  busyLabel={t.saving}
                  isSaving={busyId === s.service_id}
                  onSubmit={(draft) => save(draft, s.service_id)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {s.lead_only ? (
                          <span className="rounded-full bg-pink-100 px-2 py-1 text-pink-800">
                            👑 {t.leadBadge}
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-green-800">
                            👥 {t.bothBadge}
                          </span>
                        )}
                        {s.group_name && (
                          <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-800">
                            {t.groupBadge(s.group_name)}
                          </span>
                        )}
                        {!s.is_active && (
                          <span className="rounded-full bg-gray-200 px-2 py-1 text-gray-700">
                            {t.hidden}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {s.price_is_from
                          ? t.fromPrice(formatPrice(s.price_pence))
                          : formatPrice(s.price_pence)}
                      </p>
                      <p className="text-sm text-gray-500">{t.minutes(s.duration_minutes)}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => setEditingId(s.service_id)}
                      className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {t.edit}
                    </button>
                    <button
                      disabled={busyId === s.service_id}
                      onClick={() =>
                        runAction(s.service_id, () =>
                          supabase.rpc("owner_set_service_active", {
                            p_service_id: s.service_id,
                            p_is_active: !s.is_active,
                          })
                        )
                      }
                      className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {s.is_active ? `🙈 ${t.hide}` : `👁 ${t.show}`}
                    </button>
                    <button
                      disabled={i === 0 || busyId === s.service_id}
                      onClick={() =>
                        runAction(s.service_id, () =>
                          supabase.rpc("owner_move_service", {
                            p_service_id: s.service_id,
                            p_direction: -1,
                          })
                        )
                      }
                      className="rounded-full border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                      aria-label={t.moveUp}
                    >
                      ↑
                    </button>
                    <button
                      disabled={i === services.length - 1 || busyId === s.service_id}
                      onClick={() =>
                        runAction(s.service_id, () =>
                          supabase.rpc("owner_move_service", {
                            p_service_id: s.service_id,
                            p_direction: 1,
                          })
                        )
                      }
                      className="rounded-full border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                      aria-label={t.moveDown}
                    >
                      ↓
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}