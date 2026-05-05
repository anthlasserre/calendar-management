"use client";

import { useState } from "react";
import { CopyableSnippet } from "./CopyableSnippet";

type Align = "left" | "center" | "right";

type Widget = {
  id: string;
  title: string;
  description: string;
  path: string;
  iframeWidth: number;
  iframeHeight: number;
};

type Props = {
  widget: Widget;
  baseUrl: string;
};

const ALIGN_OPTIONS: Array<{ value: Align; label: string }> = [
  { value: "left", label: "Gauche" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Droite" },
];

function buildPath(basePath: string, align: Align): string {
  return align === "left" ? basePath : `${basePath}?align=${align}`;
}

function buildSnippet(
  baseUrl: string,
  path: string,
  widget: Widget,
  align: Align,
): string {
  const widthAttr =
    align === "left" ? `width="${widget.iframeWidth}"` : `width="100%"`;
  return `<iframe
  src="${baseUrl}${path}"
  ${widthAttr}
  height="${widget.iframeHeight}"
  loading="lazy"
  style="border:0;background:transparent"
  title="Horaires du bureau">
</iframe>`;
}

export function EmbedWidgetCard({ widget, baseUrl }: Props) {
  const [align, setAlign] = useState<Align>("left");
  const path = buildPath(widget.path, align);
  const snippet = buildSnippet(baseUrl, path, widget, align);

  return (
    <section className="surface-card-elevated p-6 sm:p-8">
      <header className="mb-5">
        <p className="section-eyebrow">{widget.id}</p>
        <h3 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">
          {widget.title}
        </h3>
        <p className="mt-1 text-sm text-slate-500">{widget.description}</p>
      </header>

      <div className="mb-5">
        <p className="section-eyebrow mb-2">Alignement</p>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {ALIGN_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition ${
                align === option.value
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name={`${widget.id}-align`}
                value={option.value}
                checked={align === option.value}
                onChange={() => setAlign(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="section-eyebrow mb-2">Aperçu en direct</p>
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
            <iframe
              key={path}
              src={path}
              width={align === "left" ? widget.iframeWidth : "100%"}
              height={widget.iframeHeight}
              loading="lazy"
              style={{ border: 0, background: "transparent" }}
              title={widget.title}
            />
          </div>
        </div>

        <div>
          <p className="section-eyebrow mb-2">Code à intégrer</p>
          <CopyableSnippet code={snippet} />
          <p className="mt-2 text-xs text-slate-400">
            URL directe :{" "}
            <a
              href={path}
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 hover:underline"
            >
              {baseUrl}
              {path}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
