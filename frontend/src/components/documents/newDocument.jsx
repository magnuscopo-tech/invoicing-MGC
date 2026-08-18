import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import PageHeader from "../custom/pageHeader";
import CustomButton from "../custom/customButton";
import EmptyState from "../custom/emptyState";
import PageLoader from "../loader/PageLoader";
import WizardStepper from "./wizardStepper";
import DocumentTypeSelector from "./documentTypeSelector";
import DocumentPartiesForm from "./documentPartiesForm";
import DocumentItemsStep from "./documentItemsStep";
import DocumentReviewStep from "./documentReviewStep";
import DocumentSavedModal from "./documentSavedModal";
import DocumentPreviewModal from "../modal/documents/documentPreviewModal";
import ConvertDocumentModal from "../modal/documents/convertDocumentModal";
import useMasterData from "../../hooks/useMasterData";
import {
  resetDraft,
  selectDraftForm,
  selectDraftStep,
  setDraftField,
  setDraftForm,
  setDraftItems,
  setDraftStep,
} from "../../ReduxFeature/documentDraft/documentDraftSlice";
import { handleCreateDocument, handleGetNextNumber } from "../../Services/apiCalling/documentApis";
import { computeTotals } from "../../Utlis/calculations";
import { isDueDateValid } from "../../Utlis/Common/commonValidator";
import { todayInputDate } from "../../Utlis/dateFormat";
import { ErrorMessage, SuccessMessage } from "../../Utlis/Toastify/ToastMessage";
import { DOC_TYPES } from "../../constants/document.constants";
import { MESSAGES } from "../../constants/message.constants";
import { ROUTES } from "../../constants/route.constants";

const STEPS = [
  { title: "Document type", hint: "Series and GST rules" },
  { title: "Parties & dates", hint: "Seller, buyer, timing" },
  { title: "Items", hint: "Lines and live totals" },
  { title: "Terms & review", hint: "Final check before saving" },
];

const SERIAL_PAD_LENGTH = 3;
const padSerial = (value) => String(value || "").padStart(SERIAL_PAD_LENGTH, "0");

export default function NewDocument() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const formData = useSelector(selectDraftForm);
  const activeStep = useSelector(selectDraftStep);
  const { companies, clients, services, loading } = useMasterData();

  const [errors, setErrors] = useState({});
  const [numberPreview, setNumberPreview] = useState(null);
  const [serialValue, setSerialValue] = useState("");
  const [serialTouched, setSerialTouched] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedDocument, setSavedDocument] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const selectedCompany = useMemo(
    () => companies.find((company) => company._id === formData.company) || null,
    [companies, formData.company]
  );
  const selectedClient = useMemo(
    () => clients.find((client) => client._id === formData.client) || null,
    [clients, formData.client]
  );

  const isQuotation = formData.docType === DOC_TYPES.quotation;
  const dueDateLabel = isQuotation ? "Valid Until" : "Due Date";
  const defaultTerms = selectedCompany?.defaultTerms?.[formData.docType] || "";
  const totals = useMemo(
    () => computeTotals(formData.items, formData.gstApplicable),
    [formData.items, formData.gstApplicable]
  );

  useEffect(() => {
    if (!formData.issueDate) {
      dispatch(setDraftField({ field: "issueDate", value: todayInputDate() }));
    }
  }, [dispatch, formData.issueDate]);

  // Seed the terms slot whenever the type or company changes, unless the user
  // has already typed something custom.
  useEffect(() => {
    if (!selectedCompany) return;

    const nextDefault =
      selectedCompany.defaultTerms?.[formData.docType] || "";
    const isUntouched =
      !formData.notesTerms ||
      Object.values(selectedCompany.defaultTerms || {}).includes(
        formData.notesTerms
      );

    if (isUntouched && formData.notesTerms !== nextDefault) {
      dispatch(setDraftField({ field: "notesTerms", value: nextDefault }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, selectedCompany, formData.docType]);

  const fetchNumberPreview = useCallback(async () => {
    if (!formData.company || !formData.docType) {
      setNumberPreview(null);
      return;
    }

    setLoadingNumber(true);
    try {
      const preview = await handleGetNextNumber(
        formData.docType,
        formData.company,
        formData.issueDate
      );
      setNumberPreview(preview);
      setSerialValue(preview?.serialNumber ? padSerial(preview.serialNumber) : "");
      setSerialTouched(false);
    } finally {
      setLoadingNumber(false);
    }
  }, [formData.company, formData.docType, formData.issueDate]);

  useEffect(() => {
    fetchNumberPreview();
  }, [fetchNumberPreview]);

  const onTypeChange = (docType) => {
    dispatch(
      setDraftForm({
        docType,
        gstApplicable: docType !== DOC_TYPES.quotation,
        introLine: docType === DOC_TYPES.quotation ? formData.introLine : "",
      })
    );
    setErrors({});
  };

  const onFieldChange = (value, field) => {
    dispatch(setDraftField({ field, value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  const onSerialChange = (value) => {
    const digitsOnly = String(value).replace(/\D/g, "").slice(0, 6);
    setSerialValue(digitsOnly);
    setSerialTouched(true);
    setErrors((previous) => ({ ...previous, serialNumber: "" }));
  };

  const serialNumber = Number(serialValue);
  const displayDocNumber = useMemo(() => {
    if (!numberPreview?.docNumber) return "";
    if (!serialNumber) return numberPreview.docNumber;
    return numberPreview.docNumber.replace(/\d+$/, padSerial(serialNumber));
  }, [numberPreview?.docNumber, serialNumber]);

  const onAddItem = (item) => {
    dispatch(setDraftItems([...formData.items, item]));
    setErrors((previous) => ({ ...previous, items: "" }));
  };

  const onRemoveItem = (index) => {
    dispatch(setDraftItems(formData.items.filter((_, i) => i !== index)));
  };

  const validateStep = (step) => {
    const nextErrors = {};

    if (step === 1) {
      if (!formData.company) nextErrors.company = "Select a company.";
      if (!formData.client) nextErrors.client = "Select a client.";
      if (!formData.issueDate) nextErrors.issueDate = "Select an issue date.";
      if (!isDueDateValid(formData.issueDate, formData.dueDate)) {
        nextErrors.dueDate = `${dueDateLabel} cannot be before the issue date.`;
      }
      if (!isQuotation && selectedClient && !selectedClient.gstin) {
        nextErrors.client =
          "This client needs a GSTIN before a proforma or tax invoice can be created.";
      }
    }

    if (step === 2 && formData.items.length === 0) {
      nextErrors.items = MESSAGES.itemsRequired;
    }

    if (step === 3) {
      if (!serialNumber || !Number.isInteger(serialNumber) || serialNumber < 1) {
        nextErrors.serialNumber = "Enter a serial number of 1 or higher.";
      }
    }

    setErrors(nextErrors);

    if (nextErrors.items) ErrorMessage(nextErrors.items);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(activeStep)) return;
    dispatch(setDraftStep(Math.min(activeStep + 1, STEPS.length - 1)));
  };

  const goBack = () => dispatch(setDraftStep(Math.max(activeStep - 1, 0)));

  const onSave = async () => {
    if (!validateStep(1)) {
      dispatch(setDraftStep(1));
      return;
    }
    if (!validateStep(2)) {
      dispatch(setDraftStep(2));
      return;
    }
    if (!validateStep(3)) {
      dispatch(setDraftStep(3));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        docType: formData.docType,
        company: formData.company,
        client: formData.client,
        issueDate: formData.issueDate,
        gstApplicable: formData.gstApplicable,
        notesTerms: formData.notesTerms,
        items: formData.items,
      };
      if (serialTouched) payload.serialNumber = serialNumber;
      if (formData.dueDate) payload.dueDate = formData.dueDate;
      if (isQuotation && formData.introLine) {
        payload.introLine = formData.introLine;
      }

      const result = await handleCreateDocument(payload);
      if (result) {
        SuccessMessage(MESSAGES.documentCreated);
        setSavedDocument(result);
      }
    } finally {
      setSaving(false);
    }
  };

  const finishWizard = (documentId) => {
    dispatch(resetDraft());
    navigate(ROUTES.documentDetailPath(documentId));
  };

  if (loading) return <PageLoader label="Loading companies and catalog…" />;

  if (companies.length === 0 || clients.length === 0) {
    return (
      <div className="card">
        <EmptyState
          title="Set up your master data first"
          description={
            companies.length === 0
              ? "Add at least one company before creating a document — the seller block is pulled from it."
              : "Add at least one client before creating a document — the buyer block is pulled from it."
          }
          actionLabel={companies.length === 0 ? "Add company" : "Add client"}
          onAction={() =>
            navigate(companies.length === 0 ? ROUTES.companies : ROUTES.clients)
          }
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="New Document"
        description="One form, cascading through the whole chain."
      >
        <CustomButton
          variant="ghost"
          size="sm"
          onClick={() => {
            dispatch(resetDraft());
            setErrors({});
          }}
        >
          Reset draft
        </CustomButton>
      </PageHeader>

      <WizardStepper
        steps={STEPS}
        activeStep={activeStep}
        onStepClick={(step) => dispatch(setDraftStep(step))}
      />

      <div className="card mt-5 animate-fade-up p-5 sm:p-6">
        {activeStep === 0 && (
          <DocumentTypeSelector
            value={formData.docType}
            numberPreview={numberPreview}
            loadingNumber={loadingNumber}
            onChange={onTypeChange}
          />
        )}

        {activeStep === 1 && (
          <DocumentPartiesForm
            formData={formData}
            errors={errors}
            companies={companies}
            clients={clients}
            selectedCompany={selectedCompany}
            selectedClient={selectedClient}
            dueDateLabel={dueDateLabel}
            onChange={onFieldChange}
          />
        )}

        {activeStep === 2 && (
          <DocumentItemsStep
            items={formData.items}
            services={services}
            totals={totals}
            gstApplicable={formData.gstApplicable}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
          />
        )}

        {activeStep === 3 && (
          <DocumentReviewStep
            formData={formData}
            numberPreview={numberPreview}
            displayDocNumber={displayDocNumber}
            serialValue={serialValue}
            serialError={errors.serialNumber}
            selectedCompany={selectedCompany}
            selectedClient={selectedClient}
            defaultTerms={defaultTerms}
            totals={totals}
            dueDateLabel={dueDateLabel}
            onChange={onFieldChange}
            onSerialChange={onSerialChange}
            onResetTerms={() =>
              dispatch(
                setDraftField({ field: "notesTerms", value: defaultTerms })
              )
            }
          />
        )}

        <footer className="mt-8 flex items-center justify-between gap-3 border-t border-ink-100 pt-5">
          <CustomButton
            variant="secondary"
            icon={ArrowLeft}
            disabled={activeStep === 0}
            onClick={goBack}
          >
            Back
          </CustomButton>

          {activeStep < STEPS.length - 1 ? (
            <CustomButton icon={ArrowRight} iconRight onClick={goNext}>
              Continue
            </CustomButton>
          ) : (
            <CustomButton icon={Save} loading={saving} onClick={onSave}>
              Save document
            </CustomButton>
          )}
        </footer>
      </div>

      <DocumentSavedModal
        open={Boolean(savedDocument) && !previewOpen && !convertOpen}
        document={savedDocument}
        onPreview={() => setPreviewOpen(true)}
        onConvert={() => setConvertOpen(true)}
        onOpenDocument={() => finishWizard(savedDocument._id)}
        onClose={() => finishWizard(savedDocument._id)}
      />

      <DocumentPreviewModal
        open={previewOpen}
        documentId={savedDocument?._id}
        docNumber={savedDocument?.docNumber}
        onClose={() => setPreviewOpen(false)}
      />

      <ConvertDocumentModal
        open={convertOpen}
        document={savedDocument}
        onClose={() => setConvertOpen(false)}
        onSuccess={(converted) => finishWizard(converted._id)}
      />
    </>
  );
}
