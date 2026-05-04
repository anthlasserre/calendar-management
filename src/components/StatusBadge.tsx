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
      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium shadow-sm"
      style={{
        backgroundImage: isOpen
          ? "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)"
          : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        borderColor: isOpen ? "#a7f3d0" : "#e2e8f0",
        boxShadow: isOpen
          ? "0 1px 2px rgba(16,185,129,0.18), 0 8px 18px -10px rgba(16,185,129,0.28)"
          : "0 1px 2px rgba(15,23,42,0.06), 0 8px 18px -10px rgba(15,23,42,0.12)",
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
      <span
        className="font-semibold"
        style={{ color: isOpen ? "#065f46" : "#0f172a" }}
      >
        {label}
      </span>
      <span aria-hidden style={{ color: "#cbd5e1" }}>
        ·
      </span>
      <span style={{ color: isOpen ? "#047857" : "#64748b" }}>{detail}</span>
    </span>
  );
}
