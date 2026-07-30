import { useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAtomValue } from "jotai";

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
  }, [navigate]);

  return (
    <div
      className="relative min-h-screen bg-background"
      data-ai-context={JSON.stringify({
        section: "private-layout",
        sidebarOpen,
      })}
    >
      <Sidebar />

      {/* Offset for fixed sidebar (left-3 + w-68 / w-20) */}
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col gap-3 p-3 transition-[margin] duration-250 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
          sidebarOpen ? "ml-71" : "ml-23",
        )}
      >
        <Topbar />
        {/* Opaque grounded work stage — solid bg-card over flat canvas */}
        <main className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
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
