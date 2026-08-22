import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
  includedServices: [],
};

const UNIT_OPTIONS = [
  { value: "unit", label: "Unit" },
  { value: "package", label: "Package" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
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
              includedServices: Array.isArray(service.includedServices)
                ? service.includedServices
                : [],
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

  const onIncludedServiceChange = (index, value) => {
    setFormData((previous) => ({
      ...previous,
      includedServices: previous.includedServices.map((item, itemIndex) =>
        itemIndex === index ? { ...item, title: value } : item
      ),
    }));
  };

  const addIncludedService = () => {
    setFormData((previous) => ({
      ...previous,
      includedServices: [...previous.includedServices, { title: "" }],
    }));
  };

  const removeIncludedService = (index) => {
    setFormData((previous) => ({
      ...previous,
      includedServices: previous.includedServices.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
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
        includedServices: formData.includedServices
          .map((item) => ({ title: item.title?.trim() || "" }))
          .filter((item) => item.title),
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

        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-[13px] font-semibold text-ink-700">
              Included services
            </label>
            <button
              type="button"
              onClick={addIncludedService}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-primary-700 transition-colors hover:bg-primary-50"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          <div className="space-y-2">
            {formData.includedServices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 px-3 py-2.5 text-[13px] text-ink-400">
                No included services added.
              </div>
            ) : (
              formData.includedServices.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <InputField
                    className="flex-1"
                    name={`includedService-${index}`}
                    placeholder="Example: UI/UX Design"
                    value={item.title}
                    onChange={(value) => onIncludedServiceChange(index, value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeIncludedService(index)}
                    className="mt-1 rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Remove included service"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
