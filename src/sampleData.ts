import { Guest } from "./types";

export const defaultProposal = (name = "Guest", role = "Builder", company = "their team") => ({
  heroHeadline: `${name}, let's talk AI in production.`,
  heroIntro: `I looked at your work at ${company}. Your ${role.toLowerCase()} perspective fits the practical conversations our audience cares about: what is real, what scales, and what breaks.`,
  audienceQuote:
    "This is not an audience passively consuming AI content. These are engineering leaders deciding what to build, where to trust automation, and how to scale it responsibly.",
  reasons: [
    {
      title: "Put your thinking in front of decision-makers",
      body:
        "The conversation reaches engineering leaders, operators, and founders who are actively making decisions about AI systems."
    },
    {
      title: "Turn your experience into a durable asset",
      body:
        "A focused episode gives your point of view a polished, shareable home that can travel long after the recording."
    },
    {
      title: "Shape the conversation from practice",
      body:
        "The best episodes come from people doing the work, not theorizing from the sidelines."
    }
  ],
  topics: [
    "Agent architecture in production",
    "Human-in-the-loop workflows",
    "Evaluation and observability",
    "Security and governance",
    "AI adoption inside engineering teams",
    "What actually breaks at scale"
  ],
  hostFit:
    "Prasad Pillai keeps the conversation practical: real systems, real trade-offs, and lessons engineering leaders can use.",
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
