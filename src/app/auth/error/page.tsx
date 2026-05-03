export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const message = describeError(params.error);
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-10">
      <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-red-900">
          Connexion impossible
        </h1>
        <p className="mt-2 text-sm text-red-800">{message}</p>
        <a
          href="/sign-in"
          className="mt-6 inline-block text-sm text-red-700 underline"
        >
          Retour à la page de connexion
        </a>
      </div>
    </main>
  );
}

function describeError(code: string | undefined): string {
  switch (code) {
    case "Verification":
      return "Le lien a expiré ou a déjà été utilisé. Demandez un nouveau lien.";
    case "Configuration":
      return "L'application n'est pas correctement configurée pour envoyer les emails.";
    case "AccessDenied":
      return "Accès refusé.";
    default:
      return "Une erreur est survenue lors de la connexion.";
  }
}
