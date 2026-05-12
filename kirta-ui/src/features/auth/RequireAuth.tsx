import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "./authStore";

export function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user) {
    return <Navigate to="/scans" replace />;
  }
  return <>{children}</>;
}
