import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { config } from '../config/index.js';

/**
 * Configure Turndown with custom rules for Microsoft Learn pages
 */
export function configureTurndown(currentPath: string): TurndownService {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  // Add GFM plugin for tables, strikethrough, etc.
  turndownService.use(gfm);

  // Get the base path for resolving relative URLs
  const pathParts = currentPath.split('/');
  pathParts.pop(); // Remove the page name
  const basePath = pathParts.join('/');

  // Custom rule for Azure note/warning/tip boxes
  turndownService.addRule('azureAlerts', {
    filter: (node) => {
      if (node.nodeName !== 'DIV') return false;
      const className = (node as Element).className || '';
      return className.includes('alert') ||
             className.includes('NOTE') ||
             className.includes('TIP') ||
             className.includes('WARNING') ||
             className.includes('IMPORTANT');
    },
    replacement: (content, node) => {
      const className = (node as Element).className || '';
      let noteType = 'NOTE';
      if (className.includes('WARNING') || className.includes('warning')) noteType = 'WARNING';
      else if (className.includes('TIP') || className.includes('tip')) noteType = 'TIP';
      else if (className.includes('IMPORTANT') || className.includes('important')) noteType = 'IMPORTANT';

      const cleanContent = content.trim().replace(/^\*\*Note\*\*:?\s*/i, '').replace(/^\*\*Warning\*\*:?\s*/i, '').replace(/^\*\*Tip\*\*:?\s*/i, '');
      return `\n> **${noteType}**: ${cleanContent}\n\n`;
    },
  });

  // Custom rule for code blocks with language detection
  turndownService.addRule('codeBlocks', {
    filter: ['pre'],
    replacement: (content, node) => {
      const preEl = node as Element;
      const codeEl = preEl.querySelector('code');

      // Try to get language from class
      let lang = '';
      if (codeEl) {
        const codeClass = codeEl.className || '';
        const langMatch = codeClass.match(/language-(\w+)/);
        if (langMatch) {
          lang = langMatch[1];
        }
      }

      // Get the actual code content
      const code = codeEl?.textContent || preEl.textContent || content;
      return `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`;
    },
  });

  // Custom rule for links - rewrite based on data-linktype
  turndownService.addRule('proxyLinks', {
    filter: 'a',
    replacement: (content, node) => {
      const el = node as Element;
      const href = el.getAttribute('href') || '';
      const linkType = el.getAttribute('data-linktype') || '';
      const title = el.getAttribute('title');

      if (!href || href.startsWith('#')) {
        // Keep anchor links as-is
        return title ? `[${content}](${href} "${title}")` : `[${content}](${href})`;
      }

      let newHref = href;

      if (linkType === 'relative-path') {
        // Relative path - resolve against current path and proxy
        // href might be "storage-blobs-overview" or "../common/something"
        if (href.startsWith('/')) {
          newHref = `${config.proxyBaseUrl}${href}`;
        } else if (href.startsWith('../') || href.startsWith('./')) {
          // Resolve relative path
          const resolvedPath = resolvePath(basePath, href);
          newHref = `${config.proxyBaseUrl}${resolvedPath}`;
        } else {
          // Simple relative - same directory
          newHref = `${config.proxyBaseUrl}${basePath}/${href}`;
        }
      } else if (linkType === 'absolute-path') {
        // Absolute path on same domain - proxy it
        if (href.startsWith('/')) {
          newHref = `${config.proxyBaseUrl}${href}`;
        }
      } else if (linkType === 'external') {
        // External link - keep as-is
        newHref = href;
      } else {
        // No linktype - try to determine from href
        if (href.startsWith('http://') || href.startsWith('https://')) {
          // Check if it's a Microsoft Learn URL
          if (href.includes('learn.microsoft.com')) {
            const url = new URL(href);
            newHref = `${config.proxyBaseUrl}${url.pathname}`;
          } else {
            newHref = href;
          }
        } else if (href.startsWith('/')) {
          newHref = `${config.proxyBaseUrl}${href}`;
        } else {
          // Relative path
          newHref = `${config.proxyBaseUrl}${basePath}/${href}`;
        }
      }

      // Clean up any double slashes (except in http://)
      newHref = newHref.replace(/([^:])\/\//g, '$1/');

      return title ? `[${content}](${newHref} "${title}")` : `[${content}](${newHref})`;
    },
  });

  // Handle images
  turndownService.addRule('images', {
    filter: 'img',
    replacement: (content, node) => {
      const el = node as Element;
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || '';

      // Convert relative image URLs to absolute
      let imageSrc = src;
      if (src.startsWith('/')) {
        imageSrc = `${config.microsoftLearnBaseUrl}${src}`;
      } else if (!src.startsWith('http')) {
        imageSrc = `${config.microsoftLearnBaseUrl}${basePath}/${src}`;
      }

      return `![${alt}](${imageSrc})`;
    },
  });

  return turndownService;
}

/**
 * Resolve a relative path against a base path
 */
function resolvePath(basePath: string, relativePath: string): string {
  const baseParts = basePath.split('/').filter(Boolean);
  const relativeParts = relativePath.split('/');

  for (const part of relativeParts) {
    if (part === '..') {
      baseParts.pop();
    } else if (part !== '.' && part !== '') {
      baseParts.push(part);
    }
  }

  return '/' + baseParts.join('/');
}
