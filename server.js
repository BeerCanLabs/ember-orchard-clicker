// Ticket Booth server: serves the static game AND a small JSON API for
// accounts, cloud saves, and the leaderboard.
//
// Dependency-free: built-in http + the accounts store (crypto + JSON file).
// Run with `npm start`; the game opens at http://localhost:3000.

const http = require("http");
const fs = require("fs");
const path = require("path");
const { createStore } = require("./accounts.js");

const root = __dirname;
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.TICKET_BOOTH_DATA || path.join(root, "data", "accounts.json");
const store = createStore({ filePath: DATA_FILE });

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

// Allow the game (served from GitHub Pages or anywhere else) to call this API
// from a different origin. Set ALLOWED_ORIGINS to a comma-separated list to
// lock it down; defaults to "*" so it works out of the box.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

function corsHeaders(request) {
  const origin = request.headers.origin;
  let allow = "*";
  if (!ALLOWED_ORIGINS.includes("*")) {
    allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || "";
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let tooBig = false;
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        tooBig = true;
        request.destroy();
      }
    });
    request.on("end", () => {
      if (tooBig) return reject(new Error("Payload too large"));
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function tokenFrom(request) {
  const header = request.headers["authorization"] || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

async function handleApi(request, response, urlPath) {
  const method = request.method;

  // Public: leaderboard is readable without an account.
  if (urlPath === "/api/leaderboard" && method === "GET") {
    return sendJson(response, 200, store.leaderboard(100));
  }

  if (urlPath === "/api/register" && method === "POST") {
    const body = await readBody(request);
    const result = store.register(body.username, body.password);
    return sendJson(response, result.ok ? 200 : result.status || 400, result);
  }

  if (urlPath === "/api/login" && method === "POST") {
    const body = await readBody(request);
    const result = store.login(body.username, body.password);
    return sendJson(response, result.ok ? 200 : result.status || 401, result);
  }

  if (urlPath === "/api/logout" && method === "POST") {
    return sendJson(response, 200, store.logout(tokenFrom(request)));
  }

  if (urlPath === "/api/save" && method === "GET") {
    const result = store.loadSave(tokenFrom(request));
    return sendJson(response, result.ok ? 200 : result.status || 401, result);
  }

  if (urlPath === "/api/save" && method === "POST") {
    const body = await readBody(request);
    const result = store.saveSave(tokenFrom(request), body.save);
    return sendJson(response, result.ok ? 200 : result.status || 401, result);
  }

  return sendJson(response, 404, { ok: false, error: "Unknown endpoint." });
}

function serveStatic(request, response, urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.resolve(root, `.${cleanPath}`);
  // Never serve the data directory or the accounts module over HTTP.
  if (!filePath.startsWith(root) || filePath.startsWith(path.join(root, "data"))) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  const urlPath = request.url.split("?")[0];
  if (urlPath.startsWith("/api/")) {
    // Apply CORS to every API response so the game can be hosted elsewhere
    // (e.g. GitHub Pages) and still call this backend.
    for (const [key, value] of Object.entries(corsHeaders(request))) {
      response.setHeader(key, value);
    }
    // Preflight: answer OPTIONS immediately.
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    handleApi(request, response, urlPath).catch((error) => {
      sendJson(response, 400, { ok: false, error: error.message || "Bad request" });
    });
    return;
  }
  serveStatic(request, response, urlPath);
});

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () =>
    console.log(`Ticket Booth is running at http://localhost:${PORT}`)
  );
}

module.exports = { server, store };
