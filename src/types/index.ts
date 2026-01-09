// Metadata extracted from Microsoft Learn pages
export interface PageMetadata {
  title: string;
  description: string;
  author: string;
  msAuthor: string;
  msService: string;
  msDate: string;
  updatedAt: string;
  wordCount: string;
  canonicalUrl: string;
  tocRel: string;
  breadcrumbPath: string;
}

// Table of contents entry from toc.json
export interface TocItem {
  href?: string;
  toc_title: string;
  children?: TocItem[];
  expanded?: boolean;
}

export interface TocJson {
  items: TocItem[];
}

// Scoped navigation for current page
export interface ScopedNavigation {
  parent?: { title: string; href: string };
  siblings: Array<{ title: string; href: string; isCurrent: boolean }>;
}

// Request log entry for dashboard
export interface RequestLogEntry {
  id: string;
  timestamp: Date;
  path: string;
  originalUrl: string;
  status: 'pending' | 'success' | 'error';
  processingTimeMs?: number;
  markdown?: string;
  metadata?: PageMetadata;
  error?: string;
}

// WebSocket message types
export type WsMessageType = 'request_started' | 'request_completed' | 'request_error';

export interface WsMessage {
  type: WsMessageType;
  payload: RequestLogEntry;
}

// Search result from Microsoft Learn API
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  proxyUrl: string;
}

export interface SearchResponse {
  query: string;
  count: number;
  results: Array<{
    title: string;
    description: string;
    originalUrl: string;
    proxyUrl: string;
    fetchCommand: string;
  }>;
  hint: string;
}
