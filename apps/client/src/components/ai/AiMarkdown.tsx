import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Shared react-markdown component map — the single source of truth for every
 * AI surface (chat bubbles, report narratives, executive briefs, fix
 * checklists, admin chat).
 *
 * Without it a model-emitted `#` renders at the UA default 2em inside a
 * `text-sm` box and a GFM table renders unstyled, which is what a bare
 * `<ReactMarkdown>` produces.
 */
export const aiMarkdownComponents: Components = {
  h1: ({ children }) => <h1 className="mt-3 mb-1.5 text-[0.9375rem] font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 mb-1.5 text-sm font-bold">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-2 mb-1 text-xs font-semibold">{children}</h3>,
  p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
      {children}
    </a>
  ),
  code: ({ className, children, ...rest }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="rounded bg-muted px-1 py-px font-mono text-[0.75rem]" {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code className={cn("font-mono text-[0.75rem]", className)} {...rest}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      aria-label="Code block"
      className="my-2 overflow-x-auto rounded-lg bg-muted p-2 font-mono text-[0.75rem] whitespace-pre"
    >
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-[0.75rem]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
};

/** Whitelist safe URL protocols. Blocks javascript: / data: / vbscript: URIs. */
export const sanitizeAiUrl = (url: string) => (/^(https?:|mailto:|#)/.test(url) ? url : "#");

export interface AiMarkdownProps {
  /** Raw markdown emitted by the model. */
  children: string;
}

/**
 * `react-markdown` pre-wired with the shared map, GFM tables and URL
 * sanitising. Renders no wrapper of its own — the caller owns the surrounding
 * bubble / panel chrome. Memoised so streaming parents that re-render with an
 * unchanged buffer do not re-parse the AST.
 */
export function AiMarkdown({ children }: AiMarkdownProps) {
  return useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={aiMarkdownComponents}
        urlTransform={sanitizeAiUrl}
      >
        {children}
      </ReactMarkdown>
    ),
    [children],
  );
}
