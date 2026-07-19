export const DEFAULT_GUILD_COMMISSION_PERCENT = 10;

export type CommissionBreakdown = {
  grossAmount: number;
  guildFee: number;
  organizationPayout: number;
  commissionPercent: number;
};

export function getCommissionPercent(value?: number | null) {
  const numeric = Number(value ?? DEFAULT_GUILD_COMMISSION_PERCENT);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_GUILD_COMMISSION_PERCENT;
  }
  return numeric;
}

export function calculateCommissionBreakdown(amount: number, commissionPercent?: number | null): CommissionBreakdown {
  const grossAmount = Math.max(0, Number(amount) || 0);
  const resolvedPercent = getCommissionPercent(commissionPercent);
  const guildFee = Math.round((grossAmount * resolvedPercent) / 100 * 100) / 100;
  const organizationPayout = Math.max(0, Math.round((grossAmount - guildFee) * 100) / 100);

  return {
    grossAmount,
    guildFee,
    organizationPayout,
    commissionPercent: resolvedPercent,
  };
}

export function formatCurrency(currency: string | undefined, amount: number) {
  const safeCurrency = (currency || 'INR').toUpperCase();
  if (safeCurrency === 'INR') {
    return `Rs ${amount.toLocaleString('en-IN')}`;
  }
  return `${safeCurrency} ${amount.toLocaleString('en-IN')}`;
}

export function getEventCommissionPercent(event?: { paymentConfig?: { platformCommissionPercent?: number | null } } | null) {
  return getCommissionPercent(event?.paymentConfig?.platformCommissionPercent);
}
