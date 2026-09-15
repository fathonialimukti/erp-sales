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
import { AppSettingsPage } from "../AppSettingsPage";

const mocks = vi.hoisted(() => ({
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
  mutateApp: vi.fn(),
}));

vi.mock("@/lib/hooks/useSettings", () => ({
  useAppSettings: () => ({
    data: mocks.appData,
    isLoading: false,
    isError: false,
  }),
  useUpdateAppSettings: () => ({
    mutate: mocks.mutateApp,
    isPending: false,
  }),
  useUserSettings: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useUpdateUserSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

const renderApp = () => {
  const store = createStore();
  store.set(authUserAtom, {
    id: "user-1",
    email: "admin@example.com",
    username: "admin",
    name: "Admin",
    permissions: ["settings@app@read", "settings@app@update"],
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

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AppSettingsPage", () => {
  it("renders all 4 sections", async () => {
    renderApp();

    expect(await screen.findByText("General")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
  });

  it("form submission calls updateAppSettings.mutate", async () => {
    renderApp();

    const companyInput = await screen.findByLabelText(/company name/i);
    fireEvent.change(companyInput, { target: { value: "Acme Updated" } });

    const save = screen.getByRole("button", { name: /save changes/i });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() =>
      expect(mocks.mutateApp).toHaveBeenCalledTimes(1),
    );
    expect(mocks.mutateApp.mock.calls[0]?.[0]).toMatchObject({
      companyName: "Acme Updated",
    });
  });
});
