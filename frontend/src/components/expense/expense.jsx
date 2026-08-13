import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Download,
  LayoutDashboard,
  Minus,
  Plus,
  Table2,
  Upload,
} from "lucide-react";
import PageHeader from "../custom/pageHeader";
import CustomButton from "../custom/customButton";
import CardGridLoader from "../loader/cardGridLoader";
import ExpenseFilterBar from "./expenseFilterBar";
import ExpenseKpiRow from "./expenseKpiRow";
import ExpenseDashboardTab from "./expenseDashboardTab";
import ExpenseLedgerTab, { LEDGER_LIMIT } from "./expenseLedgerTab";
import ExpenseImportTab from "./expenseImportTab";
import TransactionModal from "../modal/expense/transactionModal";
import useDebounce from "../../hooks/useDebounce";
import { selectIsAdmin } from "../../ReduxFeature/Authenthicate/LoginSlice";
import {
  handleExportTransactions,
  handleGetAllTransactions,
  handleGetCashBookMeta,
  handleGetCashFlowSummary,
  handleGetCashFlowTrend,
  handleGetCategoryBreakdown,
  handleGetDailyCashFlow,
  handleGetPaymentModeSplit,
  handleGetTopParties,
} from "../../Services/apiCalling/expenseApis";
import {
  classNames,
  downloadBlobAsFile,
  itemsOf,
} from "../../Utlis/Common/commonMethod";
import { todayInputDate } from "../../Utlis/dateFormat";
import {
  CATEGORY_OPTIONS,
  TXN_CATEGORIES,
  TXN_DIRECTION,
} from "../../constants/expense.constants";

const EMPTY_FILTERS = {
  fromDate: "",
  toDate: "",
  direction: "",
  category: "",
  paymentMode: "",
  source: "",
  search: "",
};

export default function Expense() {
  const isAdmin = useSelector(selectIsAdmin);

  /*
   * Tab visibility is the role split made concrete. A finance user keeps the
   * book - they record what was paid and received, and see what they are
   * keeping. Reading the whole book as a financial picture, importing a
   * statement over it, and exporting it are admin work. The API enforces the
   * same split independently; this only avoids offering a refused action.
   */
  const tabs = useMemo(
    () =>
      [
        isAdmin && { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { key: "ledger", label: "Transactions", icon: Table2 },
        isAdmin && { key: "import", label: "Bulk Upload", icon: Upload },
      ].filter(Boolean),
    [isAdmin]
  );

  const [activeTab, setActiveTab] = useState(isAdmin ? "dashboard" : "ledger");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [meta, setMeta] = useState(null);

  const [reports, setReports] = useState({});
  const [loadingReports, setLoadingReports] = useState(isAdmin);

  const [ledger, setLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [page, setPage] = useState(1);

  const [formModal, setFormModal] = useState({ open: false, direction: null });
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(filters.search, 400);

  // One scope object for every request on the screen, so the charts and the
  // table can never be describing different sets of transactions.
  const scope = useMemo(() => {
    const next = {};
    if (filters.fromDate) next.fromDate = filters.fromDate;
    if (filters.toDate) next.toDate = filters.toDate;
    if (filters.direction) next.direction = filters.direction;
    if (filters.category) next.category = filters.category;
    if (filters.paymentMode) next.paymentMode = filters.paymentMode;
    if (filters.source) next.source = filters.source;
    if (debouncedSearch) next.search = debouncedSearch;
    return next;
  }, [
    filters.fromDate,
    filters.toDate,
    filters.direction,
    filters.category,
    filters.paymentMode,
    filters.source,
    debouncedSearch,
  ]);

  // The category list the API will actually accept. Falls back to the bundled
  // copy if the metadata call fails, so the forms still work.
  const metaCategories = itemsOf(meta?.categories);
  const categories = metaCategories.length ? metaCategories : TXN_CATEGORIES;
  const categoryOptions = useMemo(
    () =>
      metaCategories.length
        ? metaCategories.map((item) => ({
            value: item.value,
            label: item.value,
          }))
        : CATEGORY_OPTIONS,
    [metaCategories]
  );

  useEffect(() => {
    handleGetCashBookMeta().then(setMeta);
  }, []);

  const fetchReports = useCallback(async () => {
    if (!isAdmin) return;

    setLoadingReports(true);
    try {
      const [summary, trend, daily, categoryMix, parties, paymentModes] =
        await Promise.all([
          handleGetCashFlowSummary(scope),
          handleGetCashFlowTrend({ ...scope, months: 12 }),
          handleGetDailyCashFlow(scope),
          handleGetCategoryBreakdown(scope),
          handleGetTopParties({ ...scope, limit: 8 }),
          handleGetPaymentModeSplit(scope),
        ]);

      setReports({
        summary,
        trend,
        daily,
        categories: categoryMix,
        parties,
        paymentModes: paymentModes || [],
      });
    } finally {
      setLoadingReports(false);
    }
  }, [isAdmin, scope]);

  const fetchLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      setLedger(
        await handleGetAllTransactions({ ...scope, page, limit: LEDGER_LIMIT })
      );
    } finally {
      setLoadingLedger(false);
    }
  }, [scope, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Changing what is being filtered invalidates the page you were on.
  useEffect(() => {
    setPage(1);
  }, [scope]);

  const refreshAll = useCallback(() => {
    fetchReports();
    fetchLedger();
  }, [fetchReports, fetchLedger]);

  const onFilterChange = (value, field) => {
    setFilters((previous) => ({ ...previous, [field]: value }));
  };

  const onExport = async () => {
    setExporting(true);
    try {
      // The export respects the current filters, so what downloads is what is
      // on screen rather than the entire book.
      const blob = await handleExportTransactions(scope);
      if (blob) {
        downloadBlobAsFile(blob, `cash-book-${todayInputDate()}.xlsx`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Cash Book"
        description={
          isAdmin
            ? "Money actually in and out of the bank account. Kept separately from quotations, proformas and invoices — those record what was agreed, this records what moved."
            : "Record what the business paid out and what it received. Kept separately from quotations, proformas and invoices."
        }
      >
        <CustomButton
          variant="secondary"
          icon={Minus}
          onClick={() =>
            setFormModal({ open: true, direction: TXN_DIRECTION.debit })
          }
        >
          Add expense
        </CustomButton>
        <CustomButton
          icon={Plus}
          onClick={() =>
            setFormModal({ open: true, direction: TXN_DIRECTION.credit })
          }
        >
          Add receipt
        </CustomButton>
        {isAdmin && (
          <CustomButton
            variant="ghost"
            icon={Download}
            loading={exporting}
            onClick={onExport}
          >
            Export
          </CustomButton>
        )}
      </PageHeader>

      <ExpenseFilterBar
        filters={filters}
        categoryOptions={categoryOptions}
        loading={loadingLedger || loadingReports}
        showSearch={activeTab !== "import"}
        onChange={onFilterChange}
        onReset={() => setFilters(EMPTY_FILTERS)}
        onRefresh={refreshAll}
      />

      {isAdmin &&
        (loadingReports ? (
          <CardGridLoader count={4} />
        ) : (
          <ExpenseKpiRow summary={reports.summary} />
        ))}

      {tabs.length > 1 && (
        <nav className="card mt-5 flex animate-fade-up gap-1 overflow-x-auto p-1.5">
          {tabs.map((tab) => (
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
      )}

      <div className={tabs.length > 1 ? "mt-5" : "mt-0"}>
        {activeTab === "dashboard" && isAdmin && (
          loadingReports ? (
            <CardGridLoader count={4} />
          ) : (
            <ExpenseDashboardTab
              summary={reports.summary}
              trend={reports.trend}
              daily={reports.daily}
              categories={reports.categories}
              parties={reports.parties}
              paymentModes={reports.paymentModes}
            />
          )
        )}

        {activeTab === "ledger" && (
          <ExpenseLedgerTab
            ledger={ledger}
            loading={loadingLedger}
            page={page}
            categories={categories}
            onPageChange={setPage}
            onChanged={refreshAll}
          />
        )}

        {activeTab === "import" && isAdmin && (
          <ExpenseImportTab onImported={refreshAll} />
        )}
      </div>

      <TransactionModal
        open={formModal.open}
        defaultDirection={formModal.direction || TXN_DIRECTION.debit}
        categories={categories}
        parties={itemsOf(meta?.parties)}
        onClose={() => setFormModal({ open: false, direction: null })}
        onSuccess={refreshAll}
      />
    </>
  );
}
