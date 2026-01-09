# Learn4Agent - Microsoft Learn Markdown Proxy

A local proxy server that makes learn.microsoft.com agent-friendly by converting HTML to enhanced markdown.

## Project Purpose

This is a hackathon project demonstrating how to make documentation more accessible to AI agents. The proxy:
1. Intercepts requests to `localhost:3000/en-us/...`
2. Fetches corresponding pages from `learn.microsoft.com`
3. Converts HTML to markdown with YAML frontmatter, scoped navigation, and search instructions
4. Provides a real-time visualization dashboard for demos

## How to Use the Proxy (for agents)

When browsing Microsoft Learn documentation, use the local proxy:

| Instead of | Use |
|------------|-----|
| `https://learn.microsoft.com/en-us/azure/...` | `http://localhost:3000/en-us/azure/...` |
| `https://learn.microsoft.com/en-us/dotnet/...` | `http://localhost:3000/en-us/dotnet/...` |

Start by fetching any doc page. The returned markdown includes instructions for searching.

## Running the Project

```bash
npm install
npm run dev      # Start dev server with hot reload
npm run build    # Build for production
npm start        # Run production build
```

- **Proxy**: http://localhost:3000/en-us/...
- **Dashboard**: http://localhost:3000/dashboard
- **Search API**: http://localhost:3000/api/search?q=...

## Architecture

```
src/
├── index.ts                 # Entry point
├── server.ts                # Express + WebSocket setup
├── config/index.ts          # Configuration (proxy base URL, etc.)
├── routes/
│   ├── proxyRoute.ts        # Main proxy handler (GET /*)
│   └── searchRoute.ts       # Search API (GET /api/search)
├── services/
│   ├── fetchService.ts      # Fetch from learn.microsoft.com + search API
│   ├── parserService.ts     # Extract metadata, TOC, main content
│   └── markdownService.ts   # Generate enhanced markdown
├── utils/
│   └── turndownRules.ts     # Custom Turndown rules for link rewriting
└── types/index.ts           # TypeScript interfaces

public/
├── index.html               # Dashboard HTML
├── styles.css               # Dark VS Code theme
└── dashboard.js             # WebSocket client for real-time updates
```

## Key Design Decisions

1. **Link Rewriting**: All internal links are rewritten to `localhost:3000` using `data-linktype` attribute from Microsoft's HTML
2. **TOC from JSON**: Table of contents is fetched separately from `toc.json`, not embedded in HTML
3. **Scoped Navigation**: Shows sibling pages in "In This Section" to help agents explore
4. **Search Discovery**: Agents learn about search API from the footer of fetched pages (not told upfront)
5. **Dashboard Labels**: Requests are labeled "PAGE" or "SEARCH" to visualize agent browsing behavior
6. **Rendered Preview**: Strips YAML frontmatter and shows H1 title to look like a real page

## Tech Stack

- **Runtime**: Node.js with TypeScript (ES modules)
- **Server**: Express 5 + WebSocket (ws)
- **HTML Parsing**: Cheerio
- **Markdown**: Turndown with GFM plugin (for tables)
- **Dashboard**: Vanilla HTML/CSS/JS with marked.js

## Important Implementation Notes

- Express 5 uses `/*path` syntax for wildcard routes (not `/*`)
- Path params in Express 5 can be arrays - handle with `Array.isArray()`
- GFM plugin required for proper table conversion
- WebSocket broadcasts to dashboard for real-time updates
