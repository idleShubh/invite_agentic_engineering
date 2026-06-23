import { ProposalContent } from "./types";
import { defaultProposal } from "./sampleData";

type GenerateInput = {
  name: string;
  role: string;
  company: string;
  linkedinText: string;
};

export async function generateProposalWithDeepSeek(input: GenerateInput): Promise<ProposalContent> {
  const response = await fetch("/api/generate-proposal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || `DeepSeek request failed with ${response.status}`);
  }

  return normalizeProposal(await response.json(), input);
}

function normalizeProposal(value: Partial<ProposalContent>, input: GenerateInput): ProposalContent {
  const fallback = defaultProposal(input.name, input.role, input.company);
  return {
    heroHeadline: cleanCopy(value.heroHeadline || fallback.heroHeadline),
    heroIntro: cleanCopy(value.heroIntro || fallback.heroIntro),
    audienceQuote: cleanCopy(value.audienceQuote || fallback.audienceQuote),
    reasons:
      Array.isArray(value.reasons) && value.reasons.length
        ? value.reasons.slice(0, 3).map((reason) => ({
            title: cleanCopy(reason.title),
            body: cleanCopy(reason.body)
          }))
        : fallback.reasons,
    topics: Array.isArray(value.topics) && value.topics.length ? value.topics.slice(0, 10).map(cleanCopy) : fallback.topics,
    hostFit: cleanCopy(value.hostFit || fallback.hostFit),
    hostPhotoUrl: value.hostPhotoUrl || fallback.hostPhotoUrl,
    episodeTitle: cleanCopy(value.episodeTitle || fallback.episodeTitle),
    previousEpisodes: fallback.previousEpisodes,
    personalizedCta: cleanCopy(value.personalizedCta || fallback.personalizedCta)
  };
}

function cleanCopy(value: string) {
  return value.replace(/\u2014/g, ", ").replace(/\u2013/g, "-").replace(/\s+/g, " ").trim();
}
