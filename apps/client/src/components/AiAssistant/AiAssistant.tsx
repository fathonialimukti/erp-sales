import "./AiAssistant.css";

import { Chip, Spinner, Textarea } from '../../ui';
import { useChat } from '@ai-sdk/react';
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

// Markdown component map using BEM CSS classes from AiAssistant.css
// instead of Tailwind utility classes.
const markdownComponents: Components = {
  h1: ({ children }) => <h1>{children}</h1>,
  h2: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3>{children}</h3>,
  p: ({ children }) => <p>{children}</p>,
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ className, children, ...rest }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="ai-markdown code--inline" {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre aria-label="Code block">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote>
      {children}
    </blockquote>
  ),
  hr: () => <hr />,
  table: ({ children }) => (
    <div className="ai-md-table-wrap">
      <table>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,
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
  return <div className="ai-markdown">{rendered}</div>;
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

  const tone =
    state === 'output-available' ? 'success' :
      state === 'output-error' ? 'danger' :
        state === 'input-streaming' ? 'warning' :
          'neutral';

  const prefix =
    state === 'output-available' ? '✓' :
      state === 'output-error' ? '✗' :
        state === 'input-streaming' ? '' : '…';

  const labelText = state === 'input-streaming'
    ? `${meta.label}…`
    : `${prefix} ${meta.label}${detail}`;

  return (
    <Chip size="sm" tone={tone}>
      {labelText}
    </Chip>
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
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
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
      api: 'http://localhost:2022/api/ai/chat',
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
        api: `http://localhost:2022/api/ai/chat/${id}/stream`,
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
      fetch('http://localhost:2022/api/ai/query', {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    <div className="ai-anchor">
      {open && (
        <div className={`ai-panel ${isExpanded ? 'ai-panel--expanded' : 'ai-panel--compact'}`}>
          <div className="ai-header">
            <div className="ai-header__brand">
              <span className="ai-header__brand-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3v4M3 5h4M6 17v4M4 19h4" />
                  <path d="M13 3l2.5 5.5L21 11l-5.5 2.5L13 19l-2.5-5.5L5 11l5.5-2.5z" />
                </svg>
              </span>
              <span className="ai-header__brand-text">ERP Assistant</span>
            </div>
            <div className="ai-header__actions">
              <button type="button" className="ai-header__btn" onClick={clearChat} aria-label="Clear chat history">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              <button type="button" className="ai-header__btn" onClick={() => setIsExpanded((v) => !v)} aria-label="Expand chat">
                {isExpanded ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="8 4 4 4 4 8" />
                    <polyline points="16 4 20 4 20 8" />
                    <polyline points="8 20 4 20 4 16" />
                    <polyline points="16 20 20 20 20 16" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                )}
              </button>
              <button type="button" className="ai-header__btn" onClick={() => { setOpen(false); setIsExpanded(false); }} aria-label="Close chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className={`ai-messages ${isExpanded ? 'ai-messages--expanded' : 'ai-messages--compact'}`}>
            {messages.length === 0 && (
              <div className="ai-empty">
                <span className="ai-empty__icon" aria-hidden="true">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </span>
                <span className="ai-empty__text">Ask me anything about this ERP system or ask me to navigate somewhere.</span>
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
                  className={`ai-msg ${isUser ? 'ai-msg--user' : 'ai-msg--assistant'}`}
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
                        <div key={`text-${segKey++}`} className={`ai-bubble ${isUser ? 'ai-bubble--user' : 'ai-bubble--assistant'}`}>
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
              <div className="ai-loading">
                <div className="ai-loading__bubble">
                  <Spinner size="sm" />
                </div>
              </div>
            )}
            {error && (
              <div className="ai-error">
                Something went wrong. Please try again.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-footer">
            <div className="ai-footer__row">
              <div className="ai-footer__textarea">
                <Textarea
                  placeholder="Ask a question..."
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
              </div>
              <button
                type="button"
                className="ai-send-btn"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ai-toggle">
        <button
          type="button"
          className="ai-toggle__btn"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3v4M3 5h4M6 17v4M4 19h4" />
              <path d="M13 3l2.5 5.5L21 11l-5.5 2.5L13 19l-2.5-5.5L5 11l5.5-2.5z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
