import { Mail } from "@/components/icons";

export default function VerifyRequestPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl" />
        <div className="absolute bottom-[-20%] right-1/3 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
      </div>
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="surface-card p-7 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-lift">
            <Mail size={20} />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Consultez votre boîte mail
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Nous vous avons envoyé un lien de connexion. Cliquez dessus pour
            accéder à votre espace de gestion. Pensez à vérifier vos
            indésirables si vous ne le voyez pas.
          </p>
          <a
            href="/sign-in"
            className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            Renvoyer un lien
          </a>
        </div>
      </div>
    </main>
  );
}
