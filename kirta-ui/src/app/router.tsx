import { createBrowserRouter, Navigate, Outlet, RouterProvider, useParams } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { LandingPage } from "@/pages/LandingPage";
import { ScansPage } from "@/pages/ScansPage";
import { ScanReportPage } from "@/pages/ScanReportPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { RequireAuth, RedirectIfAuthenticated } from "@/features/auth";
import { AppLayout } from "@/components/layout/AppLayout";

function isValidScanId(scanId: string | undefined): scanId is string {
  return typeof scanId === "string" && /^[1-9]\d*$/.test(scanId);
}

function ScanIdGuard() {
  const { scanId } = useParams<{ scanId: string }>();
  if (!isValidScanId(scanId)) {
    return <NotFoundPage />;
  }
  return <Outlet />;
}

function LegacyScanRouteRedirect() {
  const { scanId } = useParams<{ scanId: string }>();
  if (!isValidScanId(scanId)) {
    return <NotFoundPage />;
  }
  return <Navigate to={`/${scanId}`} replace />;
}

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  {
    path: "/login",
    element: (
      <RedirectIfAuthenticated>
        <LoginPage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "scans", element: <ScansPage /> },
          { path: "scans/:scanId", element: <LegacyScanRouteRedirect /> },
        ],
      },
    ],
  },
  {
    path: ":scanId",
    element: <ScanIdGuard />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [{ index: true, element: <ScanReportPage /> }],
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
