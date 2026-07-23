import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useAtomValue, useSetAtom } from "jotai";
import { useIntl } from "react-intl";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { UIMessage } from "ai";
import { useNavigate } from "react-router";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Layers,
  Loader2,
  SendHorizontal,
  Trash2,
} from "lucide-react";
import { aiFormFillAtom, authUserAtom } from "../../lib/atoms";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROUTE_ALIASES: Record<string, string> = {
  "/": "/dashboard",
  "/sku": "/skus",
  "/sku/new": "/skus/new",
  "/sku/create": "/skus/new",
  "/warehouses": "/warehouse",
  "/warehouses/new": "/warehouse/new",
  "/users/create": "/users/new",
  "/roles": "/access-control/roles",
  "/roles/new": "/access-control/roles/new",
  "/access-control": "/access-control/roles",
  "/stock-movements": "/stock-movement",
  "/receiving-transactions": "/inbound-transaction",
  "/receiving-transactions/new": "/inbound-transaction/receiving/new",
  "/shipments": "/outbound-transaction",
  "/shipments/new": "/outbound-transaction/shipment/new",
  "/disposals": "/outbound-transaction",
  "/disposals/new": "/outbound-transaction/disposal/new",
  "/loss-transactions": "/outbound-transaction",
  "/loss-transactions/new": "/outbound-transaction/loss/new",
  "/found-transactions": "/inbound-transaction",
  "/found-transactions/new": "/inbound-transaction/found/new",
  "/rma-receipts": "/inbound-transaction",
  "/rma-receipts/new": "/inbound-transaction/rma-receipt/new",
  "/wip-completions": "/inbound-transaction",
  "/wip-completions/new": "/inbound-transaction/wip-completion/new",
  "/wip-issues": "/outbound-transaction",
  "/wip-issues/new": "/outbound-transaction/wip-issue/new",
  "/return-to-supplier": "/outbound-transaction",
  "/return-to-supplier/new": "/outbound-transaction/return-to-supplier/new",
};

const normalizeRoutePath = (path: string) => {
  const trimmedPath = path.trim();
  return ROUTE_ALIASES[trimmedPath] ?? trimmedPath;
};

const createPatchedFetch = (): typeof fetch => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await window.fetch(input, init);
    const method = (init?.method ?? "GET").toUpperCase();
    if (method !== "POST" || !response.body || response.status === 204) return response;

    type ToolBuf = { toolName: string; inputText: string };
    const buffers = new Map<string, ToolBuf>();
    let partial = "";

    const patchedBody = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, ctrl) {
          partial += new TextDecoder().decode(chunk);
          const lines = partial.split("\n");
          partial = lines.pop() ?? "";

          const out: string[] = [];

          for (const line of lines) {
            const isFinishStep =
              line.startsWith("data: ") &&
              (() => {
                try {
                  const ev = JSON.parse(line.slice(6).trim()) as Record<string, unknown>;
                  return ev.type === "finish-step";
                } catch {
                  return false;
                }
              })();

            if (isFinishStep && buffers.size > 0) {
              for (const [toolCallId, buf] of buffers) {
                try {
                  const toolInput = JSON.parse(buf.inputText) as unknown;
                  const injected = JSON.stringify({
                    type: "tool-input-available",
                    toolCallId,
                    toolName: buf.toolName,
                    input: toolInput,
                  });
                  out.push(`data: ${injected}`);
                  out.push("");
                } catch {
                  // skip
                }
              }
              buffers.clear();
            }

            out.push(line);

            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;

            let ev: Record<string, unknown>;
            try {
              ev = JSON.parse(raw) as Record<string, unknown>;
            } catch {
              continue;
            }

            if (ev.type === "tool-input-start") {
              buffers.set(String(ev.toolCallId), {
                toolName: String(ev.toolName ?? ""),
                inputText: "",
              });
            } else if (ev.type === "tool-input-delta") {
              const b = buffers.get(String(ev.toolCallId));
              if (b) b.inputText += String(ev.inputTextDelta ?? "");
            }
          }

          if (out.length > 0) {
            ctrl.enqueue(new TextEncoder().encode(out.join("\n") + "\n"));
          }
        },
        flush(ctrl) {
          if (partial) ctrl.enqueue(new TextEncoder().encode(partial));
        },
      })
    );

    return new Response(patchedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
};

const parseToolInputJson = (value: unknown): unknown => {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
};

const resolveToolInput = (part: Record<string, unknown>): unknown => {
  const direct = part.input;
  if (direct && typeof direct === "object") return direct;

  const parsedFromInput = parseToolInputJson(direct);
  if (parsedFromInput && typeof parsedFromInput === "object") return parsedFromInput;

  const parsedFromInputText = parseToolInputJson(part.inputText);
  if (parsedFromInputText && typeof parsedFromInputText === "object") return parsedFromInputText;

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

const sanitizeUrl = (url: string) => (/^(https?:|mailto:|#)/.test(url) ? url : "#");

function MarkdownBubble({ text }: { text: string }) {
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
    [text]
  );
  return <div className="text-[0.8125rem] leading-relaxed text-foreground">{rendered}</div>;
}

const TOOL_META: Record<string, { label: string }> = {
  navigateTo: { label: "Navigate" },
  fillFormFields: { label: "Fill form" },
  getPageContext: { label: "Read page" },
  queryDatabase: { label: "Query DB" },
  queryDatabaseAdmin: { label: "Query DB (Admin)" },
};

function ToolChip({ toolName, part }: { toolName: string; part: Record<string, unknown> }) {
  const meta = TOOL_META[toolName] ?? { label: toolName };
  const state = String(part.state ?? "input-available");
  const input = part.input as Record<string, unknown> | undefined;

  let detail = "";
  if (toolName === "fillFormFields" && input?.fields) {
    const count = Object.keys(input.fields as Record<string, unknown>).length;
    detail = ` (${count} field${count !== 1 ? "s" : ""})`;
  }

  const variant =
    state === "output-available"
      ? "default"
      : state === "output-error"
        ? "destructive"
        : state === "input-streaming"
          ? "outline"
          : "secondary";

  const prefix =
    state === "output-available"
      ? "✓ "
      : state === "output-error"
        ? "✗ "
        : state === "input-streaming"
          ? ""
          : "… ";

  const labelText =
    state === "input-streaming" ? `${meta.label}…` : `${prefix}${meta.label}${detail}`;

  return (
    <Badge variant={variant} className="max-w-full truncate font-normal">
      {labelText}
    </Badge>
  );
}

const collectPageContext = (): string => {
  const route = window.location.pathname;
  const heading = document.querySelector("h1")?.textContent?.trim() ?? "";
  const browserTitle = document.title.replace(/\s*[|–-].*$/, "").trim();
  const title = heading || browserTitle;
  const visibleButtons = Array.from(document.querySelectorAll("button"))
    .map((btn) => btn.textContent?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 8);
  const tableCount = document.querySelectorAll('table,[role="table"]').length;
  const inputCount = document.querySelectorAll("input:not([type=hidden]),textarea,select").length;
  const sections: unknown[] = [];

  document.querySelectorAll("[data-ai-context]").forEach((el) => {
    const raw = el.getAttribute("data-ai-context");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      sections.push(parsed);
    } catch {
      // skip
    }
  });

  const selectOptions: Record<string, unknown[]> = {};
  document.querySelectorAll("[data-ai-select-options]").forEach((el) => {
    const name = el.getAttribute("data-ai-select-options");
    const raw = el.textContent?.trim();
    if (name && raw) {
      try {
        selectOptions[name] = JSON.parse(raw) as unknown[];
      } catch {
        /* skip */
      }
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

const AiAdminChatPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const setFormFill = useSetAtom(aiFormFillAtom);
  const [input, setInput] = useState("");
  const handledToolCallsRef = useRef(new Set<string>());
  const pendingToolCallsRef = useRef(new Set<string>());
  const [, setPendingToolCallsVersion] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const user = useAtomValue(authUserAtom);
  const chatId = user?.id ? `ai-admin-chat-${user.id}` : "ai-admin-chat-anon";

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
    resume: true,
    transport: new DefaultChatTransport({
      api: "http://localhost:10022/api/ai/admin/chat",
      credentials: "include",
      fetch: createPatchedFetch(),
      prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
        body: { id, messages: msgs },
      }),
      prepareReconnectToStreamRequest: ({ id }) => ({
        api: `http://localhost:10022/api/ai/admin/chat/${id}/stream`,
        credentials: "include" as RequestCredentials,
      }),
    }),
    sendAutomaticallyWhen: (messages) => {
      if (pendingToolCallsRef.current.size > 0) return false;
      return lastAssistantMessageIsCompleteWithToolCalls(messages);
    },
    onToolCall: ({ toolCall }) => {
      const toolName = String(toolCall.toolName);
      runTool(toolName, toolCall.toolCallId, toolCall.input as unknown);
    },
  });

  const runTool = (toolName: string, toolCallId: string, toolInput: unknown) => {
    const alreadyHandled = handledToolCallsRef.current.has(toolCallId);
    if (alreadyHandled) {
      // deliver output even on dedup
      if (toolName === "getPageContext") {
        addToolOutput({ tool: "getPageContext", toolCallId, output: collectPageContext() });
      }
      return;
    }
    handledToolCallsRef.current.add(toolCallId);

    if (toolName === "navigateTo") {
      if (!toolInput || typeof toolInput !== "object") {
        addToolOutput({ tool: "navigateTo", toolCallId, output: "No input provided" });
        return;
      }
      const { path } = toolInput as { path: string };
      if (!path) {
        addToolOutput({ tool: "navigateTo", toolCallId, output: "No path provided" });
        return;
      }
      const resolved = normalizeRoutePath(String(path));
      void navigate(resolved);
      addToolOutput({ tool: "navigateTo", toolCallId, output: `Navigated to ${resolved}` });
      return;
    }

    if (toolName === "fillFormFields") {
      if (!toolInput || typeof toolInput !== "object") {
        addToolOutput({ tool: "fillFormFields", toolCallId, output: "No input provided" });
        return;
      }
      const { fields } = toolInput as { fields: Record<string, unknown> };
      if (!fields || typeof fields !== "object") {
        addToolOutput({ tool: "fillFormFields", toolCallId, output: "No fields provided" });
        return;
      }
      setFormFill(fields);
      addToolOutput({
        tool: "fillFormFields",
        toolCallId,
        output: `Filled ${Object.keys(fields).length} field(s)`,
      });
      return;
    }

    if (toolName === "getPageContext") {
      const context = collectPageContext();
      addToolOutput({ tool: "getPageContext", toolCallId, output: context });
      return;
    }

    if (toolName === "queryDatabase") {
      if (!toolInput || typeof toolInput !== "object") {
        addToolOutput({
          tool: "queryDatabase",
          toolCallId,
          output: JSON.stringify({ error: "No input" }),
        });
        return;
      }
      const { sql, limit = 100 } = toolInput as { sql?: string; limit?: number };
      if (!sql) {
        addToolOutput({
          tool: "queryDatabase",
          toolCallId,
          output: JSON.stringify({ error: "No SQL provided" }),
        });
        return;
      }

      pendingToolCallsRef.current.add(toolCallId);
      setPendingToolCallsVersion((v) => v + 1);

      fetch("http://localhost:10022/api/ai/query", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, limit }),
      })
        .then((res) => res.json())
        .then((result) => {
          pendingToolCallsRef.current.delete(toolCallId);
          addToolOutput({ tool: "queryDatabase", toolCallId, output: JSON.stringify(result) });
          setPendingToolCallsVersion((v) => v + 1);
        })
        .catch((err) => {
          pendingToolCallsRef.current.delete(toolCallId);
          addToolOutput({
            tool: "queryDatabase",
            toolCallId,
            output: JSON.stringify({
              error: "Query failed",
              message: err instanceof Error ? err.message : "Unknown error",
            }),
          });
          setPendingToolCallsVersion((v) => v + 1);
        });
      return;
    }

    if (toolName === "queryDatabaseAdmin") {
      if (!toolInput || typeof toolInput !== "object") {
        addToolOutput({
          tool: "queryDatabaseAdmin",
          toolCallId,
          output: JSON.stringify({ error: "No input" }),
        });
        return;
      }
      const { sql, limit = 100 } = toolInput as { sql?: string; limit?: number };
      if (!sql) {
        addToolOutput({
          tool: "queryDatabaseAdmin",
          toolCallId,
          output: JSON.stringify({ error: "No SQL provided" }),
        });
        return;
      }

      pendingToolCallsRef.current.add(toolCallId);
      setPendingToolCallsVersion((v) => v + 1);

      fetch("http://localhost:10022/api/ai/query", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, limit }),
      })
        .then((res) => res.json())
        .then((result) => {
          pendingToolCallsRef.current.delete(toolCallId);
          addToolOutput({
            tool: "queryDatabaseAdmin",
            toolCallId,
            output: JSON.stringify(result),
          });
          setPendingToolCallsVersion((v) => v + 1);
        })
        .catch((err) => {
          pendingToolCallsRef.current.delete(toolCallId);
          addToolOutput({
            tool: "queryDatabaseAdmin",
            toolCallId,
            output: JSON.stringify({
              error: "Query failed",
              message: err instanceof Error ? err.message : "Unknown error",
            }),
          });
          setPendingToolCallsVersion((v) => v + 1);
        });
      return;
    }

    if (toolName === "summarizeCurrentPage") {
      const context = collectPageContext();
      pendingToolCallsRef.current.add(toolCallId);
      setPendingToolCallsVersion((v) => v + 1);

      fetch("http://localhost:10022/api/ai/summarize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: (context as any).section ?? "unknown",
          contextJson: JSON.stringify(context),
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("Summarize failed");
          const reader = res.body?.getReader();
          if (!reader) throw new Error("No response body");
          const decoder = new TextDecoder();
          let accumulated = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
          }
          pendingToolCallsRef.current.delete(toolCallId);
          addToolOutput({
            tool: "summarizeCurrentPage",
            toolCallId,
            output: accumulated,
          });
          setPendingToolCallsVersion((v) => v + 1);
        })
        .catch((err) => {
          pendingToolCallsRef.current.delete(toolCallId);
          addToolOutput({
            tool: "summarizeCurrentPage",
            toolCallId,
            output: `Summary failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          });
          setPendingToolCallsVersion((v) => v + 1);
        });
      return;
    }

    addToolOutput({ tool: toolName as any, toolCallId, output: `Unknown tool: ${toolName}` });
  };

  // Persist messages to localStorage
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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Watch messages for tool parts in input-available state
  useEffect(() => {
    const lastMsg = messages.at(-1);
    if (!lastMsg || lastMsg.role !== "assistant") return;
    for (const part of lastMsg.parts) {
      if (!part.type.startsWith("tool-") && part.type !== "dynamic-tool") continue;
      const p = part as Record<string, unknown>;
      const toolName =
        part.type === "dynamic-tool" ? String(p.toolName) : part.type.slice("tool-".length);
      const resolvedInput = resolveToolInput(p);
      const state = String(p.state ?? "");
      if (state !== "input-available") continue;
      runTool(toolName, String(p.toolCallId), resolvedInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Deduplicate tool parts
  const latestToolPartPositionByCallId = new Map<string, string>();
  messages.forEach((message, messageIdx) => {
    message.parts.forEach((part, partIdx) => {
      if (!part.type.startsWith("tool-") && part.type !== "dynamic-tool") return;
      const toolCallId = String((part as Record<string, unknown>).toolCallId ?? "");
      if (!toolCallId) return;
      latestToolPartPositionByCallId.set(toolCallId, `${messageIdx}:${partIdx}`);
    });
  });

  return (
    <div
      className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 pt-6"
      data-ai-context={JSON.stringify({ section: "ai-admin-chat" })}
    >
      <header className="mb-4 shrink-0 space-y-2 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--module-ai)_14%,transparent)] text-module-ai">
            <Layers className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {intl.formatMessage({
                id: "ai_admin.page.title",
                defaultMessage: "AI System Administrator",
              })}
            </h1>
            <p className="mt-1 flex items-start gap-1.5 text-sm font-medium text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {intl.formatMessage({
                id: "ai_admin.page.warning",
                defaultMessage:
                  "Dangerous: This AI assistant can modify database records. Always review actions before confirming.",
              })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "ai_admin.page.subtitle",
                defaultMessage:
                  "Full read-write database access. All operations are immediate and irreversible. Proceed with caution.",
              })}
            </p>
          </div>
        </div>
      </header>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/80 py-0 shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <Layers className="size-8" />
              </span>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                {intl.formatMessage({
                  id: "ai_admin.chat.empty",
                  defaultMessage:
                    "Ask the AI system administrator anything about your data. It can read, write, and analyze data across all tables.",
                })}
              </p>
            </div>
          )}
          {messages.map((message, messageIdx) => {
            if (message.role !== "user" && message.role !== "assistant") return null;
            const isUser = message.role === "user";

            const hasVisible = message.parts.some(
              (p) =>
                p.type === "text" || p.type.startsWith("tool-") || p.type === "dynamic-tool"
            );
            if (!hasVisible) return null;

            return (
              <div
                key={message.id}
                className={cn(
                  "mb-3 flex flex-col gap-1",
                  isUser ? "items-end" : "items-start",
                )}
              >
                {(() => {
                  const elements: ReactNode[] = [];
                  let textBuffer: string[] = [];
                  let isFirstTextSegment = true;
                  let segKey = 0;

                  const flushText = (): void => {
                    if (textBuffer.length === 0) return;
                    const merged = textBuffer.join("\n\n");
                    const textToRender =
                      isUser || !isFirstTextSegment ? merged : merged.replace(/^\n+/, "");
                    textBuffer = [];
                    isFirstTextSegment = false;
                    if (!textToRender.trim()) return;
                    elements.push(
                      <div
                        key={`text-${segKey++}`}
                        className={cn(
                          "max-w-[85%] min-w-0 rounded-xl px-3 py-2 text-[0.8125rem] leading-relaxed wrap-break-word",
                          isUser
                            ? "whitespace-pre-wrap bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-foreground",
                        )}
                      >
                        {isUser ? textToRender : <MarkdownBubble text={textToRender} />}
                      </div>,
                    );
                  };

                  message.parts.forEach((part, partIdx) => {
                    if (part.type === "text") {
                      if (typeof part.text === "string" && part.text.length > 0) {
                        textBuffer.push(part.text);
                      }
                      return;
                    }
                    if (part.type === "step-start") {
                      flushText();
                      return;
                    }
                    if (!part.type.startsWith("tool-") && part.type !== "dynamic-tool") return;

                    flushText();

                    const p = part as Record<string, unknown>;
                    const toolCallId = String(p.toolCallId ?? "");
                    if (toolCallId) {
                      const currentPosition = `${messageIdx}:${partIdx}`;
                      const latestPosition =
                        latestToolPartPositionByCallId.get(toolCallId);
                      if (latestPosition && latestPosition !== currentPosition) return;
                    }
                    const toolName =
                      part.type === "dynamic-tool"
                        ? String(p.toolName)
                        : part.type.slice("tool-".length);
                    elements.push(
                      <ToolChip key={`tool-${partIdx}`} toolName={toolName} part={p} />,
                    );
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
                <Loader2 className="size-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Something went wrong. Please try again.
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-border bg-muted/40 p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <Textarea
              className="min-h-11 flex-1 resize-none bg-card"
              placeholder={intl.formatMessage({
                id: "ai_admin.chat.placeholder",
                defaultMessage: "Ask the AI administrator to query or modify data...",
              })}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setInput(e.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="lg"
              aria-label={intl.formatMessage({
                id: "ai_admin.chat.send",
                defaultMessage: "Send",
              })}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <SendHorizontal className="size-4" />
                  <span className="hidden sm:inline">
                    {intl.formatMessage({
                      id: "ai_admin.chat.send",
                      defaultMessage: "Send",
                    })}
                  </span>
                </>
              )}
            </Button>
          </div>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearChat}>
              <Trash2 className="size-3.5" />
              Clear Chat
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
};

export default AiAdminChatPage;