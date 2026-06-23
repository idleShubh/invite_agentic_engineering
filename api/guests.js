import { json, readBody, requireSession, supabaseFetch } from "./_shared.js";

export default async function handler(req, res) {
  if (!requireSession(req, res)) return;

  try {
    if (req.method === "GET") {
      const guests = await supabaseFetch(
        "guests?select=id,name,email,role,company,linkedin_url,status,photo_url,pdf_name,slug,proposal,published,viewed,created_at,updated_at&order=created_at.desc"
      );
      return json(res, 200, guests.map(fromRow));
    }

    if (req.method === "POST") {
      const guest = await readBody(req);
      const rows = await supabaseFetch("guests", {
        method: "POST",
        body: JSON.stringify(toRow(guest))
      });
      return json(res, 200, fromRow(rows[0]));
    }

    if (req.method === "PATCH") {
      const { id, patch } = await readBody(req);
      if (!id || !patch) return json(res, 400, { error: "Missing id or patch." });
      const rows = await supabaseFetch(`guests?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(toRow({ ...patch, updatedAt: new Date().toISOString() }, true))
      });
      return json(res, 200, fromRow(rows[0]));
    }

    return json(res, 405, { error: "Method not allowed." });
  } catch (error) {
    return json(res, 500, { error: error.message || "Guest request failed." });
  }
}

export function toRow(guest, partial = false) {
  const row = {
    id: guest.id,
    name: guest.name,
    email: guest.email,
    role: guest.role,
    company: guest.company,
    linkedin_url: guest.linkedinUrl,
    status: guest.status,
    photo_url: guest.photoUrl,
    pdf_name: guest.pdfName,
    pdf_text: guest.pdfText,
    slug: guest.slug,
    proposal: guest.proposal,
    published: guest.published,
    viewed: guest.viewed,
    created_at: guest.createdAt,
    updated_at: guest.updatedAt
  };
  return partial ? compact(row) : row;
}

export function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || "",
    role: row.role,
    company: row.company,
    linkedinUrl: row.linkedin_url || "",
    status: row.status,
    photoUrl: row.photo_url,
    pdfName: row.pdf_name || "",
    pdfText: row.pdf_text || "",
    slug: row.slug,
    proposal: row.proposal,
    published: row.published,
    viewed: row.viewed || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function compact(row) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}
