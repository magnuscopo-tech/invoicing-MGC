import { Search, X } from "lucide-react";

export default function SearchInput({
  value = "",
  placeholder = "Search…",
  className = "",
  onChange = () => {},
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
      />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="field-input pl-10 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
