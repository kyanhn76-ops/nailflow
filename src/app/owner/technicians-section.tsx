"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { OwnerText } from "@/lib/owner-text";

type Level = "lead" | "assistant";

type OwnerTechnician = {
  technician_id: string;
  display_name: string;
  level: Level;
  is_active: boolean;
  has_pin: boolean;
  is_busy: boolean;
};

type RpcResult = PromiseLike<{ error: { message: string } | null }>;

function translateError(message: string, t: OwnerText) {
  const errors = t.technicians.errors as Record<string, string>;
  const key = Object.keys(errors).find((k) => message.includes(k));
  return key ? errors[key] : t.technicians.actionFailed;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-pink-500 focus:outline-none";

function TechnicianCard({
  tech,
  t,
  canEdit,
  onChanged,
  onError,
}: {
  tech: OwnerTechnician;
  t: OwnerText;
  canEdit: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const tt = t.technicians;
  const [mode, setMode] = useState<"view" | "edit" | "pin">("view");
  const [name, setName] = useState(tech.display_name);
  const [level, setLevel] = useState<Level>(tech.level);
  const [pin, setPin] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function run(call: () => RpcResult) {
    setIsSaving(true);
    onError("");
    const { error } = await call();
    setIsSaving(false);
    if (error) {
      onError(translateError(error.message, t));
      return;
    }
    setMode("view");
    setPin("");
    onChanged();
  }

  function startEdit() {
    setName(tech.display_name);
    setLevel(tech.level);
    setMode("edit");
  }

  function handleLockToggle() {
    const message = tech.is_active
      ? tt.confirmLock(tech.display_name)
      : tt.confirmUnlock(tech.display_name);
    if (!window.confirm(message)) return;
    run(() =>
      supabase.rpc("owner_set_technician_active", {
        p_technician_id: tech.technician_id,
        p_is_active: !tech.is_active,
      })
    );
  }

  const status = !tech.is_active
    ? { label: tt.statusLocked, className: "bg-gray-200 text-gray-700" }
    : tech.is_busy
      ? { label: tt.statusBusy, className: "bg-amber-100 text-amber-800" }
      : { label: tt.statusFree, className: "bg-green-100 text-green-800" };

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        tech.is_active ? "border-gray-200" : "border-gray-300 opacity-75"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xl font-bold text-gray-900">{tech.display_name}</p>
          <p className="mt-1 text-sm text-gray-600">{tt.levelShort[tech.level]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
          {!tech.has_pin && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              {tt.noPin}
            </span>
          )}
        </div>
      </div>

      {canEdit && mode === "view" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tech.is_active && (
            <>
              <button
                onClick={startEdit}
                className="flex-1 rounded-full border border-gray-300 py-2 text-gray-700 hover:bg-gray-100"
              >
                {tt.edit}
              </button>
              <button
                onClick={() => setMode("pin")}
                className="flex-1 rounded-full border border-gray-300 py-2 text-gray-700 hover:bg-gray-100"
              >
                {tt.changePin}
              </button>
            </>
          )}
          <button
            disabled={isSaving}
            onClick={handleLockToggle}
            className={`flex-1 rounded-full py-2 font-medium disabled:opacity-50 ${
              tech.is_active
                ? "border border-red-300 text-red-700 hover:bg-red-50"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {tech.is_active ? `🔒 ${tt.lock}` : `🔓 ${tt.unlock}`}
          </button>
        </div>
      )}

      {canEdit && mode === "edit" && (
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <label className="block text-sm font-medium text-gray-700">{tt.name}</label>
          <input
            type="text"
            value={name}
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <label className="mt-3 block text-sm font-medium text-gray-700">{tt.level}</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            className={inputClass}
          >
            <option value="lead">{tt.levels.lead}</option>
            <option value="assistant">{tt.levels.assistant}</option>
          </select>
          <div className="mt-4 flex gap-3">
            <button
              disabled={isSaving}
              onClick={() =>
                run(() =>
                  supabase.rpc("owner_update_technician", {
                    p_technician_id: tech.technician_id,
                    p_display_name: name,
                    p_level: level,
                  })
                )
              }
              className="flex-1 rounded-full bg-pink-600 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {isSaving ? tt.saving : tt.save}
            </button>
            <button
              onClick={() => setMode("view")}
              className="flex-1 rounded-full border border-gray-300 bg-white py-3 text-gray-700 hover:bg-gray-100"
            >
              {tt.cancel}
            </button>
          </div>
        </div>
      )}

      {canEdit && mode === "pin" && (
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <label className="block text-sm font-medium text-gray-700">{tt.newPin}</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={pin}
            onChange={(e) => setPin(onlyDigits(e.target.value))}
            className={`${inputClass} text-center text-2xl tracking-widest`}
          />
          <p className="mt-2 text-xs text-gray-500">{tt.pinChangeNote}</p>
          <div className="mt-4 flex gap-3">
            <button
              disabled={isSaving || pin.length !== 6}
              onClick={() =>
                run(() =>
                  supabase.rpc("owner_change_technician_pin", {
                    p_technician_id: tech.technician_id,
                    p_pin: pin,
                  })
                )
              }
              className="flex-1 rounded-full bg-pink-600 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {isSaving ? tt.saving : tt.save}
            </button>
            <button
              onClick={() => {
                setPin("");
                setMode("view");
              }}
              className="flex-1 rounded-full border border-gray-300 bg-white py-3 text-gray-700 hover:bg-gray-100"
            >
              {tt.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TechniciansSection({
  salonId,
  role,
  t,
}: {
  salonId: string;
  role: "owner" | "manager";
  t: OwnerText;
}) {
  const tt = t.technicians;
  const canEdit = role === "owner";

  const [technicians, setTechnicians] = useState<OwnerTechnician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState<Level>("lead");
  const [newPin, setNewPin] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc("owner_list_technicians", {
      p_salon_id: salonId,
    });
    setIsLoading(false);
    if (loadError) {
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    setTechnicians((data ?? []) as OwnerTechnician[]);
  }, [salonId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isAdding) return;

    setIsAdding(true);
    setError("");
    setSuccessMessage("");

    const name = newName.trim();
    const { error: addError } = await supabase.rpc("owner_add_technician", {
      p_salon_id: salonId,
      p_display_name: name,
      p_level: newLevel,
      p_pin: newPin,
    });

    setIsAdding(false);
    if (addError) {
      setError(translateError(addError.message, t));
      return;
    }

    setSuccessMessage(tt.added(name));
    setNewName("");
    setNewLevel("lead");
    setNewPin("");
    load();
  }

  return (
    <div className="space-y-6">
      {canEdit ? (
        <form onSubmit={handleAdd} className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">➕ {tt.addTitle}</h2>

          <label className="mt-4 block text-sm font-medium text-gray-700">{tt.name}</label>
          <input
            type="text"
            value={newName}
            maxLength={50}
            onChange={(e) => setNewName(e.target.value)}
            className={inputClass}
          />

          <label className="mt-3 block text-sm font-medium text-gray-700">{tt.level}</label>
          <select
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value as Level)}
            className={inputClass}
          >
            <option value="lead">{tt.levels.lead}</option>
            <option value="assistant">{tt.levels.assistant}</option>
          </select>

          <label className="mt-3 block text-sm font-medium text-gray-700">{tt.pin}</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={newPin}
            onChange={(e) => setNewPin(onlyDigits(e.target.value))}
            className={`${inputClass} text-center text-2xl tracking-widest`}
          />
          <p className="mt-2 text-xs text-gray-500">{tt.pinHint}</p>

          <button
            type="submit"
            disabled={isAdding || !newName.trim() || newPin.length !== 6}
            className="mt-4 w-full rounded-full bg-pink-600 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
          >
            {isAdding ? tt.adding : tt.add}
          </button>
        </form>
      ) : (
        <p className="rounded-2xl bg-white p-4 text-sm text-gray-600 shadow-sm">
          {tt.managerReadOnly}
        </p>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {successMessage && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{successMessage}</p>
      )}

      {isLoading ? (
        <p className="text-center text-gray-600">{t.loading}</p>
      ) : loadFailed ? (
        <p className="text-center text-red-700">{tt.loadFailed}</p>
      ) : technicians.length === 0 ? (
        <p className="text-center text-gray-600">{tt.empty}</p>
      ) : (
        <div className="space-y-3">
          {technicians.map((tech) => (
            <TechnicianCard
              key={tech.technician_id}
              tech={tech}
              t={t}
              canEdit={canEdit}
              onChanged={() => {
                setSuccessMessage("");
                load();
              }}
              onError={setError}
            />
          ))}
        </div>
      )}
    </div>
  );
}