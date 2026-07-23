import { Outlet } from "react-router";

export const PublicLayout = () => (
  <div className="h-dvh overflow-hidden">
    <main className="h-full w-full">
      <Outlet />
    </main>
  </div>
);
