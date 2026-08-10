import { useState } from "react";
import { Plus } from "lucide-react";
import SelectField from "../custom/selectField";
import InputField from "../custom/inputField";
import CustomButton from "../custom/customButton";
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
};

export default function ItemBuilder({ services = [], onAdd = () => {} }) {
  const [line, setLine] = useState(EMPTY_LINE);
  const [errors, setErrors] = useState({});

  const onFieldChange = (value, field) => {
    setLine((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
  };

  // Picking a catalog service seeds description, price and unit — all editable.
  const onServiceChange = (serviceId) => {
    const service = services.find((item) => item._id === serviceId);

    setLine((previous) => ({
      ...previous,
      serviceRef: serviceId,
      description: service?.name || previous.description,
      unit: service?.unit || previous.unit,
      unitPrice:
        service?.defaultUnitPrice !== undefined
          ? service.defaultUnitPrice
          : previous.unitPrice,
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
          options={services.map((service) => ({
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
    </div>
  );
}
