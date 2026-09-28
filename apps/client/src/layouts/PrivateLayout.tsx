import { useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAtomValue } from "jotai";
import { useIntl } from "react-intl";

import { AiAssistant } from "@/components/AiAssistant/AiAssistant";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { SearchPalette } from "@/components/SearchPalette";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { PageTransition } from "@/components/motion/PageTransition";
import { sidebarOpenAtom } from "@/lib/atoms";
import {
  requestPushPermission,
  setupTauriNotifications,
} from "@/lib/push-notification";
import { cn } from "@/lib/utils";

export const PrivateLayout = () => {
  const intl = useIntl();
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const navigate = useNavigate();
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  // Sidebar is nav-dense, so the skip link is the only fast route to the page.
  const t = (id: string, fallback: string) =>
    intl.formatMessage({ id, defaultMessage: fallback });

  useEffect(() => {
    void requestPushPermission();
    void setupTauriNotifications((url) => navigate(url)).then((cleanup) => {
      cleanupRef.current = cleanup;
    });
    return () => {
      cleanupRef.current?.();
    };
  }, [navigate]);

  return (
    <div
      className="relative min-h-screen bg-background"
      data-ai-context={JSON.stringify({
        section: "private-layout",
        sidebarOpen,
      })}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        {t("common.skip_to_content", "Skip to content")}
      </a>

      <Sidebar />

      {/* Offset for the fixed sidebar (left-3 + w-68 / w-20) at md and up.
          Below md the sidebar is an off-canvas drawer, so the column keeps the
          full viewport width — a margin offset there squeezes the topbar and
          the page title to 0px and pushes the document wider than the screen. */}
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col gap-3 p-3 transition-[margin] duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
          sidebarOpen ? "md:ml-71" : "md:ml-23",
        )}
      >
        <Topbar />
        {/* Opaque grounded work stage — solid bg-card over flat canvas */}
        <main
          id="main-content"
          className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6"
        >
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <NotificationDrawer />
      <AiAssistant />
      <SearchPalette />
    </div>
  );
};
