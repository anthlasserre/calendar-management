import { computeStatusForDate } from "@/lib/schedule";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmbedBadgePage() {
  const status = await computeStatusForDate(new Date());
  return <StatusBadge status={status} />;
}
