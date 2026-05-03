export default function VerifyRequestPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-10">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Consultez votre boîte mail
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Nous vous avons envoyé un lien de connexion. Cliquez dessus pour
          accéder à votre espace de gestion. Pensez à vérifier vos
          indésirables si vous ne le voyez pas.
        </p>
        <a
          href="/sign-in"
          className="mt-6 inline-block text-sm text-brand-600 hover:underline"
        >
          Renvoyer un lien
        </a>
      </div>
    </main>
  );
}
