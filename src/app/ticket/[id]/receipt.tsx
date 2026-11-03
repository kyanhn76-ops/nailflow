"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReceiptLine = {
  line_type: "service" | "extra" | "discount" | "reward" | "total" | "cash" | "card";
  label: string;
  amount_pence: number;
  sort_order: number;
};

const EXTRA_LABELS: Record<string, string> = {
  long_nails: "Extra: long nails",
  complex_design: "Extra: complex design",
  repair: "Extra: nail repair",
  other: "Extra charge",
};

const DISCOUNT_LABELS: Record<string, string> = {
  regular: "Discount: regular customer",
  friends_family: "Discount: friends & family",
  promotion: "Discount: promotion",
  compensation: "Discount: sorry for the trouble",
  birthday: "Discount: happy birthday",
  other: "Discount",
};

const REWARD_LABELS: Record<string, string> = {
  stamps: "🎁 Loyalty card reward",
  points: "🎁 Loyalty points reward",
};

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function lineLabel(line: ReceiptLine) {
  if (line.line_type === "extra") return EXTRA_LABELS[line.label] ?? "Extra charge";
  if (line.line_type === "discount") return DISCOUNT_LABELS[line.label] ?? "Discount";
  if (line.line_type === "reward") return REWARD_LABELS[line.label] ?? "Reward";
  return line.label;
}

export function Receipt({ entryId }: { entryId: string }) {
  const [lines, setLines] = useState<ReceiptLine[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase.rpc("get_ticket_receipt", { p_entry_id: entryId });
      if (cancelled || error) return;
      setLines((data ?? []) as ReceiptLine[]);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  if (lines.length === 0) return null;

  const itemLines = lines.filter((l) =>
    ["service", "extra", "discount", "reward"].includes(l.line_type)
  );
  const total = lines.find((l) => l.line_type === "total");
  const paymentLines = lines.filter((l) => l.line_type === "cash" || l.line_type === "card");

  return (
    <div className="mt-6 rounded-xl border border-gray-200 p-4 text-left">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your receipt</p>

      <div className="mt-3 space-y-1">
        {itemLines.map((line, i) => {
          const isMinus = line.line_type === "discount" || line.line_type === "reward";
          return (
            <div
              key={i}
              className={`flex justify-between gap-2 ${isMinus ? "text-green-700" : "text-gray-800"}`}
            >
              <span>{lineLabel(line)}</span>
              <span>
                {isMinus ? "–" : ""}
                {formatPrice(line.amount_pence)}
              </span>
            </div>
          );
        })}
      </div>

      {total && (
        <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-lg font-bold text-gray-900">
          <span>Total</span>
          <span>{formatPrice(total.amount_pence)}</span>
        </div>
      )}

      {paymentLines.length > 0 && (
        <div className="mt-2 space-y-1 text-sm text-gray-600">
          {paymentLines.map((line) => (
            <div key={line.line_type} className="flex justify-between">
              <span>{line.line_type === "cash" ? "Paid by cash" : "Paid by card"}</span>
              <span>{formatPrice(line.amount_pence)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        If this does not match what you paid, please speak to the salon.
      </p>
    </div>
  );
}