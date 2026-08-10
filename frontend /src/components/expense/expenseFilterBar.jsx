import { FilterX, RefreshCw } from "lucide-react";
import SelectField from "../custom/selectField";
import DatePickerField from "../custom/datePickerField";
import SearchInput from "../custom/searchInput";
import CustomButton from "../custom/customButton";
import {
  DIRECTION_OPTIONS,
  PAYMENT_MODE_OPTIONS,
  SOURCE_OPTIONS,
} from "../../constants/expense.constants";

/*
 * One filter row above everything on the tab. The same scope object drives the
 * dashboard charts and the ledger table, so switching tabs never silently
 * changes what is being measured.
 */
export default function ExpenseFilterBar({
  filters,
  categoryOptions = [],
  loading = false,
  showSearch = true,
  onChange = () => {},
  onReset = () => {},
  onRefresh = () => {},
}) {
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="card mb-5 animate-fade-up p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-12">
        <DatePickerField
          className="lg:col-span-2"
          name="fromDate"
          placeholder="From date"
          value={filters.fromDate}
          onChange={onChange}
        />

        <DatePickerField
          className="lg:col-span-2"
          name="toDate"
          placeholder="To date"
          minDate={filters.fromDate}
          value={filters.toDate}
          onChange={onChange}
        />

        <SelectField
          className="lg:col-span-2"
          name="direction"
          placeholder="In and out"
          value={filters.direction}
          options={DIRECTION_OPTIONS}
          onChange={onChange}
        />

        <SelectField
          className="lg:col-span-2"
          name="category"
          placeholder="All categories"
          value={filters.category}
          options={categoryOptions}
          onChange={onChange}
        />

        <SelectField
          className="lg:col-span-2"
          name="paymentMode"
          placeholder="All modes"
          value={filters.paymentMode}
          options={PAYMENT_MODE_OPTIONS}
          onChange={onChange}
        />

        <div className="flex items-end gap-2 lg:col-span-2">
          <CustomButton
            variant="secondary"
            fullWidth
            icon={RefreshCw}
            loading={loading}
            onClick={onRefresh}
          >
            Refresh
          </CustomButton>
          {hasActiveFilters && (
            <CustomButton variant="ghost" icon={FilterX} onClick={onReset} />
          )}
        </div>

        {showSearch && (
          <>
            <SearchInput
              className="lg:col-span-8"
              value={filters.search}
              placeholder="Search description, party, reference or remarks…"
              onChange={(value) => onChange(value, "search")}
            />
            <SelectField
              className="lg:col-span-4"
              name="source"
              placeholder="Typed and imported"
              value={filters.source}
              options={SOURCE_OPTIONS}
              onChange={onChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
