import { Guest } from "./types";
import { defaultProposal } from "./sampleData";

export async function loadGuests(): Promise<Guest[]> {
  const response = await fetch("/api/guests");
  if (!response.ok) {
    const error = await readApiJson(response).catch(() => null);
    throw new Error(error?.error || "Could not load guests.");
  }
  return ((await readApiJson(response)) as Guest[]).map(normalizeGuest);
}

export async function saveGuest(guest: Guest): Promise<Guest> {
  const response = await fetch("/api/guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(guest)
  });
  if (!response.ok) {
    const error = await readApiJson(response).catch(() => null);
    throw new Error(error?.error || "Could not save guest.");
  }
  return normalizeGuest(await readApiJson(response));
}

export async function updateStoredGuest(id: string, patch: Partial<Guest>): Promise<Guest> {
  const response = await fetch("/api/guests", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, patch })
  });
  if (!response.ok) {
    const error = await readApiJson(response).catch(() => null);
    throw new Error(error?.error || "Could not update guest.");
  }
  return normalizeGuest(await readApiJson(response));
}

export async function deleteStoredGuest(id: string): Promise<void> {
  const response = await fetch("/api/guests", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  if (!response.ok) {
    const error = await readApiJson(response).catch(() => null);
    throw new Error(error?.error || "Could not delete guest.");
  }
}

export async function loadProposal(slug: string): Promise<Guest | undefined> {
  const response = await fetch(`/api/proposal?slug=${encodeURIComponent(slug)}`);
  if (response.status === 404) return undefined;
  if (!response.ok) {
    const error = await readApiJson(response).catch(() => null);
    throw new Error(error?.error || "Could not load proposal.");
  }
  return normalizeGuest(await readApiJson(response));
}

export async function recordProposalView(slug: string) {
  await fetch(`/api/proposal?slug=${encodeURIComponent(slug)}`, { method: "POST" });
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeGuest(guest: Guest): Guest {
  const defaults = defaultProposal(guest.name, guest.role, guest.company);
  const hasOldDemoHeadline = guest.proposal.heroHeadline.includes("your ideas belong in front of the people");
  return {
    ...guest,
    proposal: {
      ...defaults,
      ...guest.proposal,
      strategy: {
        ...defaults.strategy,
        ...guest.proposal.strategy,
        primaryMotivations:
          guest.proposal.strategy?.primaryMotivations?.length
            ? guest.proposal.strategy.primaryMotivations.map(cleanCopy)
            : defaults.strategy.primaryMotivations
      },
      heroHeadline: cleanCopy(hasOldDemoHeadline ? defaults.heroHeadline : guest.proposal.heroHeadline),
      heroIntro:
        guest.proposal.heroIntro.length > 260 ? defaults.heroIntro : cleanCopy(guest.proposal.heroIntro),
      audienceQuote: cleanCopy(guest.proposal.audienceQuote || defaults.audienceQuote),
      whyThem: cleanCopy(guest.proposal.whyThem || defaults.whyThem),
      whyNow: cleanCopy(guest.proposal.whyNow || defaults.whyNow),
      editorialThesis: cleanCopy(guest.proposal.editorialThesis || defaults.editorialThesis),
      supportingAngles: (guest.proposal.supportingAngles || defaults.supportingAngles).map(cleanCopy),
      researchSignals: (guest.proposal.researchSignals || defaults.researchSignals).map(cleanCopy),
      observation: cleanCopy(guest.proposal.observation || defaults.observation),
      sharpQuestion: cleanCopy(guest.proposal.sharpQuestion || defaults.sharpQuestion),
      howTheyHelpUs: cleanCopy(guest.proposal.howTheyHelpUs || defaults.howTheyHelpUs),
      howWeHelpThem: cleanCopy(guest.proposal.howWeHelpThem || defaults.howWeHelpThem),
      reasons: (guest.proposal.reasons || defaults.reasons).map((reason) => ({
        title: cleanCopy(reason.title),
        body: cleanCopy(reason.body)
      })),
      topics: (guest.proposal.topics || defaults.topics).map(cleanCopy),
      hostFit: cleanCopy(guest.proposal.hostFit || defaults.hostFit),
      episodeTitle: cleanCopy(guest.proposal.episodeTitle || defaults.episodeTitle),
      personalizedCta: cleanCopy(guest.proposal.personalizedCta || defaults.personalizedCta),
      previousEpisodes: defaults.previousEpisodes,
      hostPhotoUrl:
        !guest.proposal.hostPhotoUrl ||
        guest.proposal.hostPhotoUrl.includes("ui-avatars.com/api/?name=Prasad")
          ? defaults.hostPhotoUrl
          : guest.proposal.hostPhotoUrl
    }
  };
}

function cleanCopy(value: string) {
  return value.replace(/\u2014/g, ", ").replace(/\u2013/g, "-").replace(/\s+/g, " ").trim();
}

async function readApiJson(response: Response) {
  const text = await response.text();
  if (text.trim().startsWith("<")) {
    throw new Error("API route returned HTML instead of JSON. Check Vercel API routing and redeploy the latest build.");
  }
  return text ? JSON.parse(text) : null;
}
