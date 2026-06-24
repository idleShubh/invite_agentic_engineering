import { readFileSync } from "node:fs";
import path from "node:path";

import { supabaseFetch } from "./_shared.js";

const defaultImage = "/agentic-engineering-logo.png";
const htmlCacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400"
};

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
  return readFileSync(path.join(process.cwd(), "dist", "index.html"), "utf8");
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
