"use client";

import { useMemo } from "react";
import { currentMonth, shiftMonth } from "./format";
import { useStore, type Plan } from "./store";

export const TRIAL_DAYS = 7;
/** No grátis, dá para ver o mês atual e os 2 anteriores. */
export const FREE_MONTHS = 3;

export const PRICES = { monthly: 9.9, yearly: 59.9 };

/** Primeiro mês liberado no plano grátis (ex.: em outubro, "2026-08"). */
export const freeWindowStart = () => shiftMonth(currentMonth(), -(FREE_MONTHS - 1));

export function proStatus(plan: Plan, now = Date.now()) {
  const trialEnds = plan.trialStartedAt ? new Date(plan.trialStartedAt).getTime() + TRIAL_DAYS * 86_400_000 : null;
  const trialActive = trialEnds != null && now < trialEnds;
  const paid = !!plan.proUntil && now < new Date(plan.proUntil).getTime();
  return {
    isPro: trialActive || paid,
    paid,
    trialActive,
    trialUsed: !!plan.trialStartedAt,
    trialEndsAt: trialEnds ? new Date(trialEnds) : null,
  };
}

export function usePro() {
  const plan = useStore((s) => s.plan);
  return useMemo(() => {
    const status = proStatus(plan);
    const start = freeWindowStart();
    return { ...status, freeStart: start, isLocked: (month: string) => !status.isPro && month < start };
  }, [plan]);
}
