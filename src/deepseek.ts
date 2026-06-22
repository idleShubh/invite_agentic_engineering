import { ProposalContent } from "./types";
import { defaultProposal } from "./sampleData";

type GenerateInput = {
  apiKey: string;
  name: string;
  role: string;
  company: string;
  linkedinText: string;
};

export async function generateProposalWithDeepSeek(input: GenerateInput): Promise<ProposalContent> {
  if (!input.apiKey.trim()) {
    return defaultProposal(input.name, input.role, input.company);
  }

  const prompt = `
You generate personalized podcast invitation pages for "Agentic Engineering", a practitioner-first podcast for engineering leaders building agentic AI systems.

Guest:
Name: ${input.name}
Role: ${input.role}
Company: ${input.company}

LinkedIn profile text:
${input.linkedinText.slice(0, 14000)}

Return only valid JSON matching this TypeScript shape:
{
  "heroHeadline": "short direct headline addressed to the guest",
  "heroIntro": "crisp 2 sentence intro, 32-45 words total, showing you researched the guest",
  "audienceQuote": "one quote-style sentence about why this audience matters",
  "reasons": [{"title": "reason title", "body": "2 sentence reason"}],
  "topics": ["6-10 concrete episode topics"],
  "hostFit": "short paragraph connecting the host and guest",
  "hostPhotoUrl": "",
  "episodeTitle": "specific proposed episode title",
  "personalizedCta": "one sentence CTA addressed to the guest"
}

Rules:
- Make it specific to the LinkedIn profile.
- The heroHeadline must be catchy and under 8 words.
- The heroIntro must be crisp, specific, and never more than 45 words.
- Do not use em dashes. Use commas, periods, or colons instead.
- Do not generate or mention previous podcast episodes. The app uses the two fixed Agentic Engineering episodes.
- Do not invent unverifiable accomplishments.
- Keep it confident, warm, and practitioner-first.
- Avoid generic hype.
- Use plain English.
`;

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You write sharp, specific podcast proposal copy and always return parseable JSON only."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `DeepSeek request failed with ${response.status}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned an empty response.");

  return normalizeProposal(JSON.parse(content), input);
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
