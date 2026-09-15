import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import { Provider, createStore } from "jotai";

import { authUserAtom } from "@/lib/atoms";
import { AppSettingsPage, normalizeSecure } from "../AppSettingsPage";

/**
 * Legacy settings store returned by `settings.get`. `smtp.secure` is
 * deliberately MISSING so the form must fall back to the port heuristic
 * (2525 → STARTTLS), and `smtp.pass` is masked to `{ hasValue }` — the
 * plaintext secret never reaches the client.
 */
const legacyFixture = {
  ai: {
    baseUrl: "http://ai.local/v1",
    model: "chatbot",
    multimodalEnabled: false,
    globalRpm: null,
    apiKey: { hasValue: true },
    embeddingBaseUrl: "",
    embeddingModel: "",
    embeddingApiKey: { hasValue: false },
    embeddingDimensions: 1536,
  },
  smtp: {
    host: "smtp-relay.brevo.com",
    port: 2525,
    user: "aetherglo",
    pass: { hasValue: true },
    from: "AetherGlo Sales <info@aetherglo.com>",
    domain: "aetherglo.com",
  },
  emailAgent: {
    title: "Sales Representative",
    company: "AetherGlo",
    maxThreadChars: 12000,
  },
  system: { aiSystemEmail: "ai-system@mail.com", systemUserId: "" },
  company: {},
  general: {},
};

const mocks = vi.hoisted(() => ({
  legacyGet: vi.fn(),
  legacyUpdate: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  appData: {
    companyName: "Acme Corp",
    logoUrl: null,
    defaultLanguage: "en",
    timezone: "Asia/Jakarta",
    dateFormat: "YYYY-MM-DD",
    numberFormat: "1,234.56",
    defaultCurrency: "IDR",
    defaultTheme: "system",
    accentColor: "#3b82f6",
    sidebarCollapsed: false,
    emailNotifications: true,
    defaultNotificationFrequency: "daily",
    announcement: null,
    sessionTimeout: 60,
    minPasswordLength: 8,
    enforceTwoFactor: false,
    allowedLoginMethods: ["password"],
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpcClient: {
    settings: {
      get: { query: mocks.legacyGet },
      update: { mutate: mocks.legacyUpdate },
      getApp: { query: vi.fn() },
      updateApp: { mutate: vi.fn() },
    },
  },
}));

vi.mock("@/lib/hooks/useSettings", () => ({
  useAppSettings: () => ({
    data: mocks.appData,
    isLoading: false,
    isError: false,
  }),
  useUpdateAppSettings: () => ({ mutate: vi.fn(), isPending: false }),
  useUserSettings: () => ({ data: undefined, isLoading: false, isError: false }),
  useUpdateUserSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/useToast", () => ({
  useToast: () => mocks.toast,
}));

const renderApp = () => {
  const store = createStore();
  store.set(authUserAtom, {
    id: "user-1",
    email: "admin@example.com",
    username: "admin",
    name: "Admin",
    permissions: [
      "settings@app@read",
      "settings@app@update",
      "settings@read",
      "settings@update",
    ],
    roleName: "admin",
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <IntlProvider locale="en">
          <AppSettingsPage />
        </IntlProvider>
      </QueryClientProvider>
    </Provider>,
  );
};

const encryptionTrigger = () => {
  const el = document.getElementById("smtp-secure");
  if (!el) throw new Error("Encryption select trigger not found");
  return el;
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.legacyGet.mockResolvedValue(legacyFixture);
  mocks.legacyUpdate.mockResolvedValue({ success: true });
});

describe("AppSettingsPage SMTP form", () => {
  it("loads stored host/port and infers encryption from the port", async () => {
    renderApp();

    const host = await screen.findByLabelText(/^host$/i);
    expect(host).toHaveValue("smtp-relay.brevo.com");

    const port = screen.getByLabelText(/^port$/i);
    expect(port).toHaveValue(2525);

    // `smtp.secure` is unset server-side → 2525 infers STARTTLS.
    expect(encryptionTrigger()).toHaveTextContent("STARTTLS");
    // The selector is a labelled control (a11y + visible label).
    expect(screen.getByLabelText(/encryption/i)).toBe(encryptionTrigger());
  });

  it("does not echo the stored password and only sends a typed value", async () => {
    renderApp();

    const pass = await screen.findByLabelText(/password \/ api key/i);
    expect(pass).toHaveValue("");
    expect(pass).toHaveAttribute("type", "password");
    // Masked configured state, never the plaintext secret.
    expect(pass).toHaveAttribute("placeholder", "••••••");

    fireEvent.change(screen.getByLabelText(/^host$/i), {
      target: { value: "smtp.mailgun.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(mocks.legacyUpdate).toHaveBeenCalledTimes(1));
    const patch = mocks.legacyUpdate.mock.calls[0]?.[0];
    expect(patch.smtp.pass).toBeUndefined();
    expect(mocks.toast.success).toHaveBeenCalled();
  });

  it("persists host, port (as a number) and encryption", async () => {
    renderApp();

    fireEvent.change(await screen.findByLabelText(/^host$/i), {
      target: { value: "smtp.example.net" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(mocks.legacyUpdate).toHaveBeenCalledTimes(1));
    const patch = mocks.legacyUpdate.mock.calls[0]?.[0];
    expect(patch.smtp).toMatchObject({
      host: "smtp.example.net",
      port: 2525,
      secure: "starttls",
    });
    expect(typeof patch.smtp.port).toBe("number");
  });

  it("keeps encryption in sync when the port changes to an implicit-TLS port", async () => {
    renderApp();

    const port = await screen.findByLabelText(/^port$/i);
    fireEvent.change(port, { target: { value: "465" } });

    expect(encryptionTrigger()).toHaveTextContent("SSL/TLS");

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(mocks.legacyUpdate).toHaveBeenCalledTimes(1));
    const patch = mocks.legacyUpdate.mock.calls[0]?.[0];
    expect(patch.smtp).toMatchObject({ port: 465, secure: "ssl" });
  });

  it("surfaces an out-of-range port as an inline error", async () => {
    renderApp();

    const port = await screen.findByLabelText(/^port$/i);
    fireEvent.change(port, { target: { value: "70000" } });

    expect(port).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /between 1 and 65535/i,
    );
  });

  it("normalizes legacy secure aliases", () => {
    expect(normalizeSecure("tls", 587)).toBe("ssl");
    expect(normalizeSecure("start-tls", 587)).toBe("starttls");
    expect(normalizeSecure("none", 587)).toBe("none");
    expect(normalizeSecure(undefined, 465)).toBe("ssl");
    expect(normalizeSecure(undefined, 2525)).toBe("starttls");
  });
});
