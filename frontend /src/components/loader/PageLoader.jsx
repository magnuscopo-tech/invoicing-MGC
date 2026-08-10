import { FileText } from "lucide-react";

export default function PageLoader({ label = "Loading workspace…" }) {
  return (
    <div className="flex h-full min-h-[70vh] w-full flex-col items-center justify-center gap-5">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary-200/60" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-pop">
          <FileText size={24} strokeWidth={2} />
        </span>
      </div>
      <p className="animate-fade-in text-sm font-medium text-ink-500">{label}</p>
    </div>
  );
}
