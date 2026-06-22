import { Guest } from "./types";
import { defaultProposal, seedGuests } from "./sampleData";

const STORAGE_KEY = "podcast-proposal-guests";

export function loadGuests(): Guest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedGuests;
    return (JSON.parse(raw) as Guest[]).map(normalizeGuest);
  } catch {
    return seedGuests;
  }
}

export function saveGuests(guests: Guest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(guests));
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
