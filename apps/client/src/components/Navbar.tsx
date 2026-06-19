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
import "./Navbar.css";

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
    <header className="nav-bar">
      <div className="nav-bar__left">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={intl.formatMessage({ id: "nav.toggle_sidebar", defaultMessage: "Toggle sidebar" })}
        >
          <Icon icon="solar:hamburger-menu-linear" />
        </Button>
        <p className="nav-bar__brand">
          {intl.formatMessage({ id: "nav.erp_sales", defaultMessage: "CRM" })}
        </p>
      </div>

      <div className="nav-bar__right">
        <div className="nav-bar__locale">
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
          />
        </Button>

        {user && (
          <Dropdown
            trigger={
              <div className="nav-bar__user-trigger">
                <Avatar name={user.name} />
                <div className="nav-bar__user-info">
                  <p className="nav-bar__user-name">
                    {user.name}
                  </p>
                  <p className="nav-bar__user-role">{user.roleName}</p>
                </div>
                <Icon icon="solar:alt-arrow-down-linear" className="nav-bar__user-arrow" />
              </div>
            }
          >
            <div className="nav-bar__dropdown-user">
              <p className="nav-bar__dropdown-label">
                {intl.formatMessage({ id: "nav.signed_in_as", defaultMessage: "Signed in as" })}
              </p>
              <p className="nav-bar__dropdown-name">{user.name}</p>
              <p className="nav-bar__dropdown-email">{user.email}</p>
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
    </header>
  );
};
