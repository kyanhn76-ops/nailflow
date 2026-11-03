"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Loyalty = {
  is_member: boolean;
  stamps_enabled: boolean;
  stamps: number;
  stamps_required: number;
  stamp_reward_pence: number;
  points_enabled: boolean;
  points: number;
  points_redeem_threshold: number;
  points_reward_pence: number;
};

function formatPrice(pence: number) {
  const pounds = pence / 100;
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}

export function LoyaltyCard({ entryId }: { entryId: string }) {
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase.rpc("get_ticket_loyalty", { p_entry_id: entryId });
      if (cancelled || error) return;
      const row = (data as Loyalty[] | null)?.[0];
      setLoyalty(row ?? null);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  if (!loyalty || !loyalty.is_member) return null;
  if (!loyalty.stamps_enabled && !loyalty.points_enabled) return null;

  const filled = Math.min(loyalty.stamps, loyalty.stamps_required);
  const hasStampReward = loyalty.stamps >= loyalty.stamps_required;
  const stampsLeft = Math.max(loyalty.stamps_required - loyalty.stamps, 0);

  const hasPointsReward = loyalty.points >= loyalty.points_redeem_threshold;
  const pointsLeft = Math.max(loyalty.points_redeem_threshold - loyalty.points, 0);

  return (
    <div className="mt-6 rounded-xl bg-purple-50 p-4 text-left">
      <p className="text-sm font-semibold uppercase tracking-wide text-purple-700">
        Your loyalty card
      </p>

      {loyalty.stamps_enabled && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: loyalty.stamps_required }).map((_, i) => (
              <span
                key={i}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-lg ${
                  i < filled
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-purple-300 bg-white text-purple-300"
                }`}
              >
                {i < filled ? "💅" : ""}
              </span>
            ))}
          </div>
          {hasStampReward ? (
            <p className="mt-3 font-semibold text-purple-900">
              🎁 You have a reward: {formatPrice(loyalty.stamp_reward_pence)} off! Tell your
              technician when you pay.
            </p>
          ) : (
            <p className="mt-3 text-sm text-purple-900">
              {loyalty.stamps} of {loyalty.stamps_required} stamps ·{" "}
              {stampsLeft === 1 ? "1 more visit" : `${stampsLeft} more visits`} for{" "}
              {formatPrice(loyalty.stamp_reward_pence)} off
            </p>
          )}
        </div>
      )}

      {loyalty.points_enabled && (
        <div className="mt-3 border-t border-purple-200 pt-3">
          <p className="text-lg font-bold text-purple-900">⭐ {loyalty.points} points</p>
          {hasPointsReward ? (
            <p className="mt-1 font-semibold text-purple-900">
              🎁 You can use {loyalty.points_redeem_threshold} points for{" "}
              {formatPrice(loyalty.points_reward_pence)} off!
            </p>
          ) : (
            <p className="mt-1 text-sm text-purple-900">
              {pointsLeft} more points for {formatPrice(loyalty.points_reward_pence)} off
            </p>
          )}
        </div>
      )}
    </div>
  );
}