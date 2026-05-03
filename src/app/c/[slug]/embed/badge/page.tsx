import { notFound } from "next/navigation";
import { computeStatusForDate } from "@/lib/schedule";
import { getCompanyBySlug } from "@/lib/companies";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmbedBadgePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();
  const status = await computeStatusForDate(company.id, new Date());
  return <StatusBadge status={status} />;
}
