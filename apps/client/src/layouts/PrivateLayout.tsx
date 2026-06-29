import { useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAtomValue } from "jotai";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { NotificationDrawer } from "../components/NotificationDrawer";
import { SearchPalette } from "../components/SearchPalette";
import { AiAssistant } from "../components/AiAssistant/AiAssistant";
import { UserMenuPopover } from "../components/UserMenuPopover";
import { sidebarOpenAtom } from "../lib/atoms";
import { requestPushPermission, setupTauriNotifications } from "../lib/push-notification";
import "./PrivateLayout.css";

export const PrivateLayout = () => {
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const navigate = useNavigate();
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    void requestPushPermission();
    void setupTauriNotifications((url) => navigate(url)).then((cleanup) => {
      cleanupRef.current = cleanup;
    });
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div className={`priv-layout ${sidebarOpen ? "" : "priv-layout--collapsed"}`}>
      <div className="priv-layout__shell">
        <Sidebar />
        <Topbar />
        <main className="priv-layout__main">
          <div className="priv-layout__content">
            <Outlet />
          </div>
        </main>
      </div>
      <NotificationDrawer />
      <AiAssistant />
      <SearchPalette />
      <UserMenuPopover />
    </div>
  );
};
