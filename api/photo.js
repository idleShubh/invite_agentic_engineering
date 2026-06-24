import { json, supabaseFetch } from "./_shared.js";

const photoCacheHeaders = {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800"
};

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed." });
  const slug = req.query.slug;
  if (!slug) return json(res, 400, { error: "Missing slug." });

  try {
    const rows = await supabaseFetch(
      `guests?slug=eq.${encodeURIComponent(slug)}&published=eq.true&select=photo_url&limit=1`
    );
    const photoUrl = rows[0]?.photo_url || "";
    if (!photoUrl) return json(res, 404, { error: "Photo not found." });

    if (!photoUrl.startsWith("data:")) {
      res.statusCode = 302;
      res.setHeader("Location", photoUrl);
      for (const [key, value] of Object.entries(photoCacheHeaders)) res.setHeader(key, value);
      res.end();
      return;
    }

    const match = photoUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
    if (!match) return json(res, 400, { error: "Unsupported photo format." });
    const [, contentType, isBase64, payload] = match;
    const body = Buffer.from(decodeURIComponent(payload), isBase64 ? "base64" : "utf8");

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType || "image/jpeg");
    res.setHeader("Content-Length", String(body.length));
    for (const [key, value] of Object.entries(photoCacheHeaders)) res.setHeader(key, value);
    res.end(body);
  } catch (error) {
    return json(res, 500, { error: error.message || "Photo request failed." });
  }
}
