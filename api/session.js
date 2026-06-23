import { json, readSession } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed." });
  const session = readSession(req);
  return json(res, 200, { authenticated: Boolean(session), email: session?.email || null });
}
