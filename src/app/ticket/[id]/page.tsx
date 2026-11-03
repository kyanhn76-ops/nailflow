"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type QueueStatus = {
  ticket_number: number;
  first_name: string;
  status: "waiting" | "in_service" | "done" | "cancelled";
  people_ahead: number;
  estimated_wait_minutes: number;
  salon_name: string;
};

const REFRESH_SECONDS = 15;
const NEARLY_YOUR_TURN_MINUTES = 5;

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

  // A technician is free for this customer right now
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

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const entryId = params.id;

  const [ticket, setTicket] = useState<QueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load the ticket now, then refresh it every few seconds
  useEffect(() => {
    let cancelled = false;
    let hasLoaded = false;

    async function loadTicket() {
      const { data, error } = await supabase.rpc("get_queue_status", {
        p_entry_id: entryId,
      });

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        // Only show "not found" if we never loaded the ticket.
        // A short network problem later should not hide a valid ticket.
        if (!hasLoaded) {
          setNotFound(true);
          setIsLoading(false);
        }
        return;
      }

      hasLoaded = true;
      setTicket((data as QueueStatus[])[0]);
      setNotFound(false);
      setLastUpdated(new Date());
      setIsLoading(false);
    }

    loadTicket();
    const timer = setInterval(loadTicket, REFRESH_SECONDS * 1000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [entryId]);

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