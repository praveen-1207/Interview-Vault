// AppLayout — the common shell for every authenticated page.
// Lays out the left Sidebar, the Topbar, and the page's content (`children`)
// in the main area. Pages just wrap their markup in <AppLayout>...</AppLayout>.
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
