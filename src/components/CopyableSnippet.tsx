"use client";

import { useState } from "react";
import { Check, Copy } from "@/components/icons";

type Props = {
  code: string;
};

export function CopyableSnippet({ code }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 pr-24 text-xs leading-relaxed text-slate-700 shadow-soft">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur transition hover:bg-white"
      >
        {copied ? (
          <>
            <Check size={12} className="text-emerald-500" /> Copié
          </>
        ) : (
          <>
            <Copy size={12} /> Copier
          </>
        )}
      </button>
    </div>
  );
}
