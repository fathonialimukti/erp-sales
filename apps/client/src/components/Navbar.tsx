import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import { Icon } from "../ui";
import { authUserAtom, sidebarOpenAtom, themeModeAtom } from "../lib/atoms";
import { useAuthActions } from "../lib/useAuth";
import { useLocale } from "../lib/useLocale";
import { localeLabels, localeSymbols, supportedLocales } from "../lib/locale";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Dropdown, DropdownItem, DropdownSeparator } from "../ui/Dropdown";
import { Select } from "../ui/Select";

type SupportedLocale = (typeof supportedLocales)[number];

export const Navbar = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const user = useAtomValue(authUserAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);
  const [theme, setTheme] = useAtom(themeModeAtom);
  const { logout } = useAuthActions();
  const { locale, setLocale } = useLocale();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const toggleSidebar = () => setSidebarOpen((prev: boolean) => !prev);
  const toggleTheme = () =>
    setTheme((prev: "light" | "dark") => (prev === "dark" ? "light" : "dark"));

  return (
    <header className="border-b border-slate-200 bg-surface-1 px-4 py-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={intl.formatMessage({ id: "nav.toggle_sidebar", defaultMessage: "Toggle sidebar" })}
          >
            <Icon icon="solar:hamburger-menu-linear" className="h-5 w-5" />
          </Button>
          <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {intl.formatMessage({ id: "nav.erp_sales", defaultMessage: "ERP SALES" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-32">
            <Select
              aria-label={intl.formatMessage({ id: "nav.language", defaultMessage: "Language" })}
              value={locale}
              onChange={(e) => setLocale(e.target.value as SupportedLocale)}
            >
              {supportedLocales.map((code) => (
                <option key={code} value={code}>
                  {localeSymbols[code]} — {localeLabels[code]}
                </option>
              ))}
            </Select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={intl.formatMessage({ id: "nav.theme", defaultMessage: "Theme" })}
          >
            <Icon
              icon={theme === "dark" ? "solar:sun-2-linear" : "solar:moon-linear"}
              className="h-5 w-5"
            />
          </Button>

          {user && (
            <Dropdown
              trigger={
                <div className="flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Avatar name={user.name} />
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.roleName}</p>
                  </div>
                  <Icon icon="solar:alt-arrow-down-linear" className="hidden h-4 w-4 text-slate-400 md:block" />
                </div>
              }
            >
              <div className="px-3 py-2">
                <p className="text-xs text-slate-500">
                  {intl.formatMessage({ id: "nav.signed_in_as", defaultMessage: "Signed in as" })}
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{user.email}</p>
              </div>
              <DropdownSeparator />
              <DropdownItem
                leftIcon={<Icon icon="solar:settings-linear" className="h-4 w-4" />}
                onClick={() => navigate("/users")}
              >
                {intl.formatMessage({ id: "nav.my_settings", defaultMessage: "My Settings" })}
              </DropdownItem>
              <DropdownItem
                leftIcon={<Icon icon="solar:history-linear" className="h-4 w-4" />}
                onClick={() => navigate("/activity-logs")}
              >
                {intl.formatMessage({ id: "nav.activity_logs", defaultMessage: "Activity Logs" })}
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                tone="danger"
                leftIcon={<Icon icon="solar:logout-2-linear" className="h-4 w-4" />}
                onClick={handleLogout}
              >
                {intl.formatMessage({ id: "nav.logout", defaultMessage: "Log Out" })}
              </DropdownItem>
            </Dropdown>
          )}
        </div>
      </div>
    </header>
  );
};
