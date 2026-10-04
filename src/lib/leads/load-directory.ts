import { readApiJson } from "@/lib/http/client-api";

/** Assessments enrich the directory; their availability must not hide contacts. */
export async function loadAgencyDirectory<Contact, Analysis>(fetcher: typeof fetch = fetch) {
  const analysesRequest = fetcher("/api/lead-analyses", { cache: "no-store", signal: AbortSignal.timeout(5000) })
    .then((response) => readApiJson<{ success: true; analyses: Analysis[] }>(response))
    .then((data) => {
      if (!Array.isArray(data.analyses)) throw new Error("Invalid lead assessment response.");
      return { analyses: data.analyses, analysisWarning: null as string | null };
    })
    .catch(() => ({ analyses: [] as Analysis[], analysisWarning: "Lead assessments are unavailable. Agency contacts are still displayed." }));
  const response = await fetcher("/api/contacts?scope=agency", { cache: "no-store" });
  const data = await readApiJson<{ success: true; contacts: Contact[] }>(response);
  if (!Array.isArray(data.contacts)) throw new Error("The agency contact response was invalid. Retry loading the directory.");
  return { contacts: data.contacts, ...await analysesRequest };
}
