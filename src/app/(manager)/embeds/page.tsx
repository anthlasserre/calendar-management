import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CopyableSnippet } from "@/components/CopyableSnippet";

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
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Widgets à intégrer
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Copiez l&apos;extrait{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            &lt;iframe&gt;
          </code>{" "}
          souhaité et collez-le sur votre site. Les widgets se rafraîchissent
          automatiquement toutes les 2 minutes et sont liés à votre slug{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            {slug}
          </code>
          .
        </p>
      </section>

      {WIDGETS.map((widget) => {
        const path = widget.pathFromSlug(slug);
        const snippet = buildIframeSnippet(baseUrl, path, widget);
        return (
          <section
            key={widget.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <header className="mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                {widget.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{widget.description}</p>
            </header>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Aperçu en direct
                </p>
                <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
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
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Code à intégrer
                </p>
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
