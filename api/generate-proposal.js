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
              "You are a persona-aware podcast proposal strategist for technical guests. Return parseable JSON only. Be specific, status-aware, and honest. Never invent accomplishments."
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
  const selectedTemplate = input.template || "Distribution";
  const templateStrategy = templateStrategyFor(selectedTemplate);
  const linkedinText = (input.linkedinText || "").slice(0, 14000);
  return `
You generate personalized podcast invitation pages for "Agentic Engineering", a practitioner-first podcast for engineering leaders building agentic AI systems.

Guest:
Name: ${name}
Role: ${role}
Company: ${company}
Selected proposal template: ${selectedTemplate}

Template strategy to follow:
${templateStrategy}

LinkedIn profile text:
${linkedinText}

Return only valid JSON matching this TypeScript shape:
{
  "strategy": {
    "role": "one of: CTO, VP Engineering, Engineering Manager, Founder, Technical Founder, Research Engineer, Applied Scientist, AI Researcher, Technical Staff, Product Leader, Infrastructure Leader, Investor, Creator, or a precise role from the profile",
    "companyStage": "one of: Pre-seed, Seed, Series A, Growth, Enterprise, Public company, Unknown",
    "audienceSize": "one of: Small (<5k), Medium (5k-25k), Large (25k-100k), Industry Authority (100k+), Unknown",
    "primaryMotivations": ["2-4 of: Distribution, Thought Leadership, Legacy, Intellectual Discussion, Peer Recognition, Category Building, Recruiting, Network Access, Narrative Control"],
    "template": "one of: Distribution, Technical Legacy, Operator's Field Report, Research Exchange, Category Builder, Founding Voice",
    "designSystem": "short visual direction using the template keywords",
    "emotionalTrigger": "the psychological reason this guest may care",
    "corePromise": "one sentence promise for this exact strategy"
  },
  "heroHeadline": "short direct headline addressed to the guest",
  "heroIntro": "crisp 2 sentence intro, 32-55 words total, written directly to the guest using you/your",
  "audienceQuote": "one quote-style sentence that tells the guest who they will be speaking to and why that audience is valuable",
  "whyThem": "why you are uniquely qualified, using only provided evidence or cautious inference, written directly to the guest",
  "whyNow": "why this moment matters: industry shift, company context, technical trend, or category inflection",
  "editorialThesis": "one strong non-generic conversation thesis",
  "supportingAngles": ["3-5 concrete angles that support the thesis"],
  "researchSignals": ["3-5 specific signals from the profile, role, company, or public context. If input is thin, label as role/company context without pretending it came from public content"],
  "observation": "one intelligent observation about your work or operating context",
  "sharpQuestion": "one question that feels like it could only be asked to you",
  "howTheyHelpUs": "honest statement of how your judgment improves Agentic Engineering",
  "howWeHelpThem": "honest statement of what asset/value we create for you",
  "reasons": [{"title": "reason to come on Agentic Engineering", "body": "1-2 direct sentences explaining why this is worth the guest's time"}],
  "topics": ["6-10 concrete episode topics, not generic topic labels"],
  "hostFit": "short paragraph connecting the host and guest",
  "hostPhotoUrl": "",
  "episodeTitle": "specific proposed episode title",
  "personalizedCta": "one sentence CTA addressed to the guest"
}

Rules:
- First classify the guest, then use the selected proposal template: ${selectedTemplate}. Do not choose a different template unless the selected value is invalid.
- The entire proposal is addressed to ${name}. Write in second person using "you" and "your". Do not write as if a third party is reading a profile about ${name}.
- Avoid third-person constructions like "${name} brings", "they help us", "their work shows", or "this guest". Use "you bring", "you help us", "your work shows", and "your perspective".
- The public proposal must not expose internal classification work. Do not say "template", "strategy", "audience read", "primary motivation", "company context", or "research exchange".
- The proposal should sell Agentic Engineering as the platform: who listens, why the audience matters, how prepared the conversation will be, and what useful asset the guest gets afterwards.
- The reasons section must answer: "Why should I come on this podcast?"
- The proof section must make the guest feel we did real homework. Make researchSignals specific, observation sharp, and sharpQuestion unusually relevant.
- Make the pitch motive match the selected template. Do not reuse the same audience, distribution, or customer logic across templates.
- For Research Exchange, do not sell customers, buyer attention, or broad reach. Sell a technically literate room, peer-level questions, buildable ideas, and a durable explanation of the guest's research.
- For Operator's Field Report, sell fellow CTOs/operators, real production trade-offs, war stories, evaluation failures, process, reliability, security, and systems judgment.
- For Category Builder, sell narrative ownership, category language, founder/operator peers, market timing, and turning their point of view into a sharper public artifact.
- For Founding Voice, respect status. Do not imply they need our audience. Sell editorial seriousness, preparation, and setting a higher bar for the field.
- For Distribution, sell useful builder reach and clear repurposable assets without overclaiming our audience.
- For Technical Legacy, sell intellectual permanence and a clear record of how they reason through technical choices.
- Template selection rules:
  - Distribution: early-stage founder, developer tool founder, small audience. Promise: get your ideas in front of more builders.
  - Technical Legacy: CTO, research leader, principal engineer, technical authority. Promise: create a lasting record of how you think.
  - Operator's Field Report: CTO, VP Engineering, infrastructure, commerce, fintech, logistics operators. Promise: share hard-earned production lessons.
  - Research Exchange: research engineers, applied scientists, technical staff. Promise: a serious technical discussion, not a marketing podcast.
  - Category Builder: founder with audience, AI thought leader, product visionary. Promise: help shape the narrative of an emerging category.
  - Founding Voice: high-status guest, industry authority, or audience much larger than ours. Promise: help define the standard for next-generation engineering conversations.
- For Founding Voice, never sell audience size, never mention distribution, and never imply they need our audience.
- Make it specific to the LinkedIn profile and the role/company context.
- If the profile text is thin, personalize from role, company, and likely domain without pretending you saw facts.
- The heroHeadline must be catchy and under 8 words.
- The heroIntro must be crisp, specific, and never more than 55 words.
- Mandatory: whyThem, whyNow, editorialThesis, researchSignals, observation, sharpQuestion, howTheyHelpUs, and howWeHelpThem.
- Do not generate generic topic lists. editorialThesis should read like the proposed episode premise. supportingAngles and topics should read like concrete discussion points the guest would instantly understand.
- Naturally address objections: time, small audience, repeated topics, promotional podcast concern, and beginner AI questions.
- The value exchange must feel honest. If the guest is high status, acknowledge that their experience raises our bar and emphasize preparation, depth, and reusable assets.
- Do not use em dashes. Use commas, periods, or colons instead.
- Do not generate or mention previous podcast episodes. The app uses two fixed Agentic Engineering episodes.
- Do not invent unverifiable accomplishments.
- Keep it confident, warm, and practitioner-first.
- Avoid generic hype.
- Use plain English.
`;
}

function templateStrategyFor(template) {
  if (template === "Research Exchange") {
    return `
Research Exchange:
- The guest is motivated by ideas, rigor, and being understood by serious technical people.
- Pitch Agentic Engineering as a place where researchers, applied builders, and deep technical operators can translate research into systems without dumbing it down.
- The audience promise is not buyers. It is people who can understand, challenge, and build from your ideas.
- heroIntro should mention their specific research/work and why it deserves a technically literate conversation.
- audienceQuote should sound like: You would be speaking to builders and technical leaders who care enough to follow the details.
- reasons should focus on rigorous questions, intellectual translation, and a durable artifact for the idea.
`;
  }
  if (template === "Operator's Field Report") {
    return `
Operator's Field Report:
- The guest is motivated by hard-earned operational judgment and conversations with peers who have scars from production systems.
- Pitch Agentic Engineering as an operator room: CTOs, engineering leaders, and builders comparing real decisions, not polished AI theater.
- Avoid generic audience-size claims. Emphasize fellow CTOs/tinkerers, production lessons, reliability, security, cost, governance, and team adoption.
- reasons should feel like: share the decisions other operators wish they had seen before they tried this.
`;
  }
  if (template === "Category Builder") {
    return `
Category Builder:
- The guest is motivated by shaping language, market narrative, and how a new category gets understood.
- Pitch Agentic Engineering as a sharp editorial surface for their thesis, not just another podcast appearance.
- It is acceptable to talk about founders, builders, and technical leaders who may become allies, users, hires, or category believers, but never make it feel like a crude sales pitch.
- reasons should focus on narrative ownership, category timing, and turning their worldview into a reusable asset.
`;
  }
  if (template === "Founding Voice") {
    return `
Founding Voice:
- The guest likely has more reach and status than us. Acknowledge that implicitly through respect, not flattery.
- Pitch the value as editorial quality, preparation, and helping set the standard for serious agentic engineering conversations.
- Avoid claiming we can give them meaningful distribution. Sell a high-signal conversation they would be proud to point people to.
`;
  }
  if (template === "Technical Legacy") {
    return `
Technical Legacy:
- The guest is motivated by preserving how they think, not just what they built.
- Pitch the episode as a durable record of principles, trade-offs, taste, and technical judgment.
- reasons should make the conversation feel archival, precise, and useful to future builders.
`;
  }
  return `
Distribution:
- The guest is likely still building their public surface.
- Pitch useful builder reach, clear clips, and an episode that makes their ideas easier to understand and share.
- Keep it practical, direct, and not inflated.
`;
}
