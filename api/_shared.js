import crypto from "node:crypto";

const projectId = process.env.SUPABASE_PROJECT_ID || "xsomhstngzyvxhhlyhpm";
const supabaseUrl = process.env.SUPABASE_URL || `https://${projectId}.supabase.co`;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  "";
const normalizedSupabaseServiceKey = supabaseServiceKey.trim();
const authSecret = process.env.AUTH_SECRET || normalizedSupabaseServiceKey || "local-dev-secret";
const sessionCookie = "ae_session";
const secureCookie = process.env.NODE_ENV === "production" ? " Secure;" : "";

export const adminEmail = process.env.ADMIN_EMAIL || "admin@supatest.ai";
export const adminPassword = process.env.ADMIN_PASSWORD || "local@123";

export function json(res, status, body, headers = {}) {
  res.statusCode = status;
  for (const [key, value] of Object.entries({
    "Content-Type": "application/json",
    ...headers
  })) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

export function createSession(email) {
  const payload = Buffer.from(
    JSON.stringify({ email, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 14 })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSession(req) {
  const token = parseCookies(req.headers.cookie || "")[sessionCookie];
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.expiresAt || session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${sessionCookie}=${token}; HttpOnly;${secureCookie} SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 14}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${sessionCookie}=; HttpOnly;${secureCookie} SameSite=Lax; Path=/; Max-Age=0`);
}

export function requireSession(req, res) {
  const session = readSession(req);
  if (!session) {
    json(res, 401, { error: "Authentication required." });
    return null;
  }
  return session;
}

export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export async function supabaseFetch(path, options = {}) {
  if (!normalizedSupabaseServiceKey) {
    throw new Error(
      "Supabase is not configured on this deployment. Add SUPABASE_SERVICE_ROLE_KEY in Vercel Project Settings > Environment Variables, then redeploy."
    );
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: normalizedSupabaseServiceKey,
      Authorization: `Bearer ${normalizedSupabaseServiceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.error || text || `Supabase request failed with ${response.status}`;
    if (/invalid api key/i.test(message)) {
      throw new Error(
        "Invalid Supabase API key on this deployment. In Vercel, set SUPABASE_SERVICE_ROLE_KEY to the service_role key from the same Supabase project, not the anon or publishable key, then redeploy."
      );
    }
    throw new Error(message);
  }
  return data;
}

function parseCookies(cookieHeader) {
  return cookieHeader.split(";").reduce((cookies, pair) => {
    const [key, ...value] = pair.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(value.join("="));
    return cookies;
  }, {});
}
