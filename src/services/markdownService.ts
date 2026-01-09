import { configureTurndown } from '../utils/turndownRules.js';
import { config } from '../config/index.js';
import type { PageMetadata, ScopedNavigation } from '../types/index.js';

interface GenerateMarkdownOptions {
  htmlContent: string;
  metadata: PageMetadata;
  scopedNav: ScopedNavigation;
  currentPath: string;
}

/**
 * Generate enhanced markdown from HTML content
 */
export function generateEnhancedMarkdown(options: GenerateMarkdownOptions): string {
  const { htmlContent, metadata, scopedNav, currentPath } = options;

  // Configure Turndown with custom rules
  const turndownService = configureTurndown(currentPath);

  // Convert HTML to markdown
  const bodyMarkdown = turndownService.turndown(htmlContent);

  // Build all sections
  const frontmatter = buildFrontmatter(metadata);
  const scopedNavSection = buildScopedNavigation(scopedNav, currentPath);
  const searchFooter = buildSearchFooter();

  // Assemble final markdown (removed inArticleToc - not useful for agents)
  const sections = [
    frontmatter,
    scopedNavSection,
    '---',
    '',
    bodyMarkdown,
    '',
    '---',
    '',
    searchFooter,
  ].filter(Boolean);

  return sections.join('\n');
}

/**
 * Build YAML frontmatter
 */
function buildFrontmatter(metadata: PageMetadata): string {
  const lines = ['---'];

  lines.push(`title: "${escapeYaml(metadata.title)}"`);

  if (metadata.description) {
    lines.push(`description: "${escapeYaml(metadata.description)}"`);
  }

  if (metadata.msService) {
    lines.push(`ms_service: ${metadata.msService}`);
  }

  if (metadata.msDate) {
    // Parse and format the date
    const dateStr = metadata.msDate.split('T')[0];
    lines.push(`ms_date: ${dateStr}`);
  }

  if (metadata.updatedAt) {
    const updatedStr = metadata.updatedAt.split('T')[0];
    lines.push(`updated_at: ${updatedStr}`);
  }

  if (metadata.author) {
    lines.push(`author: ${metadata.author}`);
  }

  if (metadata.wordCount) {
    lines.push(`word_count: ${metadata.wordCount}`);
  }

  if (metadata.canonicalUrl) {
    lines.push(`canonical_url: ${metadata.canonicalUrl}`);
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Build scoped navigation section showing sibling pages
 */
function buildScopedNavigation(scopedNav: ScopedNavigation, currentPath: string): string {
  if (scopedNav.siblings.length === 0) {
    return '';
  }

  const lines = ['', '## In This Section'];

  if (scopedNav.parent) {
    lines.push(`**Section**: ${scopedNav.parent.title}`);
    lines.push('');
  }

  // Get the base path for constructing URLs
  const pathParts = currentPath.split('/');
  pathParts.pop();
  const basePath = pathParts.join('/');

  for (const sibling of scopedNav.siblings) {
    if (sibling.isCurrent) {
      lines.push(`- **${sibling.title}** (current)`);
    } else {
      // Construct proxy URL
      let href = sibling.href;
      if (href && !href.startsWith('http') && !href.startsWith('/')) {
        // Relative href - resolve it
        href = `${config.proxyBaseUrl}${basePath}/${href.replace('./', '')}`;
      } else if (href && href.startsWith('/')) {
        href = `${config.proxyBaseUrl}${href}`;
      }

      // Remove query parameters for cleaner URLs
      if (href) {
        href = href.split('?')[0];
      }

      lines.push(`- [${sibling.title}](${href || '#'})`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Build search instruction footer
 */
function buildSearchFooter(): string {
  return `## Need More Information?

To search for more Microsoft Learn pages, use:

\`\`\`
GET ${config.proxyBaseUrl}/api/search?q={your search query}
\`\`\`

Example: \`curl "${config.proxyBaseUrl}/api/search?q=azure%20blob%20upload"\`
`;
}

/**
 * Escape special characters for YAML strings
 */
function escapeYaml(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .trim();
}
