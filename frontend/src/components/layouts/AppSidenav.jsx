import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Building2,
  ChartNoAxesCombined,
  FilePlus2,
  Files,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { ROUTES } from "../../constants/route.constants";
import { selectIsAdmin } from "../../ReduxFeature/Authenthicate/LoginSlice";
import { classNames } from "../../Utlis/Common/commonMethod";
import BrandMark from "../custom/brandMark";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
      {
        to: ROUTES.admin,
        label: "Admin Reports",
        icon: ChartNoAxesCombined,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Documents",
    items: [
      { to: ROUTES.newDocument, label: "New Document", icon: FilePlus2 },
      { to: ROUTES.approvals, label: "Approvals", icon: ShieldCheck },
      { to: ROUTES.history, label: "Document History", icon: Files, end: true },
    ],
  },
  {
    // Its own group, not a sub-item of Documents. The cash book records money
    // that moved through the bank; a quotation or invoice records what was
    // agreed. Filing them together would imply a link that does not exist.
    label: "Cash Book",
    items: [{ to: ROUTES.expenses, label: "Expenses & Income", icon: Wallet }],
  },
  {
    label: "Master Data",
    items: [
      { to: ROUTES.companies, label: "Companies", icon: Building2 },
      { to: ROUTES.clients, label: "Clients", icon: Users },
      { to: ROUTES.services, label: "Service Catalog", icon: Package },
    ],
  },
];

export default function AppSidenav({ open = false, onClose = () => {} }) {
  const isAdmin = useSelector(selectIsAdmin);

  return (
    <>
      <div
        className={classNames(
          "fixed inset-0 z-30 bg-ink-950/40 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={classNames(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-100 bg-white transition-transform duration-300 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <BrandMark size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        classNames("nav-link", isActive && "nav-link-active")
                      }
                    >
                      <item.icon size={17} strokeWidth={2} />
                      {item.label}
                    </NavLink>
                  ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="m-3 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 p-4 text-white">
          <p className="text-[13px] font-semibold">Quotation → Invoice</p>
          <p className="mt-1 text-[11px] leading-relaxed text-primary-100">
            Build once and carry the same data through every stage of the chain.
          </p>
        </div>
      </aside>
    </>
  );
}
