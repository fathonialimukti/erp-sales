import { useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { AiAssistant } from '../components/AiAssistant/AiAssistant';
import { sidebarOpenAtom } from '../lib/atoms';
import { requestPushPermission, setupTauriNotifications } from '../lib/push-notification';

export const PrivateLayout = () => {
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);
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

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-0">
      <Navbar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="h-full min-w-0 flex-1 overflow-y-auto p-4 transition-all duration-200 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <AiAssistant />
    </div>
  );
};
