import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useIntl } from "react-intl";
import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { UIMessage } from "ai";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, MessageSquare, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CHAT_ID = "customer-ai-page";

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
    [text],
  );
  return <div className="text-[0.8125rem] leading-relaxed text-foreground">{rendered}</div>;
}

const CustomerAssistantPage = () => {
  const intl = useIntl();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [initialMessages] = useState<UIMessage[]>(() => {
    try {
      const stored = sessionStorage.getItem(CHAT_ID);
      return stored ? (JSON.parse(stored) as UIMessage[]) : [];
    } catch {
      return [];
    }
  });

  const { messages, sendMessage, status, error } = useChat({
    id: CHAT_ID,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/ai/customer/chat",
      credentials: "include",
      prepareSendMessagesRequest: ({ messages: msgs }) => ({
        body: { messages: msgs },
      }),
    }),
  });

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(CHAT_ID, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  return (
    <div
      className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 pt-6"
      data-ai-context={JSON.stringify({ section: "customer-assistant" })}
    >
      <header className="mb-4 shrink-0 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--module-ai)_14%,transparent)] text-module-ai">
            <MessageSquare className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {intl.formatMessage({
                id: "customer_ai.title",
                defaultMessage: "Customer Assistant",
              })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "customer_ai.subtitle",
                defaultMessage: "Ask about products, pricing, or your orders",
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
                <MessageSquare className="size-8" />
              </span>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                {intl.formatMessage({
                  id: "customer_ai.greeting",
                  defaultMessage:
                    "Hi! I'm your sales assistant. How can I help you today?",
                })}
              </p>
            </div>
          )}

          {messages.map((message) => {
            if (message.role !== "user" && message.role !== "assistant") return null;
            const isUser = message.role === "user";
            const hasText = message.parts.some((p) => p.type === "text");
            if (!hasText) return null;

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
                  let segKey = 0;

                  message.parts.forEach((part) => {
                    if (
                      part.type === "text" &&
                      typeof part.text === "string" &&
                      part.text.length > 0
                    ) {
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
                          {isUser ? part.text : <MarkdownBubble text={part.text} />}
                        </div>,
                      );
                    }
                  });

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
                id: "customer_ai.placeholder",
                defaultMessage: "Type your message...",
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
                id: "customer_ai.send",
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
                      id: "customer_ai.send",
                      defaultMessage: "Send",
                    })}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CustomerAssistantPage;
