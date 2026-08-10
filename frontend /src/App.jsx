import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ProtectedLayout from "./ProtectedLayout";
import AdminRoute from "./AdminRoute";
import PageLoader from "./components/loader/PageLoader";
import ErrorBoundary from "./components/custom/errorBoundary";
import {
  checkAuth,
  selectCurrentUser,
  selectIsAuthChecked,
  selectIsAuthenticated,
} from "./ReduxFeature/Authenthicate/LoginSlice";
import { getDefaultRoute, ROUTES } from "./constants/route.constants";

const LoginPage = lazy(() => import("./pages/auth/loginPage"));
const DashboardPage = lazy(() => import("./pages/dashboard/dashboardPage"));
const AdminDashboardPage = lazy(() =>
  import("./pages/admin/adminDashboardPage")
);
const CompanyPage = lazy(() => import("./pages/company/companyPage"));
const ClientPage = lazy(() => import("./pages/client/clientPage"));
const ServicePage = lazy(() => import("./pages/service/servicePage"));
const NewDocumentPage = lazy(() =>
  import("./pages/documents/newDocumentPage")
);
const ApprovalsPage = lazy(() => import("./pages/approvals/approvalsPage"));
const DocumentHistoryPage = lazy(() =>
  import("./pages/history/documentHistoryPage")
);
const ExpensePage = lazy(() => import("./pages/expense/expensePage"));
const DocumentDetailPage = lazy(() =>
  import("./pages/documentDetail/documentDetailPage")
);

const PROTECTED_ROUTES = [
  { path: ROUTES.dashboard, element: <DashboardPage /> },
  { path: ROUTES.companies, element: <CompanyPage /> },
  { path: ROUTES.clients, element: <ClientPage /> },
  { path: ROUTES.services, element: <ServicePage /> },
  { path: ROUTES.newDocument, element: <NewDocumentPage /> },
  { path: ROUTES.approvals, element: <ApprovalsPage /> },
  { path: ROUTES.expenses, element: <ExpensePage /> },
  { path: ROUTES.history, element: <DocumentHistoryPage /> },
  { path: ROUTES.documentDetail, element: <DocumentDetailPage /> },
  {
    path: ROUTES.admin,
    element: (
      <AdminRoute>
        <AdminDashboardPage />
      </AdminRoute>
    ),
  },
];

export default function App() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAuthChecked = useSelector(selectIsAuthChecked);
  const user = useSelector(selectCurrentUser);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (!isAuthChecked) {
    return <PageLoader label="Checking your session…" />;
  }

  const defaultRoute = getDefaultRoute(user?.role);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {!isAuthenticated && (
              <>
                <Route path={ROUTES.login} element={<LoginPage />} />
                <Route
                  path="*"
                  element={<Navigate to={ROUTES.login} replace />}
                />
              </>
            )}

            {isAuthenticated && (
              <>
                {PROTECTED_ROUTES.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <ProtectedLayout isAuthenticated={isAuthenticated}>
                        {route.element}
                      </ProtectedLayout>
                    }
                  />
                ))}
                <Route
                  path="*"
                  element={<Navigate to={defaultRoute} replace />}
                />
              </>
            )}
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
