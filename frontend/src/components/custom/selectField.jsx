import { AlertCircle, ChevronDown } from "lucide-react";
import { classNames, itemsOf } from "../../Utlis/Common/commonMethod";

export default function SelectField({
  label,
  name,
  value = "",
  options = [],
  placeholder = "Select an option",
  error = "",
  hint = "",
  required = false,
  disabled = false,
  className = "",
  onChange = () => {},
}) {
  const optionList = itemsOf(options);

  return (
    <div className={className}>
      {label && (
        <label className="field-label" htmlFor={name}>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={name}
          name={name}
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value, name)}
          className={classNames(
            "field-input cursor-pointer appearance-none pr-10",
            !value && "text-ink-400",
            error && "field-input-error"
          )}
        >
          <option value="">{placeholder}</option>
          {optionList.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
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
