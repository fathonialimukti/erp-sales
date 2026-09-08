import { useEffect, useRef } from "react";
import type mermaid from "mermaid";

// Mermaid (~440KB with cytoscape) loads on first diagram render only,
// keeping it out of the eager bundle graph.
let mermaidPromise: Promise<typeof mermaid> | null = null;
function loadMermaid() {
  mermaidPromise ??= import("mermaid").then((m) => {
    m.default.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "strict",
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
    });
    return m.default;
  });
  return mermaidPromise;
}

export function MermaidDiagram({ chart, className }: { chart: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    let cancelled = false;
    el.innerHTML = "";
    void loadMermaid().then((mermaid) =>
      mermaid.render(`mermaid-${Math.random().toString(36).slice(2)}`, chart).then(({ svg }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [chart]);

  return <div ref={ref} className={className} />;
}
