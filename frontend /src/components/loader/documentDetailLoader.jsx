export default function DocumentDetailLoader() {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="card p-6">
        <div className="skeleton mb-3 h-6 w-56" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card space-y-3 p-6 lg:col-span-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-4 w-full" />
          ))}
        </div>
        <div className="card space-y-3 p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-4 w-4/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
