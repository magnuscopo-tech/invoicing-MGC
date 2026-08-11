import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import PageHeader from "../custom/pageHeader";
import SearchInput from "../custom/searchInput";
import Pagination from "../custom/pagination";
import TableLoader from "../loader/tableLoader";
import ApprovalsTable from "./approvalsTable";
import DocumentPreviewModal from "../modal/documents/documentPreviewModal";
import ApproveDocumentModal from "../modal/documents/approveDocumentModal";
import RejectDocumentModal from "../modal/documents/rejectDocumentModal";
import useDebounce from "../../hooks/useDebounce";
import { selectIsAdmin } from "../../ReduxFeature/Authenthicate/LoginSlice";
import {
  handleDownloadDocument,
  handleGetAllDocuments,
  handleGetDocumentDetail,
} from "../../Services/apiCalling/documentApis";
import {
  downloadBlobAsFile,
  safeFileName,
  classNames,
} from "../../Utlis/Common/commonMethod";
import { APPROVAL_STATUS } from "../../constants/document.constants";
import { ROUTES } from "../../constants/route.constants";

const LIMIT = 20;

const TABS = [
  {
    key: APPROVAL_STATUS.pending,
    label: "Approval Pending",
    icon: Clock,
    emptyTitle: "Nothing waiting for approval",
    emptyDescription:
      "Documents sent for approval appear here. Open one to review it, then approve and sign or reject it.",
  },
  {
    key: APPROVAL_STATUS.approved,
    label: "Approved",
    icon: CheckCircle2,
    emptyTitle: "No approved documents yet",
    emptyDescription:
      "Once a document is approved it is signed automatically, and the signed PDF can be downloaded from here.",
  },
  {
    key: APPROVAL_STATUS.rejected,
    label: "Rejected",
    icon: XCircle,
    emptyTitle: "No rejected documents",
    emptyDescription:
      "Rejected documents show the reason they were sent back, and can be edited and resubmitted.",
  },
];

export default function Approvals() {
  const navigate = useNavigate();
  const isAdmin = useSelector(selectIsAdmin);

  const [activeTab, setActiveTab] = useState(APPROVAL_STATUS.pending);
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [previewTarget, setPreviewTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, approvalStatus: activeTab };
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await handleGetAllDocuments(params);
      setDocuments(response?.items || []);
      setTotal(response?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, debouncedSearch]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch]);

  const onDownload = async (document) => {
    const blob = await handleDownloadDocument(document._id);
    if (!blob) return;
    downloadBlobAsFile(blob, safeFileName(document.docNumber));
    // A draft is promoted on its first download, so the list is refreshed.
    if (document.status === "draft") fetchDocuments();
  };

  // The approve modal needs the company's saved signature, which only the
  // detail response carries, so the full record is fetched before opening.
  const onOpenApprove = async (document) => {
    const detail = await handleGetDocumentDetail(document._id);
    setApproveTarget(detail || document);
  };

  const activeMeta = TABS.find((tab) => tab.key === activeTab);

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Documents are unsigned until an admin approves them. Approving is what applies the authorised signature."
      >
        <SearchInput
          value={search}
          placeholder="Search document number…"
          className="w-full sm:w-64"
          onChange={setSearch}
        />
      </PageHeader>

      <nav className="card mb-5 flex animate-fade-up gap-1 overflow-x-auto p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={classNames(
              "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200",
              activeTab === tab.key
                ? "bg-primary-600 text-white shadow-[0_8px_20px_-8px_rgba(29,93,245,0.8)]"
                : "text-ink-600 hover:bg-ink-100"
            )}
          >
            <tab.icon size={15} strokeWidth={2} />
            {tab.label}
            {activeTab === tab.key && total > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] font-bold">
                {total}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="card animate-fade-up overflow-hidden">
        {loading ? (
          <TableLoader rows={6} columns={6} />
        ) : (
          <>
            <ApprovalsTable
              documents={documents}
              tab={activeTab}
              isAdmin={isAdmin}
              emptyIcon={activeMeta.icon}
              emptyTitle={activeMeta.emptyTitle}
              emptyDescription={activeMeta.emptyDescription}
              onOpen={(document) =>
                navigate(ROUTES.documentDetailPath(document._id))
              }
              onPreview={setPreviewTarget}
              onDownload={onDownload}
              onApprove={onOpenApprove}
              onReject={setRejectTarget}
            />
            <Pagination
              page={page}
              limit={LIMIT}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <DocumentPreviewModal
        open={Boolean(previewTarget)}
        documentId={previewTarget?._id}
        docNumber={previewTarget?.docNumber}
        onClose={() => setPreviewTarget(null)}
      />

      <ApproveDocumentModal
        open={Boolean(approveTarget)}
        document={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSuccess={fetchDocuments}
      />

      <RejectDocumentModal
        open={Boolean(rejectTarget)}
        document={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSuccess={fetchDocuments}
      />
    </>
  );
}
