import { FilterX, RefreshCw } from "lucide-react";
import SelectField from "../custom/selectField";
import DatePickerField from "../custom/datePickerField";
import CustomButton from "../custom/customButton";

// Filters sit in one row above the charts and drive every report on the screen.
export default function AdminFilterBar({
  filters,
  companies = [],
  clients = [],
  loading = false,
  onChange = () => {},
  onReset = () => {},
  onRefresh = () => {},
}) {
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="card mb-5 animate-fade-up p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-12">
        <SelectField
          className="lg:col-span-3"
          name="companyId"
          placeholder="All companies"
          value={filters.companyId}
          options={companies.map((company) => ({
            value: company._id,
            label: company.name,
          }))}
          onChange={onChange}
        />

        <SelectField
          className="lg:col-span-3"
          name="clientId"
          placeholder="All clients"
          value={filters.clientId}
          options={clients.map((client) => ({
            value: client._id,
            label: client.name,
          }))}
          onChange={onChange}
        />

        <DatePickerField
          className="lg:col-span-2"
          name="fromDate"
          placeholder="Issued from"
          value={filters.fromDate}
          onChange={onChange}
        />

        <DatePickerField
          className="lg:col-span-2"
          name="toDate"
          placeholder="Issued until"
          minDate={filters.fromDate}
          value={filters.toDate}
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
      </div>
    </div>
  );
}
