/**
 * Brave Search API client service.
 * 
 * Handles all interactions with the Brave Search API including:
 * - API key management (environment variable)
 * - Request parameter construction
 * - HTTP request execution
 * - Rate limit handling with automatic retry
 * - Error handling with user-friendly messages
 */

import { WebSearchApiResponse, IBraveWebSearchParams } from '../types/index.js';

/**
 * Brave Search API base URL
 */
const BRAVE_API_BASE_URL = 'https://api.search.brave.com';

/**
 * Brave Search web search endpoint path
 */
const WEB_SEARCH_PATH = '/res/v1/web/search';

/**
 * Rate limit retry configuration
 */
const RATE_LIMIT_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 1100,  // Slightly over 1 second to account for timing variance
  maxDelayMs: 10000,
};

/**
 * Delays execution for a specified duration.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets the Brave API key from the BRAVE_API_KEY environment variable.
 * 
 * @returns API key or empty string if not configured
 */
export function getBraveApiKey(): string {
  return process.env.BRAVE_API_KEY || '';
}

/**
 * Validates that a Goggle URL uses HTTPS protocol.
 * 
 * @param url - URL to validate
 * @returns True if URL is valid HTTPS, false otherwise
 */
function isValidGoggleURL(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Builds URL query parameters from search parameters.
 * Handles special cases for arrays, goggles, result_filter, and summary.
 * 
 * @param params - Search parameters from tool input
 * @returns URLSearchParams ready for API request
 */
function buildQueryParams(params: IBraveWebSearchParams): URLSearchParams {
  const queryParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    
    // Handle result_filter with special behavior for summary parameter
    if (key === 'result_filter') {
      if (params.summary === true) {
        // When summary is enabled, only include 'summarizer' in result_filter
        queryParams.set(key, 'summarizer');
      } else if (Array.isArray(value) && value.length > 0) {
        queryParams.set(key, value.join(','));
      }
      continue;
    }
    
    // Handle goggles parameter - validate HTTPS URLs
    if (key === 'goggles') {
      if (typeof value === 'string') {
        queryParams.set(key, value);
      } else if (Array.isArray(value)) {
        for (const url of value.filter(isValidGoggleURL)) {
          queryParams.append(key, url);
        }
      }
      continue;
    }
    
    // Map 'query' to 'q' parameter name for API
    const paramName = key === 'query' ? 'q' : key;
    queryParams.set(paramName, value.toString());
  }
  
  return queryParams;
}

/**
 * Issues a web search request to the Brave Search API.
 * Automatically retries on rate limit (429) with exponential backoff.
 * 
 * @param params - Search parameters
 * @returns Promise resolving to the API response
 * @throws Error if API key is not configured or request fails after retries
 */
export async function issueWebSearchRequest(
  params: IBraveWebSearchParams
): Promise<WebSearchApiResponse> {
  // Get API key
  const apiKey = getBraveApiKey();
  
  if (!apiKey) {
    throw new Error(
      'Brave Search API key not configured. ' +
      'Please set the BRAVE_API_KEY environment variable. ' +
      'Get an API key at https://brave.com/search/api/'
    );
  }
  
  // Build URL with query parameters
  const queryParams = buildQueryParams(params);
  const url = `${BRAVE_API_BASE_URL}${WEB_SEARCH_PATH}?${queryParams.toString()}`;
  
  // Set request headers
  const headers = {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
    'X-Subscription-Token': apiKey,
  };
  
  // Retry loop for rate limiting
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= RATE_LIMIT_CONFIG.maxRetries; attempt++) {
    // Issue request
    const response = await fetch(url, { headers });
    
    // Success - parse and return
    if (response.ok) {
      const responseBody = await response.json();
      return responseBody as WebSearchApiResponse;
    }
    
    // Rate limited (429) - retry with backoff
    if (response.status === 429 && attempt < RATE_LIMIT_CONFIG.maxRetries) {
      // Check for Retry-After header
      const retryAfter = response.headers.get('Retry-After');
      let waitMs: number;
      
      if (retryAfter) {
        // Retry-After can be seconds or HTTP date
        const retrySeconds = parseInt(retryAfter, 10);
        waitMs = isNaN(retrySeconds) 
          ? RATE_LIMIT_CONFIG.baseDelayMs 
          : retrySeconds * 1000;
      } else {
        // Exponential backoff: 1.1s, 2.2s, 4.4s, 8.8s...
        waitMs = Math.min(
          RATE_LIMIT_CONFIG.baseDelayMs * Math.pow(2, attempt),
          RATE_LIMIT_CONFIG.maxDelayMs
        );
      }
      
      await delay(waitMs);
      continue;
    }
    
    // Other error - capture and break
    let errorMessage = `Brave Search API error: ${response.status} ${response.statusText}`;
    
    try {
      const errorBody = await response.json();
      errorMessage += `\n${JSON.stringify(errorBody, null, 2)}`;
    } catch {
      try {
        const errorText = await response.text();
        errorMessage += `\n${errorText}`;
      } catch {
        // Ignore parse errors
      }
    }
    
    lastError = new Error(errorMessage);
    break;
  }
  
  // Exhausted retries or non-retryable error
  throw lastError ?? new Error('Brave Search API request failed after retries');
}
