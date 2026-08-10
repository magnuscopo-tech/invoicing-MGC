import ItemBuilder from "./itemBuilder";
import ItemsTable from "./itemsTable";
import TotalsSummary from "./totalsSummary";

export default function DocumentItemsStep({
  items = [],
  services = [],
  totals,
  gstApplicable = false,
  onAddItem = () => {},
  onRemoveItem = () => {},
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-950">
          What are you billing for?
        </h2>
        <p className="mt-0.5 text-subtle">
          Pick from the catalog or type a custom line. Totals update as you go —
          the server recalculates and stores its own result on save.
        </p>
      </div>

      <ItemBuilder services={services} onAdd={onAddItem} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ItemsTable items={items} onRemove={onRemoveItem} />
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <TotalsSummary
            subTotal={totals.subTotal}
            gstAmount={totals.gstAmount}
            totalAmount={totals.totalAmount}
            gstApplicable={gstApplicable}
          />
        </div>
      </div>
    </section>
  );
}
