import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// App root. innovlab.me is the one landing page (review A18, Eric 2026-10-03),
// so this route only routes: a signed-in account with a profile goes to
// 나의 AI 교육, everyone else to the fork at /start. Partner invite links
// (?org=) and the Q5 pilot toggle (?q5=) are carried through.

/** Carry the partner org code and the Q5 pilot toggle through to the fork. */
function buildStartHref(params: Record<string, string | string[] | undefined>) {
  const qs = new URLSearchParams();
  if (typeof params.org === "string" && params.org !== "") qs.set("org", params.org);
  if (params.q5 === "grid" || params.q5 === "seq") qs.set("q5", params.q5);
  return qs.size > 0 ? `/start?${qs.toString()}` : "/start";
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const session = await getSession();
  if (session?.profile) redirect("/app/education");
  redirect(buildStartHref(await searchParams));
}
