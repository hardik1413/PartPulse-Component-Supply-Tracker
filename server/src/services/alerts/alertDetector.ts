import { AlertType, StockStatus } from '../../../../shared/types';
import { calculatePriceChange } from '../matching/comparer';

export interface SnapshotComparisonInput {
  componentId: string;
  supplierListingId: string;
  componentName: string;
  mpn: string;
  supplierName: string;
  previous: {
    price: number | null;
    currency: string | null;
    stockStatus: StockStatus;
    stockQuantity: number | null;
  } | null;
  current: {
    price: number | null;
    currency: string | null;
    stockStatus: StockStatus;
    stockQuantity: number | null;
  };
}

export interface DetectedAlert {
  componentId: string;
  supplierListingId: string;
  type: AlertType;
  message: string;
  previousValue: string;
  currentValue: string;
}

/**
 * Detects price spikes, stock shortages, and availability recoveries.
 * Prevents redundant duplicate alerts.
 */
export function detectAlerts(input: SnapshotComparisonInput): DetectedAlert[] {
  const alerts: DetectedAlert[] = [];
  const { previous, current, componentId, supplierListingId, componentName, mpn, supplierName } = input;

  if (!previous) {
    // First snapshot; no historical transition yet
    return alerts;
  }

  // 1. Stock Transition Checks
  const prevStock = previous.stockStatus;
  const currStock = current.stockStatus;

  // In-stock -> Out-of-stock / Backorder
  if (
    (prevStock === 'IN_STOCK' || prevStock === 'LIMITED_STOCK') &&
    (currStock === 'OUT_OF_STOCK' || currStock === 'BACKORDER')
  ) {
    alerts.push({
      componentId,
      supplierListingId,
      type: 'OUT_OF_STOCK',
      message: `Shortage alert: ${componentName} (${mpn}) went OUT OF STOCK at ${supplierName}.`,
      previousValue: `${prevStock}${previous.stockQuantity ? ` (${previous.stockQuantity} units)` : ''}`,
      currentValue: `${currStock}${current.stockQuantity ? ` (${current.stockQuantity} units)` : ''}`,
    });
  }
  // Out-of-stock -> In-stock
  else if (
    (prevStock === 'OUT_OF_STOCK' || prevStock === 'BACKORDER') &&
    (currStock === 'IN_STOCK' || currStock === 'LIMITED_STOCK')
  ) {
    alerts.push({
      componentId,
      supplierListingId,
      type: 'IN_STOCK',
      message: `Stock recovered: ${componentName} (${mpn}) is now back IN STOCK at ${supplierName}!`,
      previousValue: `${prevStock}`,
      currentValue: `${currStock}${current.stockQuantity ? ` (${current.stockQuantity} units)` : ''}`,
    });
  }
  // General availability change
  else if (prevStock !== currStock && prevStock !== 'UNKNOWN' && currStock !== 'UNKNOWN') {
    alerts.push({
      componentId,
      supplierListingId,
      type: 'AVAILABILITY_CHANGE',
      message: `Availability changed for ${componentName} at ${supplierName}: from ${prevStock} to ${currStock}.`,
      previousValue: prevStock,
      currentValue: currStock,
    });
  }

  // 2. Price Change Checks
  const priceEval = calculatePriceChange(
    previous.price,
    previous.currency,
    current.price,
    current.currency
  );

  if (priceEval.valid && priceEval.percentageChange !== null) {
    const pct = priceEval.percentageChange;
    const currency = current.currency || 'USD';

    // Price increase >= 10%
    if (pct >= 10.0) {
      alerts.push({
        componentId,
        supplierListingId,
        type: 'PRICE_INCREASE',
        message: `Price spike alert: ${componentName} increased by +${pct}% at ${supplierName} (${previous.price} ${currency} → ${current.price} ${currency}).`,
        previousValue: `${previous.price} ${currency}`,
        currentValue: `${current.price} ${currency} (+${pct}%)`,
      });
    }
    // Price decrease >= 5%
    else if (pct <= -5.0) {
      alerts.push({
        componentId,
        supplierListingId,
        type: 'PRICE_DECREASE',
        message: `Price drop: ${componentName} decreased by ${pct}% at ${supplierName} (${previous.price} ${currency} → ${current.price} ${currency}).`,
        previousValue: `${previous.price} ${currency}`,
        currentValue: `${current.price} ${currency} (${pct}%)`,
      });
    }
  }

  return alerts;
}
