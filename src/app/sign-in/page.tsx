import { requestMagicLink } from "./actions";

export const dynamic = "force-dynamic";

export default function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-10">
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
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Connexion</h1>
      <p className="mt-1 text-sm text-slate-500">
        Saisissez votre adresse email professionnelle. Vous recevrez un lien
        de connexion à usage unique.
      </p>

      <form action={requestMagicLink} className="mt-6 space-y-3">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@entreprise.com"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          Envoyer le lien de connexion
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {decodeURIComponent(error)}
        </p>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Pas de mot de passe à retenir : nous vous envoyons un lien sécurisé
        valable 24 heures.
      </p>
    </div>
  );
}
