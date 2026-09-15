import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import type { ReactNode } from "react";

import type {
  ChatActionResult,
  ChatConfirmActionWidget,
} from "@repo/schemas/chatWidget";
import { ChatConfirmCard } from "./ChatConfirmCard";
import { ChatActionResultBlock } from "./ChatActionResultBlock";

// Mutation mocks — one shared `order` log asserts the confirm → execute call
// order mandated by SPEC §5 (confirmAction lands BEFORE executeConfirmedAction).
const order: string[] = [];
const confirmMutate = vi.fn();
const rejectMutate = vi.fn();
const executeMutate = vi.fn();
const backupCreateMutate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpcClient: {
    aiChat: {
      confirmAction: {
        mutate: (...args: unknown[]) => {
          order.push("confirm");
          return confirmMutate(...(args as []));
        },
      },
      rejectAction: {
        mutate: (...args: unknown[]) => {
          order.push("reject");
          return rejectMutate(...(args as []));
        },
      },
      executeConfirmedAction: {
        mutate: (...args: unknown[]) => {
          order.push("execute");
          return executeMutate(...(args as []));
        },
      },
    },
    backup: {
      create: {
        mutate: (...args: unknown[]) => {
          order.push("backup");
          return backupCreateMutate(...(args as []));
        },
      },
    },
  },
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("@/components/useToast", () => ({
  useToast: () => ({
    success: toastSuccess,
    error: toastError,
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

const wrap = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <IntlProvider locale="en">{ui}</IntlProvider>
    </QueryClientProvider>,
  );
};

const WIDGET_ID = "01JWIDGETCONFIRM000000000X";
const CONFIRMATION_ID = "01JCONFIRMGATE000000000000X";

const widget = (over: Partial<ChatConfirmActionWidget> = {}): ChatConfirmActionWidget => ({
  type: "confirm-action",
  id: WIDGET_ID,
  title: "Deactivate stale outlet",
  description: "Soft-disables outlets with no visits in 180 days.",
  action: {
    kind: "run-sql",
    sql: 'UPDATE crm_outlets SET "isActive" = false WHERE id = 42;',
    readOnly: false,
  },
  requiresBackupAck: true,
  confirmationId: CONFIRMATION_ID,
  status: "pending",
  ...over,
});

const result = (over: Partial<ChatActionResult> = {}): ChatActionResult => ({
  confirmationId: CONFIRMATION_ID,
  status: "executed",
  sql: 'SELECT id, name FROM crm_outlets WHERE "isActive" = false;',
  rowCount: 3,
  rows: [
    { id: 1, name: "Outlet A" },
    { id: 2, name: "Outlet B" },
    { id: 3, name: "Outlet C" },
  ],
  truncated: false,
  durationMs: 12,
  ...over,
});

beforeEach(() => {
  cleanup();
  order.length = 0;
  confirmMutate.mockReset();
  rejectMutate.mockReset();
  executeMutate.mockReset();
  backupCreateMutate.mockReset();
  confirmMutate.mockResolvedValue({ id: CONFIRMATION_ID, status: "confirmed" });
  rejectMutate.mockResolvedValue({ id: CONFIRMATION_ID, status: "rejected" });
  executeMutate.mockResolvedValue(result());
  backupCreateMutate.mockResolvedValue({ id: "backup-1" });
  toastSuccess.mockClear();
  toastError.mockClear();
});

describe("ChatConfirmCard", () => {
  it("renders the exact SQL verbatim in a code block with a write badge", () => {
    wrap(<ChatConfirmCard chatId="chat-1" widget={widget()} />);

    expect(
      screen.getByText('UPDATE crm_outlets SET "isActive" = false WHERE id = 42;'),
    ).toBeInTheDocument();
    expect(screen.getByText("Write")).toBeInTheDocument();
    expect(screen.queryByText("Read only")).not.toBeInTheDocument();
  });

  it("shows a read-only badge and no backup checkbox for reads", () => {
    wrap(
      <ChatConfirmCard
        chatId="chat-1"
        widget={widget({
          action: { kind: "run-sql", sql: "SELECT count(*) FROM crm_customers;", readOnly: true },
          requiresBackupAck: false,
        })}
      />,
    );

    expect(screen.getByText("SELECT count(*) FROM crm_customers;")).toBeInTheDocument();
    expect(screen.getByText("Read only")).toBeInTheDocument();
    expect(screen.queryByLabelText("I have verified the backup")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeEnabled();
  });

  it("gates Confirm on the mandatory backup checkbox for writes", () => {
    wrap(<ChatConfirmCard chatId="chat-1" widget={widget()} />);

    const confirm = screen.getByRole("button", { name: /confirm/i });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByLabelText("I have verified the backup"));
    expect(confirm).toBeEnabled();
  });

  it("runs confirmAction then executeConfirmedAction in order with backupAck: true", async () => {
    executeMutate.mockResolvedValue(
      result({ status: "executed", rowCount: 1, rows: undefined, truncated: false }),
    );
    wrap(<ChatConfirmCard chatId="chat-1" widget={widget()} />);

    fireEvent.click(screen.getByLabelText("I have verified the backup"));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(order).toEqual(["confirm", "execute"]));
    expect(confirmMutate).toHaveBeenCalledWith({
      confirmationId: CONFIRMATION_ID,
      backupAck: true,
    });
    expect(executeMutate).toHaveBeenCalledWith({ confirmationId: CONFIRMATION_ID });
  });

  it("calls rejectAction and never executes on reject", async () => {
    wrap(<ChatConfirmCard chatId="chat-1" widget={widget()} />);

    fireEvent.click(screen.getByRole("button", { name: /reject/i }));

    await waitFor(() => expect(rejectMutate).toHaveBeenCalledWith({ confirmationId: CONFIRMATION_ID }));
    expect(executeMutate).not.toHaveBeenCalled();
    expect(order).toEqual(["reject"]);
  });

  it("shows the optional backup shortcut wired to backup.create", async () => {
    wrap(<ChatConfirmCard chatId="chat-1" widget={widget()} />);

    fireEvent.click(screen.getByRole("button", { name: /create backup now/i }));

    await waitFor(() => expect(backupCreateMutate).toHaveBeenCalledTimes(1));
    expect(order[0]).toBe("backup");
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Backup created"));
  });

  it("renders consumed statuses read-only without live actions", () => {
    for (const status of ["confirmed", "executed", "failed", "rejected"] as const) {
      wrap(<ChatConfirmCard chatId="chat-1" widget={widget({ status })} />);
      expect(screen.queryByRole("button", { name: /confirm/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
      expect(screen.getByText(/confirmed|executed|failed|rejected/i)).toBeInTheDocument();
      cleanup();
    }
  });

  it("maps replay errors (BAD_REQUEST) to the expired state + toast", async () => {
    confirmMutate.mockRejectedValue({ message: "already resolved", data: { code: "BAD_REQUEST" } });
    wrap(<ChatConfirmCard chatId="chat-1" widget={widget()} />);

    fireEvent.click(screen.getByLabelText("I have verified the backup"));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("This action was already handled or expired."),
    );
    expect(screen.getByText("This action was already handled or expired.")).toBeInTheDocument();
  });

  it("still executes a read-only confirmation without any backup checkbox", async () => {
    wrap(
      <ChatConfirmCard
        chatId="chat-1"
        widget={widget({
          action: { kind: "run-sql", sql: "SELECT 1;", readOnly: true },
          requiresBackupAck: false,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(order).toEqual(["confirm", "execute"]));
    expect(confirmMutate).toHaveBeenCalledWith({
      confirmationId: CONFIRMATION_ID,
      backupAck: false,
    });
  });

  it("renders the result block (row count + collapsible table) after execution", async () => {
    wrap(<ChatConfirmCard chatId="chat-1" widget={widget()} />);

    fireEvent.click(screen.getByLabelText("I have verified the backup"));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() =>
      expect(screen.getByText("3 row(s) returned")).toBeInTheDocument(),
    );
    // Collapsed by default — the table opens on demand.
    expect(screen.queryByText("Outlet A")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /show result table/i }));
    expect(screen.getByText("Outlet A")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /show result table/i })).toHaveLength(1);
  });

  it("renders the result block from the result prop on reload", () => {
    wrap(
      <ChatConfirmCard
        chatId="chat-1"
        widget={widget({ status: "executed" })}
        result={result({ rowCount: 3, rows: [{ id: 1, name: "Outlet A" }] })}
      />,
    );

    expect(screen.getByText("Executed")).toBeInTheDocument();
    expect(screen.getByText("3 row(s) returned")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /show result table/i }));
    expect(screen.getByText("Outlet A")).toBeInTheDocument();
    // Reloaded card stays read-only + single-render ownership.
    expect(screen.queryByRole("button", { name: /confirm/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /show result table/i })).toHaveLength(1);
  });

  it("prefers the freshest in-session result over the reload prop", async () => {
    executeMutate.mockResolvedValue(
      result({ status: "executed", rowCount: 1, rows: undefined, truncated: false }),
    );
    wrap(
      <ChatConfirmCard chatId="chat-1" widget={widget()} result={result({ rowCount: 3 })} />,
    );

    fireEvent.click(screen.getByLabelText("I have verified the backup"));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(screen.getByText("1 row(s) affected")).toBeInTheDocument());
    expect(screen.queryByText("3 row(s) returned")).not.toBeInTheDocument();
  });

  it("ignores a result prop whose confirmationId does not match the widget", () => {
    wrap(
      <ChatConfirmCard
        chatId="chat-1"
        widget={widget({ status: "executed" })}
        result={result({ confirmationId: "01JMISMATCH000000000000000X" })}
      />,
    );

    expect(screen.queryByText(/row\(s\)/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show result table/i }),
    ).not.toBeInTheDocument();
  });
});

describe("ChatActionResultBlock", () => {
  it("renders the executed chip + rows-returned count and a collapsible result table", () => {
    wrap(
      <ChatActionResultBlock
        result={result({ rowCount: 3, rows: [ { id: 1, name: "Outlet A" } ] })}
      />,
    );

    expect(screen.getByText("Executed")).toBeInTheDocument();
    expect(screen.getByText("3 row(s) returned")).toBeInTheDocument();
    expect(screen.queryByText("Outlet A")).not.toBeInTheDocument(); // collapsed

    fireEvent.click(screen.getByRole("button", { name: /show result table/i }));
    expect(screen.getByText("Outlet A")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "id" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "name" })).toBeInTheDocument();
  });

  it("shows rows-affected for writes and the truncated note when flagged", () => {
    wrap(
      <ChatActionResultBlock
        result={result({
          status: "executed",
          rowCount: 12,
          rows: undefined,
          truncated: true,
        })}
      />,
    );

    expect(screen.getByText("12 row(s) affected")).toBeInTheDocument();
    expect(screen.getByText("Results truncated")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show result table/i })).not.toBeInTheDocument();
  });

  it("renders the failed chip, rolled-back warning and raw error message", () => {
    wrap(
      <ChatActionResultBlock
        result={result({
          status: "failed",
          rowCount: undefined,
          rows: undefined,
          error: { message: "relation \"crm_outlett\" does not exist", rolledBack: true },
        })}
      />,
    );

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(
      screen.getByText("Transaction rolled back — no changes applied."),
    ).toBeInTheDocument();
    expect(screen.getByText(/relation "crm_outlett" does not exist/)).toBeInTheDocument();
    expect(screen.queryByText(/row\(s\)/)).not.toBeInTheDocument();
  });
});
