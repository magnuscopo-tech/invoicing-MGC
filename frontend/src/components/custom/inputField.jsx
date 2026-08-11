import { AlertCircle } from "lucide-react";
import { classNames } from "../../Utlis/Common/commonMethod";

export default function InputField({
  label,
  name,
  value = "",
  type = "text",
  placeholder = "",
  error = "",
  hint = "",
  required = false,
  disabled = false,
  prefix = "",
  suffix = null,
  className = "",
  // id of a <datalist>, for a field that suggests existing values while still
  // accepting anything typed.
  list = "",
  onChange = () => {},
  onBlur = () => {},
}) {
  return (
    <div className={className}>
      {label && (
        <label className="field-label" htmlFor={name}>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400">
            {prefix}
          </span>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          disabled={disabled}
          list={list || undefined}
          onChange={(event) => onChange(event.target.value, name)}
          onBlur={() => onBlur(name)}
          className={classNames(
            "field-input",
            prefix && "pl-8",
            suffix && "pr-11",
            error && "field-input-error"
          )}
        />
        {suffix && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
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
