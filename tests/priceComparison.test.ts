import { describe, it, expect } from 'vitest';
import {
  compareSupplierPrices,
  calculatePriceChange,
  normalizeCurrency,
} from '../server/src/services/matching/comparer';
import { SearchResultItem } from '../shared/types';

describe('Price Comparison and Currency Normalization', () => {
  it('normalizes common currency symbols and codes', () => {
    expect(normalizeCurrency('$')).toBe('USD');
    expect(normalizeCurrency('US$')).toBe('USD');
    expect(normalizeCurrency('€')).toBe('EUR');
    expect(normalizeCurrency('£')).toBe('GBP');
    expect(normalizeCurrency('₹')).toBe('INR');
    expect(normalizeCurrency('¥')).toBe('JPY');
  });

  it('highlights the lowest price among comparable listings with matching currencies', () => {
    const listings: SearchResultItem[] = [
      {
        supplier: 'DigiKey',
        name: 'ESP32-WROOM-32',
        mpn: 'ESP32-WROOM-32',
        manufacturer: 'Espressif',
        price: 2.80,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 15000,
        leadTime: 'Immediate',
        productUrl: 'https://digikey.com/esp32',
        specifications: {},
        verificationStatus: 'VERIFIED',
        comparable: false,
      },
      {
        supplier: 'Mouser',
        name: 'ESP32-WROOM-32',
        mpn: 'ESP32-WROOM-32',
        manufacturer: 'Espressif',
        price: 2.40,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 8200,
        leadTime: 'Immediate',
        productUrl: 'https://mouser.com/esp32',
        specifications: {},
        verificationStatus: 'VERIFIED',
        comparable: false,
      },
      {
        supplier: 'LCSC',
        name: 'ESP32-WROOM-32',
        mpn: 'ESP32-WROOM-32',
        manufacturer: 'Espressif',
        price: 2.95,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 50000,
        leadTime: 'Immediate',
        productUrl: 'https://lcsc.com/esp32',
        specifications: {},
        verificationStatus: 'VERIFIED',
        comparable: false,
      },
    ];

    const result = compareSupplierPrices(listings);

    // Mouser at $2.40 should be marked lowest
    const mouser = result.find((r) => r.supplier === 'Mouser');
    expect(mouser?.isLowestPrice).toBe(true);
    expect(mouser?.comparable).toBe(true);

    const digikey = result.find((r) => r.supplier === 'DigiKey');
    expect(digikey?.isLowestPrice).toBe(false);
  });

  it('marks listings as incomparable when currency differs and explains why', () => {
    const listings: SearchResultItem[] = [
      {
        supplier: 'US Distributor',
        name: 'Sensor',
        mpn: 'BNO055',
        manufacturer: 'Bosch',
        price: 15.00,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 100,
        leadTime: null,
        productUrl: 'https://example.com/us',
        specifications: {},
        verificationStatus: 'VERIFIED',
        comparable: false,
      },
      {
        supplier: 'EUR Distributor',
        name: 'Sensor',
        mpn: 'BNO055',
        manufacturer: 'Bosch',
        price: 13.50,
        currency: 'EUR',
        stockStatus: 'IN_STOCK',
        stockQuantity: 50,
        leadTime: null,
        productUrl: 'https://example.com/eu',
        specifications: {},
        verificationStatus: 'VERIFIED',
        comparable: false,
      },
    ];

    const result = compareSupplierPrices(listings);
    const eurListing = result.find((r) => r.currency === 'EUR');
    expect(eurListing?.comparable).toBe(false);
    expect(eurListing?.incomparabilityReason).toContain('Currency mismatch');
  });

  it('marks unpriced listings as non-comparable', () => {
    const listings: SearchResultItem[] = [
      {
        supplier: 'Supplier Without Price',
        name: 'Motor',
        mpn: 'NEMA17',
        manufacturer: 'StepperOnline',
        price: null,
        currency: 'USD',
        stockStatus: 'IN_STOCK',
        stockQuantity: 10,
        leadTime: null,
        productUrl: 'https://example.com/nema17',
        specifications: {},
        verificationStatus: 'UNVERIFIED',
        comparable: false,
      },
    ];

    const result = compareSupplierPrices(listings);
    expect(result[0].comparable).toBe(false);
    expect(result[0].incomparabilityReason).toContain('Price not published');
  });

  describe('Percentage Price Change Calculation', () => {
    it('accurately calculates price increase and decrease percentages', () => {
      // +10% price increase
      const increase = calculatePriceChange(10.00, 'USD', 11.00, 'USD');
      expect(increase.valid).toBe(true);
      expect(increase.percentageChange).toBe(10.0);
      expect(increase.absoluteChange).toBe(1.0);

      // -25% price drop
      const drop = calculatePriceChange(20.00, 'USD', 15.00, 'USD');
      expect(drop.valid).toBe(true);
      expect(drop.percentageChange).toBe(-25.0);
      expect(drop.absoluteChange).toBe(-5.0);
    });

    it('rejects percentage calculation when currencies differ to prevent misleading values', () => {
      const change = calculatePriceChange(10.00, 'USD', 10.00, 'EUR');
      expect(change.valid).toBe(false);
      expect(change.percentageChange).toBeNull();
      expect(change.reason).toContain('Currency changed');
    });

    it('rejects percentage calculation when price is missing or zero', () => {
      expect(calculatePriceChange(null, 'USD', 10.00, 'USD').valid).toBe(false);
      expect(calculatePriceChange(10.00, 'USD', null, 'USD').valid).toBe(false);
      expect(calculatePriceChange(0, 'USD', 10.00, 'USD').valid).toBe(false);
    });
  });
});
