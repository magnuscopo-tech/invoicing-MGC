import { useState } from "react";
import AppHeader from "./components/layouts/AppHeader";
import AppSidenav from "./components/layouts/AppSidenav";
import AppFooter from "./components/layouts/AppFooter";

export default function AppLayout({ children }) {
  const [sideNavOpen, setSideNavOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <AppSidenav open={sideNavOpen} onClose={() => setSideNavOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <AppHeader onMenuClick={() => setSideNavOpen(true)} />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <AppFooter />
      </div>
    </div>
  );
}
