"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Receipt } from "./receipt";

type QueueStatus = {
  ticket_number: number;
  first_name: string;
  status: "waiting" | "in_service" | "done" | "cancelled";
  people_ahead: number;
  estimated_wait_minutes: number;
  salon_name: string;
  requested_technician_id: string | null;
  requested_technician_name: string | null;
};

type TechnicianOption = {
  technician_id: string;
  display_name: string;
};

const REFRESH_SECONDS = 15;
const NEARLY_YOUR_TURN_MINUTES = 5;
const ANY_TECHNICIAN = "any";

function StatusMessage({ ticket }: { ticket: QueueStatus }) {
  if (ticket.status === "in_service") {
    return (
      <div className="mt-6 rounded-xl bg-green-100 p-4 text-green-800">
        <p className="text-lg font-semibold">It&apos;s your turn!</p>
        <p className="mt-1">Please go to your technician.</p>
      </div>
    );
  }

  if (ticket.status === "done") {
    return (
      <div className="mt-6 rounded-xl bg-pink-50 p-4 text-gray-800">
        <p className="text-lg font-semibold">Thank you for visiting!</p>
        <p className="mt-1">We hope to see you again soon.</p>
      </div>
    );
  }

  if (ticket.status === "cancelled") {
    return (
      <div className="mt-6 rounded-xl bg-gray-100 p-4 text-gray-700">
        <p className="text-lg font-semibold">This ticket was cancelled.</p>
      </div>
    );
  }

  if (ticket.estimated_wait_minutes === 0) {
    return (
      <div className="mt-6 rounded-xl bg-green-100 p-4 text-green-800">
        <p className="text-lg font-semibold">A technician will be with you shortly!</p>
        <p className="mt-1">Please stay close by. We will call you very soon.</p>
      </div>
    );
  }

  const isNearlyTurn = ticket.estimated_wait_minutes <= NEARLY_YOUR_TURN_MINUTES;

  return (
    <div
      className={`mt-6 rounded-xl p-4 ${
        isNearlyTurn ? "bg-amber-100 text-amber-900" : "bg-pink-50 text-gray-800"
      }`}
    >
      {isNearlyTurn && (
        <p className="mb-2 font-semibold">Nearly your turn — please head back to the salon.</p>
      )}
      <p className="text-sm">Estimated wait</p>
      <p className="text-3xl font-bold">
        {isNearlyTurn ? "Under 5 min" : `About ${ticket.estimated_wait_minutes} min`}
      </p>
      <p className="mt-2 text-sm">
        {ticket.people_ahead === 1
          ? "1 person arrived before you"
          : `${ticket.people_ahead} people arrived before you`}
      </p>
    </div>
  );
}

function ChangeTechnician({
  entryId,
  currentTechnicianId,
  onChanged,
}: {
  entryId: string;
  currentTechnicianId: string | null;
  onChanged: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<TechnicianOption[]>([]);
  const [selected, setSelected] = useState(ANY_TECHNICIAN);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function openPicker() {
    setError("");
    setSelected(currentTechnicianId ?? ANY_TECHNICIAN);
    setIsOpen(true);

    const { data, error: loadError } = await supabase.rpc("get_ticket_technicians", {
      p_entry_id: entryId,
    });
    if (loadError) {
      setError("Could not load technicians. Please try again.");
      return;
    }
    setOptions((data ?? []) as TechnicianOption[]);
  }

  async function save() {
    setIsSaving(true);
    setError("");

    const { error: saveError } = await supabase.rpc("customer_change_technician", {
      p_entry_id: entryId,
      p_technician_id: selected === ANY_TECHNICIAN ? null : selected,
    });

    setIsSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setIsOpen(false);
    onChanged();
  }

  if (!isOpen) {
    return (
      <button onClick={openPicker} className="mt-2 text-sm font-medium text-pink-700 underline">
        Change technician
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-gray-200 p-4 text-left">
      <label className="block text-sm font-medium text-gray-700">Choose a technician</label>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:outline-none"
      >
        <option value={ANY_TECHNICIAN}>First available (shortest wait)</option>
        {options.map((t) => (
          <option key={t.technician_id} value={t.technician_id}>
            {t.display_name}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-gray-500">You keep your place in the queue.</p>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          onClick={save}
          disabled={isSaving}
          className="flex-1 rounded-full bg-pink-600 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="flex-1 rounded-full border border-gray-300 py-3 text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const entryId = params.id;

  const [ticket, setTicket] = useState<QueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasLoadedRef = useRef(false);

  const loadTicket = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_queue_status", {
      p_entry_id: entryId,
    });

    if (error || !data || data.length === 0) {
      // Only show "not found" if we never loaded the ticket.
      // A short network problem later should not hide a valid ticket.
      if (!hasLoadedRef.current) {
        setNotFound(true);
        setIsLoading(false);
      }
      return;
    }

    hasLoadedRef.current = true;
    setTicket((data as QueueStatus[])[0]);
    setNotFound(false);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [entryId]);

  // Load the ticket now, then refresh it every few seconds
  useEffect(() => {
    loadTicket();
    const timer = setInterval(loadTicket, REFRESH_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [loadTicket]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-pink-50 flex items-center justify-center px-6">
        <p className="text-gray-600">Loading your ticket...</p>
      </main>
    );
  }

  if (notFound || !ticket) {
    return (
      <main className="min-h-screen bg-pink-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-md">
          <p className="text-gray-800">We could not find this ticket.</p>
          <p className="mt-2 text-sm text-gray-500">Please ask a member of staff for help.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-pink-50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-md">
        <p className="text-sm text-gray-500">{ticket.salon_name}</p>
        <p className="mt-1 text-lg text-gray-700">Hi {ticket.first_name}!</p>

        <p className="mt-6 text-sm uppercase tracking-wide text-gray-400">Your number</p>
        <p className="mt-1 text-7xl font-bold text-pink-600">{ticket.ticket_number}</p>

        <StatusMessage ticket={ticket} />
                {ticket.status === "done" && <Receipt entryId={entryId} />}

        {ticket.status === "waiting" && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Technician:{" "}
              <span className="font-medium text-gray-900">
                {ticket.requested_technician_name ?? "First available"}
              </span>
            </p>
            <ChangeTechnician
              entryId={entryId}
              currentTechnicianId={ticket.requested_technician_id}
              onChanged={loadTicket}
            />
          </div>
        )}

        <p className="mt-6 text-xs text-gray-400">
          Keep this page open. It updates automatically
          {lastUpdated &&
            ` · last updated ${lastUpdated.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}`}
        </p>
      </div>
    </main>
  );
}