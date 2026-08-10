import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileWarning,
  Layers,
  Lock,
  Pencil,
  SendHorizontal,
  Trash2,
  Unlock,
  XCircle,
} from "lucide-react";
import CustomButton from "../custom/customButton";
import StatusBadge from "../custom/statusBadge";
import EmptyState from "../custom/emptyState";
import DocumentDetailLoader from "../loader/documentDetailLoader";
import ItemsTable from "../documents/itemsTable";
import TotalsSummary from "../documents/totalsSummary";
import DocumentPartiesPanel from "./documentPartiesPanel";
import DocumentStatusControl from "./documentStatusControl";
import ChainView from "../history/chainView";
import DocumentPreviewModal from "../modal/documents/documentPreviewModal";
import ConvertDocumentModal from "../modal/documents/convertDocumentModal";
import EditDocumentModal from "../modal/documents/editDocumentModal";
import ApproveDocumentModal from "../modal/documents/approveDocumentModal";
import RejectDocumentModal from "../modal/documents/rejectDocumentModal";
import CreateBillingPlanModal from "../modal/documents/createBillingPlanModal";
import ConfirmDialog from "../modal/confirmDialog";
import DocumentApprovalPanel from "./documentApprovalPanel";
import BillingPlanPanel from "../billing/billingPlanPanel";
import { selectIsAdmin } from "../../ReduxFeature/Authenthicate/LoginSlice";
import {
  handleDeleteDocument,
  handleDownloadDocument,
  handleGetDocumentChain,
  handleGetDocumentDetail,
  handleSubmitForApproval,
} from "../../Services/apiCalling/documentApis";
import { handleGetBillingPlanForDocument } from "../../Services/apiCalling/billingPlanApis";
import {
  classNames,
  downloadBlobAsFile,
  safeFileName,
} from "../../Utlis/Common/commonMethod";
import { formatDisplayDate, formatDisplayDateTime } from "../../Utlis/dateFormat";
import { SuccessMessage } from "../../Utlis/Toastify/ToastMessage";
import {
  APPROVAL_LABELS,
  APPROVAL_LOCKED,
  APPROVAL_STATUS,
  APPROVAL_TONE,
  CONVERSION_TARGETS,
  DOC_LABELS,
  DOC_STATUS_TONE,
  DOC_TYPE_TONE,
  DOC_TYPES,
  LOCKED_STATUSES,
  isPriceLocked,
} from "../../constants/document.constants";
import { ROUTES } from "../../constants/route.constants";

const MetaItem = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
      {label}
    </p>
    <p className="mt-0.5 text-[13px] font-semibold text-ink-900">{value}</p>
  </div>
);

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = useSelector(selectIsAdmin);

  const [document, setDocument] = useState(null);
  const [chain, setChain] = useState([]);
  // Null on any ordinary document - only a job billed in stages has one.
  const [billingPlan, setBillingPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    try {
      // The plan lookup resolves from any document in the job - an installment,
      // the closing invoice, or the quotation it was cut from - and returns
      // null for everything else, which is the ordinary case.
      const [detail, chainResult, plan] = await Promise.all([
        handleGetDocumentDetail(id),
        handleGetDocumentChain(id),
        handleGetBillingPlanForDocument(id),
      ]);
      setDocument(detail);
      setChain(chainResult?.chain || []);
      setBillingPlan(plan);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // The file is printed on request, so there is nothing to generate first. A
  // draft is promoted to "generated" server side once it has been handed over,
  // which is why the document is reloaded after a successful download.
  const onDownload = async () => {
    setDownloading(true);
    try {
      const blob = await handleDownloadDocument(document._id);
      if (!blob) return;
      downloadBlobAsFile(blob, safeFileName(document.docNumber));
      if (document.status === "draft") fetchDocument();
    } finally {
      setDownloading(false);
    }
  };

  const onDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const result = await handleDeleteDocument(document._id);
      if (result) {
        SuccessMessage(
          result.softDeleted
            ? "Document is no longer a draft, so it was cancelled instead."
            : "Document deleted successfully."
        );
        setDeleteOpen(false);
        if (result.softDeleted) {
          fetchDocument();
        } else {
          navigate(ROUTES.history);
        }
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <DocumentDetailLoader />;

  if (!document) {
    return (
      <div className="card">
        <EmptyState
          icon={FileWarning}
          title="Document not found"
          description="It may have been deleted, or the link is out of date."
          actionLabel="Back to history"
          actionIcon={ArrowLeft}
          onAction={() => navigate(ROUTES.history)}
        />
      </div>
    );
  }

  /*
   * A job billed in stages does not move through the ordinary convert flow: its
   * installments and its single closing tax invoice are raised from the plan,
   * which is the only thing that knows the schedule. So the moment a plan
   * exists, the convert button gives way to the plan panel below.
   */
  const nextStage = (CONVERSION_TARGETS[document.docType] || [])[0] || null;
  const canConvert =
    Boolean(nextStage) && document.status !== "cancelled" && !billingPlan;
  // Splitting is offered on a quotation only, and only while it is still an
  // open, unconverted one - the same point at which it could be converted.
  const canSplit =
    document.docType === DOC_TYPES.quotation &&
    document.status !== "cancelled" &&
    !billingPlan &&
    document.convertedToCount === 0;
  // A quotation is the negotiation document; a proforma or invoice freezes its
  // money once it is sent or signed. Only the amounts lock - dates, notes and
  // terms stay editable, which is exactly what the edit modal offers.
  const priceLocked = isPriceLocked(document);
  const isNegotiable =
    document.docType === DOC_TYPES.quotation &&
    !LOCKED_STATUSES.includes(document.status) &&
    !APPROVAL_LOCKED.includes(document.approvalStatus);
  // Editing is blocked by status (paid/cancelled) and by approval (pending or
  // already signed). The buttons mirror the API rather than offering a 422.
  const canEdit =
    !LOCKED_STATUSES.includes(document.status) &&
    !APPROVAL_LOCKED.includes(document.approvalStatus);
  const canSubmitForApproval =
    document.status !== "cancelled" &&
    (document.approvalStatus === APPROVAL_STATUS.notSubmitted ||
      document.approvalStatus === APPROVAL_STATUS.rejected);
  const isPendingApproval =
    document.approvalStatus === APPROVAL_STATUS.pending;

  const onSubmitForApproval = async () => {
    setSubmitting(true);
    try {
      const result = await handleSubmitForApproval(document._id);
      if (result) {
        SuccessMessage("Sent to an admin for approval.");
        fetchDocument();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(ROUTES.history)}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 transition-colors hover:text-primary-700"
      >
        <ArrowLeft size={15} /> Back to history
      </button>

      <header className="card mb-5 animate-fade-up p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                dot={false}
                label={DOC_LABELS[document.docType]}
                tone={DOC_TYPE_TONE[document.docType]}
              />
              <StatusBadge
                label={document.status}
                tone={DOC_STATUS_TONE[document.status]}
              />
              {document.version > 1 && (
                <StatusBadge dot={false} label={`v${document.version}`} />
              )}
              <StatusBadge
                label={APPROVAL_LABELS[document.approvalStatus]}
                tone={APPROVAL_TONE[document.approvalStatus]}
              />
              {document.isSigned && (
                <StatusBadge dot={false} label="Signed" tone="success" />
              )}
              {document.isInstallment && (
                <StatusBadge
                  dot={false}
                  tone="purple"
                  label={`${document.installmentPercent}% · ${document.installmentIndex} of ${document.installmentCount}`}
                />
              )}
            </div>

            <h1 className="mt-2.5 font-mono text-2xl font-bold tracking-tight text-ink-950">
              {document.docNumber}
            </h1>
            <p className="mt-1 text-subtle">
              {document.client?.name} · issued{" "}
              {formatDisplayDate(document.issueDate)}
            </p>

            {document.paidAt && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-800">
                <CheckCircle2 size={12} />
                Payment confirmed on{" "}
                {formatDisplayDateTime(document.paidAt)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {canEdit && (
              <CustomButton
                variant="secondary"
                icon={Pencil}
                onClick={() => setEditOpen(true)}
              >
                Edit
              </CustomButton>
            )}
            <CustomButton
              variant="secondary"
              icon={Eye}
              onClick={() => setPreviewOpen(true)}
            >
              Preview
            </CustomButton>
            <CustomButton
              icon={Download}
              loading={downloading}
              onClick={onDownload}
            >
              Download PDF
            </CustomButton>
            {canSubmitForApproval && (
              <CustomButton
                icon={SendHorizontal}
                loading={submitting}
                onClick={onSubmitForApproval}
              >
                Send for approval
              </CustomButton>
            )}

            {isPendingApproval && isAdmin && (
              <>
                <CustomButton
                  icon={CheckCircle2}
                  onClick={() => setApproveOpen(true)}
                >
                  Approve &amp; sign
                </CustomButton>
                <CustomButton
                  variant="dangerGhost"
                  icon={XCircle}
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </CustomButton>
              </>
            )}

            {canConvert && (
              <CustomButton
                variant="subtle"
                icon={ArrowRight}
                iconRight
                onClick={() => setConvertOpen(true)}
              >
                Convert to {DOC_LABELS[nextStage]}
              </CustomButton>
            )}
            {canSplit && (
              <CustomButton
                variant="secondary"
                icon={Layers}
                onClick={() => setSplitOpen(true)}
              >
                Bill in installments
              </CustomButton>
            )}
            {isAdmin && (
              <CustomButton
                variant="dangerGhost"
                icon={Trash2}
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </CustomButton>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-ink-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem label="Series" value={document.financialYearOrYear} />
          <MetaItem label="Serial" value={document.serialNumber} />
          <MetaItem
            label="Issue date"
            value={formatDisplayDate(document.issueDate)}
          />
          <MetaItem
            label={document.dueDateLabel || "Due date"}
            value={formatDisplayDate(document.dueDate)}
          />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card animate-fade-up p-5">
            <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-ink-400">
              Parties
            </h2>
            <DocumentPartiesPanel document={document} />
          </section>

          <section className="card animate-fade-up p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-400">
                Line items
              </h2>
              <span
                className={classNames(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold",
                  priceLocked
                    ? "bg-amber-50 text-amber-800"
                    : "bg-emerald-50 text-emerald-700"
                )}
              >
                {priceLocked ? <Lock size={11} /> : <Unlock size={11} />}
                {priceLocked ? "Price fixed" : "Price open"}
              </span>
            </div>

            {/* On an installment the items list the whole scope while the
                payable is one slice of it, so this says so before anyone reads
                the two as disagreeing. */}
            {document.isInstallment ? (
              <p className="mb-4 rounded-xl bg-violet-50 px-4 py-3 text-[13px] leading-relaxed text-violet-800">
                These items describe the full scope of the job. This proforma
                bills {document.installmentPercent}% of it — the amounts below
                come from the agreed schedule, so they cannot be edited here.
                Cancel the installment on its billing plan to re-cut the split.
              </p>
            ) : (
              priceLocked && (
                <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800">
                  This is the agreed amount, so the line items can no longer be
                  changed. Dates, notes and terms are still editable. If the
                  price itself has to move, cancel this document and convert a
                  fresh one from the quotation.
                </p>
              )
            )}

            {isNegotiable && (
              <p className="mb-4 rounded-xl bg-ink-50 px-4 py-3 text-[13px] leading-relaxed text-ink-600">
                Prices on a quotation stay open while the client negotiates.
                Convert it to a proforma invoice once the final amount is
                agreed — that is the point at which it is fixed.
              </p>
            )}

            {document.introLine && (
              <p className="mb-4 rounded-xl bg-ink-50 px-4 py-3 text-[13px] leading-relaxed text-ink-600">
                {document.introLine}
              </p>
            )}
            <ItemsTable items={document.items} editable={false} />
          </section>

          {document.notesTerms && (
            <section className="card animate-fade-up p-5">
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-ink-400">
                Notes &amp; terms
              </h2>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-600">
                {document.notesTerms}
              </p>
            </section>
          )}
        </div>

        <div className="space-y-5">
          <div className="animate-fade-up">
            <TotalsSummary
              subTotal={document.subTotal}
              gstAmount={document.gstAmount}
              totalAmount={document.totalAmount}
              gstApplicable={document.gstApplicable}
              amountInWords={document.amountInWords}
            />
          </div>

          <BillingPlanPanel
            plan={billingPlan}
            currentDocumentId={document._id}
            onChanged={setBillingPlan}
            onOpenDocument={(node) =>
              navigate(ROUTES.documentDetailPath(node._id))
            }
          />

          <DocumentApprovalPanel document={document} />

          <DocumentStatusControl
            documentId={document._id}
            status={document.status}
            onUpdated={fetchDocument}
          />

          <ChainView
            chain={chain}
            currentId={document._id}
            onSelect={(node) =>
              navigate(ROUTES.documentDetailPath(node._id))
            }
          />
        </div>
      </div>

      <DocumentPreviewModal
        open={previewOpen}
        documentId={document._id}
        docNumber={document.docNumber}
        onClose={() => setPreviewOpen(false)}
      />

      <EditDocumentModal
        open={editOpen}
        document={document}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchDocument}
      />

      <ConvertDocumentModal
        open={convertOpen}
        document={document}
        onClose={() => {
          setConvertOpen(false);
          fetchDocument();
        }}
        onSuccess={(converted) => {
          setConvertOpen(false);
          navigate(ROUTES.documentDetailPath(converted._id));
        }}
      />

      <ApproveDocumentModal
        open={approveOpen}
        document={document}
        onClose={() => setApproveOpen(false)}
        onSuccess={fetchDocument}
      />

      <RejectDocumentModal
        open={rejectOpen}
        document={document}
        onClose={() => setRejectOpen(false)}
        onSuccess={fetchDocument}
      />

      <CreateBillingPlanModal
        open={splitOpen}
        document={document}
        onClose={() => setSplitOpen(false)}
        onSuccess={setBillingPlan}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete document?"
        message={`${document.docNumber} is hard-deleted only while it is still an unconverted draft. Otherwise it is cancelled so the numbering series and audit trail stay intact.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={onDeleteConfirm}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  );
}
