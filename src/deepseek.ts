import { ProposalContent, ProposalTemplate } from "./types";
import { defaultProposal } from "./sampleData";

type GenerateInput = {
  name: string;
  role: string;
  company: string;
  linkedinText: string;
  template: ProposalTemplate;
};

type AnalyzeProfileInput = {
  name?: string;
  role?: string;
  company?: string;
  linkedinUrl?: string;
  pdfText: string;
};

export type ProfileAnalysis = {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  researchSignals: string[];
  recommendedTemplate: ProposalTemplate;
  recommendationReason: string;
};

const proposalTemplateValues: ProposalTemplate[] = [
  "Distribution",
  "Technical Legacy",
  "Operator's Field Report",
  "Research Exchange",
  "Category Builder",
  "Founding Voice"
];

export async function analyzeProfileWithDeepSeek(input: AnalyzeProfileInput): Promise<ProfileAnalysis> {
  const response = await fetch("/api/analyze-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || `Profile analysis failed with ${response.status}`);
  }

  return normalizeProfileAnalysis(await response.json());
}

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

function normalizeProfileAnalysis(value: Partial<ProfileAnalysis>): ProfileAnalysis {
  const recommendedTemplate = proposalTemplateValues.includes(value.recommendedTemplate as ProposalTemplate)
    ? (value.recommendedTemplate as ProposalTemplate)
    : "Distribution";

  return {
    name: cleanCopy(value.name || ""),
    role: cleanCopy(value.role || ""),
    company: cleanCopy(value.company || ""),
    linkedinUrl: cleanCopy(value.linkedinUrl || ""),
    researchSignals:
      Array.isArray(value.researchSignals) && value.researchSignals.length
        ? value.researchSignals.slice(0, 5).map(cleanCopy).filter(Boolean)
        : [],
    recommendedTemplate,
    recommendationReason: cleanCopy(value.recommendationReason || "This template best matches the profile context.")
  };
}

function normalizeProposal(value: Partial<ProposalContent>, input: GenerateInput): ProposalContent {
  const fallback = defaultProposal(input.name, input.role, input.company);
  const strategy = value.strategy || fallback.strategy;
  return {
    strategy: {
      role: cleanCopy(strategy.role || fallback.strategy.role),
      companyStage: cleanCopy(strategy.companyStage || fallback.strategy.companyStage),
      audienceSize: cleanCopy(strategy.audienceSize || fallback.strategy.audienceSize),
      primaryMotivations:
        Array.isArray(strategy.primaryMotivations) && strategy.primaryMotivations.length
          ? strategy.primaryMotivations.slice(0, 4).map(cleanCopy)
          : fallback.strategy.primaryMotivations,
      template: input.template || strategy.template || fallback.strategy.template,
      designSystem: cleanCopy(strategy.designSystem || fallback.strategy.designSystem),
      emotionalTrigger: cleanCopy(strategy.emotionalTrigger || fallback.strategy.emotionalTrigger),
      corePromise: cleanCopy(strategy.corePromise || fallback.strategy.corePromise)
    },
    heroHeadline: cleanCopy(value.heroHeadline || fallback.heroHeadline),
    heroIntro: cleanCopy(value.heroIntro || fallback.heroIntro),
    audienceQuote: cleanCopy(value.audienceQuote || fallback.audienceQuote),
    whyThem: cleanCopy(value.whyThem || fallback.whyThem),
    whyNow: cleanCopy(value.whyNow || fallback.whyNow),
    editorialThesis: cleanCopy(value.editorialThesis || fallback.editorialThesis),
    supportingAngles:
      Array.isArray(value.supportingAngles) && value.supportingAngles.length
        ? value.supportingAngles.slice(0, 5).map(cleanCopy)
        : fallback.supportingAngles,
    researchSignals:
      Array.isArray(value.researchSignals) && value.researchSignals.length
        ? value.researchSignals.slice(0, 5).map(cleanCopy)
        : fallback.researchSignals,
    observation: cleanCopy(value.observation || fallback.observation),
    sharpQuestion: cleanCopy(value.sharpQuestion || fallback.sharpQuestion),
    howTheyHelpUs: cleanCopy(value.howTheyHelpUs || fallback.howTheyHelpUs),
    howWeHelpThem: cleanCopy(value.howWeHelpThem || fallback.howWeHelpThem),
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
