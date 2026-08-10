import { useEffect, useMemo, useState } from "react";
import { Banknote, Building2, FileText } from "lucide-react";
import BaseModal from "../baseModal";
import InputField from "../../custom/inputField";
import TextAreaField from "../../custom/textAreaField";
import CustomButton from "../../custom/customButton";
import { commonValidator } from "../../../Utlis/Common/commonValidator";
import { classNames } from "../../../Utlis/Common/commonMethod";
import {
  handleCreateCompany,
  handleUpdateCompany,
} from "../../../Services/apiCalling/companyApis";
import { SuccessMessage } from "../../../Utlis/Toastify/ToastMessage";
import { MESSAGES } from "../../../constants/message.constants";

const EMPTY_FORM = {
  name: "",
  gstin: "",
  pan: "",
  stateCode: "",
  address: "",
  email: "",
  phone: "",
  website: "",
  bankDetails: {
    accountName: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
    branch: "",
    bankGstin: "",
  },
  defaultTerms: { quotation: "", proforma: "", invoice: "" },
};

const TABS = [
  { key: "details", label: "Company details", icon: Building2 },
  { key: "bank", label: "Bank details", icon: Banknote },
  { key: "terms", label: "Default terms", icon: FileText },
];

const toFormState = (company) => {
  if (!company) return EMPTY_FORM;

  return {
    ...EMPTY_FORM,
    ...company,
    bankDetails: { ...EMPTY_FORM.bankDetails, ...(company.bankDetails || {}) },
    defaultTerms: { ...EMPTY_FORM.defaultTerms, ...(company.defaultTerms || {}) },
  };
};

export default function CompanyModal({
  open,
  company = null,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const isEdit = Boolean(company?._id);
  const [activeTab, setActiveTab] = useState("details");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(toFormState(company));
      setErrors({});
      setActiveTab("details");
    }
  }, [open, company]);

  const onFieldChange = (value, field) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  const onBankChange = (value, field) => {
    setFormData((previous) => ({
      ...previous,
      bankDetails: { ...previous.bankDetails, [field]: value },
    }));
    setErrors((previous) => ({ ...previous, [`bank_${field}`]: "" }));
  };

  const onTermsChange = (value, field) => {
    setFormData((previous) => ({
      ...previous,
      defaultTerms: { ...previous.defaultTerms, [field]: value },
    }));
  };

  const validate = () => {
    const nextErrors = {
      name: commonValidator("name", formData.name),
      gstin: commonValidator("gstin", formData.gstin),
      pan: commonValidator("pan", formData.pan),
      stateCode: commonValidator("stateCode", formData.stateCode),
      address: commonValidator("required", formData.address),
      email: commonValidator("optionalEmail", formData.email),
      phone: commonValidator("optionalPhone", formData.phone),
      bank_accountName: commonValidator(
        "required",
        formData.bankDetails.accountName
      ),
      bank_accountNumber: commonValidator(
        "required",
        formData.bankDetails.accountNumber
      ),
      bank_ifsc: commonValidator("ifsc", formData.bankDetails.ifsc),
      bank_bankGstin: commonValidator(
        "optionalGstin",
        formData.bankDetails.bankGstin
      ),
    };

    const cleaned = Object.fromEntries(
      Object.entries(nextErrors).filter(([, message]) => message)
    );
    setErrors(cleaned);

    // Jump the user to the tab that actually holds the first problem.
    if (Object.keys(cleaned).some((key) => key.startsWith("bank_"))) {
      if (!Object.keys(cleaned).some((key) => !key.startsWith("bank_"))) {
        setActiveTab("bank");
      }
    }

    return Object.keys(cleaned).length === 0;
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    gstin: formData.gstin.trim().toUpperCase(),
    pan: formData.pan.trim().toUpperCase(),
    stateCode: formData.stateCode.trim(),
    address: formData.address.trim(),
    email: formData.email?.trim() || undefined,
    phone: formData.phone?.trim() || undefined,
    website: formData.website?.trim() || undefined,
    bankDetails: {
      accountName: formData.bankDetails.accountName.trim(),
      accountNumber: formData.bankDetails.accountNumber.trim(),
      ifsc: formData.bankDetails.ifsc.trim().toUpperCase(),
      bankName: formData.bankDetails.bankName?.trim() || undefined,
      branch: formData.bankDetails.branch?.trim() || undefined,
      bankGstin: formData.bankDetails.bankGstin?.trim().toUpperCase() || undefined,
    },
    defaultTerms: {
      quotation: formData.defaultTerms.quotation || "",
      proforma: formData.defaultTerms.proforma || "",
      invoice: formData.defaultTerms.invoice || "",
    },
  });

  const onSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = buildPayload();
      const result = isEdit
        ? await handleUpdateCompany(company._id, payload)
        : await handleCreateCompany(payload);

      if (result) {
        SuccessMessage(MESSAGES.savedCompany);
        onSuccess(result);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const errorCountByTab = useMemo(() => {
    const keys = Object.keys(errors);
    return {
      details: keys.filter((key) => !key.startsWith("bank_")).length,
      bank: keys.filter((key) => key.startsWith("bank_")).length,
      terms: 0,
    };
  }, [errors]);

  return (
    <BaseModal
      open={open}
      title={isEdit ? "Edit company" : "Add company"}
      description="Your seller profile — printed on every document you issue."
      size="lg"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton size="sm" loading={saving} onClick={onSubmit}>
            {isEdit ? "Save changes" : "Create company"}
          </CustomButton>
        </>
      }
    >
      <div className="mb-6 flex gap-1.5 rounded-xl bg-ink-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={classNames(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all duration-200",
              activeTab === tab.key
                ? "bg-white text-primary-700 shadow-sm"
                : "text-ink-500 hover:text-ink-800"
            )}
          >
            <tab.icon size={15} />
            <span className="hidden sm:inline">{tab.label}</span>
            {errorCountByTab[tab.key] > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {errorCountByTab[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <div className="grid animate-fade-in gap-4 sm:grid-cols-2">
          <InputField
            className="sm:col-span-2"
            label="Company name"
            name="name"
            required
            placeholder="Magnuscopo LLP"
            value={formData.name}
            error={errors.name}
            onChange={onFieldChange}
          />
          <InputField
            label="GSTIN"
            name="gstin"
            required
            placeholder="29ACGFM6419B1Z9"
            value={formData.gstin}
            error={errors.gstin}
            onChange={onFieldChange}
          />
          <InputField
            label="PAN"
            name="pan"
            required
            placeholder="ACGFM6419B"
            value={formData.pan}
            error={errors.pan}
            onChange={onFieldChange}
          />
          <InputField
            label="State code"
            name="stateCode"
            required
            placeholder="29"
            hint="Exactly 2 digits."
            value={formData.stateCode}
            error={errors.stateCode}
            onChange={onFieldChange}
          />
          <InputField
            label="Website"
            name="website"
            placeholder="https://magnuscopo.com"
            value={formData.website}
            onChange={onFieldChange}
          />
          <TextAreaField
            className="sm:col-span-2"
            label="Address"
            name="address"
            required
            rows={3}
            placeholder={"No 12, MG Road\nBengaluru 560001"}
            value={formData.address}
            error={errors.address}
            onChange={onFieldChange}
          />
          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="accounts@magnuscopo.com"
            value={formData.email}
            error={errors.email}
            onChange={onFieldChange}
          />
          <InputField
            label="Phone"
            name="phone"
            placeholder="+91 90000 00000"
            value={formData.phone}
            error={errors.phone}
            onChange={onFieldChange}
          />
        </div>
      )}

      {activeTab === "bank" && (
        <div className="grid animate-fade-in gap-4 sm:grid-cols-2">
          <InputField
            label="Account name"
            name="accountName"
            required
            value={formData.bankDetails.accountName}
            error={errors.bank_accountName}
            onChange={onBankChange}
          />
          <InputField
            label="Account number"
            name="accountNumber"
            required
            value={formData.bankDetails.accountNumber}
            error={errors.bank_accountNumber}
            onChange={onBankChange}
          />
          <InputField
            label="IFSC"
            name="ifsc"
            required
            placeholder="HDFC0001234"
            value={formData.bankDetails.ifsc}
            error={errors.bank_ifsc}
            onChange={onBankChange}
          />
          <InputField
            label="Bank name"
            name="bankName"
            placeholder="HDFC Bank"
            value={formData.bankDetails.bankName}
            onChange={onBankChange}
          />
          <InputField
            label="Branch"
            name="branch"
            placeholder="MG Road"
            value={formData.bankDetails.branch}
            onChange={onBankChange}
          />
          <InputField
            label="Bank GSTIN"
            name="bankGstin"
            placeholder="29ACGFM6419B1Z9"
            hint="Optional — printed in the bank block."
            value={formData.bankDetails.bankGstin}
            error={errors.bank_bankGstin}
            onChange={onBankChange}
          />
        </div>
      )}

      {activeTab === "terms" && (
        <div className="animate-fade-in space-y-4">
          <p className="rounded-xl bg-primary-50 px-4 py-3 text-[13px] leading-relaxed text-primary-800">
            Each slot seeds the notes &amp; terms of a new document of that type,
            and drives the terms swap when a document is converted. Fill all
            three.
          </p>
          <TextAreaField
            label="Quotation terms"
            name="quotation"
            rows={4}
            placeholder={
              "1. 50% advance payable on confirmation.\n2. Quotation validity: 1 week."
            }
            value={formData.defaultTerms.quotation}
            onChange={onTermsChange}
          />
          <TextAreaField
            label="Proforma invoice terms"
            name="proforma"
            rows={4}
            placeholder={"1. Payable by the due date.\n2. No refunds after delivery."}
            value={formData.defaultTerms.proforma}
            onChange={onTermsChange}
          />
          <TextAreaField
            label="Tax invoice terms"
            name="invoice"
            rows={4}
            placeholder={"1. Payable by the due date.\n2. Confidentiality applies."}
            value={formData.defaultTerms.invoice}
            onChange={onTermsChange}
          />
        </div>
      )}
    </BaseModal>
  );
}
