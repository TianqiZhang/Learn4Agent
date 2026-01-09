import { Router, type Request, type Response, type NextFunction } from 'express';
import { fetchPage, fetchToc } from '../services/fetchService.js';
import { parseMetadata, extractMainContent, findCurrentPageInToc } from '../services/parserService.js';
import { generateEnhancedMarkdown } from '../services/markdownService.js';
import type { RequestLogEntry } from '../types/index.js';

export const proxyRouter = Router();

// Generate unique ID for requests
function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Express 5 uses named wildcard parameters - *name captures all segments as an array
proxyRouter.get('/*path', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const requestId = generateId();
  const startTime = Date.now();
  // In Express 5, the wildcard captures path segments - can be string or array
  const pathParam = req.params.path;
  const pathSegments = Array.isArray(pathParam) ? pathParam : [pathParam || ''];
  const path = '/' + pathSegments.join('/');

  // Skip non-documentation paths
  if (!path.startsWith('/en-us/') && !path.startsWith('/en-US/')) {
    res.status(404).send(`Not found. Use paths like /en-us/azure/storage/blobs/storage-blobs-introduction

Example:
  curl http://localhost:3000/en-us/azure/storage/blobs/storage-blobs-introduction
`);
    return;
  }

  // Get broadcast function from app
  const broadcast = req.app.broadcast;

  // Broadcast request started
  const pendingEntry: RequestLogEntry = {
    id: requestId,
    timestamp: new Date(),
    path,
    originalUrl: `https://learn.microsoft.com${path}`,
    status: 'pending',
  };

  broadcast({
    type: 'request_started',
    payload: pendingEntry,
  });

  try {
    // Fetch the page from Microsoft Learn
    const html = await fetchPage(path);

    // Parse metadata
    const metadata = parseMetadata(html);

    // Extract main content
    const mainContent = extractMainContent(html);

    // Fetch and parse TOC for scoped navigation
    let scopedNav = { siblings: [] as Array<{ title: string; href: string; isCurrent: boolean }> };
    if (metadata.tocRel) {
      const tocJson = await fetchToc(path, metadata.tocRel);
      if (tocJson) {
        scopedNav = findCurrentPageInToc(tocJson, path);
      }
    }

    // Generate enhanced markdown
    const markdown = generateEnhancedMarkdown({
      htmlContent: mainContent,
      metadata,
      scopedNav,
      currentPath: path,
    });

    const processingTimeMs = Date.now() - startTime;

    // Broadcast success
    broadcast({
      type: 'request_completed',
      payload: {
        id: requestId,
        timestamp: new Date(),
        path,
        originalUrl: `https://learn.microsoft.com${path}`,
        status: 'success',
        processingTimeMs,
        markdown,
        metadata,
      },
    });

    // Return markdown
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(markdown);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Broadcast error
    broadcast({
      type: 'request_error',
      payload: {
        id: requestId,
        timestamp: new Date(),
        path,
        originalUrl: `https://learn.microsoft.com${path}`,
        status: 'error',
        error: errorMessage,
      },
    });

    next(error);
  }
});
