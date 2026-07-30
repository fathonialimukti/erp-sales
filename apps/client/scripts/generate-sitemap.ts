/**
 * Generate sitemap.xml for ERP Sales.
 * Run: bun scripts/generate-sitemap.ts
 * Output: dist/sitemap.xml (Vite build output)
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = 'https://erp-sales.app';
const DIST_DIR = resolve(import.meta.dirname, '..', 'dist');

interface SitemapEntry {
  loc: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  hreflang?: { lang: string; href: string }[];
}

const pages: SitemapEntry[] = [
  {
    loc: '/',
    changefreq: 'weekly',
    priority: 1.0,
    hreflang: [
      { lang: 'en', href: `${BASE_URL}/` },
      { lang: 'id', href: `${BASE_URL}/id` },
    ],
  },
  {
    loc: '/login',
    changefreq: 'monthly',
    priority: 0.3,
  },
  {
    loc: '/dashboard',
    changefreq: 'daily',
    priority: 0.7,
  },
  {
    loc: '/reports',
    changefreq: 'daily',
    priority: 0.6,
  },
  // GEO: llms.txt and llms-full.txt for AI/LLM discoverability
  {
    loc: '/llms.txt',
    changefreq: 'monthly',
    priority: 0.4,
  },
  {
    loc: '/llms-full.txt',
    changefreq: 'monthly',
    priority: 0.3,
  },
];

// ── Module index pages ──
const modulePages = [
  'region',
  'area',
  'customer',
  'outlet',
  'sku-category',
  'sku',
  'sales-order',
  'visit-log',
  'action-program',
  'event-proposal',
  'email-crm',
  'knowledge-base',
];

for (const mod of modulePages) {
  pages.push({
    loc: `/${mod}`,
    changefreq: 'daily',
    priority: 0.6,
    hreflang: [
      { lang: 'en', href: `${BASE_URL}/${mod}` },
      { lang: 'id', href: `${BASE_URL}/id/${mod}` },
    ],
  });
}

// ── Generate XML ──
function urlXml(entry: SitemapEntry): string {
  const alternates = (entry.hreflang ?? [])
    .map((hl) => `      <xhtml:link rel="alternate" hreflang="${hl.lang}" href="${hl.href}" />`)
    .join('\n');

  return `  <url>
    <loc>${BASE_URL}${entry.loc}</loc>
    <changefreq>${entry.changefreq ?? 'monthly'}</changefreq>
    <priority>${entry.priority ?? 0.5}</priority>
${alternates ? `    ${alternates}\n` : ''}  </url>`;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${pages.map(urlXml).join('\n')}
</urlset>
`;

// ── Write ──
if (!existsSync(DIST_DIR)) {
  mkdirSync(DIST_DIR, { recursive: true });
}
writeFileSync(resolve(DIST_DIR, 'sitemap.xml'), xml, 'utf-8');
console.log(`✓ sitemap.xml written to dist/ (${pages.length} pages)`);
