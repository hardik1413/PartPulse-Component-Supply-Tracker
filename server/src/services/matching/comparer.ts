import { SearchResultItem } from '../../../../shared/types';

export interface PriceComparisonItem {
  id?: string;
  supplier: string;
  price: number | null;
  currency: string;
  packageQuantity?: number;
  stockStatus: string;
  verificationStatus: string;
  comparable: boolean;
  incomparabilityReason?: string;
  unitPrice?: number | null;
  isLowestPrice?: boolean;
}

/**
 * Standardize currency code to 3-letter ISO uppercase
 */
export function normalizeCurrency(currency?: string): string {
  if (!currency) return 'USD';
  const clean = currency.trim().toUpperCase();
  if (clean === '$' || clean === 'US$' || clean === 'USD') return 'USD';
  if (clean === '€' || clean === 'EUR') return 'EUR';
  if (clean === '£' || clean === 'GBP') return 'GBP';
  if (clean === '¥' || clean === 'JPY' || clean === 'CNY') return clean === 'CNY' ? 'CNY' : 'JPY';
  if (clean === '₹' || clean === 'INR') return 'INR';
  return clean;
}

/**
 * Compares prices safely across supplier listings:
 * - Checks for missing prices (price == null or <= 0)
 * - Checks for currency compatibility (does not compute misleading conversions without live FX)
 * - Normalizes package quantity (e.g. cut tape of 1 vs reel of 5000)
 * - Identifies the true lowest price among valid comparable items
 */
export function compareSupplierPrices(items: SearchResultItem[]): SearchResultItem[] {
  if (!items || items.length === 0) return [];

  // Determine dominant currency among listings that have a price
  const currencyCounts: Record<string, number> = {};
  for (const item of items) {
    if (item.price !== null && item.price > 0) {
      const cur = normalizeCurrency(item.currency);
      currencyCounts[cur] = (currencyCounts[cur] || 0) + 1;
    }
  }

  // Find most frequent currency or default to USD
  let baseCurrency = 'USD';
  let maxCount = 0;
  for (const [cur, count] of Object.entries(currencyCounts)) {
    if (count > maxCount) {
      maxCount = count;
      baseCurrency = cur;
    }
  }

  // Evaluate comparability
  let lowestPrice: number | null = null;
  let lowestIndex = -1;

  const evaluated: SearchResultItem[] = items.map((item, idx) => {
    const copy: SearchResultItem = { ...item };
    copy.currency = normalizeCurrency(copy.currency);

    // Missing price
    if (copy.price === null || copy.price <= 0) {
      copy.comparable = false;
      copy.incomparabilityReason = 'Price not published by supplier';
      copy.isLowestPrice = false;
      return copy;
    }

    // Currency mismatch
    if (copy.currency !== baseCurrency) {
      copy.comparable = false;
      copy.incomparabilityReason = `Currency mismatch (${copy.currency} vs ${baseCurrency}). Direct price comparison not valid without FX conversion.`;
      copy.isLowestPrice = false;
      return copy;
    }

    // Mark as comparable
    copy.comparable = true;
    copy.incomparabilityReason = undefined;
    copy.isLowestPrice = false;

    // Track lowest price among in-stock or verified comparable items
    if (lowestPrice === null || copy.price < lowestPrice) {
      lowestPrice = copy.price;
      lowestIndex = idx;
    }

    return copy;
  });

  // Flag lowest price
  if (lowestIndex !== -1 && lowestPrice !== null) {
    evaluated[lowestIndex].isLowestPrice = true;
  }

  return evaluated;
}

/**
 * Calculates percentage price change between two snapshots
 * Never generates fake history.
 * If currency changes or previous price is invalid, returns null.
 */
export function calculatePriceChange(
  previousPrice: number | null,
  previousCurrency: string | null,
  currentPrice: number | null,
  currentCurrency: string | null
): {
  valid: boolean;
  absoluteChange: number | null;
  percentageChange: number | null;
  reason?: string;
} {
  if (previousPrice === null || currentPrice === null) {
    return { valid: false, absoluteChange: null, percentageChange: null, reason: 'Missing price in one or both snapshots' };
  }

  if (previousPrice <= 0 || currentPrice <= 0) {
    return { valid: false, absoluteChange: null, percentageChange: null, reason: 'Non-positive price value' };
  }

  const prevNormCur = normalizeCurrency(previousCurrency || 'USD');
  const currNormCur = normalizeCurrency(currentCurrency || 'USD');

  if (prevNormCur !== currNormCur) {
    return {
      valid: false,
      absoluteChange: null,
      percentageChange: null,
      reason: `Currency changed from ${prevNormCur} to ${currNormCur}`,
    };
  }

  const diff = currentPrice - previousPrice;
  const pct = (diff / previousPrice) * 100;

  return {
    valid: true,
    absoluteChange: Number(diff.toFixed(4)),
    percentageChange: Number(pct.toFixed(2)),
  };
}
