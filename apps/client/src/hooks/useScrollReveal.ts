import { useRef, useEffect, useCallback } from 'react';

interface UseScrollRevealOptions {
  /** IntersectionObserver threshold (default 0.15) */
  threshold?: number;
  /** IntersectionObserver rootMargin (default '0px 0px -40px 0px') */
  rootMargin?: string;
  /** CSS class to add when element enters viewport (default 'is-revealed') */
  revealedClass?: string;
}

/**
 * Adds a CSS class when an element enters the viewport via IntersectionObserver.
 * Respects `prefers-reduced-motion` — immediately reveals all elements if set.
 */
export const useScrollReveal = <T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {},
) => {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -40px 0px',
    revealedClass = 'is-revealed',
  } = options;

  const elementRef = useRef<T | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: T | null) => {
      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node) return;
      elementRef.current = node;

      // Respect prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        node.classList.add(revealedClass);
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add(revealedClass);
              observerRef.current?.unobserve(entry.target);
            }
          }
        },
        { threshold, rootMargin },
      );

      observerRef.current.observe(node);
    },
    [threshold, rootMargin, revealedClass],
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return ref;
};