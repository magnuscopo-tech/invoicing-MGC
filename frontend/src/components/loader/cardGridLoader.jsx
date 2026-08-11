export default function CardGridLoader({ count = 6 }) {
  return (
    <div className="grid animate-fade-in gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card p-5">
          <div className="flex items-center gap-3">
            <div className="skeleton h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/5" />
              <div className="skeleton h-3 w-2/5" />
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
