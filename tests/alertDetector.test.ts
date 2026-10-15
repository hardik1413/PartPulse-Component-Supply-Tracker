import { describe, it, expect } from 'vitest';
import { detectAlerts, SnapshotComparisonInput } from '../server/src/services/alerts/alertDetector';

describe('Shortage Alerts & Stock Transition Detection', () => {
  it('detects in-stock to out-of-stock shortage transitions', () => {
    const input: SnapshotComparisonInput = {
      componentId: 'comp_1',
      supplierListingId: 'listing_1',
      componentName: 'ESP32 Module',
      mpn: 'ESP32-WROOM-32',
      supplierName: 'DigiKey',
      previous: {
        price: 2.50,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 5000,
      },
      current: {
        price: 2.50,
        currency: 'USD',
        stockStatus: 'OUT_OF_STOCK',
        stockQuantity: 0,
      },
    };

    const alerts = detectAlerts(input);
    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe('OUT_OF_STOCK');
    expect(alerts[0].message).toContain('went OUT OF STOCK');
    expect(alerts[0].currentValue).toContain('OUT_OF_STOCK');
  });

  it('detects stock recovery from out-of-stock to in-stock', () => {
    const input: SnapshotComparisonInput = {
      componentId: 'comp_2',
      supplierListingId: 'listing_2',
      componentName: 'BNO055 IMU',
      mpn: 'BNO055',
      supplierName: 'Mouser',
      previous: {
        price: 18.00,
        currency: 'USD',
        stockStatus: 'OUT_OF_STOCK',
        stockQuantity: 0,
      },
      current: {
        price: 18.00,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 350,
      },
    };

    const alerts = detectAlerts(input);
    expect(alerts.length).toBe(1);
    expect(alerts[0].type).toBe('IN_STOCK');
    expect(alerts[0].message).toContain('back IN STOCK');
  });

  it('detects price spike >= 10%', () => {
    const input: SnapshotComparisonInput = {
      componentId: 'comp_3',
      supplierListingId: 'listing_3',
      componentName: 'STM32 MCU',
      mpn: 'STM32F401RET6',
      supplierName: 'Arrow',
      previous: {
        price: 5.00,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 1000,
      },
      current: {
        price: 6.00, // +20% increase
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 950,
      },
    };

    const alerts = detectAlerts(input);
    const priceAlert = alerts.find((a) => a.type === 'PRICE_INCREASE');
    expect(priceAlert).toBeDefined();
    expect(priceAlert?.message).toContain('+20%');
  });

  it('does NOT create a price spike alert for sub-10% changes', () => {
    const input: SnapshotComparisonInput = {
      componentId: 'comp_4',
      supplierListingId: 'listing_4',
      componentName: 'Resistor Pack',
      mpn: 'RES-10K',
      supplierName: 'LCSC',
      previous: {
        price: 1.00,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 1000,
      },
      current: {
        price: 1.05, // +5% (less than 10%)
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 1000,
      },
    };

    const alerts = detectAlerts(input);
    const priceAlert = alerts.find((a) => a.type === 'PRICE_INCREASE');
    expect(priceAlert).toBeUndefined();
  });

  it('does not produce duplicate alerts when status is unchanged', () => {
    const input: SnapshotComparisonInput = {
      componentId: 'comp_5',
      supplierListingId: 'listing_5',
      componentName: 'Diode',
      mpn: '1N4148',
      supplierName: 'DigiKey',
      previous: {
        price: 0.10,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 10000,
      },
      current: {
        price: 0.10,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 9800,
      },
    };

    const alerts = detectAlerts(input);
    expect(alerts.length).toBe(0);
  });
});
