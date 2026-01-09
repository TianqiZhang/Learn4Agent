import { config } from '../config/index.js';
import type { TocJson } from '../types/index.js';

/**
 * Fetch a page from Microsoft Learn
 */
export async function fetchPage(path: string): Promise<string> {
  const url = `${config.microsoftLearnBaseUrl}${path}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': config.userAgent,
      'Accept': 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(config.requestTimeout),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Fetch TOC JSON for a page
 * @param basePath - The base path of the current page (e.g., /en-us/azure/storage/blobs)
 * @param tocRel - The relative path to toc.json (from toc_rel meta tag)
 */
export async function fetchToc(basePath: string, tocRel: string): Promise<TocJson | null> {
  try {
    // Construct the TOC URL by resolving the relative path
    // basePath might be /en-us/azure/storage/blobs/storage-blobs-introduction
    // tocRel is usually just "toc.json"
    const pathParts = basePath.split('/');
    pathParts.pop(); // Remove the page filename
    const tocPath = [...pathParts, tocRel].join('/');

    const url = `${config.microsoftLearnBaseUrl}${tocPath}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(config.requestTimeout),
    });

    if (!response.ok) {
      console.warn(`Failed to fetch TOC: ${url} - ${response.status}`);
      return null;
    }

    return await response.json() as TocJson;
  } catch (error) {
    console.warn('Error fetching TOC:', error);
    return null;
  }
}

/**
 * Search Microsoft Learn
 */
export async function searchMicrosoftLearn(query: string): Promise<any[]> {
  const searchUrl = `https://learn.microsoft.com/api/search?search=${encodeURIComponent(query)}&locale=en-us&$top=10`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(config.requestTimeout),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}
