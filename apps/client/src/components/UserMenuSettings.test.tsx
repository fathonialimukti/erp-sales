import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { Provider, createStore } from "jotai";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { UserAvatarMenu } from "./UserAvatarMenu";
import { NAV_MENU, ROUTE_META, type NavMenuItem } from "@/constants/nav-menu";
import { authUserAtom } from "@/lib/atoms";
import en from "@/locales/en.json";
import id from "@/locales/id.json";

vi.mock("@/lib/useAuth", () => ({
  useAuthActions: () => ({ logout: vi.fn() }),
}));

afterEach(cleanup);

const collectAll = (items: NavMenuItem[]): NavMenuItem[] =>
  items.flatMap((item) => [item, ...collectAll(item.children ?? [])]);

const PathProbe = () => {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
};

const renderMenu = (permissions: string[] = []) => {
  const store = createStore();
  store.set(authUserAtom, {
    id: "user-1",
    email: "amy@example.com",
    username: "amy",
    name: "Amy Operator",
    permissions,
    roleName: "Operator",
  });
  return render(
    <Provider store={store}>
      <IntlProvider locale="en">
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route
              path="*"
              element={
                <>
                  <PathProbe />
                  <UserAvatarMenu variant="topbar" />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </Provider>,
  );
};

const openMenu = async (permissions: string[] = []) => {
  renderMenu(permissions);
  fireEvent.pointerDown(screen.getByRole("button", { name: /Amy Operator/ }), {
    button: 0,
  });
  return screen.findAllByRole("menuitem");
};

describe("settings move to user modal", () => {
  it("removes Settings from the sidebar nav entirely", () => {
    const all = collectAll(NAV_MENU);
    expect(
      all.filter((i) => i.href === "/setting" || i.href === "/settings"),
    ).toEqual([]);
    expect(
      all.filter(
        (i) => i.name === "nav.settings" || i.name.startsWith("nav.settings_"),
      ),
    ).toEqual([]);
  });

  it("orders the menu Profile → Personal settings → App settings → Log out", async () => {
    const items = await openMenu(["settings@app@read"]);
    expect(items.map((el) => el.textContent)).toEqual([
      "Profile",
      "Personal settings",
      "App settings",
      "Log out",
    ]);
  });

  it("navigates to personal settings (/setting) from the modal", async () => {
    await openMenu(["settings@app@read"]);
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Personal settings" }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("pathname")).toHaveTextContent(/^\/setting$/),
    );
  });

  it("navigates to app settings (/settings) from the modal", async () => {
    await openMenu(["settings@app@read"]);
    fireEvent.click(screen.getByRole("menuitem", { name: "App settings" }));

    await waitFor(() =>
      expect(screen.getByTestId("pathname")).toHaveTextContent(/^\/settings$/),
    );
  });

  it("shows the app settings entry when the user has settings@app@read", async () => {
    await openMenu(["settings@app@read"]);
    expect(
      screen.getByRole("menuitem", { name: "App settings" }),
    ).toBeInTheDocument();
  });

  it("hides the app settings entry when the user lacks settings@app@read", async () => {
    const items = await openMenu([]);
    expect(items.map((el) => el.textContent)).toEqual([
      "Profile",
      "Personal settings",
      "Log out",
    ]);
    expect(
      screen.queryByRole("menuitem", { name: "App settings" }),
    ).not.toBeInTheDocument();
  });
});

describe("Topbar metadata for modal-only routes", () => {
  it("resolves /settings without a sidebar entry", () => {
    expect(ROUTE_META["/settings"]).toEqual({
      kicker: "nav.section.settings",
      title: "settings.app.title",
    });
    expect(ROUTE_META["/setting"]).toEqual({
      kicker: "nav.section.settings",
      title: "settings.user.title",
    });
  });

  it("resolves /application-logs breadcrumb metadata", () => {
    expect(ROUTE_META["/application-logs"]).toEqual({
      kicker: "nav.administration",
      title: "applicationLog.index.title",
    });
  });

  it("has the modal + breadcrumb copy in both locales", () => {
    for (const messages of [en, id]) {
      expect(messages["user.menu.settings_personal"]).toBeTruthy();
      expect(messages["user.menu.app_settings"]).toBeTruthy();
      expect(messages["nav.section.settings"]).toBeTruthy();
      expect(messages["settings.app.title"]).toBeTruthy();
      expect(messages["settings.user.title"]).toBeTruthy();
    }
    expect(en["user.menu.settings_personal"]).not.toEqual(
      en["user.menu.app_settings"],
    );
  });
});
