import { json, readBody, requireSession } from "./_shared.js";

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
              "You write sharp, specific podcast proposal copy. Return parseable JSON only and avoid invented accomplishments."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.65,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return json(res, response.status, { error: data?.error?.message || "DeepSeek request failed." });
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) return json(res, 502, { error: "DeepSeek returned an empty response." });
    return json(res, 200, JSON.parse(content));
  } catch (error) {
    return json(res, 500, { error: error.message || "Generation failed." });
  }
}

function buildPrompt(input) {
  const name = input.name || "Guest";
  const role = input.role || "Practitioner";
  const company = input.company || "their team";
  const linkedinText = (input.linkedinText || "").slice(0, 14000);
  return `
You generate personalized podcast invitation pages for "Agentic Engineering", a practitioner-first podcast for engineering leaders building agentic AI systems.

Guest:
Name: ${name}
Role: ${role}
Company: ${company}

LinkedIn profile text:
${linkedinText}

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
- If the profile text is thin, personalize from role, company, and likely domain without pretending you saw facts.
- The heroHeadline must be catchy and under 8 words.
- The heroIntro must be crisp, specific, and never more than 45 words.
- Do not use em dashes. Use commas, periods, or colons instead.
- Do not generate or mention previous podcast episodes. The app uses two fixed Agentic Engineering episodes.
- Do not invent unverifiable accomplishments.
- Keep it confident, warm, and practitioner-first.
- Avoid generic hype.
- Use plain English.
`;
}
