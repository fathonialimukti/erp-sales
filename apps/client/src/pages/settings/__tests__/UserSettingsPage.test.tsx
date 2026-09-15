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
import { UserSettingsPage } from "../UserSettingsPage";

const mocks = vi.hoisted(() => ({
  userData: {
    displayName: "Jane Operator",
    avatarUrl: null,
    email: "jane@example.com",
    phone: null,
    bio: null,
    themeOverride: null,
    languageOverride: null,
    timezone: null,
    dateFormat: null,
    currency: null,
    tableDensity: "comfortable",
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    digestFrequency: "realtime",
    mutedCategories: [],
    twoFactorEnabled: false,
  },
  mutateUser: vi.fn(),
}));

vi.mock("@/lib/hooks/useSettings", () => ({
  useUserSettings: () => ({
    data: mocks.userData,
    isLoading: false,
    isError: false,
  }),
  useUpdateUserSettings: () => ({
    mutate: mocks.mutateUser,
    isPending: false,
  }),
  useAppSettings: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useUpdateAppSettings: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/components/useToast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

const renderUser = () => {
  const store = createStore();
  store.set(authUserAtom, {
    id: "user-1",
    email: "jane@example.com",
    username: "jane",
    name: "Jane Operator",
    permissions: [],
    roleName: "staff",
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <IntlProvider locale="en">
          <UserSettingsPage />
        </IntlProvider>
      </QueryClientProvider>
    </Provider>,
  );
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("UserSettingsPage", () => {
  it("renders all 4 sections", async () => {
    renderUser();

    expect(await screen.findByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
  });

  it("form submission calls updateUserSettings.mutate", async () => {
    renderUser();

    const nameInput = await screen.findByLabelText(/display name/i);
    fireEvent.change(nameInput, { target: { value: "Jane Updated" } });

    const save = screen.getByRole("button", { name: /save changes/i });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() =>
      expect(mocks.mutateUser).toHaveBeenCalledTimes(1),
    );
    expect(mocks.mutateUser.mock.calls[0]?.[0]).toMatchObject({
      displayName: "Jane Updated",
    });
  });
});
