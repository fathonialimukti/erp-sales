import "./CustomerAiWidget.css";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useIntl } from "react-intl";
import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { UIMessage } from "ai";
import { useNavigate } from "react-router";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Textarea, Spinner } from "../ui";

interface CustomerAiWidgetProps {
  collapsed?: boolean;
  onExpand?: () => void;
}

const CHAT_ID = "customer-ai-widget";

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

export const CustomerAiWidget = ({ collapsed: initialCollapsed = true, onExpand }: CustomerAiWidgetProps) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(!initialCollapsed);
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

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && onExpand) onExpand();
  };

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

  const handleOpenFull = () => {
    navigate("/customer-assistant");
  };

  return (
    <div className="customer-ai-widget" data-ai-context={JSON.stringify({ section: "customer-ai-widget" })}>
      {!isOpen ? (
        <button
          className="customer-ai-widget__button"
          onClick={handleToggle}
          aria-label={intl.formatMessage({ id: "customer_ai.widget_label", defaultMessage: "Need help? Chat with us" })}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
      ) : (
        <div className="customer-ai-widget__panel">
          {/* Header */}
          <div className="ai-header">
            <div className="ai-header__brand">
              <span className="ai-header__brand-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </span>
              <span className="ai-header__brand-text">
                {intl.formatMessage({ id: "customer_ai.title", defaultMessage: "Customer Assistant" })}
              </span>
            </div>
            <div className="ai-header__actions">
              <button
                className="ai-header__btn"
                onClick={handleOpenFull}
                aria-label={intl.formatMessage({ id: "customer_ai.expand", defaultMessage: "Open full chat" })}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
              <button
                className="ai-header__btn"
                onClick={handleToggle}
                aria-label={intl.formatMessage({ id: "customer_ai.close", defaultMessage: "Close" })}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="customer-ai-widget__messages ai-messages">
            {messages.length === 0 && (
              <div className="ai-empty">
                <span className="ai-empty__icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </span>
                <span className="ai-empty__text">
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

          {/* Input */}
          <div className="customer-ai-widget__input ai-footer">
            <div className="ai-footer__row">
              <div className="ai-footer__input" style={{ flex: 1 }}>
                <Textarea
                  placeholder={intl.formatMessage({ id: "customer_ai.placeholder", defaultMessage: "Type your message..." })}
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  rows={1}
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
      )}
    </div>
  );
};