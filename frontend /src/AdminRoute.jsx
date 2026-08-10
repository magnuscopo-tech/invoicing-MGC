import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAdmin } from "./ReduxFeature/Authenthicate/LoginSlice";
import { ROUTES } from "./constants/route.constants";

// The reporting screens aggregate the whole workspace, so they are admin-only on
// the client too. The API enforces the same rule independently.
export default function AdminRoute({ children }) {
  const isAdmin = useSelector(selectIsAdmin);

  if (!isAdmin) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return children;
}
