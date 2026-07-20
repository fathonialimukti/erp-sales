import "./CustomerAssistantPage.css";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useIntl } from "react-intl";
import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { UIMessage } from "ai";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Textarea, Spinner } from "../ui";

const CHAT_ID = "customer-ai-page";

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
  code: ({ className, children, ...rest }: any) => {
    const isInline = !className;
    if (isInline) {
      return <code className="ai-markdown code--inline" {...rest}>{children}</code>;
    }
    return <code className={className} {...rest}>{children}</code>;
  },
  pre: ({ children }) => <pre aria-label="Code block">{children}</pre>,
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
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
  return <div className="ai-markdown">{rendered}</div>;
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

  // Persist to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(CHAT_ID, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll
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
      className="customer-assistant-page"
      data-ai-context={JSON.stringify({ section: "customer-assistant" })}
    >
      {/* Page Header */}
      <div className="customer-assistant-page__header">
        <h1 className="customer-assistant-page__title">
          {intl.formatMessage({ id: "customer_ai.title", defaultMessage: "Customer Assistant" })}
        </h1>
        <p className="customer-assistant-page__subtitle">
          {intl.formatMessage({ id: "customer_ai.subtitle", defaultMessage: "Ask about products, pricing, or your orders" })}
        </p>
      </div>

      {/* Chat Container */}
      <div className="customer-assistant-page__chat">
        <div className="customer-assistant-page__messages">
          {messages.length === 0 && (
            <div className="customer-assistant-page__empty">
              <span className="customer-assistant-page__empty-icon" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </span>
              <span className="customer-assistant-page__empty-text">
                {intl.formatMessage({ id: "customer_ai.greeting", defaultMessage: "Hi! I'm your sales assistant. How can I help you today?" })}
              </span>
            </div>
          )}
          {messages.map((message) => {
            if (message.role !== "user" && message.role !== "assistant") return null;
            const isUser = message.role === "user";

            const hasText = message.parts.some((p) => p.type === "text");
            if (!hasText) return null;

            return (
              <div key={message.id} className={`ai-msg ${isUser ? "ai-msg--user" : "ai-msg--assistant"}`}>
                {(() => {
                  const elements: ReactNode[] = [];
                  let segKey = 0;

                  message.parts.forEach((part) => {
                    if (part.type === "text" && typeof part.text === "string" && part.text.length > 0) {
                      elements.push(
                        <div
                          key={`text-${segKey++}`}
                          className={`ai-bubble ${isUser ? "ai-bubble--user" : "ai-bubble--assistant"}`}
                        >
                          {isUser ? part.text : <MarkdownBubble text={part.text} />}
                        </div>
                      );
                    }
                  });

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
            <div className="ai-error">Something went wrong. Please try again.</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="customer-assistant-page__input">
          <div className="customer-assistant-page__input-row">
            <div className="customer-assistant-page__textarea">
              <Textarea
                placeholder={intl.formatMessage({ id: "customer_ai.placeholder", defaultMessage: "Type your message..." })}
                value={input}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                intl.formatMessage({ id: "customer_ai.send", defaultMessage: "Send" })
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAssistantPage;