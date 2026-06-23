import { json, supabaseFetch } from "./_shared.js";
import { fromRow } from "./guests.js";

export default async function handler(req, res) {
  const slug = req.query.slug;
  if (!slug) return json(res, 400, { error: "Missing slug." });

  try {
    if (req.method === "GET") {
      const rows = await supabaseFetch(
        `guests?slug=eq.${encodeURIComponent(slug)}&published=eq.true&select=id,name,email,role,company,linkedin_url,status,photo_url,pdf_name,slug,proposal,published,viewed,created_at,updated_at&limit=1`
      );
      return json(res, rows[0] ? 200 : 404, rows[0] ? fromRow(rows[0]) : { error: "Proposal not found." });
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
