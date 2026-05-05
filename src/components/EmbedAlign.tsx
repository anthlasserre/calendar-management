const CLASSES = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
} as const;

type Align = keyof typeof CLASSES;

export function normalizeAlign(value?: string): Align {
  return value === "right" || value === "center" ? value : "left";
}

export function EmbedAlign({
  align,
  children,
}: {
  align?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex w-full ${CLASSES[normalizeAlign(align)]}`}>
      {children}
    </div>
  );
}
