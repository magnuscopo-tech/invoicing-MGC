export default function ButtonLoader({ className = "" }) {
  return (
    <span
      className={`h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80 ${className}`}
      aria-hidden="true"
    />
  );
}
