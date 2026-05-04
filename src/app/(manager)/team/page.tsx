import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMembersOfCompany } from "@/lib/companies";
import { listPendingInvitations } from "@/lib/invitations";
import { InviteMemberForm } from "@/components/InviteMemberForm";
import { TeamMembersPanel } from "@/components/TeamMembersPanel";
import { Users } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.id) {
    redirect("/sign-in");
  }
  const companyId = session.user.companyId;
  const [members, pending] = await Promise.all([
    listMembersOfCompany(companyId),
    listPendingInvitations(companyId),
  ]);

  return (
    <main className="space-y-8">
      <section className="surface-card p-6 sm:p-8">
        <header className="mb-6 flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Users size={18} />
          </span>
          <div>
            <p className="section-eyebrow">Équipe</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
              Membres et invitations
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Invitez vos collègues par e-mail pour qu&apos;ils rejoignent cette
              entreprise.
            </p>
          </div>
        </header>
        <InviteMemberForm />
      </section>

      <section className="surface-card p-6 sm:p-8">
        <TeamMembersPanel
          members={members}
          pending={pending.map((p) => ({
            id: p.id,
            email: p.email,
            expiresAt: p.expiresAt,
            createdAt: p.createdAt,
          }))}
          currentUserId={Number(session.user.id)}
        />
      </section>
    </main>
  );
}
