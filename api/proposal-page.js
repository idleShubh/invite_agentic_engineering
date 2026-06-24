import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { supabaseFetch } from "./_shared.js";

const defaultImage = "/agentic-engineering-logo.png";
const htmlCacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400"
};
const functionDir = path.dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  const slug = req.query.slug;
  if (!slug) return sendAppShell(res);

  try {
    const rows = await supabaseFetch(
      `guests?slug=eq.${encodeURIComponent(slug)}&published=eq.true&select=name,role,company,photo_url,slug&limit=1`
    );
    if (!rows[0]) return sendAppShell(res, { noindex: true });
    return sendAppShell(res, socialMeta(req, rows[0]));
  } catch {
    return sendAppShell(res);
  }
}

function socialMeta(req, row) {
  const origin = requestOrigin(req);
  const name = clean(row.name || "Guest");
  const company = clean(row.company || "their team");
  const title = `${name}, join Agentic Engineering with Prasad Pilla`;
  const description = `Prasad Pilla is inviting ${name} from ${company} to join the Agentic Engineering podcast and share valuable insights with serious AI builders.`;
  const path = `/proposal/${row.slug}`;
  const image = socialImageUrl(origin, row);

  return {
    title,
    description,
    canonical: `${origin}${path}`,
    image,
    url: `${origin}${path}`
  };
}

function sendAppShell(res, meta = {}) {
  const html = personalizedHtml(meta);
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  for (const [key, value] of Object.entries(htmlCacheHeaders)) res.setHeader(key, value);
  res.end(html);
}

function personalizedHtml(meta) {
  const fallbackTitle = "Agentic Engineering Podcast Proposal Generator";
  const fallbackDescription =
    "Create personalized podcast proposal pages and track guest outreach for Agentic Engineering.";
  const title = meta.title || fallbackTitle;
  const description = meta.description || fallbackDescription;
  const image = meta.image || defaultImage;
  const url = meta.url || "/";
  const canonical = meta.canonical || url;
  const html = readIndexHtml();

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?>/,
      `<meta name="description" content="${escapeAttribute(description)}" />`
    )
    .replace(/<link\s+rel="canonical"[\s\S]*?>/, `<link rel="canonical" href="${escapeAttribute(canonical)}" />`)
    .replace(/<meta\s+property="og:type"[\s\S]*?>/, `<meta property="og:type" content="website" />`)
    .replace(/<meta\s+property="og:title"[\s\S]*?>/, `<meta property="og:title" content="${escapeAttribute(title)}" />`)
    .replace(
      /<meta\s+property="og:description"[\s\S]*?>/,
      `<meta property="og:description" content="${escapeAttribute(description)}" />`
    )
    .replace(/<meta\s+property="og:image"[\s\S]*?>/, `<meta property="og:image" content="${escapeAttribute(image)}" />`)
    .replace(/<meta\s+property="og:url"[\s\S]*?>/, `<meta property="og:url" content="${escapeAttribute(url)}" />`)
    .replace(/<meta\s+name="twitter:card"[\s\S]*?>/, `<meta name="twitter:card" content="summary_large_image" />`)
    .replace(/<meta\s+name="twitter:title"[\s\S]*?>/, `<meta name="twitter:title" content="${escapeAttribute(title)}" />`)
    .replace(
      /<meta\s+name="twitter:description"[\s\S]*?>/,
      `<meta name="twitter:description" content="${escapeAttribute(description)}" />`
    )
    .replace(/<meta\s+name="twitter:image"[\s\S]*?>/, `<meta name="twitter:image" content="${escapeAttribute(image)}" />`)
    .replace(
      /<meta\s+name="robots"[\s\S]*?>/,
      `<meta name="robots" content="${meta.noindex ? "noindex,nofollow" : "index,follow"}" />`
    );
}

function readIndexHtml() {
  const candidates = [
    path.join(process.cwd(), "dist", "index.html"),
    path.join(functionDir, "..", "dist", "index.html")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return readFileSync(candidate, "utf8");
  }

  return fallbackIndexHtml();
}

function fallbackIndexHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agentic Engineering Podcast Proposal Generator</title>
    <meta name="description" content="Create personalized Agentic Engineering podcast proposal pages for AI engineering leaders, manage guest outreach, edit invitations, and track every proposal from reach out to done." />
    <meta name="robots" content="index,follow" />
    <meta name="theme-color" content="#07080e" />
    <link rel="icon" type="image/png" href="/agentic-engineering-logo.png" />
    <link rel="apple-touch-icon" href="/agentic-engineering-logo.png" />
    <link rel="canonical" href="/" />
    <meta property="og:site_name" content="Agentic Engineering" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Agentic Engineering Podcast Proposal Generator" />
    <meta property="og:description" content="Generate personalized podcast proposals, share guest-specific invitation pages, and track outreach for Agentic Engineering." />
    <meta property="og:image" content="/agentic-engineering-logo.png" />
    <meta property="og:url" content="/" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Agentic Engineering Podcast Proposal Generator" />
    <meta name="twitter:description" content="Create personalized podcast proposal pages and track guest outreach for Agentic Engineering." />
    <meta name="twitter:image" content="/agentic-engineering-logo.png" />
    <script type="module" crossorigin src="/assets/index-rrfBNfbw.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-1x4v5M8a.css" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

function socialImageUrl(origin, row) {
  const photoUrl = row.photo_url || "";
  if (photoUrl.startsWith("data:")) return `${origin}/api/photo?slug=${encodeURIComponent(row.slug)}`;
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  if (photoUrl) return `${origin}${photoUrl.startsWith("/") ? "" : "/"}${photoUrl}`;
  return `${origin}${defaultImage}`;
}

function requestOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "invite-agentic-engineering.vercel.app";
  const protocol = req.headers["x-forwarded-proto"] || (String(host).startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
