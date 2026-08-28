/**
 * KARTELO MD — Standalone Pair Code Server (pair.js)
 * ──────────────────────────────────────────────────
 * Deploy this on Render / Railway / Koyeb to get a
 * web page where users enter their phone number and
 * receive an 8-digit WhatsApp pairing code.
 *
 * Uses only Node.js built-in modules (no express needed).
 * Usage:  node pair.js    (PORT env var, default 3000)
 */

const http = require("http");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Baileys (lazy-load so the bot can run without these if needed)
let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Boom;
try {
  const baileys = require("@whiskeysockets/baileys");
  makeWASocket = baileys.default;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  DisconnectReason = baileys.DisconnectReason;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
  Boom = require("@hapi/boom").default;
} catch (e) {
  console.error("❌ Baileys not installed. Run: npm install");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const SESSIONS_DIR = path.join(__dirname, "pair_sessions");
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR);

const activeSockets = new Map();

async function startPairSession(sessionId, phoneNumber) {
  const sessionDir = path.join(SESSIONS_DIR, sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    version,
    logger: { level: "silent" },
  });

  let pairingCode = "";
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      setTimeout(() => {
        try { sock.end(undefined); } catch {}
        fs.rmSync(sessionDir, { recursive: true, force: true });
        activeSockets.delete(sessionId);
      }, 5000);
    }
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        activeSockets.delete(sessionId);
      }
    }
  });

  await new Promise((r) => setTimeout(r, 2000));
  if (!sock.authState.creds.registered) {
    pairingCode = await sock.requestPairingCode(phoneNumber);
  }
  activeSockets.set(sessionId, { sock, pairingCode });
  return pairingCode;
}

// ── HTML Pages ──
const homePage = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KARTELO MD — Pair Code</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,sans-serif}
body{background:#0a0a0a;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;padding:20px}
.card{background:#151515;border:1px solid #25D366;border-radius:20px;padding:40px;max-width:420px;width:100%;text-align:center}
h1{color:#25D366;font-size:28px;margin-bottom:8px}
p{color:#aaa;font-size:14px;margin-bottom:24px}
input{width:100%;padding:14px;border-radius:10px;border:1px solid #333;background:#222;color:#fff;font-size:16px;margin-bottom:16px}
button{width:100%;padding:14px;border-radius:10px;border:none;background:#25D366;color:#000;font-size:16px;font-weight:700;cursor:pointer}
button:hover{background:#1ebe55}
.note{color:#666;font-size:12px;margin-top:16px}
</style></head><body>
<div class="card">
<h1>🤖 KARTELO MD</h1>
<p>Get your WhatsApp Pairing Code</p>
<form method="POST" action="/pair">
<input type="tel" name="phone" placeholder="254712345678" required pattern="[0-9]{10,15}">
<button type="submit">Get Pair Code</button>
</form>
<div class="note">Enter your number with country code (no +)</div>
</div></body></html>`;

function codePage(code) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Pair Code — KARTELO MD</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,sans-serif}
body{background:#0a0a0a;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#fff;padding:20px}
.card{background:#151515;border:1px solid #25D366;border-radius:20px;padding:40px;max-width:420px;width:100%;text-align:center}
h1{color:#25D366;font-size:24px;margin-bottom:16px}
.code{font-size:52px;font-weight:900;letter-spacing:14px;color:#25D366;font-family:monospace;margin:20px 0}
ol{text-align:left;color:#ccc;font-size:14px;margin:16px 0;padding-left:20px}
li{margin:8px 0}
.note{color:#666;font-size:12px;margin-top:16px}
</style></head><body>
<div class="card">
<h1>🤖 Your Pairing Code</h1>
<div class="code">${code}</div>
<ol>
<li>Open WhatsApp on your phone</li>
<li>Settings → Linked Devices → Link a Device</li>
<li>Tap "Link with phone number instead"</li>
<li>Enter the code above</li>
</ol>
<p class="note">Code expires in ~60 seconds. Don't refresh.</p>
</div></body></html>`;
}

const errorPage = (msg) => `<div style="color:red;text-align:center;margin-top:40px;font-family:sans-serif">❌ ${msg}<br><br><a href="/" style="color:#25D366">← Go back</a></div>`;

// ── HTTP Server ──
const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && parsed.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(homePage);
  }

  if (req.method === "POST" && parsed.pathname === "/pair") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const phone = (body.split("=")[1] || "").replace(/[^0-9]/g, "");
      if (!phone || phone.length < 10) {
        res.writeHead(400, { "Content-Type": "text/html" });
        return res.end(errorPage("Invalid phone number."));
      }
      try {
        const sessionId = crypto.randomUUID();
        const code = await startPairSession(sessionId, phone);
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(codePage(code));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "text/html" });
        return res.end(errorPage(e.message));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/html" });
  res.end("<h1>404 — Not Found</h1><p><a href='/'>Go home</a></p>");
});

server.listen(PORT, () => {
  console.log(`🎮 KARTELO MD Pair Server running on port ${PORT}`);
});
