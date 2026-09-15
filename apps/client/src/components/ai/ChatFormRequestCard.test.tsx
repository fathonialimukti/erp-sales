import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import type { ReactNode } from "react";

import type {
  ChatFormRequestWidget,
  ChatWidget,
  ChatWidgetField,
} from "@repo/schemas/chatWidget";
import { ChatFormRequestCard } from "./ChatFormRequestCard";
import { ChatWidgetRenderer } from "./ChatWidgetRenderer";

// Task 6 owns ChatConfirmCard (parallel, disjoint file) — stub it here so the
// renderer's confirm-action branch is inert under test.
vi.mock("./ChatConfirmCard", () => ({ ChatConfirmCard: () => null }));

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpcClient: {
    aiChat: {
      submitFormResponse: {
        mutate: mocks.mutate,
      },
    },
  },
}));

vi.mock("@/components/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: mocks.toastError,
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

const WIDGET_ID = "01JFORMWIDGET0000000000000X";

const wrap = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <IntlProvider locale="en">{ui}</IntlProvider>
    </QueryClientProvider>,
  );
};

const field = (over: Partial<ChatWidgetField>): ChatWidgetField => ({
  key: "name",
  label: "Project name",
  type: "text",
  required: false,
  ...over,
});

const pendingWidget = (fields: ChatWidgetField[]): ChatFormRequestWidget => ({
  type: "form-request",
  id: WIDGET_ID,
  title: "Tell me more",
  fields,
  status: "pending",
});

beforeEach(() => {
  cleanup();
  mocks.mutate.mockReset();
  mocks.mutate.mockResolvedValue({ widgetId: WIDGET_ID, values: {} });
  mocks.toastError.mockReset();
});

describe("ChatFormRequestCard", () => {
  it("renders all six field types", () => {
    wrap(
      <ChatFormRequestCard
        chatId="chat-1"
        widget={pendingWidget([
          field({ key: "text", label: "Text", type: "text" }),
          field({ key: "textarea", label: "Essay", type: "textarea" }),
          field({ key: "number", label: "Count", type: "number" }),
          field({ key: "select", label: "Choice", type: "select", options: ["A", "B"] }),
          field({ key: "date", label: "When", type: "date" }),
          field({ key: "agree", label: "I agree", type: "checkbox" }),
        ])}
      />,
    );

    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByLabelText("Essay")).toBeInTheDocument();
    expect(screen.getByLabelText("Count")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("When")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("I agree")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument(); // select trigger
  });

  it("blocks submit until required fields are filled", () => {
    wrap(
      <ChatFormRequestCard
        chatId="chat-1"
        widget={pendingWidget([field({ required: true })])}
      />,
    );

    const submit = screen.getByRole("button", { name: /submit/i });
    expect(submit).toBeDisabled();
    // Required fields append a visual asterisk — match the label by prefix.
    fireEvent.change(screen.getByLabelText(/Project name/), { target: { value: "Apollo" } });
    expect(submit).toBeEnabled();
  });

  it("submits the mutation with { widgetId, values }", async () => {
    wrap(
      <ChatFormRequestCard
        chatId="chat-1"
        widget={pendingWidget([
          field({ key: "name", label: "Project name", type: "text", required: true }),
          field({ key: "count", label: "Count", type: "number" }),
          field({ key: "agree", label: "I agree", type: "checkbox" }),
        ])}
      />,
    );

    // Required fields append a visual asterisk — match the label by prefix.
    fireEvent.change(screen.getByLabelText(/Project name/), { target: { value: "Apollo" } });
    fireEvent.change(screen.getByLabelText("Count"), { target: { value: "3" } });
    fireEvent.click(screen.getByLabelText("I agree"));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(mocks.mutate).toHaveBeenCalledWith({
        widgetId: WIDGET_ID,
        values: { name: "Apollo", count: 3, agree: true },
      }),
    );
  });

  it("renders locked and read-only with shown values when status is submitted", () => {
    wrap(
      <ChatFormRequestCard
        chatId="chat-1"
        widget={{
          ...pendingWidget([field({ required: true })]),
          status: "submitted",
          values: { name: "Apollo" },
        }}
      />,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Apollo")).toBeInTheDocument();
  });

  it("maps replay errors (BAD_REQUEST) to the expired message toast", async () => {
    mocks.mutate.mockRejectedValue({
      message: "already handled",
      data: { code: "BAD_REQUEST" },
    });
    wrap(
      <ChatFormRequestCard
        chatId="chat-1"
        widget={pendingWidget([field({ required: true })])}
      />,
    );

    // Required fields append a visual asterisk — match the label by prefix.
    fireEvent.change(screen.getByLabelText(/Project name/), { target: { value: "Apollo" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "This action was already handled or expired.",
      ),
    );
  });
});

describe("ChatWidgetRenderer", () => {
  it("renders a graceful fallback for unknown widget types", () => {
    wrap(
      <ChatWidgetRenderer
        chatId="chat-1"
        widget={{ type: "chart-v2", id: "01JUNKNOWN000000000000000X" } as unknown as ChatWidget}
      />,
    );

    expect(screen.getByText("Unsupported widget")).toBeInTheDocument();
  });
});
