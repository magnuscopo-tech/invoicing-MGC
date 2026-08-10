import { Navigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import { ROUTES } from "./constants/route.constants";

export default function ProtectedLayout({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}
