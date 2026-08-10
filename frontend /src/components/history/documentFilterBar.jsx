import { FilterX } from "lucide-react";
import SearchInput from "../custom/searchInput";
import SelectField from "../custom/selectField";
import DatePickerField from "../custom/datePickerField";
import CustomButton from "../custom/customButton";
import {
  DOC_STATUS_OPTIONS,
  DOC_TYPE_OPTIONS,
} from "../../constants/document.constants";

export default function DocumentFilterBar({
  filters,
  companies = [],
  clients = [],
  onChange = () => {},
  onReset = () => {},
}) {
  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => key !== "page" && value
  );

  return (
    <div className="card mb-5 animate-fade-up p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-12">
        <SearchInput
          className="lg:col-span-4"
          value={filters.search}
          placeholder="Search document number…"
          onChange={(value) => onChange(value, "search")}
        />

        <SelectField
          className="lg:col-span-2"
          name="docType"
          placeholder="All types"
          value={filters.docType}
          options={DOC_TYPE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onChange={onChange}
        />

        <SelectField
          className="lg:col-span-2"
          name="status"
          placeholder="All statuses"
          value={filters.status}
          options={DOC_STATUS_OPTIONS}
          onChange={onChange}
        />

        <SelectField
          className="lg:col-span-2"
          name="company"
          placeholder="All companies"
          value={filters.company}
          options={companies.map((company) => ({
            value: company._id,
            label: company.name,
          }))}
          onChange={onChange}
        />

        <SelectField
          className="lg:col-span-2"
          name="client"
          placeholder="All clients"
          value={filters.client}
          options={clients.map((client) => ({
            value: client._id,
            label: client.name,
          }))}
          onChange={onChange}
        />

        <DatePickerField
          className="lg:col-span-3"
          name="fromDate"
          placeholder="Issued from"
          value={filters.fromDate}
          onChange={onChange}
        />

        <DatePickerField
          className="lg:col-span-3"
          name="toDate"
          placeholder="Issued until"
          minDate={filters.fromDate}
          value={filters.toDate}
          onChange={onChange}
        />

        {hasActiveFilters && (
          <div className="flex items-end lg:col-span-2">
            <CustomButton
              variant="ghost"
              fullWidth
              icon={FilterX}
              onClick={onReset}
            >
              Clear filters
            </CustomButton>
          </div>
        )}
      </div>
    </div>
  );
}
