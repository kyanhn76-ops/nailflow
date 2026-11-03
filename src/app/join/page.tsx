"use client";

import { useState } from "react";

type Service = {
  id: string;
  name: string;
  price: number; // GBP. If priceIsFrom is true, this is the starting price
  durationMinutes: number;
  leadOnly: boolean; // true = only lead technicians can do this service
  priceIsFrom?: boolean; // true = final price confirmed by the technician
  group?: string; // services with the same group are shown together under one heading
};

type Technician = {
  id: string;
  name: string;
  level: "lead" | "assistant"; // never shown to customers
};

type DisplayItem =
  | { kind: "service"; service: Service }
  | { kind: "group"; name: string; services: Service[] };

// ===== EDIT YOUR SALON'S SERVICES HERE =====
const SERVICES: Service[] = [
  { id: "gel-hands", name: "Gel polish (hands)", price: 25, durationMinutes: 35, leadOnly: false },
  { id: "gel-toes", name: "Gel toes", price: 25, durationMinutes: 35, leadOnly: false },
  { id: "manicure", name: "Manicure", price: 20, durationMinutes: 30, leadOnly: false },
  { id: "pedicure", name: "Pedicure", price: 30, durationMinutes: 40, leadOnly: false },
  { id: "pedicure-deluxe", name: "Deluxe pedicure", price: 45, durationMinutes: 60, leadOnly: false },
  { id: "biab-overlay", name: "BIAB overlay", price: 35, durationMinutes: 50, leadOnly: true },
  { id: "biab-infill", name: "BIAB infill", price: 32, durationMinutes: 45, leadOnly: true },
  { id: "biab-extensions", name: "BIAB extensions", price: 45, durationMinutes: 75, leadOnly: true },
  { id: "acrylic-full", name: "Acrylic full set", price: 35, durationMinutes: 60, leadOnly: true },
  { id: "acrylic-infill", name: "Acrylic infill", price: 28, durationMinutes: 45, leadOnly: true },
  { id: "nail-art-simple", name: "Nail art – Simple", price: 5, durationMinutes: 15, leadOnly: true, priceIsFrom: true, group: "Nail art" },
  { id: "nail-art-medium", name: "Nail art – Medium", price: 10, durationMinutes: 25, leadOnly: true, priceIsFrom: true, group: "Nail art" },
  { id: "nail-art-complex", name: "Nail art – Complex", price: 20, durationMinutes: 40, leadOnly: true, priceIsFrom: true, group: "Nail art" },
  { id: "gems-few", name: "Gems – A few (1–2 nails)", price: 3, durationMinutes: 10, leadOnly: true, priceIsFrom: true, group: "Nail art" },
  { id: "gems-medium", name: "Gems – Medium (3–5 nails)", price: 8, durationMinutes: 20, leadOnly: true, priceIsFrom: true, group: "Nail art" },
  { id: "gems-lots", name: "Gems – Lots (6–10 nails)", price: 15, durationMinutes: 30, leadOnly: true, priceIsFrom: true, group: "Nail art" },
  { id: "removal", name: "Removal", price: 10, durationMinutes: 15, leadOnly: false },
];

// ===== EDIT YOUR TECHNICIANS HERE =====
const TECHNICIANS: Technician[] = [
  { id: "linh", name: "Linh", level: "lead" },
  { id: "mai", name: "Mai", level: "lead" },
  { id: "tom", name: "Tom", level: "assistant" },
];

const ANY_TECHNICIAN = "any";

function formatPrice(amount: number) {
  return `£${amount.toFixed(2)}`;
}

function displayServicePrice(service: Service) {
  return service.priceIsFrom ? `from ${formatPrice(service.price)}` : formatPrice(service.price);
}

function isValidUkMobile(value: string) {
  const digits = value.replace(/\s/g, "");
  return /^(07\d{9}|\+447\d{9})$/.test(digits);
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

const DISPLAY_ITEMS = buildDisplayItems(SERVICES);

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
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [technicianId, setTechnicianId] = useState(ANY_TECHNICIAN);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);

  const selectedServices = SERVICES.filter((s) => selectedServiceIds.includes(s.id));
  const needsLead = selectedServices.some((s) => s.leadOnly);
  const eligibleTechnicians = TECHNICIANS.filter(
    (t) => !needsLead || t.level === "lead"
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalMinutes = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const hasFromPrice = selectedServices.some((s) => s.priceIsFrom);
  const totalPriceLabel = hasFromPrice
    ? `from ${formatPrice(totalPrice)}`
    : formatPrice(totalPrice);

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

  if (ticketNumber !== null) {
    return (
      <main className="min-h-screen bg-pink-50 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-md">
          <p className="text-lg text-gray-700">Thanks, {firstName}!</p>
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
        <h1 className="text-2xl font-bold text-pink-600">Join the queue</h1>
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
          {DISPLAY_ITEMS.map((item) => {
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
            const lowestPrice = Math.min(...item.services.map((s) => s.price));

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
                    from {formatPrice(lowestPrice)}
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