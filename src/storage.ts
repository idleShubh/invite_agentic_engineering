import { Guest } from "./types";
import { defaultProposal } from "./sampleData";

export async function loadGuests(): Promise<Guest[]> {
  const response = await fetch("/api/guests");
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Could not load guests.");
  }
  return ((await response.json()) as Guest[]).map(normalizeGuest);
}

export async function saveGuest(guest: Guest): Promise<Guest> {
  const response = await fetch("/api/guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(guest)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Could not save guest.");
  }
  return normalizeGuest(await response.json());
}

export async function updateStoredGuest(id: string, patch: Partial<Guest>): Promise<Guest> {
  const response = await fetch("/api/guests", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, patch })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Could not update guest.");
  }
  return normalizeGuest(await response.json());
}

export async function loadProposal(slug: string): Promise<Guest | undefined> {
  const response = await fetch(`/api/proposals/${encodeURIComponent(slug)}`);
  if (response.status === 404) return undefined;
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Could not load proposal.");
  }
  return normalizeGuest(await response.json());
}

export async function recordProposalView(slug: string) {
  await fetch(`/api/proposals/${encodeURIComponent(slug)}`, { method: "POST" });
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
      heroHeadline: cleanCopy(hasOldDemoHeadline ? defaults.heroHeadline : guest.proposal.heroHeadline),
      heroIntro:
        guest.proposal.heroIntro.length > 260 ? defaults.heroIntro : cleanCopy(guest.proposal.heroIntro),
      audienceQuote: cleanCopy(guest.proposal.audienceQuote || defaults.audienceQuote),
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
