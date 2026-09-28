import { Loader2, Maximize2, Minimize2, Paperclip, Send, Sparkles, Trash2, X } from 'lucide-react';
import { AiMarkdown } from '@/components/ai/AiMarkdown';
import { aiBorderStyle, aiPlateStyle } from '@/components/ai/AiPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/lib/api-base';
import { isAcceptableImage } from '@/lib/attach-limits';
import { getFriendlyErrorMessage } from '@/lib/friendlyError';
import { normalizeRoutePath } from '@/lib/route-aliases';
import { cn } from '@/lib/utils';
import { useChat } from '@ai-sdk/react';
import { useIntl } from 'react-intl';
import { useGeneralSettings } from '@/hooks/useGeneralSettings';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useAtomValue, useSetAtom } from 'jotai';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { UIMessage, type FileUIPart } from 'ai';
import { useNavigate } from 'react-router';
import { aiFormFillAtom, authUserAtom } from '../../lib/atoms';
import {
  ChatWidgetPart,
  WIDGET_TOOL_NAMES,
  createWidgetTurnHandlers,
  lastAssistantStepHasWidgetTool,
} from '@/components/ai/ChatWidgetWiring';



const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

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

function MarkdownBubble({ text }: { text: string }) {
  return <div className="text-[0.8125rem] leading-relaxed text-foreground"><AiMarkdown>{text}</AiMarkdown></div>;
}

/** One assistant per authenticated page, so the dialog ids are stable. */
const PANEL_ID = 'ai-assistant-panel';
const PANEL_TITLE_ID = 'ai-assistant-title';

/** Tab order inside the panel: every control a keyboard user can reach. */
const FOCUSABLE_IN_PANEL = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Metadata for rendering tool activity chips
const TOOL_META: Record<string, { id: string; defaultMessage: string }> = {
  navigateTo: { id: 'ai.assistant.tool.navigate', defaultMessage: 'Navigate' },
  fillFormFields: { id: 'ai.assistant.tool.fill_form', defaultMessage: 'Fill form' },
  getPageContext: { id: 'ai.assistant.tool.read_page', defaultMessage: 'Read page' },
  queryDatabase: { id: 'ai.assistant.tool.query_db', defaultMessage: 'Query DB' },
  searchKnowledge: { id: 'ai.assistant.tool.knowledge', defaultMessage: 'Knowledge' },
};

/** Best-effort hit/result count from searchKnowledge tool output (server or client). */
const resolveKnowledgeHitCount = (output: unknown): number | undefined => {
  if (output == null) return undefined;

  let value: unknown = output;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return undefined;
    }
  }

  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  for (const key of ['count', 'hitCount', 'total', 'totalHits'] as const) {
    const n = record[key];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  for (const key of ['hits', 'results', 'chunks', 'documents', 'items'] as const) {
    const arr = record[key];
    if (Array.isArray(arr)) return arr.length;
  }
  return undefined;
};

function ToolChip({ toolName, part }: { toolName: string; part: Record<string, unknown> }) {
  const intl = useIntl();
  const message = TOOL_META[toolName];
  const label = message ? intl.formatMessage(message) : toolName;
  const state = String(part.state ?? 'input-available');
  const input = part.input as Record<string, unknown> | undefined;

  let detail = '';
  if (toolName === 'fillFormFields' && input?.fields) {
    const count = Object.keys(input.fields as Record<string, unknown>).length;
    detail = ` (${count} field${count !== 1 ? 's' : ''})`;
  } else if (toolName === 'searchKnowledge') {
    const hitCount = resolveKnowledgeHitCount(part.output);
    if (hitCount !== undefined) {
      detail = ` (${hitCount})`;
    }
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
    state === 'input-streaming' ? `${label}…` : `${prefix}${label}${detail}`;

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
  const { multimodalEnabled } = useGeneralSettings();
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileUIPart[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const navigate = useNavigate();
  const setFormFill = useSetAtom(aiFormFillAtom);
  // Tracks toolCallIds already executed to prevent double-firing (Strict Mode / multiple effects)
  const handledToolCallsRef = useRef(new Set<string>());
  // Tracks pending async tool calls (like queryDatabase) to prevent premature auto-send
  const pendingToolCallsRef = useRef(new Set<string>());
  const [, setPendingToolCallsVersion] = useState(0);
  // Sentinel element at the bottom of the messages list for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Dialog plumbing: the panel traps Tab, closes on Escape and hands focus
  // back to the launcher. Implemented on the existing fixed element rather
  // than a shadcn Sheet because the assistant is co-present with the page —
  // a scrim, scroll lock or blocked outside click would break the
  // navigateTo / fillFormFields flow that mutates the page behind it.
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

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
      api: `${API_BASE_URL}/api/ai/chat`,
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
        api: `${API_BASE_URL}/api/ai/chat/${id}/stream`,
        credentials: 'include' as RequestCredentials,
      }),
    }),
    sendAutomaticallyWhen: ({ messages }) => {
      // Block auto-send while any async tool call (like queryDatabase) is still pending
      if (pendingToolCallsRef.current.size > 0) return false;
      // Widget tool calls END the turn (SPEC §5.2) — the user's structured
      // response resumes it; never auto-continue from a card.
      if (lastAssistantStepHasWidgetTool(messages)) return false;
      return lastAssistantMessageIsCompleteWithToolCalls({ messages });
    },
    // Execute ALL tools (dynamic and typed) directly in onToolCall — NOT in useEffect.
    // sendAutomaticallyWhen is checked immediately after this callback resolves.
    // If we defer to useEffect, the predicate fires before the output is registered
    // and the next step never triggers, breaking multi-step chains (navigate → fill).
    onToolCall: ({ toolCall }) => {
      // String(toolCall.toolName) works for both dynamic (string) and typed (literal union) tools.
      const toolName = String(toolCall.toolName);
      runTool(toolName, toolCall.toolCallId, toolCall.input as unknown);
    },
  });

  // Widget interaction handlers (SPEC §5.3): persist status onto the widget
  // tool-part output and append the structured turns that resume the AI.
  const widgetTurns = createWidgetTurnHandlers(setMessages, sendMessage);

  // runTool is defined as a stable function via useCallback-equivalent pattern.
  // It must not close over stale addToolOutput — since it's called from inside useEffect
  // which always has the latest closure, this is safe.
  const runTool = (toolName: string, toolCallId: string, toolInput: unknown) => {
    // Widget tools (request_form_input / request_confirmation) render as cards,
    // never executed client-side — and never "Unknown tool", whose addToolOutput
    // fallback would clobber the widget output (SPEC §7).
    if (WIDGET_TOOL_NAMES.has(toolName)) return;

    const alreadyHandled = handledToolCallsRef.current.has(toolCallId);
    if (!alreadyHandled) {
      handledToolCallsRef.current.add(toolCallId);
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
      fetch(`${API_BASE_URL}/api/ai/query`, {
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

      fetch(`${API_BASE_URL}/api/ai/summarize`, {
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

    // Preferred path: server-executed searchKnowledge (has execute) streams output itself.
    // If it arrives as a client tool call, ack safely so multi-step does not stall.
    if (toolName === 'searchKnowledge') {
      addToolOutput({
        tool: 'searchKnowledge' as any,
        toolCallId,
        output: JSON.stringify({ hits: [], note: 'Knowledge search is handled server-side when available' }),
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

      runTool(toolName, String(p.toolCallId), resolvedInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim(), files: pendingFiles.length > 0 ? pendingFiles : undefined });
    setInput('');
    setPendingFiles([]);
    setAttachError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const closePanel = () => {
    setOpen(false);
    setIsExpanded(false);
  };

  // Dialog keyboard contract: Escape dismisses, Tab and Shift+Tab cycle inside
  // the panel so the page behind never receives focus while it is open.
  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
      return;
    }
    if (e.key !== 'Tab') return;

    const root = panelRef.current;
    if (!root) return;
    const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_IN_PANEL)).filter(
      (el) => el.getClientRects().length > 0,
    );
    if (focusable.length === 0) {
      e.preventDefault();
      root.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!active || !root.contains(active)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Move focus into the composer on open and back to the launcher on close.
  // Guarded so a first mount (panel closed) never steals the page's focus.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      composerRef.current?.focus();
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      launcherRef.current?.focus();
    }
  }, [open]);

  const processFiles = async (files: File[]) => {
    let skippedCount = 0;
    const accepted: File[] = [];
    for (const file of files) {
      if (isAcceptableImage(file)) {
        accepted.push(file);
      } else {
        skippedCount += 1;
      }
    }
    setAttachError(
      skippedCount > 0
        ? `${skippedCount} file${skippedCount > 1 ? 's' : ''} skipped - images only, max 5 MB.`
        : null,
    );

    const newParts: FileUIPart[] = [];
    for (const file of accepted) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        newParts.push({ type: 'file', filename: file.name, mediaType: file.type, url: dataUrl });
      } catch {
        setAttachError(`Could not read ${file.name}.`);
      }
    }
    if (newParts.length > 0) {
      setPendingFiles((prev) => [...prev, ...newParts]);
    }
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!multimodalEnabled) return;
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    await processFiles(files);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!multimodalEnabled || isLoading) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    await processFiles(files);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleSummarizePage = async () => {
    if (isLoading || summarizing) return;
    setSummarizing(true);
    try {
      const context = collectPageContext();
      const res = await fetch(`${API_BASE_URL}/api/ai/summarize`, {
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
        { id: crypto.randomUUID(), role: 'assistant', parts: [{ type: 'text', text: getFriendlyErrorMessage(e) }] },
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
          ref={panelRef}
          id={PANEL_ID}
          role="dialog"
          aria-modal="true"
          aria-labelledby={PANEL_TITLE_ID}
          tabIndex={-1}
          // The drop-target accent wins over the AI identity border.
          style={isDragging && multimodalEnabled ? undefined : aiBorderStyle}
          className={cn(
            'flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl outline-none',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200 motion-reduce:animate-none',
            isExpanded ? 'w-170' : 'w-96',
            isDragging && multimodalEnabled ? 'border-dashed border-primary' : '',
          )}
          onKeyDown={handlePanelKeyDown}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg"
                style={aiPlateStyle}
                aria-hidden
              >
                <Sparkles className="size-3.5" />
              </span>
              <span id={PANEL_TITLE_ID} className="truncate font-heading text-sm font-semibold text-foreground">
                {/* One product name, one message id: the Sidebar is the brand surface. */}
                {intl.formatMessage({ id: 'nav.brand_name', defaultMessage: 'B2B CRM' })}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-lg text-muted-foreground"
                onClick={clearChat}
                aria-label={intl.formatMessage({
                  id: 'ai.assistant.clear_history',
                  defaultMessage: 'Clear chat history',
                })}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-lg text-muted-foreground"
                onClick={() => setIsExpanded((v) => !v)}
                aria-label={intl.formatMessage(
                  isExpanded
                    ? { id: 'ai.assistant.collapse', defaultMessage: 'Collapse chat' }
                    : { id: 'ai.assistant.expand', defaultMessage: 'Expand chat' },
                )}
                aria-pressed={isExpanded}
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
                onClick={closePanel}
                aria-label={intl.formatMessage({ id: 'common.action.close', defaultMessage: 'Close' })}
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
                <span
                  className="inline-flex size-12 items-center justify-center rounded-2xl"
                  style={aiPlateStyle}
                >
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

              // Structured widget turns (form_response/confirmation/action_result)
              // carry only an empty text part + metadata — they render nothing.
              const hasVisible = message.parts.some(
                p =>
                  (p.type === 'text' && p.text.trim() !== '') ||
                  p.type === 'file' ||
                  p.type.startsWith('tool-') ||
                  p.type === 'dynamic-tool',
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
                      if (part.type === 'file') {
                        if (!multimodalEnabled) return;
                        flushText();
                        if (isUser) {
                          const mediaType = part.mediaType ?? '';
                          const looksLikeImage = mediaType.startsWith('image/')
                            || (!mediaType && part.url.startsWith('data:image/'));
                          if (looksLikeImage) {
                            elements.push(
                              <img
                                key={`file-${partIdx}`}
                                src={part.url}
                                alt={part.filename ?? 'attachment'}
                                className="max-h-56 max-w-full rounded-xl object-cover"
                              />,
                            );
                          }
                        }
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

                      // Widget tool parts render as cards below the text (SPEC §7) —
                      // never as a raw tool chip. Malformed payloads render nothing.
                      if (WIDGET_TOOL_NAMES.has(toolName) && String(p.state ?? '') === 'output-available') {
                        elements.push(
                          <ChatWidgetPart
                            key={`widget-${partIdx}`}
                            part={part}
                            chatId={chatId}
                            messages={messages}
                            disabled={isLoading}
                            onSubmitted={widgetTurns.onSubmitted}
                            onCancelled={widgetTurns.onCancelled}
                            onStatusChange={widgetTurns.onStatusChange}
                            onResult={widgetTurns.onResult}
                          />,
                        );
                        return;
                      }

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
            <div className="mb-2.5 flex flex-wrap gap-2">
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
            {attachError && (
              <p className="mb-2 text-xs text-destructive">{attachError}</p>
            )}
            {multimodalEnabled && pendingFiles.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-2">
                {pendingFiles.map((file, fileIdx) => (
                  <div key={`${file.filename}-${fileIdx}`} className="relative">
                    <img
                      src={file.url}
                      alt={file.filename ?? 'attachment'}
                      className="h-16 w-16 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -top-1.5 -right-1.5 inline-flex size-6 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== fileIdx))}
                      aria-label={`Remove ${file.filename ?? 'attachment'}`}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {multimodalEnabled && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                disabled={isLoading}
                onChange={handleAttach}
              />
            )}
            <div className="flex w-full items-end gap-2">
              <Input
                ref={composerRef}
                placeholder={intl.formatMessage({
                  id: 'ai.assistant.placeholder',
                  defaultMessage: 'Ask a question...',
                })}
                value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="h-10 rounded-xl"
              />
              {multimodalEnabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  aria-label={intl.formatMessage({ id: 'ai_admin.chat.attach', defaultMessage: 'Attach image' })}
                >
                  <Paperclip className="size-4" aria-hidden />
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                className="size-10 shrink-0 rounded-xl"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                aria-label={intl.formatMessage({ id: 'ai_admin.chat.send', defaultMessage: 'Send' })}
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
        ref={launcherRef}
        type="button"
        size="icon"
        className="size-13 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90"
        onClick={() => (open ? closePanel() : setOpen(true))}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? PANEL_ID : undefined}
      >
        {open ? <X className="size-5" aria-hidden /> : <Sparkles className="size-5" aria-hidden />}
      </Button>
    </div>
  );
};
