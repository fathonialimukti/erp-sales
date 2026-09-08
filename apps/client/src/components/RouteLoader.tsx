import { Spinner } from '@/components/ui/spinner';

/**
 * Suspense fallback for lazy route chunks. Grounded, opaque, no layout shift
 * flash — matches the app's light work-surface recipe.
 */
export const RouteLoader = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex min-h-[60vh] w-full items-center justify-center bg-background"
  >
    <Spinner className="size-6 text-muted-foreground" />
  </div>
);
