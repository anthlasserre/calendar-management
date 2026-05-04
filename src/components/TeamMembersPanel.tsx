"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@/components/icons";

export type CompanyMember = {
  userId: number;
  email: string;
  name: string | null;
  joinedAt: string;
};

type PendingInvitation = {
  id: number;
  email: string;
  expiresAt: string;
  createdAt: string;
};

type Props = {
  members: CompanyMember[];
  pending: PendingInvitation[];
  currentUserId: number;
};

export function TeamMembersPanel({ members, pending, currentUserId }: Props) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold text-slate-900">
          Membres ({members.length})
        </h3>
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {m.email}
                  {m.userId === currentUserId ? (
                    <span className="ml-2 text-xs text-slate-400">(vous)</span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-400">
                  Membre depuis{" "}
                  {new Date(m.joinedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {pending.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold text-slate-900">
            Invitations en attente ({pending.length})
          </h3>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {pending.map((inv) => (
              <PendingRow key={inv.id} invitation={inv} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function PendingRow({ invitation }: { invitation: PendingInvitation }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onRevoke = () => {
    if (!window.confirm(`Révoquer l'invitation pour ${invitation.email} ?`))
      return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/invitations/${invitation.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Échec de la révocation.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">
          {invitation.email}
        </p>
        <p className="text-xs text-slate-400">
          Expire le{" "}
          {new Date(invitation.expiresAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <button
        type="button"
        onClick={onRevoke}
        disabled={pending}
        className="btn-ghost text-slate-500 hover:text-red-600"
      >
        <Trash size={14} />
        Révoquer
      </button>
    </li>
  );
}
