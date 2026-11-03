"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Service = {
  id: string;
  name: string;
  pricePence: number; // If priceIsFrom is true, this is the starting price
  durationMinutes: number;
  leadOnly: boolean; // true = only lead technicians can do this service
  priceIsFrom: boolean; // true = final price confirmed by the technician
  group: string | null; // services with the same group are shown under one heading
};

type ServiceRow = {
  id: string;
  name: string;
  price_pence: number;
  duration_minutes: number;
  lead_only: boolean;
  price_is_from: boolean;
  group_name: string | null;
};

type Technician = {
  id: string;
  name: string;
  level: "lead" | "assistant"; // never shown to customers
};

type DisplayItem =
  | { kind: "service"; service: Service }
  | { kind: "group"; name: string; services: Service[] };

// Which salon this page belongs to. Later each salon gets its own QR link.
const SALON_SLUG = "demo-salon";

// ===== TECHNICIANS (will move to the database in a later step) =====
const TECHNICIANS: Technician[] = [
  { id: "linh", name: "Linh", level: "lead" },
  { id: "mai", name: "Mai", level: "lead" },
  { id: "tom", name: "Tom", level: "assistant" },
];

const ANY_TECHNICIAN = "any";

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function displayServicePrice(service: Service) {
  return service.priceIsFrom
    ? `from ${formatPrice(service.pricePence)}`
    : formatPrice(service.pricePence);
}

function isValidUkMobile(value: string) {
  const digits = value.replace(/\s/g, "");
  return /^(07\d{9}|\+447\d{9})$/.test(digits);
}

function mapServiceRow(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    pricePence: row.price_pence,
    durationMinutes: row.duration_minutes,
    leadOnly: row.lead_only,
    priceIsFrom: row.price_is_from,
    group: row.group_name,
  };
}

// Turns the flat service list into single services and grouped services, keeping the order
function buildDisplayItems(services: Service[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  for (const service of services) {
    if (!service.group) {
      items.push({ kind: "service", service });
      continue;
    }
    const existing = items.find(
      (item) => item.kind === "group" && item.name === service.group
    );
    if (existing && existing.kind === "group") {
      existing.services.push(service);
    } else {
      items.push({ kind: "group", name: service.group, services: [service] });
    }
  }
  return items;
}

function ServiceOption({
  service,
  checked,
  onToggle,
}: {
  service: Service;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 ${
        checked ? "border-pink-500 bg-pink-50" : "border-gray-300 bg-white"
      }`}
    >
      <span className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-5 w-5 accent-pink-600"
        />
        <span className="text-gray-900">{service.name}</span>
      </span>
      <span className="text-right text-sm text-gray-600">
        {displayServicePrice(service)}
        <br />
        {service.durationMinutes} min
      </span>
    </label>
  );
}

export default function JoinQueuePage() {
  const [salonName, setSalonName] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [technicianId, setTechnicianId] = useState(ANY_TECHNICIAN);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);

  // Load the salon and its services from Supabase when the page opens
  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      const { data: salon, error: salonError } = await supabase
        .from("salons")
        .select("id, name")
        .eq("slug", SALON_SLUG)
        .single();

      if (cancelled) return;
      if (salonError || !salon) {
        setLoadError("We could not find this salon. Please ask a member of staff.");
        setIsLoading(false);
        return;
      }

      const { data: rows, error: servicesError } = await supabase
        .from("services")
        .select("id, name, price_pence, duration_minutes, lead_only, price_is_from, group_name")
        .eq("salon_id", salon.id)
        .order("sort_order", { ascending: true });

      if (cancelled) return;
      if (servicesError || !rows) {
        setLoadError("We could not load the services. Please try again in a moment.");
        setIsLoading(false);
        return;
      }

      setSalonName(salon.name);
      setServices((rows as ServiceRow[]).map(mapServiceRow));
      setIsLoading(false);
    }

    loadServices();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayItems = buildDisplayItems(services);
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const needsLead = selectedServices.some((s) => s.leadOnly);
  const eligibleTechnicians = TECHNICIANS.filter(
    (t) => !needsLead || t.level === "lead"
  );
  const totalPence = selectedServices.reduce((sum, s) => sum + s.pricePence, 0);
  const totalMinutes = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const hasFromPrice = selectedServices.some((s) => s.priceIsFrom);
  const totalPriceLabel = hasFromPrice
    ? `from ${formatPrice(totalPence)}`
    : formatPrice(totalPence);

  // If the chosen technician can no longer do the selected services, fall back to "any"
  const chosenTechnician = eligibleTechnicians.find((t) => t.id === technicianId);
  const effectiveTechnicianId = chosenTechnician ? technicianId : ANY_TECHNICIAN;

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleGroup(name: string) {
    setOpenGroups((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!firstName.trim()) {
      setError("Please enter your first name.");
      return;
    }
    if (selectedServices.length === 0) {
      setError("Please choose at least one service.");
      return;
    }
    if (phone.trim() && !isValidUkMobile(phone)) {
      setError("Please enter a valid UK mobile number, e.g. 07123 456789.");
      return;
    }

    // Temporary number for testing the screen. Real queue numbers come later.
    setTicketNumber(Math.floor(Math.random() * 50) + 1);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-pink-50 flex items-center justify-center px-6">
        <p className="text-gray-600">Loading services...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-pink-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-md">
          <p className="text-red-700">{loadError}</p>
        </div>
      </main>
    );
  }

  if (ticketNumber !== null) {
    return (
      <main className="min-h-screen bg-pink-50 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-md">
          <p className="text-sm text-gray-500">{salonName}</p>
          <p className="mt-1 text-lg text-gray-700">Thanks, {firstName}!</p>
          <p className="mt-6 text-sm uppercase tracking-wide text-gray-400">Your number</p>
          <p className="mt-1 text-7xl font-bold text-pink-600">{ticketNumber}</p>

          <div className="mt-6 rounded-xl bg-pink-50 p-4 text-left">
            {selectedServices.map((s) => (
              <div key={s.id} className="flex justify-between py-1 text-gray-800">
                <span>{s.name}</span>
                <span>{displayServicePrice(s)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-pink-200 pt-2 font-semibold text-gray-900">
              <span>Total</span>
              <span>{totalPriceLabel}</span>
            </div>
            {hasFromPrice && (
              <p className="mt-1 text-xs text-gray-500">
                Final price will be confirmed by your technician.
              </p>
            )}
            <p className="mt-2 text-sm text-gray-600">About {totalMinutes} minutes</p>
            <p className="mt-1 text-sm text-gray-600">
              Technician:{" "}
              {chosenTechnician ? chosenTechnician.name : "First available"}
            </p>
            {notes && <p className="mt-1 text-sm text-gray-600">Note: {notes}</p>}
          </div>

          <p className="mt-6 text-gray-600">
            {phone.trim()
              ? "We will text you when it is nearly your turn."
              : "Keep this page open. We will show you when it is your turn."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-pink-50 flex items-center justify-center px-6 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md"
      >
        <p className="text-sm text-gray-500">{salonName}</p>
        <h1 className="mt-1 text-2xl font-bold text-pink-600">Join the queue</h1>
        <p className="mt-1 text-gray-600">Tell us your name and what you would like.</p>

        <label className="mt-6 block text-sm font-medium text-gray-700">First name</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="e.g. Sarah"
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:outline-none"
        />

        <p className="mt-6 text-sm font-medium text-gray-700">Services (choose one or more)</p>
        <div className="mt-2 space-y-2">
          {displayItems.map((item) => {
            if (item.kind === "service") {
              return (
                <ServiceOption
                  key={item.service.id}
                  service={item.service}
                  checked={selectedServiceIds.includes(item.service.id)}
                  onToggle={() => toggleService(item.service.id)}
                />
              );
            }

            const isOpen = openGroups.includes(item.name);
            const selectedInGroup = item.services.filter((s) =>
              selectedServiceIds.includes(s.id)
            ).length;
            const lowestPence = Math.min(...item.services.map((s) => s.pricePence));

            return (
              <div
                key={item.name}
                className={`rounded-lg border ${
                  selectedInGroup > 0 ? "border-pink-500" : "border-gray-300"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(item.name)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-gray-900">{item.name}</span>
                    <span className="block text-xs text-gray-500">
                      {item.services.length} options
                      {selectedInGroup > 0 && ` · ${selectedInGroup} selected`}
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-sm text-gray-600">
                    from {formatPrice(lowestPence)}
                    <span className="text-lg text-pink-600">{isOpen ? "▴" : "▾"}</span>
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-2 border-t border-gray-200 bg-gray-50 p-3">
                    {item.services.map((s) => (
                      <ServiceOption
                        key={s.id}
                        service={s}
                        checked={selectedServiceIds.includes(s.id)}
                        onToggle={() => toggleService(s.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedServices.length > 0 && (
          <div className="mt-3 rounded-lg bg-pink-50 px-4 py-3">
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total: {totalPriceLabel}</span>
              <span>About {totalMinutes} min</span>
            </div>
            {hasFromPrice && (
              <p className="mt-1 text-xs text-gray-500">
                Nail art price depends on the design. Your technician will confirm the final price.
              </p>
            )}
          </div>
        )}

        <label className="mt-6 block text-sm font-medium text-gray-700">Technician</label>
        <select
          value={effectiveTechnicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:outline-none"
        >
          <option value={ANY_TECHNICIAN}>First available (shortest wait)</option>
          {eligibleTechnicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <label className="mt-6 block text-sm font-medium text-gray-700">
          Mobile number (optional)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07123 456789"
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Only used to tell you when your turn is near.
        </p>

        <label className="mt-6 block text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. sensitive nails, flowers on 2 nails"
          rows={3}
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-pink-500 focus:outline-none"
        />

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          className="mt-6 w-full rounded-full bg-pink-600 py-4 text-lg font-semibold text-white hover:bg-pink-700"
        >
          Get my number
        </button>
      </form>
    </main>
  );
}