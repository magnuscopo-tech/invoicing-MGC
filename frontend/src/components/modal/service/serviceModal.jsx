import { useEffect, useState } from "react";
import BaseModal from "../baseModal";
import InputField from "../../custom/inputField";
import TextAreaField from "../../custom/textAreaField";
import SelectField from "../../custom/selectField";
import CustomButton from "../../custom/customButton";
import { commonValidator } from "../../../Utlis/Common/commonValidator";
import {
  handleCreateService,
  handleUpdateService,
} from "../../../Services/apiCalling/serviceApis";
import { SuccessMessage } from "../../../Utlis/Toastify/ToastMessage";
import { MESSAGES } from "../../../constants/message.constants";

const EMPTY_FORM = {
  name: "",
  description: "",
  defaultUnitPrice: "",
  unit: "unit",
};

const UNIT_OPTIONS = [
  { value: "unit", label: "Unit" },
  { value: "package", label: "Package" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "project", label: "Project" },
];

export default function ServiceModal({
  open,
  service = null,
  onClose = () => {},
  onSuccess = () => {},
}) {
  const isEdit = Boolean(service?._id);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(
        service
          ? {
              ...EMPTY_FORM,
              ...service,
              defaultUnitPrice: service.defaultUnitPrice ?? "",
            }
          : EMPTY_FORM
      );
      setErrors({});
    }
  }, [open, service]);

  const onFieldChange = (value, field) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = { name: commonValidator("name", formData.name) };

    if (formData.defaultUnitPrice !== "") {
      nextErrors.defaultUnitPrice = commonValidator(
        "positiveNumber",
        formData.defaultUnitPrice
      );
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
        description: formData.description?.trim() || undefined,
        defaultUnitPrice: Number(formData.defaultUnitPrice) || 0,
        unit: formData.unit || "unit",
      };

      const result = isEdit
        ? await handleUpdateService(service._id, payload)
        : await handleCreateService(payload);

      if (result) {
        SuccessMessage(MESSAGES.savedService);
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
      title={isEdit ? "Edit service" : "Add service"}
      description="Catalog defaults for the item builder. Every value can be overridden per document line."
      size="md"
      onClose={onClose}
      footer={
        <>
          <CustomButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton size="sm" loading={saving} onClick={onSubmit}>
            {isEdit ? "Save changes" : "Create service"}
          </CustomButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          className="sm:col-span-2"
          label="Service name"
          name="name"
          required
          placeholder="1–2 Professionally Edited Videos"
          value={formData.name}
          error={errors.name}
          onChange={onFieldChange}
        />

        <TextAreaField
          className="sm:col-span-2"
          label="Description"
          name="description"
          rows={3}
          placeholder="What this service covers…"
          value={formData.description}
          onChange={onFieldChange}
        />

        <InputField
          label="Default unit price"
          name="defaultUnitPrice"
          type="number"
          prefix="₹"
          placeholder="10000"
          value={formData.defaultUnitPrice}
          error={errors.defaultUnitPrice}
          onChange={onFieldChange}
        />

        <SelectField
          label="Unit"
          name="unit"
          options={UNIT_OPTIONS}
          placeholder="Select a unit"
          value={formData.unit}
          onChange={onFieldChange}
        />
      </div>
    </BaseModal>
  );
}
