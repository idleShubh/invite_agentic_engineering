import { adminEmail, adminPassword, createSession, json, readBody, setSessionCookie } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  const body = await readBody(req);
  if (body.email === adminEmail && body.password === adminPassword) {
    setSessionCookie(res, createSession(body.email));
    return json(res, 200, { email: body.email });
  }
  return json(res, 401, { error: "Invalid email or password." });
}
