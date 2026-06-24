import { json, readBody, requireSession } from "./_shared.js";

const templates = [
  "Distribution",
  "Technical Legacy",
  "Operator's Field Report",
  "Research Exchange",
  "Category Builder",
  "Founding Voice"
];

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  if (!requireSession(req, res)) return;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return json(res, 500, { error: "Missing DEEPSEEK_API_KEY." });

  const input = await readBody(req);
  const prompt = buildPrompt(input);

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You extract LinkedIn profile identity and recommend podcast proposal strategy. Return strict JSON only. Never invent facts."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return json(res, response.status, { error: data?.error?.message || "DeepSeek profile analysis failed." });
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) return json(res, 502, { error: "DeepSeek returned an empty profile analysis." });
    return json(res, 200, normalizeAnalysis(JSON.parse(content)));
  } catch (error) {
    return json(res, 500, { error: error.message || "Profile analysis failed." });
  }
}

function buildPrompt(input) {
  const pdfText = String(input.pdfText || "").slice(0, 18000);
  return `
You are analyzing a LinkedIn profile PDF for an internal podcast outreach tool.

Current editable fields, if any:
Name: ${input.name || ""}
Role: ${input.role || ""}
Company: ${input.company || ""}
LinkedIn URL: ${input.linkedinUrl || ""}

LinkedIn PDF text:
${pdfText}

Return only valid JSON with this exact shape:
{
  "name": "exact profile owner name",
  "role": "current primary role/title",
  "company": "current primary company",
  "linkedinUrl": "LinkedIn profile URL if present",
  "researchSignals": ["5 concise, concrete facts or signals from the profile"],
  "recommendedTemplate": "Distribution | Technical Legacy | Operator's Field Report | Research Exchange | Category Builder | Founding Voice",
  "recommendationReason": "one concise reason for the recommendation"
}

Extraction rules:
- This is LinkedIn PDF text. The beginning may contain sidebar blocks like Contact, Top Skills, Languages, Publications, Public Speaking, Research, etc. Those are NOT the person's name.
- Prefer the profile identity block after the sidebar: name, headline, location, summary, and current experience.
- Ignore section labels such as Contact, Top Skills, Publications, Summary, Experience, Education, Research, Public Speaking, Languages, Projects.
- Do not use sentence fragments as company names. If a line says "I’m the co-founder and head of operations at Clay, the best way to...", the role is "Co-Founder & Head of Operations" and the company is "Clay".
- For current work, prefer the first current Experience entry and the profile headline.
- Keep the role and company human-clean, not copied as a whole sentence.
- Research signals should be useful for a right-side research card. Each should be specific and readable in one line.

Template recommendation rules:
- Research Exchange only for research engineers, scientists, professors, labs, papers, or academic technical staff where research is central to the person's current identity.
- Operator's Field Report for CTOs, VPs of Engineering, infrastructure, fintech, commerce, logistics, reliability, scale, or production operators.
- Category Builder for founders, co-founders, product/category/GTM builders, or people shaping a market narrative.
- Founding Voice for very high-status industry authorities or people whose audience/status is much larger than ours.
- Technical Legacy for principal/staff engineers, architects, fellows, or deep technical authorities.
- Distribution for early builders who mainly need more builder reach.

If the profile is Varun Anand from Clay, the correct identity is Varun Anand, Co-Founder & Head of Operations, Clay, and the likely recommendation is Category Builder.
`;
}

function normalizeAnalysis(value) {
  const recommendedTemplate = templates.includes(value?.recommendedTemplate) ? value.recommendedTemplate : "Distribution";
  return {
    name: clean(value?.name),
    role: clean(value?.role),
    company: clean(value?.company),
    linkedinUrl: clean(value?.linkedinUrl),
    researchSignals: Array.isArray(value?.researchSignals)
      ? value.researchSignals.map(clean).filter(Boolean).slice(0, 5)
      : [],
    recommendedTemplate,
    recommendationReason: clean(value?.recommendationReason) || "This template best matches the profile context."
  };
}

function clean(value) {
  return String(value || "")
    .replace(/\u2014/g, ", ")
    .replace(/\u2013/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
