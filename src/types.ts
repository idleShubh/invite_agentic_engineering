export type PipelineStatus = "Reach Out" | "Contacted" | "In Process" | "Booked" | "Done" | "Ghosted";

export type ProposalTemplate =
  | "Distribution"
  | "Technical Legacy"
  | "Operator's Field Report"
  | "Research Exchange"
  | "Category Builder"
  | "Founding Voice";

export type ProposalContent = {
  strategy: {
    role: string;
    companyStage: string;
    audienceSize: string;
    primaryMotivations: string[];
    template: ProposalTemplate;
    designSystem: string;
    emotionalTrigger: string;
    corePromise: string;
  };
  heroHeadline: string;
  heroIntro: string;
  audienceQuote: string;
  whyThem: string;
  whyNow: string;
  editorialThesis: string;
  supportingAngles: string[];
  researchSignals: string[];
  observation: string;
  sharpQuestion: string;
  howTheyHelpUs: string;
  howWeHelpThem: string;
  reasons: Array<{
    title: string;
    body: string;
  }>;
  topics: string[];
  hostFit: string;
  hostPhotoUrl: string;
  episodeTitle: string;
  previousEpisodes: Array<{
    title: string;
    guest: string;
    url: string;
  }>;
  personalizedCta: string;
};

export type Guest = {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  linkedinUrl: string;
  notes: string;
  status: PipelineStatus;
  photoUrl: string;
  pdfName: string;
  pdfText: string;
  slug: string;
  proposal: ProposalContent;
  published: boolean;
  viewed: number;
  createdAt: string;
  updatedAt: string;
};

export const pipelineStatuses: PipelineStatus[] = [
  "Reach Out",
  "Contacted",
  "In Process",
  "Booked",
  "Done"
];

export const ghostedStatus: PipelineStatus = "Ghosted";
