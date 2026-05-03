import type { OpenStatus } from "@/lib/schedule";

type Props = {
  status: OpenStatus;
};

export function StatusBadge({ status }: Props) {
  const isOpen = status.open;
  const label = isOpen ? "Ouvert" : "Fermé";
  const detail = isOpen
    ? `Jusqu'à ${status.closes_at}`
    : status.reason === "holiday" && status.holiday
      ? status.holiday.name
      : "Hors horaires";

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm"
      style={{
        borderColor: isOpen ? "#a7f3d0" : "#e2e8f0",
        backgroundColor: isOpen ? "#ecfdf5" : "#ffffff",
      }}
    >
      <span aria-hidden className="relative flex h-2.5 w-2.5">
        {isOpen && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className="relative inline-flex h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: isOpen ? "#10b981" : "#94a3b8" }}
        />
      </span>
      <span style={{ color: isOpen ? "#065f46" : "#1e293b" }}>{label}</span>
      <span className="text-slate-400">·</span>
      <span className="text-slate-500">{detail}</span>
    </span>
  );
}
