import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import ReportCard from "../admin/reportCard";
import DataTable from "../admin/dataTable";
import CustomButton from "../custom/customButton";
import InputField from "../custom/inputField";
import StatusBadge from "../custom/statusBadge";
import Pagination from "../custom/pagination";
import TableLoader from "../loader/tableLoader";
import ConfirmDialog from "../modal/confirmDialog";
import {
  handleBulkUploadStatement,
  handleDeleteImportBatch,
  handleDownloadExpenseTemplate,
  handleGetImportBatches,
} from "../../Services/apiCalling/expenseApis";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { formatDisplayDate, formatDisplayDateTime } from "../../Utlis/dateFormat";
import {
  classNames,
  downloadBlobAsFile,
  itemsOf,
} from "../../Utlis/Common/commonMethod";
import { SuccessMessage, ErrorMessage } from "../../Utlis/Toastify/ToastMessage";
import {
  EXPENSE_MESSAGES,
  IMPORT_STATUS_LABELS,
  IMPORT_STATUS_TONE,
} from "../../constants/expense.constants";

const LIMIT = 10;
const MAX_BYTES = 10 * 1024 * 1024;

const Toggle = ({ label, hint, checked, onChange }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-3.5 transition-colors hover:border-ink-300">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary-600"
    />
    <span>
      <span className="block text-[13px] font-semibold text-ink-800">{label}</span>
      <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-500">
        {hint}
      </span>
    </span>
  </label>
);

/*
 * Bulk import of a bank statement. Admin only, because an upload rewrites the
 * book wholesale rather than adding one considered entry to it.
 */
export default function ExpenseImportTab({ onImported = () => {} }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [bankAccount, setBankAccount] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [autoCategorize, setAutoCategorize] = useState(true);

  const [batches, setBatches] = useState(null);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [page, setPage] = useState(1);
  const [revertTarget, setRevertTarget] = useState(null);
  const [reverting, setReverting] = useState(false);
  const receiptErrors = itemsOf(receipt?.errors);
  const batchRows = itemsOf(batches?.items);

  const fetchBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      setBatches(await handleGetImportBatches({ page, limit: LIMIT }));
    } finally {
      setLoadingBatches(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Checked here as well as on the server so an obviously wrong file fails
  // instantly instead of after a 10 MB round trip.
  const acceptFile = (candidate) => {
    if (!candidate) return;

    if (!/\.(xlsx|xlsm)$/i.test(candidate.name)) {
      ErrorMessage(
        /\.xls$/i.test(candidate.name)
          ? "The old .xls format is not supported — re-save the file as .xlsx."
          : "Only .xlsx spreadsheet files can be uploaded."
      );
      return;
    }
    if (candidate.size > MAX_BYTES) {
      ErrorMessage("That file is larger than 10 MB.");
      return;
    }

    setFile(candidate);
    setReceipt(null);
  };

  const onUpload = async () => {
    if (!file) {
      ErrorMessage(EXPENSE_MESSAGES.uploadRequired);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("allowDuplicates", String(allowDuplicates));
      formData.append("autoCategorize", String(autoCategorize));
      if (bankAccount.trim()) formData.append("bankAccount", bankAccount.trim());
      if (sheetName.trim()) formData.append("sheetName", sheetName.trim());

      const result = await handleBulkUploadStatement(formData);
      if (result) {
        setReceipt(result);
        SuccessMessage(result.message || "Statement imported.");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchBatches();
        onImported();
      }
    } finally {
      setUploading(false);
    }
  };

  const onDownloadTemplate = async () => {
    const blob = await handleDownloadExpenseTemplate();
    if (blob) {
      downloadBlobAsFile(blob, "expense-tracker-template.xlsx");
    }
  };

  const onRevertConfirm = async () => {
    setReverting(true);
    try {
      const result = await handleDeleteImportBatch(revertTarget._id);
      if (result) {
        SuccessMessage(EXPENSE_MESSAGES.importReverted);
        setRevertTarget(null);
        fetchBatches();
        onImported();
      }
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="space-y-5">
      <ReportCard
        title="Upload a bank statement"
        description="Reads an .xlsx export or a filled-in tracker. The importer finds the header row itself and understands the usual column names — Narration or Particulars, Withdrawal/Deposit or Credit/Debit, or a single signed Amount column."
        actions={
          <CustomButton
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={onDownloadTemplate}
          >
            Template
          </CustomButton>
        }
      >
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            acceptFile(event.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={classNames(
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging
              ? "border-primary-400 bg-primary-50"
              : "border-ink-200 hover:border-primary-300 hover:bg-ink-50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xlsm"
            className="hidden"
            onChange={(event) => acceptFile(event.target.files?.[0])}
          />

          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <FileSpreadsheet size={22} strokeWidth={1.8} />
          </span>

          {file ? (
            <>
              <p className="text-sm font-semibold text-ink-900">{file.name}</p>
              <p className="mt-1 text-[12px] text-ink-500">
                {(file.size / 1024).toFixed(0)} KB — ready to import
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-ink-500 hover:bg-ink-100"
              >
                <X size={12} /> Choose a different file
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink-900">
                Drop your statement here, or click to browse
              </p>
              <p className="mt-1 text-[12px] text-ink-500">
                .xlsx up to 10 MB
              </p>
            </>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InputField
            label="Bank account number"
            name="bankAccount"
            placeholder="Read from the file when left blank"
            value={bankAccount}
            hint="Only needed if the statement does not print it."
            onChange={(value) => setBankAccount(value)}
          />
          <InputField
            label="Sheet name"
            name="sheetName"
            placeholder="Chosen automatically when left blank"
            value={sheetName}
            hint="Set this if the workbook has several ledgers."
            onChange={(value) => setSheetName(value)}
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Guess missing categories"
            hint="Classifies rows the file left blank from the narration, and flags each one as needing review."
            checked={autoCategorize}
            onChange={setAutoCategorize}
          />
          <Toggle
            label="Import rows already in the book"
            hint="Off by default. Overlapping statement periods are safe to re-upload — matching rows are skipped rather than double counted."
            checked={allowDuplicates}
            onChange={setAllowDuplicates}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <CustomButton
            icon={Upload}
            loading={uploading}
            disabled={!file}
            onClick={onUpload}
          >
            Import statement
          </CustomButton>
        </div>

        {receipt?.batch && (
          <div className="mt-5 animate-fade-up rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
            <div className="flex items-start gap-3">
              {receipt.batch.status === "completed" ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink-950">
                  {receipt.batch.fileName}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Imported", receipt.batch.inserted],
                    ["Already booked", receipt.batch.duplicates],
                    ["Could not read", receipt.batch.skipped],
                    ["Needs a category", receipt.needsReview],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                        {label}
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-ink-950 tabular-nums">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-[12px] text-ink-500">
                  {formatCurrency(receipt.batch.totalCredit)} in ·{" "}
                  {formatCurrency(receipt.batch.totalDebit)} out
                  {receipt.batch.closingBalance !== null &&
                    ` · closing balance ${formatCurrency(receipt.batch.closingBalance)}`}
                </p>

                {receiptErrors.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-[12px] font-semibold text-amber-700">
                      {receiptErrors.length} row
                      {receiptErrors.length === 1 ? "" : "s"} need attention
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {receiptErrors.map((item, index) => (
                        <li
                          key={`${item.row}-${index}`}
                          className="text-[12px] leading-relaxed text-ink-600"
                        >
                          <span className="font-semibold text-ink-800">
                            Row {item.row ?? "?"}:
                          </span>{" "}
                          {item.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="mt-4 flex gap-2 rounded-xl bg-primary-50 px-4 py-3 text-[12px] leading-relaxed text-primary-900">
          <Info size={14} className="mt-0.5 shrink-0" />
          Rows that cannot be read are reported individually and the rest of the
          file still imports — one bad line never costs you the whole statement.
          Every import can be undone in one action from the history below.
        </p>
      </ReportCard>

      <ReportCard
        title="Import history"
        description="Every upload, and what it did to the book. Reverting one removes exactly the transactions it created."
      >
        {loadingBatches ? (
          <TableLoader rows={5} columns={6} />
        ) : (
          <>
            <DataTable
              emptyLabel="No statements have been imported yet."
              columns={[
                {
                  key: "fileName",
                  label: "File",
                  render: (row) => (
                    <div className="max-w-[16rem]">
                      <p className="truncate text-[13px] font-semibold text-ink-950">
                        {row.fileName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {formatDisplayDateTime(row.createdAt)}
                        {row.uploadedBy?.name && ` · ${row.uploadedBy.name}`}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "period",
                  label: "Period",
                  render: (row) =>
                    row.periodFrom ? (
                      <span className="whitespace-nowrap text-[12px] text-ink-600">
                        {formatDisplayDate(row.periodFrom)} —{" "}
                        {formatDisplayDate(row.periodTo)}
                      </span>
                    ) : (
                      <span className="text-ink-300">—</span>
                    ),
                },
                {
                  key: "rows",
                  label: "Rows",
                  align: "right",
                  render: (row) => (
                    <span className="whitespace-nowrap text-[12px] text-ink-600 tabular-nums">
                      <span className="font-semibold text-ink-950">
                        {row.inserted}
                      </span>{" "}
                      in
                      {row.duplicates > 0 && ` · ${row.duplicates} dup`}
                      {row.skipped > 0 && ` · ${row.skipped} bad`}
                    </span>
                  ),
                },
                {
                  key: "totalCredit",
                  label: "Credited",
                  align: "right",
                  render: (row) => formatCurrency(row.totalCredit),
                },
                {
                  key: "totalDebit",
                  label: "Debited",
                  align: "right",
                  render: (row) => formatCurrency(row.totalDebit),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => (
                    <StatusBadge
                      label={IMPORT_STATUS_LABELS[row.status]}
                      tone={IMPORT_STATUS_TONE[row.status]}
                    />
                  ),
                },
                {
                  key: "actions",
                  label: "",
                  align: "right",
                  render: (row) => (
                    <button
                      type="button"
                      title="Revert this import"
                      onClick={() => setRevertTarget(row)}
                      className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  ),
                },
              ]}
              rows={batchRows.map((row) => ({ ...row, id: row._id }))}
            />

            <Pagination
              page={page}
              limit={LIMIT}
              total={batches?.total || 0}
              onPageChange={setPage}
            />
          </>
        )}
      </ReportCard>

      <ConfirmDialog
        open={Boolean(revertTarget)}
        title="Revert this import?"
        message={`The ${
          revertTarget?.inserted || 0
        } transaction(s) created by "${
          revertTarget?.fileName || ""
        }" will be deleted. Anything typed by hand, or imported from another file, is untouched.`}
        confirmLabel="Revert import"
        loading={reverting}
        onConfirm={onRevertConfirm}
        onClose={() => setRevertTarget(null)}
      />
    </div>
  );
}
