import { redirect } from "next/navigation";

const TAB_MAP: Record<string, string> = {
  chances: "chances",
  championship: "chances",
  finishes: "finishes",
};

export default async function ProbabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const pview = TAB_MAP[params.tab || ""] || "journey";
  redirect(`/?tab=probability&pview=${pview}`);
}
