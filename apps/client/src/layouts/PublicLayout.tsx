import { Outlet } from 'react-router';

export const PublicLayout = () => (
  <div className="min-h-screen bg-surface-0">
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12 lg:px-10">
      <Outlet />
    </main>
  </div>
);
