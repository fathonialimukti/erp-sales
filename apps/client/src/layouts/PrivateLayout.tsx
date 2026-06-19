import { useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { AiAssistant } from '../components/AiAssistant/AiAssistant';
import { sidebarOpenAtom } from '../lib/atoms';
import { requestPushPermission, setupTauriNotifications } from '../lib/push-notification';
import './PrivateLayout.css';

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
    <div className="priv-layout">
      <Navbar />
      <div className="priv-layout__body">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="priv-layout__main">
          <Outlet />
        </main>
      </div>
      <AiAssistant />
    </div>
  );
};
