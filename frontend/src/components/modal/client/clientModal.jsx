import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import BaseModal from "../baseModal";
import InputField from "../../custom/inputField";
import TextAreaField from "../../custom/textAreaField";
import CustomButton from "../../custom/customButton";
import { commonValidator } from "../../../Utlis/Common/commonValidator";
import {
  handleCreateClient,
  handleUpdateClient,
} from "../../../Services/apiCalling/clientApis";
import { SuccessMessage } from "../../../Utlis/Toastify/ToastMessage";
import { MESSAGES } from "../../../constants/message.constants";

const EMPTY_FORM = {
  name: "",
  address: "",
  gstin: "",
  stateCode: "",
  contactPerson: "",
  email: "",
  phone: "",
};

export default function ClientModal({
  open,
  client = null,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const isEdit = Boolean(client?._id);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(client ? { ...EMPTY_FORM, ...client } : EMPTY_FORM);
      setErrors({});
    }
  }, [open, client]);

  const onFieldChange = (value, field) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {
      name: commonValidator("name", formData.name),
      address: commonValidator("required", formData.address),
      gstin: commonValidator("optionalGstin", formData.gstin),
      email: commonValidator("optionalEmail", formData.email),
      phone: commonValidator("optionalPhone", formData.phone),
    };

    if (formData.stateCode) {
      nextErrors.stateCode = commonValidator("stateCode", formData.stateCode);
    }

    const cleaned = Object.fromEntries(
      Object.entries(nextErrors).filter(([, message]) => message)
    );
    setErrors(cleaned);
    return Object.keys(cleaned).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        gstin: formData.gstin?.trim().toUpperCase() || undefined,
        stateCode: formData.stateCode?.trim() || undefined,
        contactPerson: formData.contactPerson?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
      };

      const result = isEdit
        ? await handleUpdateClient(client._id, payload)
        : await handleCreateClient(payload);

      if (result) {
        SuccessMessage(MESSAGES.savedClient);
        onSuccess(result);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={open}
      title={isEdit ? "Edit client" : "Add client"}
      description="The buyer printed on the document."
      size="md"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton size="sm" loading={saving} onClick={onSubmit}>
            {isEdit ? "Save changes" : "Create client"}
          </CustomButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          className="sm:col-span-2"
          label="Client name"
          name="name"
          required
          placeholder="Atya Ebiz Solutions LLP"
          value={formData.name}
          error={errors.name}
          onChange={onFieldChange}
        />

        <TextAreaField
          className="sm:col-span-2"
          label="Address"
          name="address"
          required
          rows={3}
          placeholder={"Plot 44, Hitech City\nHyderabad 500081"}
          value={formData.address}
          error={errors.address}
          onChange={onFieldChange}
        />

        <InputField
          label="GSTIN"
          name="gstin"
          placeholder="36AAECA1234F1Z5"
          value={formData.gstin}
          error={errors.gstin}
          onChange={onFieldChange}
        />

        <InputField
          label="State code"
          name="stateCode"
          placeholder="36"
          value={formData.stateCode}
          error={errors.stateCode}
          onChange={onFieldChange}
        />

        <InputField
          label="Contact person"
          name="contactPerson"
          placeholder="Ravi K"
          value={formData.contactPerson}
          onChange={onFieldChange}
        />

        <InputField
          label="Phone"
          name="phone"
          placeholder="+91 90000 11111"
          value={formData.phone}
          error={errors.phone}
          onChange={onFieldChange}
        />

        <InputField
          className="sm:col-span-2"
          label="Email"
          name="email"
          type="email"
          placeholder="ravi@atya.com"
          value={formData.email}
          error={errors.email}
          onChange={onFieldChange}
        />

        <p className="flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800 sm:col-span-2">
          <Info size={15} className="mt-0.5 shrink-0" />
          GSTIN is optional here, but a proforma or tax invoice cannot be created
          for a client without one. Quotations work either way and never print
          the buyer GSTIN.
        </p>
      </div>
    </BaseModal>
  );
}
