import { useNavigate } from "react-router-dom";
import { Building2, FilePlus2, Package, Users } from "lucide-react";
import { ROUTES } from "../../constants/route.constants";

const ACTIONS = [
  {
    label: "New document",
    description: "Start the quotation → invoice chain",
    icon: FilePlus2,
    to: ROUTES.newDocument,
    tone: "bg-primary-600 text-white",
  },
  {
    label: "Add company",
    description: "Seller profile and bank details",
    icon: Building2,
    to: ROUTES.companies,
    tone: "bg-ink-100 text-ink-700",
  },
  {
    label: "Add client",
    description: "Buyer records and GSTIN",
    icon: Users,
    to: ROUTES.clients,
    tone: "bg-ink-100 text-ink-700",
  },
  {
    label: "Service catalog",
    description: "Reusable billable lines",
    icon: Package,
    to: ROUTES.services,
    tone: "bg-ink-100 text-ink-700",
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <section className="card animate-fade-up p-5">
      <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-ink-400">
        Quick actions
      </h2>

      <div className="space-y-2">
        {ACTIONS.map((action, index) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.to)}
            style={{ animationDelay: `${index * 60}ms` }}
            className="flex w-full animate-slide-right items-center gap-3 rounded-xl border border-ink-100 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${action.tone}`}
            >
              <action.icon size={17} strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink-950">
                {action.label}
              </span>
              <span className="block truncate text-[11px] text-ink-400">
                {action.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
