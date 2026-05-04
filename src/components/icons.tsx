import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 16, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const Clock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

export const CalendarPlus = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4M12 14v4M10 16h4" />
  </Base>
);

export const CalendarRange = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4M7 15h4M13 15h4" />
  </Base>
);

export const Sparkles = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
    <path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7L19 15z" />
  </Base>
);

export const LinkChain = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 10-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 00-5.66 0l-3 3A4 4 0 1010 18.66l1-1" />
  </Base>
);

export const Building = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 21V5a2 2 0 012-2h7a2 2 0 012 2v16" />
    <path d="M16 9h2a2 2 0 012 2v10" />
    <path d="M9 7h2M9 11h2M9 15h2" />
    <path d="M3 21h18" />
  </Base>
);

export const Settings = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.34 1.85l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.85-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.85.34l-.06.06A2 2 0 113.32 16.92l.06-.06a1.7 1.7 0 00.34-1.85 1.7 1.7 0 00-1.55-1H2a2 2 0 110-4h.1a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.85l-.06-.06A2 2 0 117.08 3.32l.06.06a1.7 1.7 0 001.85.34h.04a1.7 1.7 0 001-1.55V2a2 2 0 114 0v.1a1.7 1.7 0 001 1.55 1.7 1.7 0 001.85-.34l.06-.06A2 2 0 1120.68 7.08l-.06.06a1.7 1.7 0 00-.34 1.85v.04a1.7 1.7 0 001.55 1H22a2 2 0 110 4h-.1a1.7 1.7 0 00-1.55 1z" />
  </Base>
);

export const LogOut = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </Base>
);

export const Trash = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6v14a2 2 0 002 2h8a2 2 0 002-2V6" />
    <path d="M10 11v6M14 11v6" />
  </Base>
);

export const Plus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const Mail = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3 7l9 6 9-6" />
  </Base>
);

export const Check = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12l5 5L20 7" />
  </Base>
);

export const Copy = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V5a2 2 0 012-2h10" />
  </Base>
);

export const Repeat = (p: IconProps) => (
  <Base {...p}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  </Base>
);
