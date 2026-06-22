export type PipelineStatus = "Reach Out" | "Contacted" | "In Process" | "Booked" | "Done";

export type ProposalContent = {
  heroHeadline: string;
  heroIntro: string;
  audienceQuote: string;
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
