import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { UploadScanDialog } from "@/features/scans";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

export function AppLayout() {
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block lg:w-64 lg:shrink-0">
        <div className="fixed inset-y-0 left-0 w-64">
          <Sidebar onScan={() => setScanDialogOpen(true)} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar
          onMenuOpen={() => setSidebarOpen(true)}
          onScan={() => setScanDialogOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DialogContent
          className="left-0 top-0 h-full max-h-screen max-w-[280px] translate-x-0 translate-y-0 rounded-none border-r p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:rounded-none"
        >
          <VisuallyHidden>
            <DialogTitle>Меню</DialogTitle>
          </VisuallyHidden>
          <Sidebar
            onNavigate={() => setSidebarOpen(false)}
            onScan={() => setScanDialogOpen(true)}
          />
        </DialogContent>
      </Dialog>

      <UploadScanDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
      />
    </div>
  );
}
