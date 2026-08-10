export const ROUTES = {
  root: "/",
  login: "/login",
  dashboard: "/dashboard",
  admin: "/admin",
  companies: "/companies",
  clients: "/clients",
  services: "/services",
  newDocument: "/documents/new",
  approvals: "/approvals",
  // The cash book. Deliberately not under /documents - it tracks money that
  // moved, not the paperwork.
  expenses: "/expenses",
  history: "/documents",
  documentDetail: "/documents/:id",
  documentDetailPath: (id) => `/documents/${id}`,
};

// Admins land on the reporting dashboard, everyone else on the working dashboard.
export const getDefaultRoute = (role) =>
  role === "admin" ? ROUTES.admin : ROUTES.dashboard;
