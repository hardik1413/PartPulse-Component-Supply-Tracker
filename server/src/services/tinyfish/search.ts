import { getTinyFishConfig, tinyFishRequest } from './client';

export interface TinyFishSearchResultItem {
  position?: number;
  site_name?: string;
  title: string;
  snippet?: string;
  url: string;
  date?: string;
}

export interface TinyFishSearchApiResponse {
  query: string;
  results: TinyFishSearchResultItem[];
  total_results: number;
  page: number;
}

export interface SupplierCandidate {
  title: string;
  url: string;
  snippet: string;
  siteName: string;
}

/**
 * Builds a targeted query for electronic component distributors and suppliers
 */
export function buildTargetedSearchQuery(
  mpnOrName: string,
  manufacturer?: string,
  technicalRequirement?: string
): string {
  const parts: string[] = [mpnOrName.trim()];

  if (manufacturer && manufacturer.trim()) {
    parts.push(manufacturer.trim());
  }

  if (technicalRequirement && technicalRequirement.trim()) {
    parts.push(technicalRequirement.trim());
  }

  // Keywords that target distributor inventory and pricing
  parts.push('price in stock electronics distributor');

  return parts.join(' ');
}

/**
 * Executes a web search via TinyFish Search API
 * GET https://api.search.tinyfish.ai
 */
export async function searchTinyFish(
  query: string,
  options: {
    maxResults?: number;
    location?: string;
    language?: string;
  } = {}
): Promise<{
  query: string;
  totalFound: number;
  suppliers: SupplierCandidate[];
}> {
  const config = getTinyFishConfig();
  const maxResults = options.maxResults || 5;

  const params = new URLSearchParams({
    query,
    location: options.location || 'US',
    language: options.language || 'en',
  });

  const fullUrl = `${config.searchEndpoint}?${params.toString()}`;

  const response = await tinyFishRequest<TinyFishSearchApiResponse>(fullUrl, {
    method: 'GET',
    timeoutMs: config.timeoutMs,
  });

  const rawResults = response.results || [];

  // Filter out non-product pages (e.g. forums, generic blog posts without parts)
  const filtered = rawResults.filter((r) => {
    if (!r.url || !r.url.startsWith('http')) return false;
    const urlLower = r.url.toLowerCase();
    // Exclude social networks and pure video sites
    if (urlLower.includes('youtube.com') || urlLower.includes('reddit.com') || urlLower.includes('pinterest.com')) {
      return false;
    }
    return true;
  });

  const suppliers: SupplierCandidate[] = filtered.slice(0, maxResults).map((r) => ({
    title: r.title || 'Untitled Listing',
    url: r.url,
    snippet: r.snippet || '',
    siteName: r.site_name || '',
  }));

  return {
    query: response.query || query,
    totalFound: response.total_results || suppliers.length,
    suppliers,
  };
}
