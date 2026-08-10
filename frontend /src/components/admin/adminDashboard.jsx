import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Landmark,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import PageHeader from "../custom/pageHeader";
import CardGridLoader from "../loader/cardGridLoader";
import AdminFilterBar from "./adminFilterBar";
import AdminKpiRow from "./adminKpiRow";
import AdminOverviewTab from "./adminOverviewTab";
import AdminReceivablesTab from "./adminReceivablesTab";
import AdminGstTab from "./adminGstTab";
import AdminPartiesTab from "./adminPartiesTab";
import AdminLedgerTab from "./adminLedgerTab";
import AdminGovernanceTab from "./adminGovernanceTab";
import useMasterData from "../../hooks/useMasterData";
import {
  handleGetCompanyPerformance,
  handleGetConversionFunnel,
  handleGetDocumentBreakdown,
  handleGetFinancialSummary,
  handleGetGstSummary,
  handleGetReceivablesAgeing,
  handleGetRevenueTrend,
  handleGetTopClients,
  handleGetWorkspaceOverview,
} from "../../Services/apiCalling/reportApis";
import { classNames } from "../../Utlis/Common/commonMethod";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "receivables", label: "Receivables", icon: Wallet },
  { key: "gst", label: "GST & Tax", icon: Landmark },
  { key: "parties", label: "Clients & Companies", icon: Users },
  { key: "ledger", label: "Document Ledger", icon: BookOpen },
  { key: "governance", label: "Audit & Team", icon: ShieldCheck },
];

const EMPTY_FILTERS = {
  companyId: "",
  clientId: "",
  fromDate: "",
  toDate: "",
};

export default function AdminDashboard() {
  const { companies, clients } = useMasterData();
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState({});

  // One scope object drives every report, so the filter bar stays authoritative.
  const scope = useMemo(() => {
    const next = {};
    if (filters.companyId) next.companyId = filters.companyId;
    if (filters.clientId) next.clientId = filters.clientId;
    if (filters.fromDate) next.fromDate = filters.fromDate;
    if (filters.toDate) next.toDate = filters.toDate;
    return next;
  }, [filters]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [
        summary,
        trend,
        breakdown,
        funnel,
        ageing,
        gst,
        topClients,
        companyPerformance,
        overview,
      ] = await Promise.all([
        handleGetFinancialSummary(scope),
        handleGetRevenueTrend({ ...scope, months: 12 }),
        handleGetDocumentBreakdown(scope),
        handleGetConversionFunnel(scope),
        handleGetReceivablesAgeing(scope),
        handleGetGstSummary({ ...scope, months: 12 }),
        handleGetTopClients({ ...scope, limit: 10 }),
        handleGetCompanyPerformance(scope),
        handleGetWorkspaceOverview(),
      ]);

      setReports({
        summary,
        trend,
        breakdown,
        funnel,
        ageing,
        gst,
        topClients: topClients || [],
        companyPerformance: companyPerformance || [],
        overview,
      });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onFilterChange = (value, field) => {
    setFilters((previous) => ({ ...previous, [field]: value }));
  };

  return (
    <>
      <PageHeader
        title="Admin Dashboard"
        description="Financial reporting across the whole workspace. Revenue counts tax invoices only — quotations and proformas are shown as pipeline."
      />

      <AdminFilterBar
        filters={filters}
        companies={companies}
        clients={clients}
        loading={loading}
        onChange={onFilterChange}
        onReset={() => setFilters(EMPTY_FILTERS)}
        onRefresh={fetchReports}
      />

      {loading ? (
        <CardGridLoader count={4} />
      ) : (
        <>
          <AdminKpiRow summary={reports.summary} />

          <nav className="card mt-5 flex animate-fade-up gap-1 overflow-x-auto p-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={classNames(
                  "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-all duration-200",
                  activeTab === tab.key
                    ? "bg-primary-600 text-white shadow-[0_8px_20px_-8px_rgba(29,93,245,0.8)]"
                    : "text-ink-600 hover:bg-ink-100"
                )}
              >
                <tab.icon size={15} strokeWidth={2} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="mt-5">
            {activeTab === "overview" && (
              <AdminOverviewTab
                summary={reports.summary}
                trend={reports.trend}
                funnel={reports.funnel}
                breakdown={reports.breakdown}
              />
            )}

            {activeTab === "receivables" && (
              <AdminReceivablesTab ageing={reports.ageing} />
            )}

            {activeTab === "gst" && <AdminGstTab gst={reports.gst} />}

            {activeTab === "parties" && (
              <AdminPartiesTab
                topClients={reports.topClients}
                companyPerformance={reports.companyPerformance}
              />
            )}

            {activeTab === "ledger" && <AdminLedgerTab scope={scope} />}

            {activeTab === "governance" && (
              <AdminGovernanceTab overview={reports.overview} />
            )}
          </div>
        </>
      )}
    </>
  );
}
