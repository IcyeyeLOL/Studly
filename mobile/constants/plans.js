export const FREE_DAILY_LIMIT = 10;

export const PLAN_LABELS = {
  free: `Free (${FREE_DAILY_LIMIT} questions/day)`,
  freeShort: `Free (${FREE_DAILY_LIMIT}/day)`,
  monthly: 'Studly Pro \u2014 Monthly',
  yearly: 'Studly Pro \u2014 Yearly',
};

export function getPlanLabel(plan) {
  if (plan === 'yearly') return PLAN_LABELS.yearly;
  if (plan === 'monthly') return PLAN_LABELS.monthly;
  return PLAN_LABELS.free;
}

export function getPlanLabelShort(plan) {
  if (plan === 'yearly') return PLAN_LABELS.yearly;
  if (plan === 'monthly') return PLAN_LABELS.monthly;
  return PLAN_LABELS.freeShort;
}

export const FREE_PLAN_CTA = `Continue with free plan (${FREE_DAILY_LIMIT} questions/day)`;
export const PLAN_PICKER_MESSAGE = `Choose your plan. Free: ${FREE_DAILY_LIMIT} questions per day. Pro: unlimited.`;
