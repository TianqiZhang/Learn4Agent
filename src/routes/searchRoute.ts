import { Router, type Request, type Response } from 'express';
import { searchMicrosoftLearn } from '../services/fetchService.js';
import { config } from '../config/index.js';
import type { SearchResponse } from '../types/index.js';

export const searchRouter = Router();

searchRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q as string;

  if (!query || query.trim().length < 2) {
    res.status(400).json({
      error: 'Query parameter "q" is required and must be at least 2 characters',
      usage: `GET ${config.proxyBaseUrl}/api/search?q=azure blob storage`,
      example: `curl "${config.proxyBaseUrl}/api/search?q=azure%20blob%20storage"`,
    });
    return;
  }

  try {
    const rawResults = await searchMicrosoftLearn(query.trim());

    const response: SearchResponse = {
      query,
      count: rawResults.length,
      results: rawResults.map((r: any) => {
        // Convert the original URL to a proxy URL
        let proxyUrl = r.url || '';
        if (proxyUrl.includes('learn.microsoft.com')) {
          try {
            const url = new URL(proxyUrl);
            proxyUrl = `${config.proxyBaseUrl}${url.pathname}`;
          } catch {
            // Keep original if URL parsing fails
          }
        }

        return {
          title: r.title || '',
          description: r.description || '',
          originalUrl: r.url || '',
          proxyUrl,
          fetchCommand: `curl "${proxyUrl}"`,
        };
      }),
      hint: 'Use the proxyUrl to fetch enhanced markdown for any result. Example: curl "proxyUrl"',
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Search failed',
      message: errorMessage,
    });
  }
});
