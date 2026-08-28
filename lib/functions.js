/**
 * KARTELO MD — Utility Functions (lib/functions.js)
 */
const https = require("https");

function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const { headers = {}, timeout = 10000 } = options;
    const req = https.get(url, { headers, timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return httpGet(next, options).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    });
    req.on("timeout", () => req.destroy(new Error("Request timeout")));
    req.on("error", reject);
  });
}

function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

function parseTimeString(str) {
  const m = String(str || "").match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * mult[unit];
}

function runtime(start) {
  const ms = Date.now() - (start instanceof Date ? start.getTime() : start);
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(d + "d");
  if (h) parts.push(h + "h");
  if (m) parts.push(m + "m");
  parts.push(sec + "s");
  return parts.join(" ");
}

function getMentionedJids(msg) {
  const jids = [];
  const ctx = msg?.message?.extendedTextMessage?.contextInfo;
  if (ctx?.mentionedJid) jids.push(...ctx.mentionedJid);
  return jids;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + u[i];
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function isGroupJid(jid) { return String(jid || "").endsWith("@g.us"); }

function isOwner(jid, config) {
  const num = String(jid || "").split("@")[0];
  return (config.owner || []).some((o) => String(o).split("@")[0] === num);
}

module.exports = { httpGet, pickRandom, parseTimeString, runtime, getMentionedJids, formatBytes, sleep, isGroupJid, isOwner };
