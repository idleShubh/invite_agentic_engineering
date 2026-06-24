import { Guest } from "./types";

export const defaultProposal = (name = "Guest", role = "Builder", company = "their team") => ({
  strategy: {
    role,
    companyStage: inferCompanyStage(role, company),
    audienceSize: "Unknown",
    primaryMotivations: inferMotivations(role),
    template: inferTemplate(role),
    designSystem: designSystemForTemplate(inferTemplate(role)),
    emotionalTrigger: emotionalTriggerForTemplate(inferTemplate(role)),
    corePromise: corePromiseForTemplate(inferTemplate(role))
  },
  heroHeadline: `${name}, let's talk AI in production.`,
  heroIntro: `I looked at your work at ${company}. Your ${role.toLowerCase()} perspective fits the practical conversations our audience cares about: what is real, what scales, and what breaks.`,
  audienceQuote:
    "You would be speaking to engineering leaders, founders, and builders who are actively deciding what to build, where to trust automation, and how to bring agents into real teams.",
  reasons: [
    {
      title: "Your work deserves a serious room",
      body:
        "Agentic Engineering is built for people who care about the practical shift happening inside software teams, not surface-level AI commentary."
    },
    {
      title: "You get a useful narrative asset",
      body:
        "We prepare deeply, record a focused conversation, and turn your point of view into clips and a written story your team can reuse."
    },
    {
      title: "You help define the field",
      body:
        "The best conversations come from people doing the work. Your perspective can help others understand what agentic engineering should become."
    }
  ],
  whyThem:
    `You bring the kind of ${role.toLowerCase()} context that makes an AI conversation useful: decisions made close to teams, systems, and customers.`,
  whyNow:
    "Agentic engineering is moving from demos into daily operating practice. This is the right moment to separate durable judgment from tool-cycle noise.",
  editorialThesis:
    "The hard part of agentic engineering is no longer access to models. It is deciding where automation deserves trust.",
  supportingAngles: [
    "How teams decide which workflows are ready for agents",
    "Where reliability, evaluation, and oversight still break",
    "How engineering leaders change process without slowing teams down",
    "What technical judgment looks like when tools improve every month"
  ],
  researchSignals: [
    `${role} perspective at ${company}`,
    "Hands-on context in AI adoption and engineering workflows",
    "A technical audience looking for grounded operating lessons"
  ],
  observation:
    `Your work at ${company} suggests a practical lens on AI adoption: you seem to care less about the demo and more about what survives real team constraints.`,
  sharpQuestion:
    `Where would you refuse to use an AI agent today, even if the tool looked impressive in a controlled demo?`,
  howTheyHelpUs:
    `You help us raise the quality bar of Agentic Engineering from tool commentary to real practitioner judgment.`,
  howWeHelpThem:
    "We help you turn the conversation into a reusable thought-leadership asset: a focused episode, strong clips, and a written narrative your team can share.",
  topics: [
    "Agent architecture in production",
    "Human-in-the-loop workflows",
    "Evaluation and observability",
    "Security and governance",
    "AI adoption inside engineering teams",
    "What actually breaks at scale"
  ],
  hostFit:
    "Prasad Pilla keeps the conversation practical: real systems, real trade-offs, and lessons engineering leaders can use.",
  hostPhotoUrl: "/prasad_pilla.jpg",
  episodeTitle: `How ${name} is building practical AI systems`,
  previousEpisodes: [
    {
      title: "Building agentic AI in the real world",
      guest: "Anuj Kumar",
      url: "https://youtu.be/W5oLxiycjnA?si=LM6y02HrzbJ61iwr"
    },
    {
      title: "How engineering teams are going agentic",
      guest: "Shivang Agarwal",
      url: "https://youtu.be/aO8FLbxjoaE?si=f3Bvl6ed_hk1Bgo6"
    }
  ],
  personalizedCta: `Ready to turn your work at ${company} into a conversation builders can use?`
});

function inferTemplate(role: string) {
  const normalized = role.toLowerCase();
  if (/(research|scientist|technical staff|applied)/.test(normalized)) return "Research Exchange";
  if (/(cto|vp|infrastructure|platform|engineering leader)/.test(normalized)) return "Operator's Field Report";
  if (/(founder|ceo|creator|visionary)/.test(normalized)) return "Category Builder";
  if (/(principal|staff|architect)/.test(normalized)) return "Technical Legacy";
  return "Distribution";
}

function inferCompanyStage(role: string, company: string) {
  const normalized = `${role} ${company}`.toLowerCase();
  if (/(public|enterprise|intuit|google|microsoft|amazon|meta|apple|netflix)/.test(normalized)) return "Enterprise";
  if (/(founder|seed|startup)/.test(normalized)) return "Seed";
  return "Growth";
}

function inferMotivations(role: string) {
  const normalized = role.toLowerCase();
  if (/(research|scientist|technical staff)/.test(normalized)) return ["Intellectual Discussion", "Legacy", "Peer Recognition"];
  if (/(cto|vp|infrastructure|platform)/.test(normalized)) return ["Thought Leadership", "Narrative Control", "Recruiting"];
  if (/(founder|creator)/.test(normalized)) return ["Category Building", "Narrative Control", "Network Access"];
  return ["Distribution", "Thought Leadership"];
}

function corePromiseForTemplate(template: string) {
  if (template === "Technical Legacy") return "Create a lasting record of how you think.";
  if (template === "Operator's Field Report") return "Share hard-earned production lessons.";
  if (template === "Research Exchange") return "A serious technical discussion, not a marketing podcast.";
  if (template === "Category Builder") return "Help shape the narrative of an emerging category.";
  if (template === "Founding Voice") return "Help define the standard for the next generation of engineering conversations.";
  return "Get your ideas in front of more builders.";
}

function designSystemForTemplate(template: string) {
  if (template === "Technical Legacy") return "documentary, timeless, premium, archival";
  if (template === "Operator's Field Report") return "boardroom, operating memo, executive briefing";
  if (template === "Research Exchange") return "lab notebook, research paper, technical depth";
  if (template === "Category Builder") return "editorial, manifesto, future-facing";
  if (template === "Founding Voice") return "invitation, exclusive, category-defining";
  return "direct, practical, builder-focused";
}

function emotionalTriggerForTemplate(template: string) {
  if (template === "Technical Legacy") return "Intellectual permanence";
  if (template === "Operator's Field Report") return "Respect for operating judgment";
  if (template === "Research Exchange") return "Serious peer-level curiosity";
  if (template === "Category Builder") return "Narrative ownership";
  if (template === "Founding Voice") return "Status-respecting invitation";
  return "Useful distribution";
}

export const seedGuests: Guest[] = [
  {
    id: "guest-prasad-demo",
    name: "Anuj Kumar",
    email: "anuj@example.com",
    role: "VP of Engineering",
    company: "AI Infrastructure Co.",
    linkedinUrl: "https://linkedin.com/in/example",
    status: "Reach Out",
    photoUrl:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=320&q=80",
    pdfName: "anuj-linkedin-profile.pdf",
    pdfText: "",
    slug: "anuj-kumar",
    proposal: defaultProposal("Anuj", "VP of Engineering", "AI Infrastructure Co."),
    published: true,
    viewed: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
