import { useEffect } from 'react';

interface MetaConfig {
  /** Page title appended to " — B2B CRM" */
  title?: string;
  /** Meta description */
  description?: string;
  /** Canonical URL (absolute). If omitted, uses window.location.origin + pathname */
  canonical?: string;
  /** OG / Twitter image URL (absolute). Defaults to /og-image.png */
  image?: string;
  /** Robots content. Defaults to "index, follow" */
  robots?: string;
  /** JSON-LD structured data to inject (will be merged into a single script) */
  jsonLd?: Record<string, unknown>[];
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://erp-sales.app';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'B2B CRM';
const GLOBAL_DESCRIPTION = 'Sales management platform for field teams and back-office. Manage customers, outlets, sales orders, visits, approvals, and real-time insights in one platform.';

/**
 * Declarative hook to set <title>, meta tags, canonical link, and JSON-LD.
 * Cleans up on unmount / re-render. Call once per page component.
 */
export function useMeta(config: MetaConfig = {}) {
  useEffect(() => {
    const { title, description, canonical, image, robots, jsonLd } = config;

    // ── Title ──
    const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
    const prevTitle = document.title;
    document.title = fullTitle;

    // ── Helpers ──
    const setMeta = (selector: string, attr: 'content' | 'href', value: string) => {
      const el = document.head.querySelector<HTMLElement>(selector);
      if (el) el.setAttribute(attr, value);
    };

    const setOrRemoveMeta = (selector: string, attr: 'content' | 'href', value: string | null) => {
      const el = document.head.querySelector<HTMLElement>(selector);
      if (!el) return;
      if (value) el.setAttribute(attr, value);
      else el.removeAttribute(attr);
    };

    // ── Canonical ──
    const canonicalUrl = canonical ?? `${BASE_URL}${window.location.pathname}`;
    setMeta('link[rel="canonical"]', 'href', canonicalUrl);

    // ── Description ──
    const desc = description ?? GLOBAL_DESCRIPTION;
    setMeta('meta[name="description"]', 'content', desc);

    // ── Robots ──
    setOrRemoveMeta('meta[name="robots"]', 'content', robots ?? 'index, follow');

    // ── OG Tags ──
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:image"]', 'content', image ?? DEFAULT_IMAGE);
    setMeta('meta[property="og:site_name"]', 'content', SITE_NAME);

    // ── Twitter Tags ──
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:description"]', 'content', desc);
    setMeta('meta[name="twitter:image"]', 'content', image ?? DEFAULT_IMAGE);

    // ── JSON-LD ──
    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd && jsonLd.length > 0) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.id = 'dynamic-jsonld';
      const payload = jsonLd.length === 1 ? jsonLd[0] : { '@context': 'https://schema.org', '@graph': jsonLd };
      jsonLdScript.textContent = JSON.stringify(payload);
      document.head.appendChild(jsonLdScript);
    }

    // ── Cleanup ──
    return () => {
      document.title = prevTitle;
      if (jsonLdScript) jsonLdScript.remove();
    };
  }, [
    config.title,
    config.description,
    config.canonical,
    config.image,
    config.robots,
    config.jsonLd,
  ]);
}
