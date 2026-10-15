import { getTinyFishConfig, tinyFishRequest } from './client';
import { ExtractedSupplierData, parseFetchedSupplierPage } from './parser';

export interface TinyFishFetchResultItem {
  url: string;
  final_url?: string;
  title: string | null;
  description: string | null;
  text: string | null;
  status_code?: number;
  latency_ms?: number | null;
}

export interface TinyFishFetchErrorItem {
  url: string;
  error_code: string;
  message: string;
}

export interface TinyFishFetchApiResponse {
  results: TinyFishFetchResultItem[];
  errors: TinyFishFetchErrorItem[];
}

/**
 * Fetches page content for supplier URLs via TinyFish Fetch API
 * POST https://api.fetch.tinyfish.ai
 */
export async function fetchSupplierPages(
  urls: string[],
  options: {
    expectedMpn: string;
    expectedManufacturer?: string;
    perUrlTimeoutMs?: number;
  }
): Promise<{
  successful: ExtractedSupplierData[];
  failures: { url: string; error: string }[];
}> {
  if (!urls || urls.length === 0) {
    return { successful: [], failures: [] };
  }

  const config = getTinyFishConfig();
  // TinyFish Fetch supports up to 10 URLs per request
  const cleanUrls = urls.slice(0, 10);

  const requestBody = {
    urls: cleanUrls,
    format: 'markdown',
    per_url_timeout_ms: options.perUrlTimeoutMs || 35000,
  };

  const response = await tinyFishRequest<TinyFishFetchApiResponse>(config.fetchEndpoint, {
    method: 'POST',
    body: requestBody,
    timeoutMs: config.timeoutMs,
  });

  const successful: ExtractedSupplierData[] = [];
  const failures: { url: string; error: string }[] = [];

  // Parse successful results
  for (const item of response.results || []) {
    try {
      const parsed = parseFetchedSupplierPage(
        item.final_url || item.url,
        {
          title: item.title,
          description: item.description,
          text: typeof item.text === 'string' ? item.text : JSON.stringify(item.text || ''),
        },
        options.expectedMpn,
        options.expectedManufacturer
      );
      successful.push(parsed);
    } catch (parseErr: any) {
      failures.push({
        url: item.url,
        error: `Failed to parse extracted page content: ${parseErr.message}`,
      });
    }
  }

  // Preserve errors from partial supplier failures
  for (const err of response.errors || []) {
    failures.push({
      url: err.url,
      error: `Supplier fetch failed (${err.error_code}): ${err.message}`,
    });
  }

  return { successful, failures };
}
