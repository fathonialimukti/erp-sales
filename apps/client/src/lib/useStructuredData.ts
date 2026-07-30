import { useEffect, useId } from 'react';

/**
 * Inject a single JSON-LD structured data block into <head>.
 * Cleans up on unmount. Can be called multiple times per page.
 */
export function useStructuredData(data: Record<string, unknown> | Record<string, unknown>[]) {
  const id = useId();

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = `jsonld-${id}`;
    script.textContent = JSON.stringify(Array.isArray(data) ? data : data);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
    // Serialize to string for stable dependency comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), id]);
}
