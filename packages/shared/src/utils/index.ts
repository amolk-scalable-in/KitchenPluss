// ============================================================
// @kitchenpulse/shared — Domain Utilities & Calculation Formulas
// Single implementation for Food Cost, Scrap Percentages, and Clocks
// ============================================================

export const CURRENCY_SYMBOL = '₹';

/**
 * Calculates food cost percentage: (cost / sale_price) * 100
 */
export function calculateFoodCostPercentage(cost: number, salePrice: number): number {
  if (!salePrice || salePrice <= 0) return 0;
  const pct = (cost / salePrice) * 100;
  return Number(pct.toFixed(2));
}

/**
 * Calculates scrap / waste rate percentage: (waste_qty / prepped_qty) * 100
 */
export function calculateWastePercentage(wasteQty: number, preppedQty: number): number {
  if (!preppedQty || preppedQty <= 0) return 0;
  const pct = (wasteQty / preppedQty) * 100;
  return Number(pct.toFixed(2));
}

/**
 * Formats a numerical amount to Indian Rupee (INR - ₹) format
 * Uses Indian numbering grouping (e.g. ₹1,250.00 or ₹350.00)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '₹0.00';
  const num = Number(amount);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Calculates and formats elapsed kitchen wait time (T+ mm:ss)
 */
export function formatElapsedTime(createdAt: string | Date | number): string {
  const start = typeof createdAt === 'string' || typeof createdAt === 'number'
    ? new Date(createdAt).getTime()
    : createdAt.getTime();
  
  const elapsedSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  return `T+ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Returns station color code for KDS badge displays with Indian commercial kitchen stations
 */
export function getStationColor(station: string): { bg: string; text: string; border: string } {
  const norm = (station || '').toUpperCase();
  if (norm.includes('TANDOOR') || norm.includes('GRILL')) {
    return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
  }
  if (norm.includes('CURRY') || norm.includes('HANDI') || norm.includes('SAUTÉ') || norm.includes('SAUTE')) {
    return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
  }
  if (norm.includes('BIRYANI') || norm.includes('RICE')) {
    return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' };
  }
  if (norm.includes('STARTER') || norm.includes('CHAAT')) {
    return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
  }
  if (norm.includes('TAWA') || norm.includes('ROTI') || norm.includes('BREAD')) {
    return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' };
  }
  if (norm.includes('BAR') || norm.includes('DRINK') || norm.includes('BEVERAGE')) {
    return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' };
  }
  if (norm.includes('DESSERT') || norm.includes('MITHAI')) {
    return { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' };
  }
  if (norm.includes('PREP') || norm.includes('PANTRY')) {
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
  }
  if (norm.includes('PIZZA') || norm.includes('OVEN')) {
    return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
  }
  return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
}
