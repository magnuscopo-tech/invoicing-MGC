export default function PageHeader({ title, description = "", children }) {
  return (
    <div className="mb-6 flex animate-fade-up flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-heading">{title}</h1>
        {description && <p className="mt-1 text-subtle">{description}</p>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2.5">{children}</div>
      )}
    </div>
  );
}
