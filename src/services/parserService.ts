import * as cheerio from 'cheerio';
import type { PageMetadata, TocJson, TocItem, ScopedNavigation } from '../types/index.js';

/**
 * Parse metadata from HTML meta tags
 */
export function parseMetadata(html: string): PageMetadata {
  const $ = cheerio.load(html);

  const getMetaContent = (name: string): string => {
    return $(`meta[name="${name}"]`).attr('content') || '';
  };

  const title = $('meta[property="og:title"]').attr('content')
    || $('title').text().replace(' | Microsoft Learn', '').trim()
    || '';

  const description = $('meta[name="description"]').attr('content')
    || $('meta[property="og:description"]').attr('content')
    || '';

  return {
    title,
    description,
    author: getMetaContent('author'),
    msAuthor: getMetaContent('ms.author'),
    msService: getMetaContent('ms.service'),
    msDate: getMetaContent('ms.date'),
    updatedAt: getMetaContent('updated_at'),
    wordCount: getMetaContent('word_count'),
    canonicalUrl: $('link[rel="canonical"]').attr('href') || '',
    tocRel: getMetaContent('toc_rel'),
    breadcrumbPath: getMetaContent('breadcrumb_path'),
  };
}

/**
 * Extract main content HTML from the page
 */
export function extractMainContent(html: string): string {
  const $ = cheerio.load(html);

  // The main content is in <div class="content"> within <main id="main">
  // We need to get the content divs inside the main area
  const mainContent = $('main#main div.content');

  if (mainContent.length === 0) {
    // Fallback to other selectors
    const fallback = $('main article, main .content, #main-content');
    if (fallback.length > 0) {
      return fallback.html() || '';
    }
    return '';
  }

  // Combine all content divs
  let combinedHtml = '';
  mainContent.each((_, el) => {
    combinedHtml += $.html(el);
  });

  return combinedHtml;
}

/**
 * Find current page in TOC and return scoped navigation
 */
export function findCurrentPageInToc(
  toc: TocJson,
  currentPath: string
): ScopedNavigation {
  const result: ScopedNavigation = { siblings: [] };

  // Normalize the current path for comparison
  // currentPath might be /en-us/azure/storage/blobs/storage-blobs-introduction
  // TOC hrefs might be relative like "storage-blobs-introduction" or "./storage-blobs-introduction"
  const currentPageName = currentPath.split('/').pop() || '';

  function searchInItems(items: TocItem[], parent?: TocItem): boolean {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check if this item matches the current page
      const itemHref = item.href?.replace('./', '').split('?')[0] || '';
      const itemPageName = itemHref.split('/').pop() || '';

      if (itemPageName === currentPageName || itemHref === currentPageName) {
        // Found the current page! Get siblings from this level
        if (parent) {
          result.parent = {
            title: parent.toc_title,
            href: parent.href || '',
          };
        }

        // Add siblings (items at the same level)
        for (const sibling of items) {
          const siblingHref = sibling.href?.replace('./', '').split('?')[0] || '';
          const siblingPageName = siblingHref.split('/').pop() || '';

          result.siblings.push({
            title: sibling.toc_title,
            href: sibling.href || '',
            isCurrent: siblingPageName === currentPageName || siblingHref === currentPageName,
          });
        }
        return true;
      }

      // Recursively search in children
      if (item.children && item.children.length > 0) {
        if (searchInItems(item.children, item)) {
          return true;
        }
      }
    }
    return false;
  }

  searchInItems(toc.items);
  return result;
}

/**
 * Extract "In this article" headings from the content
 */
export function extractInArticleToc(html: string): Array<{ level: number; title: string; anchor: string }> {
  const $ = cheerio.load(html);
  const toc: Array<{ level: number; title: string; anchor: string }> = [];

  // Find all h2 and h3 headings in the content
  $('div.content h2, div.content h3').each((_, el) => {
    const $el = $(el);
    const tagName = el.tagName?.toLowerCase() || 'h2';
    const level = parseInt(tagName.charAt(1), 10);
    const title = $el.text().trim();
    const anchor = $el.attr('id') || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    if (title) {
      toc.push({ level, title, anchor });
    }
  });

  return toc;
}
