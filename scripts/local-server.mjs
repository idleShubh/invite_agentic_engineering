import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import generateProposal from "../api/generate-proposal.js";
import guests from "../api/guests.js";
import login from "../api/login.js";
import logout from "../api/logout.js";
import proposalQuery from "../api/proposal.js";
import proposal from "../api/proposals/[slug].js";
import session from "../api/session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const port = Number(process.env.PORT || 3000);

const handlers = {
  "/api/generate-proposal": generateProposal,
  "/api/guests": guests,
  "/api/login": login,
  "/api/logout": logout,
  "/api/proposal": proposalQuery,
  "/api/session": session
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (handlers[pathname]) {
      req.query = Object.fromEntries(url.searchParams.entries());
      return handlers[pathname](req, res);
    }

    const proposalMatch = pathname.match(/^\/api\/proposals\/([^/]+)$/);
    if (proposalMatch) {
      req.query = { slug: decodeURIComponent(proposalMatch[1]) };
      return proposal(req, res);
    }

    return serveStatic(pathname, res);
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`Local app running at http://localhost:${port}`);
  });

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const candidate = path.normalize(path.join(dist, requested));
  const filePath = candidate.startsWith(dist) && existsSync(candidate) ? candidate : path.join(dist, "index.html");

  try {
    if ((await stat(filePath)).isDirectory()) return streamFile(path.join(dist, "index.html"), res);
    return streamFile(filePath, res);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}

function streamFile(filePath, res) {
  res.setHeader("Content-Type", contentType(filePath));
  createReadStream(filePath).pipe(res);
}

function contentType(filePath) {
  const extension = path.extname(filePath);
  return (
    {
      ".css": "text/css",
      ".html": "text/html",
      ".js": "text/javascript",
      ".json": "application/json",
      ".mjs": "text/javascript",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".webp": "image/webp"
    }[extension] || "application/octet-stream"
  );
}
