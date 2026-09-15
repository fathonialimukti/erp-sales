import { Outlet } from "react-router";

/**
 * @deprecated Task 11 split Settings into 2 standalone pages:
 * `/settings` → AppSettingsPage, `/setting` → UserSettingsPage.
 * The combined tab layout is removed. This pass-through is kept so any
 * lingering import does not break; routes no longer use it.
 */
export const SettingsLayout = () => {
  return (
    <main
      className="min-w-0 flex-1"
      data-ai-context={JSON.stringify({
        section: "settings-layout",
        deprecated: true,
      })}
    >
      <Outlet />
    </main>
  );
};
