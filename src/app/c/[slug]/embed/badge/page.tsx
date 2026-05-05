import { notFound } from "next/navigation";
import { computeStatusForDate } from "@/lib/schedule";
import { getCompanyBySlug } from "@/lib/companies";
import { StatusBadge } from "@/components/StatusBadge";
import { EmbedAlign } from "@/components/EmbedAlign";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmbedBadgePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ align?: string }>;
}) {
  const [{ slug }, { align }] = await Promise.all([params, searchParams]);
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();
  const status = await computeStatusForDate(company.id, new Date());
  return (
    <EmbedAlign align={align}>
      <StatusBadge status={status} />
    </EmbedAlign>
  );
}
