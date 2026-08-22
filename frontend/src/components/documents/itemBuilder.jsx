import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import SelectField from "../custom/selectField";
import InputField from "../custom/inputField";
import CustomButton from "../custom/customButton";
import { itemsOf } from "../../Utlis/Common/commonMethod";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { computeLineAmount } from "../../Utlis/calculations";
import { commonValidator } from "../../Utlis/Common/commonValidator";

const EMPTY_LINE = {
  serviceRef: "",
  description: "",
  unit: "unit",
  qty: 1,
  unitPrice: "",
  discountPercent: 0,
  includedServices: [],
};

export default function ItemBuilder({ services = [], onAdd = () => {} }) {
  const [line, setLine] = useState(EMPTY_LINE);
  const [errors, setErrors] = useState({});
  const serviceList = itemsOf(services);

  const onFieldChange = (value, field) => {
    setLine((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  const onIncludedServiceChange = (index, value) => {
    setLine((previous) => ({
      ...previous,
      includedServices: previous.includedServices.map((item, itemIndex) =>
        itemIndex === index ? { ...item, title: value } : item
      ),
    }));
  };

  const addIncludedService = () => {
    setLine((previous) => ({
      ...previous,
      includedServices: [...previous.includedServices, { title: "" }],
    }));
  };

  const removeIncludedService = (index) => {
    setLine((previous) => ({
      ...previous,
      includedServices: previous.includedServices.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  // Picking a catalog service seeds description, price and unit — all editable.
  const onServiceChange = (serviceId) => {
    const service = serviceList.find((item) => item._id === serviceId);

    setLine((previous) => ({
      ...previous,
      serviceRef: serviceId,
      description: service?.name || previous.description,
      unit: service?.unit || previous.unit,
      unitPrice:
        service?.defaultUnitPrice !== undefined
          ? service.defaultUnitPrice
          : previous.unitPrice,
      includedServices: Array.isArray(service?.includedServices)
        ? service.includedServices.map((item) => ({ title: item.title || "" }))
        : [],
    }));
    setErrors({});
  };

  const validate = () => {
    const nextErrors = {
      description: commonValidator("required", line.description),
      qty: commonValidator("positiveNumber", line.qty),
      unitPrice: commonValidator("positiveNumber", line.unitPrice),
      discountPercent: commonValidator("discountPercent", line.discountPercent),
    };

    if (!nextErrors.qty && Number(line.qty) <= 0) {
      nextErrors.qty = "Quantity must be greater than zero.";
    }

    const cleaned = Object.fromEntries(
      Object.entries(nextErrors).filter(([, message]) => message)
    );
    setErrors(cleaned);
    return Object.keys(cleaned).length === 0;
  };

  const onAddClick = () => {
    if (!validate()) return;

    onAdd({
      serviceRef: line.serviceRef || undefined,
      description: line.description.trim(),
      unit: line.unit || "unit",
      qty: Number(line.qty),
      unitPrice: Number(line.unitPrice),
      discountPercent: Number(line.discountPercent) || 0,
      includedServices: line.includedServices
        .map((item) => ({ title: item.title?.trim() || "" }))
        .filter((item) => item.title),
    });

    setLine(EMPTY_LINE);
    setErrors({});
  };

  const livePreview = computeLineAmount(line);

  return (
    <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-primary-900">
          Add a line item
        </p>
        <p className="text-[13px] font-bold text-primary-800">
          {formatCurrency(livePreview)}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <SelectField
          className="lg:col-span-4"
          label="From catalog"
          name="serviceRef"
          placeholder="Custom line item"
          value={line.serviceRef}
          options={serviceList.map((service) => ({
            value: service._id,
            label: service.name,
          }))}
          onChange={onServiceChange}
        />

        <InputField
          className="lg:col-span-8"
          label="Description"
          name="description"
          required
          placeholder="What is being billed"
          value={line.description}
          error={errors.description}
          onChange={onFieldChange}
        />

        <InputField
          className="lg:col-span-2"
          label="Qty"
          name="qty"
          type="number"
          required
          value={line.qty}
          error={errors.qty}
          onChange={onFieldChange}
        />

        <InputField
          className="lg:col-span-2"
          label="Unit"
          name="unit"
          placeholder="unit"
          value={line.unit}
          onChange={onFieldChange}
        />

        <InputField
          className="lg:col-span-3"
          label="Unit price"
          name="unitPrice"
          type="number"
          prefix="₹"
          required
          placeholder="0"
          value={line.unitPrice}
          error={errors.unitPrice}
          onChange={onFieldChange}
        />

        <InputField
          className="lg:col-span-2"
          label="Discount %"
          name="discountPercent"
          type="number"
          value={line.discountPercent}
          error={errors.discountPercent}
          onChange={onFieldChange}
        />

        <div className="flex items-end lg:col-span-3">
          <CustomButton fullWidth icon={Plus} onClick={onAddClick}>
            Add item
          </CustomButton>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-ink-100 bg-white/70 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-ink-700">
            Included services
          </p>
          <button
            type="button"
            onClick={addIncludedService}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-primary-700 transition-colors hover:bg-primary-50"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        {line.includedServices.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-200 px-3 py-2 text-[13px] text-ink-400">
            No included services for this item.
          </p>
        ) : (
          <div className="space-y-2">
            {line.includedServices.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <InputField
                  className="flex-1"
                  name={`lineIncludedService-${index}`}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
