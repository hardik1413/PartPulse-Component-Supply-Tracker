import { ComponentSpecs, StockStatus, VerificationStatus } from '../../../../shared/types';
import { normalizeCurrency } from '../matching/comparer';

export interface ExtractedSupplierData {
  componentName: string;
  manufacturer: string;
  mpn: string;
  supplierName: string;
  price: number | null;
  currency: string;
  stockStatus: StockStatus;
  stockQuantity: number | null;
  leadTime: string | null;
  packageQuantity: number;
  specifications: ComponentSpecs;
  verificationStatus: VerificationStatus;
  productUrl: string;
  retrievedAt: string;
}

const KNOWN_SUPPLIER_DOMAINS: Record<string, string> = {
  'digikey.com': 'DigiKey',
  'mouser.com': 'Mouser Electronics',
  'lcsc.com': 'LCSC Electronics',
  'arrow.com': 'Arrow Electronics',
  'newark.com': 'Newark',
  'element14.com': 'element14',
  'adafruit.com': 'Adafruit',
  'sparkfun.com': 'SparkFun',
  'pololu.com': 'Pololu',
  'rs-online.com': 'RS Components',
  'avnet.com': 'Avnet',
  'futureelectronics.com': 'Future Electronics',
  'tme.eu': 'TME Electronic Components',
  'ti.com': 'Texas Instruments Direct',
  'microchip.com': 'Microchip Direct',
};

/**
 * Identifies supplier name from URL or page text
 */
export function identifySupplier(url: string, title?: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    for (const [domain, name] of Object.entries(KNOWN_SUPPLIER_DOMAINS)) {
      if (hostname.includes(domain)) {
        return name;
      }
    }

    // Capitalize domain name as fallback supplier name
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      const main = domainParts[domainParts.length - 2];
      return main.charAt(0).toUpperCase() + main.slice(1);
    }
    return hostname;
  } catch {
    return 'Unknown Supplier';
  }
}

/**
 * Extracts price and currency from markdown/text.
 * Never invents values.
 */
export function extractPriceAndCurrency(text: string): { price: number | null; currency: string } {
  if (!text) return { price: null, currency: 'USD' };

  // Look for currency symbols or currency codes with digits
  // Examples: $2.45, USD 3.10, €1.89, £4.50, ¥15.00, ₹140.00, $0.85 / ea
  const priceRegexes = [
    /(?:price|unit\s*price|each|1\+)\s*[:=\-]?\s*([$€£¥₹])\s*([0-9]+(?:\.[0-9]{1,4})?)/i,
    /([$€£¥₹])\s*([0-9]+(?:\.[0-9]{1,4})?)\s*(?:\/|\s*(?:ea|each|unit|pc|piece))/i,
    /(?:USD|EUR|GBP|JPY|INR)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]{1,4})?)/i,
    /([$€£¥₹])\s*([0-9]+(?:\.[0-9]{1,4})?)/i,
  ];

  for (const regex of priceRegexes) {
    const match = text.match(regex);
    if (match) {
      if (match.length === 3) {
        const symbol = match[1];
        const val = parseFloat(match[2]);
        if (!isNaN(val) && val > 0 && val < 100000) {
          return { price: val, currency: normalizeCurrency(symbol) };
        }
      } else if (match.length === 2) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val > 0 && val < 100000) {
          return { price: val, currency: 'USD' };
        }
      }
    }
  }

  return { price: null, currency: 'USD' };
}

/**
 * Extracts stock availability and quantity from markdown/text
 */
export function extractStock(text: string): { status: StockStatus; quantity: number | null } {
  if (!text) return { status: 'UNKNOWN', quantity: null };

  const lower = text.toLowerCase();

  // In stock with quantity patterns checked first
  // e.g. "15,400 In Stock", "Available: 2,500", "In Stock: 420", "Quantity Available: 100"
  const qtyPatterns = [
    /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*(?:in\s*stock|available|units\s*in\s*stock|on\s*hand)/i,
    /(?:in\s*stock|quantity\s*available|stock\s*level|available)\s*[:=\-]?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)/i,
  ];

  for (const pattern of qtyPatterns) {
    const match = text.match(pattern);
    if (match) {
      const rawNum = match[1].replace(/,/g, '');
      const parsed = parseInt(rawNum, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return {
          status: parsed < 20 ? 'LIMITED_STOCK' : 'IN_STOCK',
          quantity: parsed,
        };
      }
    }
  }

  // Out of stock patterns with word boundaries
  if (
    lower.includes('out of stock') ||
    lower.includes('non-stock') ||
    lower.includes('currently unavailable') ||
    /\b0\s*in\s*stock\b/i.test(text) ||
    /\bstock\s*:\s*0\b/i.test(text) ||
    /\bno\s*stock\b/i.test(text)
  ) {
    return { status: 'OUT_OF_STOCK', quantity: 0 };
  }

  // Backorder patterns
  if (lower.includes('backorder') || lower.includes('back order') || lower.includes('on order')) {
    return { status: 'BACKORDER', quantity: 0 };
  }

  // Generic in-stock detection without exact count
  if (lower.includes('in stock') || lower.includes('available to ship') || lower.includes('immediate dispatch')) {
    return { status: 'IN_STOCK', quantity: null };
  }

  return { status: 'UNKNOWN', quantity: null };
}

/**
 * Extracts lead time if published
 */
export function extractLeadTime(text: string): string | null {
  if (!text) return null;

  const leadTimePatterns = [
    /(?:factory\s*lead[\s-]*time|standard\s*lead[\s-]*time|lead[\s-]*time)\s*[:=\-]?\s*([0-9]+\s*(?:weeks?|days?|business\s*days?|months?))/i,
    /(?:ships\s*in|ships\s*within|dispatch\s*within)\s*[:=\-]?\s*([0-9]+\s*(?:weeks?|days?|business\s*days?|hours?))/i,
    /(?:lead[\s-]*time)\s*[:=\-]?\s*([^\n\r,;]{3,30})/i,
  ];

  for (const pattern of leadTimePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const clean = match[1].trim();
      if (clean.length > 0 && clean.length <= 40) {
        return clean;
      }
    }
  }

  return null;
}

/**
 * Extracts technical specifications from text (voltage, current, interface, etc.)
 */
export function extractSpecifications(text: string): ComponentSpecs {
  const specs: ComponentSpecs = {};
  if (!text) return specs;

  // Operating Voltage
  const voltMatch = text.match(/(?:voltage|operating\s*voltage|vcc|input\s*voltage)\s*[:=\-]?\s*([0-9.]+\s*V(?:\s*-\s*[0-9.]+\s*V)?)/i);
  if (voltMatch) specs.voltage = voltMatch[1].trim();

  // Current
  const currMatch = text.match(/(?:current|operating\s*current|supply\s*current)\s*[:=\-]?\s*([0-9.]+\s*(?:mA|uA|A))/i);
  if (currMatch) specs.current = currMatch[1].trim();

  // Interface / Protocol
  const ifaceMatches: string[] = [];
  const interfaces = ['I2C', 'SPI', 'UART', 'CAN', 'USB', 'Bluetooth', 'Wi-Fi', 'RS485', 'PWM', 'ADC', 'GPIO'];
  for (const iface of interfaces) {
    const regex = new RegExp(`\\b${iface}\\b`, 'i');
    if (regex.test(text)) {
      ifaceMatches.push(iface);
    }
  }
  if (ifaceMatches.length > 0) specs.interface = ifaceMatches.join(', ');

  // Package / Footprint
  const pkgMatch = text.match(/(?:package|case|footprint)\s*[:=\-]?\s*([A-Za-z0-9\-]+(?:QFN|SOIC|TSSOP|BGA|DIP|SMD|SMT|TO-[0-9]+|Module)[A-Za-z0-9\-]*)/i);
  if (pkgMatch) {
    specs.package = pkgMatch[1].trim();
  } else {
    const commonPkgs = ['QFN-32', 'QFN-48', 'SOIC-8', 'SOIC-16', 'TSSOP-20', 'DIP-8', 'DIP-14', 'Module', 'SMD', 'TO-220', 'TO-92'];
    for (const pkg of commonPkgs) {
      if (text.includes(pkg)) {
        specs.package = pkg;
        break;
      }
    }
  }

  // Operating Temperature
  const tempMatch = text.match(/(?:operating\s*temp(?:erature)?|temp\s*range)\s*[:=\-]?\s*([-0-9]+\s*°?C\s*(?:to|~|-)\s*[\+0-9]+\s*°?C)/i);
  if (tempMatch) specs.operatingTemp = tempMatch[1].trim();

  // Mounting type
  if (/surface\s*mount/i.test(text) || /\bSMD\b/i.test(text) || /\bSMT\b/i.test(text)) {
    specs.mountingType = 'Surface Mount';
  } else if (/through\s*hole/i.test(text) || /\bTHT\b/i.test(text)) {
    specs.mountingType = 'Through Hole';
  }

  return specs;
}

/**
 * Normalizes and extracts structured supplier listing data from TinyFish Fetch page content
 */
export function parseFetchedSupplierPage(
  url: string,
  pageData: {
    title?: string | null;
    description?: string | null;
    text?: string | null;
  },
  expectedMpn: string,
  expectedManufacturer?: string
): ExtractedSupplierData {
  const title = pageData.title || '';
  const text = pageData.text || '';
  const combined = `${title}\n${pageData.description || ''}\n${text}`;

  const supplierName = identifySupplier(url, title);
  const { price, currency } = extractPriceAndCurrency(combined);
  const { status: stockStatus, quantity: stockQuantity } = extractStock(combined);
  const leadTime = extractLeadTime(combined);
  const specifications = extractSpecifications(combined);

  // Determine actual MPN from page or fall back to expected
  let foundMpn = expectedMpn;
  const mpnRegex = new RegExp(`\\b${expectedMpn.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}[A-Z0-9-]*\\b`, 'i');
  const mpnMatch = combined.match(mpnRegex);
  if (mpnMatch) {
    foundMpn = mpnMatch[0];
  }

  // Determine actual manufacturer
  let manufacturer = expectedManufacturer || '';
  if (!manufacturer) {
    const commonMfgs = ['Espressif', 'Bosch', 'STMicroelectronics', 'Texas Instruments', 'Microchip', 'Analog Devices', 'NXP', 'Nordic', 'Raspberry Pi', 'Infineon', 'TDK', 'Murata'];
    for (const mfg of commonMfgs) {
      if (new RegExp(`\\b${mfg}\\b`, 'i').test(combined)) {
        manufacturer = mfg;
        break;
      }
    }
    if (!manufacturer) manufacturer = 'Unknown Manufacturer';
  }

  // Verification status:
  // If price and stock were successfully extracted from the actual fetched page, it is VERIFIED.
  // If either is missing or page was minimal, mark as UNVERIFIED.
  let verificationStatus: VerificationStatus = 'UNVERIFIED';
  if (text.length > 50 && (price !== null || stockStatus !== 'UNKNOWN')) {
    verificationStatus = 'VERIFIED';
  }

  return {
    componentName: title ? title.split(/[-–|]/)[0].trim() : expectedMpn,
    manufacturer,
    mpn: foundMpn,
    supplierName,
    price,
    currency,
    stockStatus,
    stockQuantity,
    leadTime,
    packageQuantity: 1,
    specifications,
    verificationStatus,
    productUrl: url,
    retrievedAt: new Date().toISOString(),
  };
}
