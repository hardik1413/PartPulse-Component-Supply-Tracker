/**
 * TinyFish API Client
 * Manages authentication, headers, timeouts, and error handling.
 * Never leaks API keys or secrets in logs or responses.
 */

export interface TinyFishConfig {
  apiKey: string;
  searchEndpoint: string;
  fetchEndpoint: string;
  agentEndpoint: string;
  timeoutMs: number;
}

export class TinyFishApiError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public details?: any;

  constructor(message: string, statusCode: number, errorCode?: string, details?: any) {
    super(message);
    this.name = 'TinyFishApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export function getTinyFishConfig(): TinyFishConfig {
  const apiKey = process.env.TINYFISH_API_KEY || '';
  return {
    apiKey,
    searchEndpoint: process.env.TINYFISH_SEARCH_ENDPOINT || 'https://api.search.tinyfish.ai',
    fetchEndpoint: process.env.TINYFISH_FETCH_ENDPOINT || 'https://api.fetch.tinyfish.ai',
    agentEndpoint: process.env.TINYFISH_AGENT_ENDPOINT || 'https://agent.tinyfish.ai/v1/automation/run',
    timeoutMs: Number(process.env.TINYFISH_TIMEOUT_MS) || 45000,
  };
}

/**
 * Validates that TINYFISH_API_KEY is configured before making live API requests.
 */
export function ensureApiKeyConfigured(): string {
  const { apiKey } = getTinyFishConfig();
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_tinyfish_api_key')) {
    throw new TinyFishApiError(
      'TINYFISH_API_KEY is not configured in environment or .env file. Please set TINYFISH_API_KEY to execute real supplier searches.',
      401,
      'API_KEY_MISSING'
    );
  }
  return apiKey.trim();
}

/**
 * Standard HTTP helper with timeout and sanitization
 */
export async function tinyFishRequest<T>(
  url: string,
  options: {
    method?: 'GET' | 'POST';
    body?: any;
    timeoutMs?: number;
    customHeaders?: Record<string, string>;
  } = {}
): Promise<T> {
  const apiKey = ensureApiKeyConfigured();
  const timeoutMs = options.timeoutMs || getTinyFishConfig().timeoutMs;

  const headers: Record<string, string> = {
    'X-API-Key': apiKey,
    Accept: 'application/json',
    ...(options.customHeaders || {}),
  };

  if (options.body && options.method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    const contentType = res.headers.get('content-type') || '';
    let responseData: any = null;

    if (contentType.includes('application/json')) {
      responseData = await res.json();
    } else {
      const text = await res.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { text };
      }
    }

    if (!res.ok) {
      const status = res.status;
      let message = `TinyFish API error (${status})`;
      let code = 'UPSTREAM_ERROR';

      if (status === 400) {
        message = responseData?.message || 'Invalid search parameters or request schema.';
        code = 'INVALID_REQUEST';
      } else if (status === 401) {
        message = 'Unauthorized: Invalid or expired TinyFish API key.';
        code = 'UNAUTHORIZED';
      } else if (status === 402) {
        message = 'Payment Required: TinyFish daily free allowance exhausted or insufficient credits.';
        code = 'INSUFFICIENT_CREDITS';
      } else if (status === 429) {
        message = 'TinyFish rate limit exceeded. Please retry in a few moments.';
        code = 'RATE_LIMITED';
      } else if (status >= 500) {
        message = 'TinyFish service temporarily unavailable. Please retry.';
        code = 'SERVICE_UNAVAILABLE';
      }

      throw new TinyFishApiError(message, status, code, responseData);
    }

    return responseData as T;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new TinyFishApiError(
        `TinyFish API request timed out after ${timeoutMs}ms`,
        504,
        'TIMEOUT'
      );
    }
    if (err instanceof TinyFishApiError) {
      throw err;
    }
    throw new TinyFishApiError(
      `Network error connecting to TinyFish: ${err.message}`,
      502,
      'NETWORK_ERROR'
    );
  }
}
