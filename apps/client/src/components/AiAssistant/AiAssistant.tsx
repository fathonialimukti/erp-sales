import { Loader2, Maximize2, Minimize2, Send, Sparkles, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { useIntl } from 'react-intl';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useAtomValue, useSetAtom } from 'jotai';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UIMessage } from 'ai';
import { useNavigate } from 'react-router';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiFormFillAtom, authUserAtom } from '../../lib/atoms';

const ROUTE_ALIASES: Record<string, string> = {
  '/': '/dashboard',
  '/sku': '/skus',
  '/sku/new': '/skus/new',
  '/sku/create': '/skus/new',
  '/warehouses': '/warehouse',
  '/warehouses/new': '/warehouse/new',
  '/users/create': '/users/new',
  '/roles': '/access-control/roles',
  '/roles/new': '/access-control/roles/new',
  '/access-control': '/access-control/roles',
  '/stock-movements': '/stock-movement',
  '/receiving-transactions': '/inbound-transaction',
  '/receiving-transactions/new': '/inbound-transaction/receiving/new',
  '/shipments': '/outbound-transaction',
  '/shipments/new': '/outbound-transaction/shipment/new',
  '/disposals': '/outbound-transaction',
  '/disposals/new': '/outbound-transaction/disposal/new',
  '/loss-transactions': '/outbound-transaction',
  '/loss-transactions/new': '/outbound-transaction/loss/new',
  '/found-transactions': '/inbound-transaction',
  '/found-transactions/new': '/inbound-transaction/found/new',
  '/rma-receipts': '/inbound-transaction',
  '/rma-receipts/new': '/inbound-transaction/rma-receipt/new',
  '/wip-completions': '/inbound-transaction',
  '/wip-completions/new': '/inbound-transaction/wip-completion/new',
  '/wip-issues': '/outbound-transaction',
  '/wip-issues/new': '/outbound-transaction/wip-issue/new',
  '/return-to-supplier': '/outbound-transaction',
  '/return-to-supplier/new': '/outbound-transaction/return-to-supplier/new',
};

const normalizeRoutePath = (path: string) => {
  const trimmedPath = path.trim();
  return ROUTE_ALIASES[trimmedPath] ?? trimmedPath;
};

/**
 * Custom fetch wrapper that fixes a compatibility issue with local OpenAI-compatible models:
 * these models call tools correctly but emit `finishReason: "other"` instead of "tool-calls",
 * so the AI SDK never emits `tool-input-available` — leaving tool parts stuck in `input-streaming`
 * and `onToolCall` never fires.
 *
 * This transform intercepts the SSE stream, buffers `tool-input-delta` text per toolCallId,
 * and injects a synthetic `tool-input-available` event before each `finish-step` so the SDK
 * transitions tool parts to `input-available` and fires `onToolCall` normally.
 */
const createPatchedFetch = (): typeof fetch => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await window.fetch(input, init);
    // Only patch POST streaming responses — pass GET/HEAD/204 through untouched.
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method !== 'POST' || !response.body || response.status === 204) return response;

    type ToolBuf = { toolName: string; inputText: string };
    const buffers = new Map<string, ToolBuf>();
    let partial = '';

    const patchedBody = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, ctrl) {
          partial += new TextDecoder().decode(chunk);
          const lines = partial.split('\n');
          partial = lines.pop() ?? '';

          const out: string[] = [];

          for (const line of lines) {
            // Check if this is a finish-step — inject tool-input-available BEFORE it
            const isFinishStep = line.startsWith('data: ') && (() => {
              try {
                const ev = JSON.parse(line.slice(6).trim()) as Record<string, unknown>;
                return ev.type === 'finish-step';
              } catch { return false; }
            })();

            if (isFinishStep && buffers.size > 0) {
              for (const [toolCallId, buf] of buffers) {
                try {
                  const toolInput = JSON.parse(buf.inputText) as unknown;
                  const injected = JSON.stringify({ type: 'tool-input-available', toolCallId, toolName: buf.toolName, input: toolInput });
                  out.push(`data: ${injected}`);
                  out.push('');
                  console.log('[AI] injected tool-input-available for', toolCallId, buf.toolName, toolInput);
                } catch {
                  // incomplete / invalid JSON — skip injection for this tool
                }
              }
              buffers.clear();
            }

            out.push(line);

            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;

            let ev: Record<string, unknown>;
            try { ev = JSON.parse(raw) as Record<string, unknown>; } catch { continue; }

            if (ev.type === 'tool-input-start') {
              buffers.set(String(ev.toolCallId), { toolName: String(ev.toolName ?? ''), inputText: '' });
            } else if (ev.type === 'tool-input-delta') {
              const b = buffers.get(String(ev.toolCallId));
              if (b) b.inputText += String(ev.inputTextDelta ?? '');
            }
          }

          if (out.length > 0) {
            ctrl.enqueue(new TextEncoder().encode(out.join('\n') + '\n'));
          }
        },
        flush(ctrl) {
          if (partial) ctrl.enqueue(new TextEncoder().encode(partial));
        },
      }),
    );

    return new Response(patchedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
};

const parseToolInputJson = (value: unknown): unknown => {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
};

const resolveToolInput = (part: Record<string, unknown>): unknown => {
  const direct = part.input;
  if (direct && typeof direct === 'object') return direct;

  const parsedFromInput = parseToolInputJson(direct);
  if (parsedFromInput && typeof parsedFromInput === 'object') return parsedFromInput;

  const parsedFromInputText = parseToolInputJson(part.inputText);
  if (parsedFromInputText && typeof parsedFromInputText === 'object') return parsedFromInputText;

  return direct;
};

const markdownComponents: Components = {
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
      <code className={cn('font-mono text-[0.75rem]', className)} {...rest}>
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

// Whitelist safe URL protocols. Blocks javascript: / data: / vbscript: URIs.
const sanitizeUrl = (url: string) => (/^(https?:|mailto:|#)/.test(url) ? url : '#');

function MarkdownBubble({ text }: { text: string }) {
  // useMemo skips re-parsing the AST on parent re-renders that don't change the text
  // (e.g., status flips from 'streaming' to 'submitted' with the same buffer).
  const rendered = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
        urlTransform={sanitizeUrl}
      >
        {text}
      </ReactMarkdown>
    ),
    [text],
  );
  return <div className="text-[0.8125rem] leading-relaxed text-foreground">{rendered}</div>;
}

// Metadata for rendering tool activity chips
const TOOL_META: Record<string, { label: string }> = {
  navigateTo: { label: 'Navigate' },
  fillFormFields: { label: 'Fill form' },
  getPageContext: { label: 'Read page' },
  queryDatabase: { label: 'Query DB' },
};

function ToolChip({ toolName, part }: { toolName: string; part: Record<string, unknown> }) {
  const meta = TOOL_META[toolName] ?? { label: toolName };
  const state = String(part.state ?? 'input-available');
  const input = part.input as Record<string, unknown> | undefined;

  let detail = '';
  if (toolName === 'fillFormFields' && input?.fields) {
    const count = Object.keys(input.fields as Record<string, unknown>).length;
    detail = ` (${count} field${count !== 1 ? 's' : ''})`;
  }

  const variant =
    state === 'output-available'
      ? 'default'
      : state === 'output-error'
        ? 'destructive'
        : state === 'input-streaming'
          ? 'outline'
          : 'secondary';

  const prefix =
    state === 'output-available'
      ? '✓ '
      : state === 'output-error'
        ? '✗ '
        : state === 'input-streaming'
          ? ''
          : '… ';

  const labelText =
    state === 'input-streaming' ? `${meta.label}…` : `${prefix}${meta.label}${detail}`;

  return (
    <Badge variant={variant} className="max-w-full truncate font-normal">
      {labelText}
    </Badge>
  );
}

/** Scrape all [data-ai-context] annotations from the current DOM into a JSON string. */
const collectPageContext = (): string => {
  const route = window.location.pathname;
  const heading = document.querySelector('h1')?.textContent?.trim() ?? '';
  const browserTitle = document.title.replace(/\s*[|–-].*$/, '').trim();
  const title = heading || browserTitle;
  const visibleButtons = Array.from(document.querySelectorAll('button'))
    .map(btn => btn.textContent?.trim() ?? '')
    .filter(Boolean)
    .slice(0, 8);
  const tableCount = document.querySelectorAll('table,[role="table"]').length;
  const inputCount = document.querySelectorAll('input:not([type=hidden]),textarea,select').length;
  const sections: unknown[] = [];

  document.querySelectorAll('[data-ai-context]').forEach(el => {
    const raw = el.getAttribute('data-ai-context');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      sections.push(parsed);
    } catch {
      // skip malformed attribute
    }
  });

  // Scrape SelectSearch dropdown options exposed via data-ai-select-options
  const selectOptions: Record<string, unknown[]> = {};
  document.querySelectorAll('[data-ai-select-options]').forEach(el => {
    const name = el.getAttribute('data-ai-select-options');
    const raw = el.textContent?.trim();
    if (name && raw) {
      try { selectOptions[name] = JSON.parse(raw) as unknown[]; } catch { /* skip */ }
    }
  });

  return JSON.stringify({
    route,
    title,
    heading: heading || null,
    browserTitle,
    quickStats: {
      tableCount,
      inputCount,
      visibleButtonCount: visibleButtons.length,
    },
    visibleButtons,
    sections,
    ...(Object.keys(selectOptions).length > 0 ? { selectOptions } : {}),
  });
};

export const AiAssistant = () => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const navigate = useNavigate();
  const setFormFill = useSetAtom(aiFormFillAtom);
  // Tracks toolCallIds already executed to prevent double-firing (Strict Mode / multiple effects)
  const handledToolCallsRef = useRef(new Set<string>());
  // Tracks pending async tool calls (like queryDatabase) to prevent premature auto-send
  const pendingToolCallsRef = useRef(new Set<string>());
  const [, setPendingToolCallsVersion] = useState(0);
  // Sentinel element at the bottom of the messages list for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const user = useAtomValue(authUserAtom);
  const chatId = user?.id ? `ai-chat-${user.id}` : 'ai-chat-anon';

  // Lazy-init: read once from localStorage so useChat gets stable initialMessages
  const [initialMessages] = useState<UIMessage[]>(() => {
    try {
      const stored = localStorage.getItem(chatId);
      return stored ? (JSON.parse(stored) as UIMessage[]) : [];
    } catch {
      return [];
    }
  });

  const { messages, sendMessage, setMessages, status, error, addToolOutput } = useChat({
    id: chatId,
    messages: initialMessages,
    // resume: automatically reconnects to any active server-side stream on mount.
    // The GET /api/ai/chat/:id/stream endpoint returns 204 when no stream is active,
    // which the SDK handles gracefully (falls back to localStorage messages).
    // To enable full persistence across server restarts, configure Redis + resumable-stream
    // on the server side and implement consumeSseStream in the POST handler.
    resume: true,
    transport: new DefaultChatTransport({
      api: 'http://localhost:10022/api/ai/chat',
      credentials: 'include',
      // Patches SSE stream to inject missing tool-input-available events from
      // local models that emit finishReason:"other" instead of "tool-calls".
      fetch: createPatchedFetch(),
      // Send chat id with every message so the server can track the active stream.
      prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
        body: { id, messages: msgs },
      }),
      // Point the resume GET request at our Express resume endpoint.
      prepareReconnectToStreamRequest: ({ id }) => ({
        api: `http://localhost:10022/api/ai/chat/${id}/stream`,
        credentials: 'include' as RequestCredentials,
      }),
    }),
    sendAutomaticallyWhen: (messages) => {
      // Block auto-send while any async tool call (like queryDatabase) is still pending
      if (pendingToolCallsRef.current.size > 0) return false;
      return lastAssistantMessageIsCompleteWithToolCalls(messages);
    },
    // Execute ALL tools (dynamic and typed) directly in onToolCall — NOT in useEffect.
    // sendAutomaticallyWhen is checked immediately after this callback resolves.
    // If we defer to useEffect, the predicate fires before the output is registered
    // and the next step never triggers, breaking multi-step chains (navigate → fill).
    onToolCall: ({ toolCall }) => {
      // String(toolCall.toolName) works for both dynamic (string) and typed (literal union) tools.
      const toolName = String(toolCall.toolName);
      console.log('[AI] onToolCall', toolName, toolCall.toolCallId, 'dynamic:', toolCall.dynamic);
      runTool(toolName, toolCall.toolCallId, toolCall.input as unknown);
    },
  });

  // runTool is defined as a stable function via useCallback-equivalent pattern.
  // It must not close over stale addToolOutput — since it's called from inside useEffect
  // which always has the latest closure, this is safe.
  const runTool = (toolName: string, toolCallId: string, toolInput: unknown) => {
    const alreadyHandled = handledToolCallsRef.current.has(toolCallId);
    if (alreadyHandled) {
      console.log('[AI] dedup skip side-effects for', toolCallId);
    } else {
      handledToolCallsRef.current.add(toolCallId);
      console.log('[AI] runTool', toolName, toolCallId, toolInput);
    }

    if (toolName === 'navigateTo') {
      if (!toolInput || typeof toolInput !== 'object') {
        if (!alreadyHandled) addToolOutput({ tool: 'navigateTo', toolCallId, output: 'No input provided' });
        return;
      }
      const { path } = toolInput as { path: string };
      if (!path) {
        if (!alreadyHandled) addToolOutput({ tool: 'navigateTo', toolCallId, output: 'No path provided' });
        return;
      }
      const resolved = normalizeRoutePath(String(path));
      if (!alreadyHandled) {
        console.log('[AI] navigate →', resolved);
        void navigate(resolved);
      }
      addToolOutput({ tool: 'navigateTo', toolCallId, output: `Navigated to ${resolved}` });
      return;
    }
    if (toolName === 'fillFormFields') {
      if (!toolInput || typeof toolInput !== 'object') {
        if (!alreadyHandled) addToolOutput({ tool: 'fillFormFields', toolCallId, output: 'No input provided' });
        return;
      }
      const { fields } = toolInput as { fields: Record<string, unknown> };
      if (!fields || typeof fields !== 'object') {
        if (!alreadyHandled) addToolOutput({ tool: 'fillFormFields', toolCallId, output: 'No fields provided' });
        return;
      }
      if (!alreadyHandled) setFormFill(fields);
      addToolOutput({ tool: 'fillFormFields', toolCallId, output: `Filled ${Object.keys(fields).length} field(s)` });
      return;
    }
    if (toolName === 'getPageContext') {
      if (!alreadyHandled) {
        const context = collectPageContext();
        addToolOutput({ tool: 'getPageContext', toolCallId, output: context });
      } else {
        // Even on dedup, deliver output so the server doesn't get MissingToolResultsError
        addToolOutput({ tool: 'getPageContext', toolCallId, output: collectPageContext() });
      }
      return;
    }
    if (toolName === 'queryDatabase') {
      if (!toolInput || typeof toolInput !== 'object') {
        if (!alreadyHandled) addToolOutput({ tool: 'queryDatabase', toolCallId, output: JSON.stringify({ error: 'No input' }) });
        return;
      }
      const { sql, limit = 100 } = toolInput as { sql?: string; limit?: number };
      if (!sql) {
        if (!alreadyHandled) addToolOutput({ tool: 'queryDatabase', toolCallId, output: JSON.stringify({ error: 'No SQL provided' }) });
        return;
      }

      if (alreadyHandled) {
        // Already executing — still deliver output (async tools send output when done)
        return;
      }

      // Track this as a pending async call to block premature auto-send
      pendingToolCallsRef.current.add(toolCallId);
      setPendingToolCallsVersion(v => v + 1);

      // Call the server endpoint to execute the query
      fetch('http://localhost:10022/api/ai/query', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, limit }),
      })
        .then(res => res.json())
        .then(result => {
          pendingToolCallsRef.current.delete(toolCallId);
          const output = JSON.stringify(result);
          addToolOutput({ tool: 'queryDatabase', toolCallId, output });
          setPendingToolCallsVersion(v => v + 1);
        })
        .catch(err => {
          pendingToolCallsRef.current.delete(toolCallId);
          addToolOutput({
            tool: 'queryDatabase',
            toolCallId,
            output: JSON.stringify({
              error: 'Query failed',
              message: err instanceof Error ? err.message : 'Unknown error',
            }),
          });
          setPendingToolCallsVersion(v => v + 1);
         });
      return;
    }

    if (toolName === 'summarizeCurrentPage') {
      if (alreadyHandled) return;

      const context = collectPageContext();
      pendingToolCallsRef.current.add(toolCallId);
      setPendingToolCallsVersion(v => v + 1);

      fetch('http://localhost:10022/api/ai/summarize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: (context as any).section ?? 'unknown', contextJson: JSON.stringify(context) }),
      })
        .then(async res => {
          if (!res.ok) throw new Error('Summarize failed');
          const reader = res.body?.getReader();
          if (!reader) throw new Error('No response body');
          const decoder = new TextDecoder();
          let accumulated = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
          }
          pendingToolCallsRef.current.delete(toolCallId);
          addToolOutput({ tool: 'summarizeCurrentPage', toolCallId, output: accumulated });
          setPendingToolCallsVersion(v => v + 1);
        })
        .catch(err => {
          pendingToolCallsRef.current.delete(toolCallId);
          addToolOutput({
            tool: 'summarizeCurrentPage',
            toolCallId,
            output: `Summary failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
          setPendingToolCallsVersion(v => v + 1);
        });
      return;
    }

    // Unknown tool — always deliver output so the server step can continue
    addToolOutput({ tool: toolName as any, toolCallId, output: `Unknown tool: ${toolName}` });
  };

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(chatId, JSON.stringify(messages));
    }
  }, [messages, chatId]);

  const clearChat = () => {
    localStorage.removeItem(chatId);
    setMessages([]);
    handledToolCallsRef.current.clear();
  };

  // Auto-scroll to bottom when messages change (streaming responses)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Primary tool execution path: watch messages for tool parts in input-available state.
  // This reliably catches tools whether onToolCall fired or not (e.g. when stream finishes
  // before onToolCall has a chance to run, or when the local model skips the callback).
  useEffect(() => {
    const lastMsg = messages.at(-1);
    if (!lastMsg || lastMsg.role !== 'assistant') return;
    for (const part of lastMsg.parts) {
      if (!part.type.startsWith('tool-') && part.type !== 'dynamic-tool') continue;
      const p = part as Record<string, unknown>;
      const toolName = part.type === 'dynamic-tool'
        ? String(p.toolName)
        : part.type.slice('tool-'.length);
      const resolvedInput = resolveToolInput(p);

      const state = String(p.state ?? '');
      // Only execute when input is fully available — never on input-streaming,
      // since we now inject tool-input-available via createPatchedFetch and
      // executing on partial deltas would use wrong/incomplete input values.
      if (state !== 'input-available') continue;

      console.log('[AI] useEffect tool part', toolName, p.state);
      runTool(toolName, String(p.toolCallId), resolvedInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSummarizePage = async () => {
    if (isLoading || summarizing) return;
    setSummarizing(true);
    try {
      const context = collectPageContext();
      const res = await fetch('http://localhost:10022/api/ai/summarize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: (context as unknown as { section?: string }).section ?? 'unknown', contextJson: JSON.stringify(context) }),
      });
      if (!res.ok) throw new Error('Summarize failed');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }
      setMessages([
        ...messages,
        { id: crypto.randomUUID(), role: 'assistant', parts: [{ type: 'text', text: accumulated }] },
      ]);
    } catch (e) {
      setMessages([
        ...messages,
        { id: crypto.randomUUID(), role: 'assistant', parts: [{ type: 'text', text: `Summary failed: ${e instanceof Error ? e.message : 'Unknown error'}` }] },
      ]);
    } finally {
      setSummarizing(false);
    }
  };

  // Keep the latest position of each toolCallId so duplicate tool parts
  // (from step merges/replays) are shown only once in the UI.
  const latestToolPartPositionByCallId = new Map<string, string>();
  messages.forEach((message, messageIdx) => {
    message.parts.forEach((part, partIdx) => {
      if (!part.type.startsWith('tool-') && part.type !== 'dynamic-tool') return;
      const toolCallId = String((part as Record<string, unknown>).toolCallId ?? '');
      if (!toolCallId) return;
      latestToolPartPositionByCallId.set(toolCallId, `${messageIdx}:${partIdx}`);
    });
  });

  return (
    <div className="fixed right-6 bottom-6 z-1000 flex flex-col items-end gap-3">
      {open && (
        <div
          className={cn(
            'flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 motion-reduce:animate-none',
            isExpanded ? 'w-170' : 'w-96',
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
                aria-hidden
              >
                <Sparkles className="size-3.5" />
              </span>
              <span className="font-heading text-sm font-semibold text-foreground">
                ERP Assistant
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-lg text-muted-foreground"
                onClick={clearChat}
                aria-label="Clear chat history"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-lg text-muted-foreground"
                onClick={() => setIsExpanded((v) => !v)}
                aria-label="Expand chat"
              >
                {isExpanded ? (
                  <Minimize2 className="size-4" aria-hidden />
                ) : (
                  <Maximize2 className="size-4" aria-hidden />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-lg text-muted-foreground"
                onClick={() => {
                  setOpen(false);
                  setIsExpanded(false);
                }}
                aria-label="Close chat"
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto px-4 pt-4',
              isExpanded ? 'h-[65vh]' : 'h-[50vh]',
            )}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-2.5 px-6 py-8 text-center">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" aria-hidden />
                </span>
                <span className="max-w-64 text-xs leading-relaxed text-muted-foreground">
                  Ask me anything about this ERP system or ask me to navigate somewhere.
                </span>
              </div>
            )}
            {messages.map((message, messageIdx) => {
              if (message.role !== 'user' && message.role !== 'assistant') return null;
              const isUser = message.role === 'user';

              const hasVisible = message.parts.some(
                p => p.type === 'text' || p.type.startsWith('tool-') || p.type === 'dynamic-tool',
              );
              if (!hasVisible) return null;

              return (
                <div
                  key={message.id}
                  className={cn(
                    'mb-3 flex flex-col gap-1',
                    isUser ? 'items-end' : 'items-start',
                  )}
                >
                  {(() => {
                    const elements: ReactNode[] = [];
                    let textBuffer: string[] = [];
                    let isFirstTextSegment = true;
                    let segKey = 0;

                    const flushText = (): void => {
                      if (textBuffer.length === 0) return;
                      const merged = textBuffer.join('\n\n');
                      const textToRender = isUser || !isFirstTextSegment
                        ? merged
                        : merged.replace(/^\n+/, '');
                      textBuffer = [];
                      isFirstTextSegment = false;
                      if (!textToRender.trim()) return;
                      elements.push(
                        <div
                          key={`text-${segKey++}`}
                          className={cn(
                            'max-w-[85%] min-w-0 rounded-xl px-3 py-2 text-[0.8125rem] leading-relaxed wrap-break-word',
                            isUser
                              ? 'whitespace-pre-wrap bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted text-foreground',
                          )}
                        >
                          {isUser ? textToRender : <MarkdownBubble text={textToRender} />}
                        </div>,
                      );
                    };

                    message.parts.forEach((part, partIdx) => {
                      if (part.type === 'text') {
                        if (typeof part.text === 'string' && part.text.length > 0) {
                          textBuffer.push(part.text);
                        }
                        return;
                      }
                      if (part.type === 'step-start') {
                        flushText();
                        return;
                      }
                      if (!part.type.startsWith('tool-') && part.type !== 'dynamic-tool') return;

                      flushText();

                      const p = part as Record<string, unknown>;
                      const toolCallId = String(p.toolCallId ?? '');
                      if (toolCallId) {
                        const currentPosition = `${messageIdx}:${partIdx}`;
                        const latestPosition = latestToolPartPositionByCallId.get(toolCallId);
                        if (latestPosition && latestPosition !== currentPosition) return;
                      }
                      const toolName = part.type === 'dynamic-tool'
                        ? String(p.toolName)
                        : part.type.slice('tool-'.length);
                      elements.push(<ToolChip key={`tool-${partIdx}`} toolName={toolName} part={p} />);
                    });

                    flushText();

                    if (elements.length === 0) return null;
                    return <>{elements}</>;
                  })()}
                </div>
              );
            })}
            {isLoading && (
              <div className="mb-3 flex justify-start">
                <div className="rounded-xl bg-muted px-3 py-2">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
                </div>
              </div>
            )}
            {error && (
              <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Something went wrong. Please try again.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t border-border px-4 pt-3 pb-4">
            <div className="mb-2.5 flex gap-2">
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleSummarizePage}
                disabled={isLoading || summarizing}
              >
                <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-medium">
                  {summarizing ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
                  {intl.formatMessage({ id: 'common.action.summarize_page', defaultMessage: 'Summarize this page' })}
                </Badge>
              </button>
            </div>
            <div className="flex w-full items-end gap-2">
              <Input
                placeholder="Ask a question..."
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="h-10 rounded-xl"
              />
              <Button
                type="button"
                size="icon"
                className="size-10 shrink-0 rounded-xl"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        size="icon"
        className="size-13 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {open ? <X className="size-5" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
      </Button>
    </div>
  );
};
