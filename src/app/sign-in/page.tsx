import { requestMagicLink } from "./actions";
import { Building, Mail } from "@/components/icons";

export const dynamic = "force-dynamic";

export default function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl" />
        <div className="absolute right-[-10%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-accent-500/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-1/3 h-80 w-80 rounded-full bg-pink-300/20 blur-3xl" />
      </div>
      <SignInCard searchParams={searchParams} />
    </main>
  );
}

async function SignInCard({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const error = params.error;
  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <div className="mb-6 flex items-center justify-center gap-2 text-slate-600">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lift">
          <Building size={16} />
        </span>
        <span className="text-sm font-semibold tracking-tight text-slate-900">
          Horaires du bureau
        </span>
      </div>

      <div className="surface-card p-7">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Connexion
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Saisissez votre adresse email professionnelle. Vous recevrez un lien
          de connexion à usage unique, valable 24 heures.
        </p>

        <form action={requestMagicLink} className="mt-6 space-y-3">
          <label className="block">
            <span className="section-eyebrow">Adresse email</span>
            <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
              <span className="flex items-center bg-slate-50 px-3 text-slate-400">
                <Mail size={14} />
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="vous@entreprise.com"
                className="w-full bg-transparent px-3 py-2 text-sm text-slate-800 outline-none"
              />
            </div>
          </label>
          <button type="submit" className="btn-primary w-full">
            Envoyer le lien de connexion
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {decodeURIComponent(error)}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Pas de mot de passe à retenir — uniquement un lien sécurisé.
        </p>
      </div>
    </div>
  );
}
