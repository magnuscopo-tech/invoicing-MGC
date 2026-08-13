import { ListPlus, Trash2 } from "lucide-react";
import EmptyState from "../custom/emptyState";
import { itemsOf } from "../../Utlis/Common/commonMethod";
import { formatCurrency } from "../../Utlis/currencyFormat";
import { computeLineAmount } from "../../Utlis/calculations";

export default function ItemsTable({
  items = [],
  editable = true,
  onRemove = () => {},
}) {
  const itemList = itemsOf(items);

  if (itemList.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-100">
        <EmptyState
          icon={ListPlus}
          title="No items added yet"
          description="At least one line item is required before the document can be saved."
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-100">
      <table className="w-full min-w-[640px]">
        <thead className="bg-ink-50">
          <tr>
            <th className="table-head w-10">#</th>
            <th className="table-head">Description</th>
            <th className="table-head text-right">Qty</th>
            <th className="table-head text-right">Unit price</th>
            <th className="table-head text-right">Disc %</th>
            <th className="table-head text-right">Amount</th>
            {editable && <th className="table-head w-12" />}
          </tr>
        </thead>

        <tbody className="divide-y divide-ink-100">
          {itemList.map((item, index) => (
            <tr
              key={`${item.description}-${index}`}
              className="animate-fade-in transition-colors hover:bg-ink-50/60"
            >
              <td className="table-cell text-ink-400">{index + 1}</td>
              <td className="px-4 py-3.5">
                <p className="text-sm font-medium text-ink-900">
                  {item.description}
                </p>
                <p className="mt-0.5 text-xs capitalize text-ink-400">
                  per {item.unit || "unit"}
                </p>
              </td>
              <td className="table-cell text-right">{item.qty}</td>
              <td className="table-cell text-right">
                {formatCurrency(item.unitPrice)}
              </td>
              <td className="table-cell text-right">
                {item.discountPercent ? `${item.discountPercent}%` : "—"}
              </td>
              <td className="table-cell text-right font-semibold text-ink-950">
                {formatCurrency(item.amount ?? computeLineAmount(item))}
              </td>
              {editable && (
                <td className="px-4 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
