"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building, Check, ChevronDown, Plus } from "@/components/icons";
import type { Company } from "@/lib/companies";
import { createCompanyAction } from "@/app/(manager)/[companySlug]/actions";

type Props = {
  current: Company;
  memberships: Company[];
  userEmail: string | null | undefined;
};

export function CompanySwitcher({ current, memberships, userEmail }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const onCreate = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const value = name.trim();
    if (!value) {
      setError("Le nom est requis.");
      return;
    }
    startTransition(async () => {
      try {
        const slug = await createCompanyAction(value);
        setOpen(false);
        setCreating(false);
        setName("");
        router.push(`/${slug}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      }
    });
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setCreating(false);
        }}
        className="flex items-center gap-3 rounded-xl border border-transparent bg-white/0 px-1.5 py-1 text-left transition hover:bg-slate-100"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lift">
          <Building size={18} />
        </span>
        <span className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            Horaires du bureau
          </p>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <span className="truncate">{current.name}</span>
            <ChevronDown size={12} className="text-slate-400" />
            {userEmail ? (
              <>
                <span className="mx-1 text-slate-300">·</span>
                <span className="truncate text-slate-400">{userEmail}</span>
              </>
            ) : null}
          </p>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift">
          <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Vos entreprises
          </p>
          <ul className="max-h-72 overflow-auto">
            {memberships.map((m) => {
              const active = m.id === current.id;
              return (
                <li key={m.id}>
                  <Link
                    href={`/${m.slug}`}
                    onClick={() => setOpen(false)}
                    className={
                      "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition " +
                      (active
                        ? "bg-brand-50 text-brand-700"
                        : "hover:bg-slate-50 text-slate-700")
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {m.name}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        /{m.slug}
                      </span>
                    </span>
                    {active && <Check size={14} className="text-brand-600" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-1 border-t border-slate-100 pt-1.5">
            {!creating ? (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={14} className="text-slate-500" />
                Créer une entreprise
              </button>
            ) : (
              <form onSubmit={onCreate} className="space-y-2 px-2 py-2">
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom de l'entreprise"
                  className="field-input"
                  disabled={pending}
                  maxLength={120}
                />
                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setName("");
                      setError(null);
                    }}
                    className="btn-ghost"
                    disabled={pending}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={pending}
                  >
                    {pending ? "Création…" : "Créer"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
