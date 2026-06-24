import { json, supabaseFetch } from "./_shared.js";

const publicCacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400"
};

export default async function handler(req, res) {
  const slug = req.query.slug;
  if (!slug) return json(res, 400, { error: "Missing slug." });

  try {
    if (req.method === "GET") {
      const rows = await supabaseFetch(
        `guests?slug=eq.${encodeURIComponent(slug)}&published=eq.true&select=id,name,role,company,photo_url,slug,proposal,published,viewed,created_at,updated_at&limit=1`
      );
      return json(
        res,
        rows[0] ? 200 : 404,
        rows[0] ? publicGuestFromRow(rows[0]) : { error: "Proposal not found." },
        rows[0] ? publicCacheHeaders : {}
      );
    }

    if (req.method === "POST") {
      const rows = await supabaseFetch(`guests?slug=eq.${encodeURIComponent(slug)}&select=id,viewed&limit=1`);
      if (!rows[0]) return json(res, 404, { error: "Proposal not found." });
      await supabaseFetch(`guests?id=eq.${encodeURIComponent(rows[0].id)}`, {
        method: "PATCH",
        body: JSON.stringify({ viewed: (rows[0].viewed || 0) + 1, updated_at: new Date().toISOString() })
      });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed." });
  } catch (error) {
    return json(res, 500, { error: error.message || "Proposal request failed." });
  }
}

function publicGuestFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: "",
    role: row.role,
    company: row.company,
    linkedinUrl: "",
    status: "Reach Out",
    photoUrl: publicPhotoUrl(row),
    pdfName: "",
    pdfText: "",
    slug: row.slug,
    proposal: row.proposal,
    published: row.published,
    viewed: row.viewed || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function publicPhotoUrl(row) {
  const photoUrl = row.photo_url || "";
  if (photoUrl.startsWith("data:")) return `/api/photo?slug=${encodeURIComponent(row.slug)}`;
  return photoUrl;
}
