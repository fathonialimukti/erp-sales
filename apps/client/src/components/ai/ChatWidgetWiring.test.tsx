import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import type { ReactNode } from "react";

import type { UIMessage } from "ai";
import type { ChatConfirmActionWidget } from "@repo/schemas/chatWidget";

// This SDK version types UIMessagePart generically — derive it from UIMessage.
type MessagePart = UIMessage["parts"][number];

import {
  ChatWidgetPart,
  WIDGET_TOOL_NAMES,
  actionResultTurn,
  createWidgetTurnHandlers,
  formResponseTurn,
  lastAssistantStepHasWidgetTool,
  rejectConfirmationTurn,
  resolveActionResultForConfirmation,
  resolveWidgetPartWidget,
  updateWidgetPartOutput,
} from "./ChatWidgetWiring";

// ChatWidgetRenderer renders the real cards. Card mutations only run on user
// interaction; the module-level trpc client just needs to exist.
const mocks = vi.hoisted(() => ({
  submitFormResponse: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpcClient: {
    aiChat: {
      submitFormResponse: { mutate: mocks.submitFormResponse },
      confirmAction: { mutate: vi.fn() },
      rejectAction: { mutate: vi.fn() },
      executeConfirmedAction: { mutate: vi.fn() },
    },
    backup: { create: { mutate: vi.fn() } },
  },
}));

vi.mock("@/components/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

// ULID fixtures — Crockford base32 only (zod's ulid regex excludes I/L/O/Q/S/U).
const FORM_WIDGET_ID = "01JHW1DG3T000000000000000X";
const CONFIRM_WIDGET_ID = "01JC0NF1RM000000000000000X";
const CONFIRMATION_ID = "01JG4T3000000000000000000X";
const UNKNOWN_WIDGET_ID = "01JZER0PAD000000000000000X";

const wrap = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <IntlProvider locale="en">{ui}</IntlProvider>
    </QueryClientProvider>,
  );
};

const formWidget = {
  type: "form-request",
  id: FORM_WIDGET_ID,
  title: "Tell me more",
  fields: [{ key: "name", label: "Project name", type: "text", required: true }],
  status: "pending",
};

const confirmWidget = {
  type: "confirm-action",
  id: CONFIRM_WIDGET_ID,
  title: "Run admin SQL",
  action: { kind: "run-sql", sql: "UPDATE skus SET active = false", readOnly: false },
  requiresBackupAck: true,
  confirmationId: CONFIRMATION_ID,
  status: "pending",
} satisfies ChatConfirmActionWidget;

const toolPart = (toolName: string, output: unknown, state = "output-available") =>
  ({
    type: `tool-${toolName}`,
    toolCallId: `call-${toolName}`,
    state,
    input: {},
    output,
  }) as unknown as MessagePart;

const stepPart = { type: "step-start" } as MessagePart;
const textPart = { type: "text", text: "Need a detail, please." } as MessagePart;

/** Assistant thread carrying one widget tool part (after a step-start). */
const widgetThread = (toolName = "request_form_input", output: unknown = formWidget): UIMessage[] => [
  { id: "u1", role: "user", parts: [textPart] } as unknown as UIMessage,
  {
    id: "a1",
    role: "assistant",
    parts: [stepPart, toolPart(toolName, output)],
  } as unknown as UIMessage,
];

const makeHandlers = () => {
  const setMessages = vi.fn();
  const sendMessage = vi.fn();
  return { setMessages, sendMessage, turns: createWidgetTurnHandlers(setMessages, sendMessage) };
};

/** Apply the last setMessages updater to a fresh widget thread. */
const appliedThread = (
  setMessages: ReturnType<typeof makeHandlers>["setMessages"],
  thread: UIMessage[] = widgetThread(),
) => {
  const updater = setMessages.mock.calls.at(-1)?.[0] as
    | ((prev: UIMessage[]) => UIMessage[])
    | undefined;
  return updater ? updater(thread) : undefined;
};

const widgetPartOutput = (thread: UIMessage[] | undefined) =>
  (thread?.[1]?.parts[1] as { output?: Record<string, unknown> } | undefined)?.output;

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.submitFormResponse.mockResolvedValue({
    widgetId: FORM_WIDGET_ID,
    values: { name: "Apollo" },
  });
});

describe("ChatWidgetPart (bubble render path)", () => {
  it("renders the form card for a valid form-request tool part", () => {
    wrap(<ChatWidgetPart part={toolPart("request_form_input", formWidget)} chatId="ai-chat-1" />);

    expect(screen.getByText("Tell me more")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("renders the confirm card for a valid confirm-action tool part", () => {
    wrap(
      <ChatWidgetPart
        part={toolPart("request_confirmation", confirmWidget)}
        chatId="ai-admin-chat-1"
      />,
    );

    // Exact SQL verbatim (SPEC §7) + the confirm gate action.
    expect(screen.getByText(confirmWidget.action.sql)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm & run/i })).toBeInTheDocument();
  });

  it("renders nothing for a malformed widget output", () => {
    const { container } = wrap(
      <ChatWidgetPart
        part={toolPart("request_form_input", { type: "form-request", junk: true })}
        chatId="ai-chat-1"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for non-widget tool parts", () => {
    const { container } = wrap(
      <ChatWidgetPart part={toolPart("queryDatabase", { rows: [] })} chatId="ai-chat-1" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing before the tool part reaches output-available", () => {
    const { container } = wrap(
      <ChatWidgetPart
        part={toolPart("request_form_input", formWidget, "input-available")}
        chatId="ai-chat-1"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("submit success triggers the generation entry exactly once with the structured turn", async () => {
    const { setMessages, sendMessage, turns } = makeHandlers();
    wrap(
      <ChatWidgetPart
        part={toolPart("request_form_input", formWidget)}
        chatId="ai-chat-1"
        onSubmitted={turns.onSubmitted}
        onCancelled={turns.onCancelled}
        onStatusChange={turns.onStatusChange}
        onResult={turns.onResult}
      />,
    );

    // Required fields append a visual asterisk — match the label by prefix.
    fireEvent.change(screen.getByLabelText(/Project name/), { target: { value: "Apollo" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage).toHaveBeenCalledWith(
      formResponseTurn({ widgetId: FORM_WIDGET_ID, values: { name: "Apollo" } }),
    );
    expect(widgetPartOutput(appliedThread(setMessages))).toEqual({
      ...formWidget,
      status: "submitted",
      values: { name: "Apollo" },
    });
  });
});

describe("structured turns (createWidgetTurnHandlers)", () => {
  it("onSubmitted stashes status+values on the widget output and fires form_response once", () => {
    const { setMessages, sendMessage, turns } = makeHandlers();
    turns.onSubmitted({ widgetId: FORM_WIDGET_ID, values: { name: "Apollo" } });

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      text: "",
      metadata: {
        form_response: { widgetId: FORM_WIDGET_ID, values: { name: "Apollo" } },
      },
    });
    expect(widgetPartOutput(appliedThread(setMessages))).toEqual({
      ...formWidget,
      status: "submitted",
      values: { name: "Apollo" },
    });
  });

  it("onCancelled persists 'cancelled' and fires no turn", () => {
    const { setMessages, sendMessage, turns } = makeHandlers();
    turns.onCancelled(FORM_WIDGET_ID);

    expect(sendMessage).not.toHaveBeenCalled();
    expect(widgetPartOutput(appliedThread(setMessages))).toEqual({
      ...formWidget,
      status: "cancelled",
    });
  });

  it("onStatusChange('confirmed') persists status but fires no turn (mid-execution reload state)", () => {
    const { setMessages, sendMessage, turns } = makeHandlers();
    turns.onStatusChange(confirmWidget, "confirmed");

    expect(sendMessage).not.toHaveBeenCalled();
    // The confirm widget lives on a confirm-action thread, not the form thread.
    expect(
      widgetPartOutput(appliedThread(setMessages, widgetThread("request_confirmation", confirmWidget))),
    ).toEqual({
      ...confirmWidget,
      status: "confirmed",
    });
  });

  it("onStatusChange('rejected') fires the confirmation turn once", () => {
    const { sendMessage, turns } = makeHandlers();
    turns.onStatusChange(confirmWidget, "rejected");

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(rejectConfirmationTurn(confirmWidget));
  });

  it("onResult fires the action_result turn once with the result verbatim", () => {
    const { sendMessage, turns } = makeHandlers();
    const result = {
      confirmationId: CONFIRMATION_ID,
      status: "executed",
      sql: confirmWidget.action.sql,
      rowCount: 3,
      truncated: false,
      durationMs: 42,
    } as const;
    turns.onResult(result);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const call = sendMessage.mock.calls[0]?.[0] as { metadata: { action_result: unknown } };
    expect(call.metadata.action_result).toBe(result);
  });

  it("turn builders match the Task 4 renderStructuredTurns shapes", () => {
    expect(formResponseTurn({ widgetId: FORM_WIDGET_ID, values: { a: 1 } })).toEqual({
      text: "",
      metadata: { form_response: { widgetId: FORM_WIDGET_ID, values: { a: 1 } } },
    });
    expect(rejectConfirmationTurn(confirmWidget)).toEqual({
      text: "",
      metadata: {
        confirmation: {
          widgetId: CONFIRM_WIDGET_ID,
          confirmationId: CONFIRMATION_ID,
          decision: "reject",
        },
      },
    });
    const result = {
      confirmationId: CONFIRMATION_ID,
      status: "failed",
      sql: "S",
      truncated: true,
      durationMs: 1,
      error: { message: "boom", rolledBack: true },
    } as const;
    expect(actionResultTurn(result)).toEqual({ text: "", metadata: { action_result: result } });
  });
});

describe("auto-continuation exclusion (sendAutomaticallyWhen seam)", () => {
  const assistantMessage = (parts: unknown[]): UIMessage =>
    ({ id: "a1", role: "assistant", parts }) as unknown as UIMessage;

  const widgetStep = (state = "output-available") =>
    assistantMessage([stepPart, toolPart("request_confirmation", confirmWidget, state)]);

  it("returns true when the last step ends with a widget tool call", () => {
    expect(lastAssistantStepHasWidgetTool([widgetStep()])).toBe(true);
    expect(lastAssistantStepHasWidgetTool([widgetStep("output-error")])).toBe(true);
  });

  it("returns false for non-widget tool steps", () => {
    const queryStep = assistantMessage([stepPart, toolPart("queryDatabase", { rows: [] })]);
    expect(lastAssistantStepHasWidgetTool([queryStep])).toBe(false);
  });

  it("returns false when a user turn follows the widget step", () => {
    expect(
      lastAssistantStepHasWidgetTool([
        widgetStep(),
        { id: "u1", role: "user", parts: [textPart] } as unknown as UIMessage,
      ]),
    ).toBe(false);
  });

  it("returns false for empty or non-assistant tails", () => {
    expect(lastAssistantStepHasWidgetTool([])).toBe(false);
    expect(
      lastAssistantStepHasWidgetTool([
        { id: "u", role: "user", parts: [] } as unknown as UIMessage,
      ]),
    ).toBe(false);
  });

  it("widget tool names registry matches the server tools", () => {
    expect(WIDGET_TOOL_NAMES.has("request_form_input")).toBe(true);
    expect(WIDGET_TOOL_NAMES.has("request_confirmation")).toBe(true);
    expect(WIDGET_TOOL_NAMES.has("queryDatabase")).toBe(false);
  });
});

describe("updateWidgetPartOutput", () => {
  it("patches the matching widget tool-part output only", () => {
    const messages = widgetThread();
    const patched = updateWidgetPartOutput(messages, FORM_WIDGET_ID, {
      status: "submitted",
      values: { name: "Apollo" },
    });

    expect(widgetPartOutput(patched)).toEqual({
      ...formWidget,
      status: "submitted",
      values: { name: "Apollo" },
    });
    // Untouched messages stay referentially identical.
    expect(patched[0]).toBe(messages[0]);
    // Unknown widget id → no change anywhere.
    expect(
      updateWidgetPartOutput(messages, UNKNOWN_WIDGET_ID, { status: "cancelled" }),
    ).toBe(messages);
  });
});

describe("resolveWidgetPartWidget", () => {
  it("validates against chatWidgetSchema", () => {
    expect(resolveWidgetPartWidget(toolPart("request_form_input", formWidget))).toMatchObject({
      id: FORM_WIDGET_ID,
    });
    expect(resolveWidgetPartWidget(toolPart("request_confirmation", confirmWidget))).toMatchObject({
      id: CONFIRM_WIDGET_ID,
      confirmationId: CONFIRMATION_ID,
    });
    expect(resolveWidgetPartWidget(toolPart("request_form_input", { broken: true }))).toBeNull();
    expect(
      resolveWidgetPartWidget(toolPart("request_form_input", formWidget, "input-available")),
    ).toBeNull();
    expect(resolveWidgetPartWidget(toolPart("queryDatabase", {}))).toBeNull();
  });
});

describe("resolveActionResultForConfirmation (reload path, SPEC §7 re-show)", () => {
  const actionResult = {
    confirmationId: CONFIRMATION_ID,
    status: "executed",
    sql: confirmWidget.action.sql,
    rowCount: 3,
    truncated: false,
    durationMs: 12,
  } as const;

  /** Thread ending in user turns carrying the given metadata (actionResultTurn shape). */
  const resultThread = (metas: unknown[]): UIMessage[] => [
    { id: "u0", role: "user", parts: [textPart] } as unknown as UIMessage,
    {
      id: "a0",
      role: "assistant",
      parts: [stepPart, toolPart("request_confirmation", confirmWidget)],
    } as unknown as UIMessage,
    ...metas.map((metadata, index) =>
      ({
        id: `ur-${index}`,
        role: "user",
        parts: [{ type: "text", text: "" }],
        metadata,
      }) as unknown as UIMessage,
    ),
  ];

  it("finds the most recent action_result whose confirmationId matches", () => {
    const newer = { ...actionResult, rowCount: 5 };
    expect(
      resolveActionResultForConfirmation(
        resultThread([{ action_result: actionResult }, { action_result: newer }]),
        CONFIRMATION_ID,
      ),
    ).toEqual(newer);
  });

  it("returns null for absent, non-matching, or malformed action_result turns", () => {
    expect(resolveActionResultForConfirmation(resultThread([]), CONFIRMATION_ID)).toBeNull();
    expect(
      resolveActionResultForConfirmation(
        resultThread([{ action_result: actionResult }]),
        "01J0THERG4T300000000000000X",
      ),
    ).toBeNull();
    expect(
      resolveActionResultForConfirmation(resultThread([{ action_result: { junk: true } }]), CONFIRMATION_ID),
    ).toBeNull();
    expect(resolveActionResultForConfirmation(resultThread([{ junk: true }]), CONFIRMATION_ID)).toBeNull();
  });

  it("ignores assistant messages and skips malformed turns to find older valid ones", () => {
    const thread: UIMessage[] = [
      resultThread([{ action_result: actionResult }])[2],
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "re-analysis" }],
        metadata: { action_result: { ...actionResult, rowCount: 999 } },
      } as unknown as UIMessage,
      { id: "u1", role: "user", parts: [{ type: "text", text: "" }], metadata: null } as unknown as UIMessage,
    ];
    expect(resolveActionResultForConfirmation(thread, CONFIRMATION_ID)).toEqual(actionResult);
  });
});

describe("ChatWidgetPart reload result pass-through (SPEC §7)", () => {
  const executedResult = {
    confirmationId: CONFIRMATION_ID,
    status: "executed",
    sql: confirmWidget.action.sql,
    rowCount: 3,
    // rows present → the block renders the "rows returned" variant.
    rows: [{ id: 1, name: "Outlet A" }],
    truncated: false,
    durationMs: 9,
  } as const;

  const reloadedThread = (): UIMessage[] => [
    {
      id: "u0",
      role: "user",
      parts: [{ type: "text", text: "" }],
      metadata: { action_result: executedResult },
    } as unknown as UIMessage,
    {
      id: "a0",
      role: "assistant",
      parts: [stepPart, toolPart("request_confirmation", { ...confirmWidget, status: "executed" })],
    } as unknown as UIMessage,
  ];

  it("renders the confirm card WITH the result block when the thread carries a matching action_result", () => {
    wrap(
      <ChatWidgetPart
        part={toolPart("request_confirmation", { ...confirmWidget, status: "executed" })}
        chatId="ai-admin-chat-1"
        messages={reloadedThread()}
      />,
    );

    expect(screen.getByText("3 row(s) returned")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show result table/i })).toBeInTheDocument();
    // Single-render ownership: the card is the only surface rendering the block.
    expect(screen.getAllByRole("button", { name: /show result table/i })).toHaveLength(1);
  });

  it("renders no result block without the messages prop (backward-compatible seam)", () => {
    wrap(
      <ChatWidgetPart
        part={toolPart("request_confirmation", confirmWidget)}
        chatId="ai-admin-chat-1"
      />,
    );

    expect(screen.getByRole("button", { name: /confirm & run/i })).toBeInTheDocument();
    expect(screen.queryByText(/row\(s\)/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show result table/i }),
    ).not.toBeInTheDocument();
  });

  it("renders no result block when no action_result matches the widget's confirmationId", () => {
    const mismatched = reloadedThread().map((message) => ({
      ...message,
      metadata:
        message.role === "user" && (message.metadata as { action_result?: unknown })?.action_result
          ? { action_result: { ...executedResult, confirmationId: "01J0THERG4T300000000000000X" } }
          : message.metadata,
    })) as UIMessage[];
    wrap(
      <ChatWidgetPart
        part={toolPart("request_confirmation", { ...confirmWidget, status: "executed" })}
        chatId="ai-admin-chat-1"
        messages={mismatched}
      />,
    );

    expect(screen.queryByText(/row\(s\)/)).not.toBeInTheDocument();
  });
});
