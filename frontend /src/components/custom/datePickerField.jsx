import DatePicker from "react-datepicker";
import { AlertCircle, CalendarDays } from "lucide-react";
import { classNames } from "../../Utlis/Common/commonMethod";
import { toInputDate } from "../../Utlis/dateFormat";

export default function DatePickerField({
  label,
  name,
  value = "",
  error = "",
  hint = "",
  minDate = null,
  required = false,
  disabled = false,
  placeholder = "Select a date",
  className = "",
  onChange = () => {},
}) {
  const selected = value ? new Date(value) : null;

  return (
    <div className={className}>
      {label && (
        <label className="field-label" htmlFor={name}>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <DatePicker
          id={name}
          name={name}
          selected={selected}
          minDate={minDate ? new Date(minDate) : null}
          disabled={disabled}
          placeholderText={placeholder}
          dateFormat="dd MMM yyyy"
          showPopperArrow={false}
          // Rendered into a body-level portal. Modal panels clip their content
          // and carry a transform, so neither overflow nor position:fixed would
          // let the calendar escape without this.
          portalId="datepicker-portal"
          popperPlacement="bottom-start"
          onChange={(date) => onChange(toInputDate(date), name)}
          className={classNames(
            "field-input pr-10",
            error && "field-input-error"
          )}
        />
        <CalendarDays
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400"
        />
      </div>

      {error ? (
        <p className="field-error">
          <AlertCircle size={13} /> {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
      )}
    </div>
  );
}
