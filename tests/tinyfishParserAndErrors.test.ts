import { describe, it, expect } from 'vitest';
import {
  parseFetchedSupplierPage,
  extractPriceAndCurrency,
  extractStock,
  extractLeadTime,
  identifySupplier,
} from '../server/src/services/tinyfish/parser';
import { TinyFishApiError } from '../server/src/services/tinyfish/client';

describe('TinyFish Content Parser & Missing Fields Handling', () => {
  it('correctly identifies known supplier names from URLs', () => {
    expect(identifySupplier('https://www.digikey.com/en/products/detail/esp32/19124')).toBe('DigiKey');
    expect(identifySupplier('https://www.mouser.com/ProductDetail/Espressif/ESP32')).toBe('Mouser Electronics');
    expect(identifySupplier('https://www.lcsc.com/product-detail/WiFi-Modules_ESP32.html')).toBe('LCSC Electronics');
    expect(identifySupplier('https://www.adafruit.com/product/3405')).toBe('Adafruit');
    expect(identifySupplier('https://www.sparkfun.com/products/13672')).toBe('SparkFun');
    expect(identifySupplier('https://custom-distributor.io/part/123')).toBe('Custom-distributor');
  });

  it('extracts prices and currencies in various standard formats', () => {
    expect(extractPriceAndCurrency('Price: $2.45 / each')).toEqual({ price: 2.45, currency: 'USD' });
    expect(extractPriceAndCurrency('Unit Price: €1.89')).toEqual({ price: 1.89, currency: 'EUR' });
    expect(extractPriceAndCurrency('Unit: £4.50')).toEqual({ price: 4.5, currency: 'GBP' });
    expect(extractPriceAndCurrency('1+ $0.95')).toEqual({ price: 0.95, currency: 'USD' });
    expect(extractPriceAndCurrency('USD 12.50 in stock')).toEqual({ price: 12.5, currency: 'USD' });
  });

  it('represents missing price as null without inventing fake values', () => {
    const res = extractPriceAndCurrency('Call for quote. Contact sales office.');
    expect(res.price).toBeNull();
  });

  it('extracts stock statuses and quantities', () => {
    expect(extractStock('15,400 In Stock for immediate delivery')).toEqual({
      status: 'IN_STOCK',
      quantity: 15400,
    });
    expect(extractStock('Available: 12')).toEqual({
      status: 'LIMITED_STOCK',
      quantity: 12,
    });
    expect(extractStock('Currently Out of Stock. Factory order.')).toEqual({
      status: 'OUT_OF_STOCK',
      quantity: 0,
    });
    expect(extractStock('On Backorder. Ships when available.')).toEqual({
      status: 'BACKORDER',
      quantity: 0,
    });
    expect(extractStock('Product overview datasheet PDF')).toEqual({
      status: 'UNKNOWN',
      quantity: null,
    });
  });

  it('extracts lead times if published', () => {
    expect(extractLeadTime('Factory Lead-Time: 6 Weeks')).toBe('6 Weeks');
    expect(extractLeadTime('Standard lead time: 8 weeks')).toBe('8 weeks');
    expect(extractLeadTime('Ships in 2 days')).toBe('2 days');
    expect(extractLeadTime('Download schematic')).toBeNull();
  });

  it('parses full supplier page and marks verified vs unverified accurately', () => {
    const rawMarkdown = `
# ESP32-WROOM-32D Espressif Systems
Wi-Fi and Bluetooth Module
Manufacturer: Espressif Systems
MPN: ESP32-WROOM-32D-TR
Price: $2.40 / unit
Stock: 12,500 In Stock
Lead Time: Ships in 1 business day
Specifications:
Operating Voltage: 3.0V - 3.6V
Interface: I2C, SPI, UART
Package: SMD Module
    `;

    const parsed = parseFetchedSupplierPage(
      'https://www.digikey.com/product/esp32',
      {
        title: 'ESP32-WROOM-32D DigiKey',
        description: 'In-stock ESP32 module',
        text: rawMarkdown,
      },
      'ESP32-WROOM-32D',
      'Espressif'
    );

    expect(parsed.supplierName).toBe('DigiKey');
    expect(parsed.price).toBe(2.40);
    expect(parsed.currency).toBe('USD');
    expect(parsed.stockStatus).toBe('IN_STOCK');
    expect(parsed.stockQuantity).toBe(12500);
    expect(parsed.verificationStatus).toBe('VERIFIED');
    expect(parsed.specifications.voltage).toBe('3.0V - 3.6V');
    expect(parsed.specifications.interface).toContain('I2C');
  });

  it('never treats an empty or minimal snippet as a verified listing', () => {
    const parsed = parseFetchedSupplierPage(
      'https://unknown-shop.com/part',
      {
        title: 'Hardware Catalog',
        description: null,
        text: 'Welcome to our catalog',
      },
      'BNO055'
    );

    expect(parsed.price).toBeNull();
    expect(parsed.stockStatus).toBe('UNKNOWN');
    expect(parsed.verificationStatus).toBe('UNVERIFIED');
  });
});

describe('TinyFish API Error Handling', () => {
  it('instantiates TinyFishApiError with status code and error details', () => {
    const err = new TinyFishApiError('Payment Required: free allowance exhausted', 402, 'INSUFFICIENT_CREDITS', { balance: 0 });
    expect(err.statusCode).toBe(402);
    expect(err.errorCode).toBe('INSUFFICIENT_CREDITS');
    expect(err.details).toEqual({ balance: 0 });
    expect(err.name).toBe('TinyFishApiError');
  });
});
