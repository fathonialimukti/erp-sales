import { Outlet } from 'react-router';
import './PublicLayout.css';

export const PublicLayout = () => (
  <div className="pub-layout">
    <main className="pub-layout__inner">
      <Outlet />
    </main>
  </div>
);
