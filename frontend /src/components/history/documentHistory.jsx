import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import PageHeader from "../custom/pageHeader";
import CustomButton from "../custom/customButton";
import EmptyState from "../custom/emptyState";
import Pagination from "../custom/pagination";
import TableLoader from "../loader/tableLoader";
import DocumentFilterBar from "./documentFilterBar";
import DocumentHistoryTable from "./documentHistoryTable";
import DocumentPreviewModal from "../modal/documents/documentPreviewModal";
import useDebounce from "../../hooks/useDebounce";
import useMasterData from "../../hooks/useMasterData";
import {
  handleDownloadDocument,
  handleGetAllDocuments,
} from "../../Services/apiCalling/documentApis";
import {
  downloadBlobAsFile,
  safeFileName,
} from "../../Utlis/Common/commonMethod";
import { ROUTES } from "../../constants/route.constants";

const LIMIT = 20;

const EMPTY_FILTERS = {
  search: "",
  docType: "",
  status: "",
  company: "",
  client: "",
  fromDate: "",
  toDate: "",
};

export default function DocumentHistory() {
  const navigate = useNavigate();
  const { companies, clients } = useMasterData();

  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [previewTarget, setPreviewTarget] = useState(null);

  const debouncedSearch = useDebounce(filters.search, 400);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.docType) params.docType = filters.docType;
      if (filters.status) params.status = filters.status;
      if (filters.company) params.company = filters.company;
      if (filters.client) params.client = filters.client;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;

      const response = await handleGetAllDocuments(params);
      setDocuments(response?.items || []);
      setTotal(response?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    debouncedSearch,
    filters.docType,
    filters.status,
    filters.company,
    filters.client,
    filters.fromDate,
    filters.toDate,
  ]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onFilterChange = (value, field) => {
    setFilters((previous) => ({ ...previous, [field]: value }));
    setPage(1);
  };

  const onResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const onDownload = async (document) => {
    const blob = await handleDownloadDocument(document._id);
    if (!blob) return;
    downloadBlobAsFile(blob, safeFileName(document.docNumber));
    // A draft is promoted on its first download, so the list is refreshed.
    if (document.status === "draft") fetchDocuments();
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title="Document History"
        description="Every quotation, proforma and tax invoice you have issued."
      >
        <CustomButton
          icon={Plus}
          onClick={() => navigate(ROUTES.newDocument)}
        >
          New document
        </CustomButton>
      </PageHeader>

      <DocumentFilterBar
        filters={filters}
        companies={companies}
        clients={clients}
        onChange={onFilterChange}
        onReset={onResetFilters}
      />

      <div className="card animate-fade-up overflow-hidden">
        {loading ? (
          <TableLoader rows={8} columns={7} />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              hasActiveFilters
                ? "No documents match these filters"
                : "No documents yet"
            }
            description={
              hasActiveFilters
                ? "Try widening the date range or clearing a filter."
                : "Create your first quotation and cascade it into a proforma and tax invoice."
            }
            actionLabel={hasActiveFilters ? "Clear filters" : "New document"}
            actionIcon={hasActiveFilters ? null : Plus}
            onAction={
              hasActiveFilters
                ? onResetFilters
                : () => navigate(ROUTES.newDocument)
            }
          />
        ) : (
          <>
            <DocumentHistoryTable
              documents={documents}
              onOpen={(document) =>
                navigate(ROUTES.documentDetailPath(document._id))
              }
              onPreview={setPreviewTarget}
              onDownload={onDownload}
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
    </>
  );
}
