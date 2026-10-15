import { getTinyFishConfig, tinyFishRequest } from './client';
import { ExtractedSupplierData, identifySupplier } from './parser';
import { normalizeCurrency } from '../matching/comparer';
import { StockStatus } from '../../../../shared/types';

export interface TinyFishAgentRunResponse {
  run_id: string | null;
  status: 'COMPLETED' | 'FAILED';
  started_at?: string;
  finished_at?: string;
  num_of_steps?: number;
  result?: {
    component_name?: string;
    manufacturer?: string;
    mpn?: string;
    supplier_name?: string;
    price?: number;
    currency?: string;
    stock_status?: string;
    stock_quantity?: number;
    lead_time?: string;
    [key: string]: any;
  } | null;
  error?: {
    code?: string;
    message?: string;
  } | null;
}

/**
 * Runs TinyFish Agent as a targeted fallback when standard Search + Fetch
 * cannot extract essential pricing and stock data due to heavy client-side rendering or interactive paywalls/modals.
 * 
 * Uses structured JSON output according to official TinyFish Agent specification.
 */
export async function runAgentFallback(
  url: string,
  expectedMpn: string,
  expectedManufacturer?: string
): Promise<ExtractedSupplierData | null> {
  const config = getTinyFishConfig();

  const goal = `Navigate to this electronic component listing for MPN "${expectedMpn}". Extract the visible product title, manufacturer, exact manufacturer part number (mpn), supplier name, unit price (numeric number only), currency code (e.g. USD, EUR), stock availability status (such as "In Stock", "Out of Stock", "Backorder"), stock quantity (integer if visible), and lead time.`;

  const outputSchema = {
    type: 'object',
    properties: {
      component_name: { type: 'string' },
      manufacturer: { type: 'string' },
      mpn: { type: 'string' },
      supplier_name: { type: 'string' },
      price: { type: 'number' },
      currency: { type: 'string' },
      stock_status: { type: 'string' },
      stock_quantity: { type: 'number' },
      lead_time: { type: 'string' },
    },
    required: ['price', 'currency', 'stock_status'],
  };

  const requestBody = {
    url,
    goal,
    output_schema: outputSchema,
    browser_profile: 'lite',
    agent_config: {
      max_duration_seconds: 120,
    },
  };

  try {
    const response = await tinyFishRequest<TinyFishAgentRunResponse>(config.agentEndpoint, {
      method: 'POST',
      body: requestBody,
      timeoutMs: 130000,
    });

    if (response.status === 'COMPLETED' && response.result) {
      const res = response.result;
      const supplierName = res.supplier_name || identifySupplier(url);

      let stockStatus: StockStatus = 'UNKNOWN';
      const rawStock = (res.stock_status || '').toLowerCase();
      if (rawStock.includes('out') || rawStock.includes('unavailable')) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (rawStock.includes('backorder')) {
        stockStatus = 'BACKORDER';
      } else if (rawStock.includes('in stock') || rawStock.includes('available')) {
        stockStatus = (res.stock_quantity && res.stock_quantity < 20) ? 'LIMITED_STOCK' : 'IN_STOCK';
      }

      return {
        componentName: res.component_name || expectedMpn,
        manufacturer: res.manufacturer || expectedManufacturer || 'Unknown Manufacturer',
        mpn: res.mpn || expectedMpn,
        supplierName,
        price: typeof res.price === 'number' ? res.price : null,
        currency: normalizeCurrency(res.currency || 'USD'),
        stockStatus,
        stockQuantity: typeof res.stock_quantity === 'number' ? res.stock_quantity : null,
        leadTime: res.lead_time || null,
        packageQuantity: 1,
        specifications: {},
        verificationStatus: 'VERIFIED',
        productUrl: url,
        retrievedAt: new Date().toISOString(),
      };
    }
  } catch (err: any) {
    // Log or return null; caller preserves other supplier listings
    console.warn(`TinyFish Agent fallback failed for ${url}: ${err.message}`);
  }

  return null;
}
