import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CopyableSnippet } from "@/components/CopyableSnippet";
import { LinkChain, Sparkles } from "@/components/icons";

export const dynamic = "force-dynamic";

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

type Widget = {
  id: string;
  title: string;
  description: string;
  pathFromSlug: (slug: string) => string;
  iframeWidth: number;
  iframeHeight: number;
};

const WIDGETS: Widget[] = [
  {
    id: "badge",
    title: "Badge Ouvert / Fermé",
    description:
      "Pastille compacte indiquant si le bureau est actuellement ouvert ou fermé, avec l'heure de fermeture du jour ou le motif de fermeture.",
    pathFromSlug: (slug) => `/c/${slug}/embed/badge`,
    iframeWidth: 360,
    iframeHeight: 56,
  },
  {
    id: "badge-holidays",
    title: "Badge + prochaine fermeture",
    description:
      "Badge d'ouverture accompagné de la période de fermeture en cours ou à venir dans les 15 prochains jours.",
    pathFromSlug: (slug) => `/c/${slug}/embed/badge-holidays`,
    iframeWidth: 420,
    iframeHeight: 96,
  },
];

function buildIframeSnippet(
  baseUrl: string,
  path: string,
  widget: Widget,
): string {
  return `<iframe
  src="${baseUrl}${path}"
  width="${widget.iframeWidth}"
  height="${widget.iframeHeight}"
  loading="lazy"
  style="border:0;background:transparent"
  title="Horaires du bureau">
</iframe>`;
}

export default async function EmbedsPage() {
  const session = await auth();
  if (!session?.user?.companySlug) {
    redirect("/sign-in");
  }
  const slug = session.user.companySlug;
  const baseUrl = await getBaseUrl();

  return (
    <main className="space-y-8">
      <section className="surface-card relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lift">
            <Sparkles size={18} />
          </span>
          <div>
            <p className="section-eyebrow">Intégration</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
              Widgets à intégrer
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Copiez l&apos;extrait{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                &lt;iframe&gt;
              </code>{" "}
              souhaité et collez-le sur votre site. Les widgets se
              rafraîchissent automatiquement toutes les 2 minutes et sont liés
              à votre slug{" "}
              <span className="chip text-brand-700">
                <LinkChain size={12} /> {slug}
              </span>
              .
            </p>
          </div>
        </div>
      </section>

      {WIDGETS.map((widget) => {
        const path = widget.pathFromSlug(slug);
        const snippet = buildIframeSnippet(baseUrl, path, widget);
        return (
          <section
            key={widget.id}
            className="surface-card-elevated p-6 sm:p-8"
          >
            <header className="mb-5">
              <p className="section-eyebrow">{widget.id}</p>
              <h3 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900">
                {widget.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {widget.description}
              </p>
            </header>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="section-eyebrow mb-2">Aperçu en direct</p>
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
                  <iframe
                    src={path}
                    width={widget.iframeWidth}
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
      })}
    </main>
  );
}
