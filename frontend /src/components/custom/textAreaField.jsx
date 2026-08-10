import { AlertCircle } from "lucide-react";
import { classNames } from "../../Utlis/Common/commonMethod";

export default function TextAreaField({
  label,
  name,
  value = "",
  placeholder = "",
  error = "",
  hint = "",
  rows = 4,
  required = false,
  disabled = false,
  className = "",
  onChange = () => {},
}) {
  return (
    <div className={className}>
      {label && (
        <label className="field-label" htmlFor={name}>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value, name)}
        className={classNames(
          "field-input resize-y leading-relaxed",
          error && "field-input-error"
        )}
      />

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
