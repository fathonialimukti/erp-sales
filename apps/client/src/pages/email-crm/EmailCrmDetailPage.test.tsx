import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";

import { authUserAtom } from "../../lib/atoms";
import {
  EmailCrmDetailPage,
  getEmailCrmDetailErrorCode,
  resolveEmailCrmDetailErrorState,
  shouldRetryEmailCrmDetail,
} from "./EmailCrmDetailPage";

const { REPRO_ID, routerMocks } = vi.hoisted(() => {
  const REPRO_ID = "01M2HVDFB7600RYH6F2WF231QV";
  return {
    REPRO_ID,
    routerMocks: {
      id: REPRO_ID as string | undefined,
      navigate: vi.fn(),
    },
  };
});

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useParams: () => (routerMocks.id === undefined ? {} : { id: routerMocks.id }),
    useNavigate: () => routerMocks.navigate,
  };
});

const trpcMocks = vi.hoisted(() => ({
  detailQuery: vi.fn(),
}));

vi.mock("../../lib/trpc", () => ({
  trpcClient: {
    emailCrm: {
      detail: { query: trpcMocks.detailQuery },
      sendMessage: { mutate: vi.fn() },
      suggestReply: { mutate: vi.fn() },
      retryAgent: { mutate: vi.fn() },
      delete: { mutate: vi.fn() },
    },
  },
}));

vi.mock("../../components/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock("@/hooks/useGeneralSettings", () => ({
  useGeneralSettings: () => ({ multimodalEnabled: false }),
}));

const rpcError = (code: string) =>
  Object.assign(new Error(code), { data: { code } });

const detailFixture = {
  id: REPRO_ID,
  email: "buyer@example.com",
  subject: "Repro subject",
  status: "OPEN",
  priority: "NORMAL",
  sentiment: null,
  tags: [],
  lastMessageAt: null,
  agentStatus: "IDLE",
  agentError: null,
  customer: null,
  messages: [],
  salesOrders: [],
};

const renderPage = (ui: ReactNode = <EmailCrmDetailPage />) => {
  const store = createStore();
  store.set(authUserAtom, {
    id: "user-1",
    email: "admin@example.com",
    username: "admin",
    name: "Admin",
    permissions: ["email-crm@read", "email-crm@update", "email-crm@delete"],
    roleName: "Sales",
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <IntlProvider locale="en">{ui}</IntlProvider>
      </QueryClientProvider>
    </Provider>,
  );
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  routerMocks.id = REPRO_ID;
});

describe("getEmailCrmDetailErrorCode", () => {
  it("extracts the tRPC wire code", () => {
    expect(getEmailCrmDetailErrorCode(rpcError("NOT_FOUND"))).toBe("NOT_FOUND");
  });

  it("returns undefined for plain errors", () => {
    expect(getEmailCrmDetailErrorCode(new Error("boom"))).toBeUndefined();
    expect(getEmailCrmDetailErrorCode(null)).toBeUndefined();
    expect(getEmailCrmDetailErrorCode({ data: {} })).toBeUndefined();
  });
});

describe("shouldRetryEmailCrmDetail", () => {
  it.each(["NOT_FOUND", "BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED"])(
    "never retries terminal code %s",
    (code) => {
      expect(shouldRetryEmailCrmDetail(0, rpcError(code))).toBe(false);
    },
  );

  it("retries transient failures, then gives up", () => {
    expect(shouldRetryEmailCrmDetail(0, rpcError("INTERNAL_SERVER_ERROR"))).toBe(true);
    expect(shouldRetryEmailCrmDetail(0, new Error("network"))).toBe(true);
    expect(shouldRetryEmailCrmDetail(2, new Error("network"))).toBe(false);
  });
});

describe("resolveEmailCrmDetailErrorState", () => {
  it("maps codes to not-found / forbidden / load-failed", () => {
    expect(resolveEmailCrmDetailErrorState("NOT_FOUND")).toBe("not-found");
    expect(resolveEmailCrmDetailErrorState("BAD_REQUEST")).toBe("not-found");
    expect(resolveEmailCrmDetailErrorState("FORBIDDEN")).toBe("forbidden");
    expect(resolveEmailCrmDetailErrorState("UNAUTHORIZED")).toBe("forbidden");
    expect(resolveEmailCrmDetailErrorState("INTERNAL_SERVER_ERROR")).toBe("load-failed");
    expect(resolveEmailCrmDetailErrorState(undefined)).toBe("load-failed");
  });
});

describe("EmailCrmDetailPage states", () => {
  it("shows a skeleton while loading", () => {
    trpcMocks.detailQuery.mockImplementation(() => new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Conversation not found")).not.toBeInTheDocument();
  });

  it("renders content for a valid id", async () => {
    trpcMocks.detailQuery.mockResolvedValue(detailFixture);
    renderPage();
    expect(await screen.findAllByText("Repro subject")).not.toHaveLength(0);
    expect(screen.getAllByText("buyer@example.com")).not.toHaveLength(0);
    expect(
      document.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBe(0);
  });

  it("transitions loading to not-found with a back action on NOT_FOUND", async () => {
    trpcMocks.detailQuery.mockRejectedValue(rpcError("NOT_FOUND"));
    renderPage();
    expect(await screen.findAllByText("Conversation not found")).not.toHaveLength(0);
    expect(
      document.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBe(0);
    expect(trpcMocks.detailQuery).toHaveBeenCalledWith({ id: REPRO_ID });
    fireEvent.click(screen.getAllByRole("button", { name: "Back" })[0]!);
    expect(routerMocks.navigate).toHaveBeenCalledWith("/email-crm");
  });

  it("shows the forbidden state on FORBIDDEN", async () => {
    trpcMocks.detailQuery.mockRejectedValue(rpcError("FORBIDDEN"));
    renderPage();
    expect(await screen.findAllByText("Access denied")).not.toHaveLength(0);
    expect(
      document.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBe(0);
  });

  it("shows the missing-id state without calling detail when id is absent", () => {
    routerMocks.id = undefined;
    renderPage();
    expect(
      screen.getAllByText("No conversation id was provided in the URL."),
    ).not.toHaveLength(0);
    expect(trpcMocks.detailQuery).not.toHaveBeenCalled();
  });
});
