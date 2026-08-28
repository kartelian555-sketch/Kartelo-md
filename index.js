/**
 * Kartelo 🇯🇲 Official MD — WhatsApp Bot
 * Built with @whiskeysockets/baileys
 *
 * AUTHENTICATION MODES:
 * ─────────────────────
 * 1. PAIRING CODE (default for new sessions):
 *    - Set USE_PAIRING_CODE=true in your .env or leave it as default below
 *    - Enter your phone number when prompted in the terminal
 *    - WhatsApp will give you an 8-digit pairing code to enter in your phone app
 *
 * 2. SESSION ID (for cloud/server hosting):
 *    - Set SESSION_ID=<base64-encoded-creds> in your .env
 *    - The bot will decode it and write creds.json automatically
 *    - Useful for deploying to Heroku, Railway, Replit, etc.
 *
 * 3. QR CODE fallback:
 *    - Set USE_PAIRING_CODE=false and remove SESSION_ID
 *    - A QR code will appear in the terminal — scan with WhatsApp
 */

require("dotenv").config();

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidDecode,
  proto,
} = require("@whiskeysockets/baileys");

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store shim (Baileys 6.7.x removed makeInMemoryStore)
// Provides a minimal store with bind() + chats.all() used by this bot.
// ─────────────────────────────────────────────────────────────────────────────
function makeInMemoryStore() {
  const chats = new Map();
  return {
    chats: {
      all: () => Array.from(chats.values()),
      get: (id) => chats.get(id),
      update: (id, data) => chats.set(id, { id, ...data }),
      insert: (chat) => chats.set(chat.id, chat),
      delete: (id) => chats.delete(id),
    },
    bind: (ev) => {
      ev.on("messaging-history.set", ({ chats: newChats }) => {
        for (const c of newChats || []) if (c?.id) chats.set(c.id, c);
      });
      ev.on("chats.upsert", (newChats) => {
        for (const c of newChats || []) if (c?.id) chats.set(c.id, c);
      });
      ev.on("chats.update", (updates) => {
        for (const u of updates || []) if (u?.id) {
          const existing = chats.get(u.id) || { id: u.id };
          chats.set(u.id, { ...existing, ...u });
        }
      });
      ev.on("chats.delete", (deletions) => {
        for (const id of deletions || []) chats.delete(id);
      });
    },
  };
}

const { Boom } = require("@hapi/boom");
const pino = require("pino");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const http = require("http");
const ytSearch = require("yt-search");
const ytdl = require("@distube/ytdl-core");

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const AUTH_DIR = path.join(__dirname, "auth_info");
const OWNER_NUMBER = process.env.OWNER_NUMBER || ""; // e.g. "2348012345678" without "+" or "@s.whatsapp.net"
const USE_PAIRING_CODE = process.env.USE_PAIRING_CODE !== "false"; // default: true
const SESSION_ID = process.env.SESSION_ID || null;
const AUTO_JOIN_GROUP = process.env.AUTO_JOIN_GROUP || "";
const AUTO_JOIN_CHANNEL = process.env.AUTO_JOIN_CHANNEL || "";
const AUTO_JOIN_MESSAGE = process.env.AUTO_JOIN_MESSAGE || "👋 Welcome! Join our group and channel below:";
const BOT_NAME = process.env.BOT_NAME || "Kartelo 🇯🇲 Official MD";

// In-memory store for group settings (antilink, welcome)
// Format: { [groupJid]: { antilink: bool, welcome: bool } }
const groupSettings = {};

// Bot start time for uptime tracking
const BOT_START_TIME = Date.now();

// Current pairing code (shown on admin panel when not connected)
let currentPairingCode = "";

// Current QR code as base64 image (shown on admin panel)
let currentQRCode = "";
const QRCode = require("qrcode");

// Database
const {
  isBanned, banUser, unbanUser, getBannedUsers,
  warnUser, getWarnings, getWarnCount, clearWarnings,
  saveNote, getNote, deleteNote, listNotes,
  setReply, getReply, deleteReply, listReplies,
  getGroupSettings, setGroupSetting,
  logCommand, getCommandStats, getTotalCommands,
  getDbStats,
  // Economy
  getBalance, addBalance, setLastDaily, setLastWeekly, getLeaderboard,
  // AFK
  setAFK, getAFK, removeAFK,
  // Reminders
  addReminder, getPendingReminders, deleteReminder,
  // Profiles
  getProfile, addXP, setProfileName, setProfileBio,
} = require("./database");

// HTTPS module for API-based commands (weather, wiki, translate, AI, url shortener)
const https = require("https");

// Track users already sent auto-join invite (avoid spamming)
const autoJoinedUsers = new Set();

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: HTTP GET request (returns a Promise)
// Used by weather, wiki, translate, AI, url shortener, dictionary commands
// ─────────────────────────────────────────────────────────────────────────────
function httpGet(url, { headers = {}, timeout = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout }, (res) => {
      // Follow redirects (up to 5)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (res.headers.location.startsWith("http"))) {
        return httpGet(res.headers.location, { headers, timeout }).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Extract mentioned JIDs from a message
// ─────────────────────────────────────────────────────────────────────────────
function getMentionedJids(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (ctx?.mentionedJid && Array.isArray(ctx.mentionedJid)) return ctx.mentionedJid;
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Parse time string (e.g. "10m", "2h", "30s", "1d") → milliseconds
// ─────────────────────────────────────────────────────────────────────────────
function parseTimeString(str) {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(str.trim());
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * multipliers[unit];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Random element from array
// ─────────────────────────────────────────────────────────────────────────────
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Quotes and jokes pool
const QUOTES = [
  "🌟 _The secret of getting ahead is getting started._ — Mark Twain",
  "💪 _It always seems impossible until it's done._ — Nelson Mandela",
  "🔥 _Dream big and dare to fail._ — Norman Vaughan",
  "🌱 _Success is not final, failure is not fatal._ — Winston Churchill",
  "🚀 _The harder you work, the luckier you get._ — Gary Player",
  "🏆 _Don't watch the clock; do what it does. Keep going._ — Sam Levenson",
  "✨ _You are never too old to set another goal._ — C.S. Lewis",
  "🌍 _Be the change you wish to see in the world._ — Gandhi",
];

const JOKES = [
  "😂 Why don't scientists trust atoms?\n_Because they make up everything!_",
  "😄 Why did the scarecrow win an award?\n_Because he was outstanding in his field!_",
  "🤣 I told my wife she was drawing her eyebrows too high.\n_She looked surprised._",
  "😆 Why can't you give Elsa a balloon?\n_Because she'll let it go!_",
  "😅 What do you call a fake noodle?\n_An impasta!_",
  "🤭 Why did the bicycle fall over?\n_It was two-tired!_",
  "😂 What do you call cheese that isn't yours?\n_Nacho cheese!_",
  "😄 Why do cows wear bells?\n_Because their horns don't work!_",
];

// Silent logger (pino set to silent so it doesn't flood terminal)
const logger = pino({ level: "silent" });

// In-memory store for message history (optional, useful for reply context)
const store = makeInMemoryStore({ logger });

// ──────────────────────────────────────────────
// SESSION ID RESTORE
// Decode Base64 SESSION_ID → creds.json
// ──────────────────────────────────────────────
function restoreSessionFromId() {
  if (!SESSION_ID) return;
  try {
    const decoded = Buffer.from(SESSION_ID, "base64").toString("utf-8");
    const credsPath = path.join(AUTH_DIR, "creds.json");
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(credsPath, decoded, "utf-8");
    console.log("✅ Session restored from SESSION_ID environment variable.");
  } catch (err) {
    console.error("❌ Failed to decode SESSION_ID:", err.message);
    process.exit(1);
  }
}

// ──────────────────────────────────────────────
// HELPER: Extract newsletter JID from channel link
// e.g. https://whatsapp.com/channel/0029VaXXX → 0029VaXXX@newsletter
// ──────────────────────────────────────────────
function extractNewsletterJid(input) {
  if (!input) return null;
  if (input.endsWith("@newsletter")) return input;
  const match = input.match(/channel\/([A-Za-z0-9_-]+)/);
  if (match) return `${match[1]}@newsletter`;
  return null;
}

// ──────────────────────────────────────────────
// PAIRING CODE INPUT
// ──────────────────────────────────────────────
async function askPhoneNumber() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("📱 Enter your WhatsApp number (with country code, e.g. 2348012345678): ", (answer) => {
      rl.close();
      resolve(answer.trim().replace(/[^0-9]/g, ""));
    });
  });
}

// ──────────────────────────────────────────────
// BOT START
// ──────────────────────────────────────────────
async function startBot() {
  // Restore session from Base64 if provided
  if (SESSION_ID) restoreSessionFromId();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`\n╔════════════════════════════╗`);
  console.log(`║  Kartelo 🇯🇲 Official MD   ║`);
  console.log(`╚════════════════════════════╝\n`);
  console.log(`🤖 Using Baileys v${version.join(".")} (latest: ${isLatest})`);

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: !USE_PAIRING_CODE, // Show QR only when pairing code is disabled
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ["Ubuntu", "Chrome", "120.0.0"], // Prevent account flagging
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
  });

  // Bind store to socket events
  store?.bind(sock.ev);

  // ──────────────────────────────────────────────
  // PAIRING CODE FLOW
  // ──────────────────────────────────────────────
  if (USE_PAIRING_CODE && !SESSION_ID && !sock.authState.creds.registered) {
    // Auto-use OWNER_NUMBER if set, otherwise prompt
    let phone = OWNER_NUMBER || "";
    if (!phone) {
      phone = await askPhoneNumber();
    } else {
      console.log(`📱 Auto-using owner number: ${phone}`);
    }
    if (!phone) {
      console.error("❌ No phone number provided. Set OWNER_NUMBER in .env or enter it manually.");
      process.exit(1);
    }
    // Wait briefly for socket to be ready before requesting pairing code
    await new Promise((r) => setTimeout(r, 3000));
    const code = await sock.requestPairingCode(phone);
    currentPairingCode = code;
    console.log(`\n╔══════════════════════════════╗`);
    console.log(`║   YOUR PAIRING CODE:         ║`);
    console.log(`║   >>> ${code} <<<   ║`);
    console.log(`╚══════════════════════════════╝\n`);
    console.log("   Go to WhatsApp > Linked Devices > Link a Device\n");
    console.log("   Enter the code above to connect.\n");
  }

  // ──────────────────────────────────────────────
  // CONNECTION EVENTS
  // ──────────────────────────────────────────────
  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr && !USE_PAIRING_CODE) {
      console.log("📷 QR code generated — open admin panel to scan.");
      try {
        currentQRCode = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
      } catch (e) {
        console.log("QR image error:", e.message);
      }
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;

      console.log(`🔌 Connection closed. Reason: ${reason}. Reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(() => startBot(), 3000); // Reconnect after 3 seconds
      } else {
        console.log("🚫 Logged out. Please delete the auth_info folder and restart.");
        process.exit(0);
      }
    }

    if (connection === "open") {
      console.log("✅ Kartelo 🇯🇲 Official MD connected to WhatsApp successfully!");
      const ownerJid = `${OWNER_NUMBER}@s.whatsapp.net`;

      setTimeout(async () => {
        try {
          // Build connect message with auto-join links if configured
          let autoJoinSection = "";
          if (AUTO_JOIN_GROUP || AUTO_JOIN_CHANNEL) {
            autoJoinSection += "\n\n🔗 *Auto-Join Links:*";
            if (AUTO_JOIN_GROUP) {
              try {
                const groupCode = await sock.groupInviteCode(AUTO_JOIN_GROUP);
                autoJoinSection += `\n👥 *Group:* https://chat.whatsapp.com/${groupCode}`;
              } catch (e) {
                autoJoinSection += `\n👥 *Group:* (bot must be admin to get link)`;
              }
            }
            if (AUTO_JOIN_CHANNEL) {
              autoJoinSection += `\n📢 *Channel:* https://whatsapp.com/channel/${AUTO_JOIN_CHANNEL.replace("@newsletter", "")}`;
            }
          }

          const connectMsg = `╔════════════════════════╗
║  Kartelo 🇯🇲 Official MD  ║
╚════════════════════════╝

✅ *Bot is now ONLINE!*

🤖 Your WhatsApp bot has been linked successfully.

📋 *Quick Commands:*
• *.menu* — See all commands
• *.ping* — Check bot speed
• *.alive* — Confirm bot is running
• *.uptime* — How long bot has been on

🌐 *Admin Panel:* Login with password \`kartelo2024\`${autoJoinSection}

_Send .menu to get started_ 🚀`;
          await sock.sendMessage(ownerJid, { text: connectMsg });
        } catch (e) {
          console.log("Could not send connect message:", e.message);
        }

        // ── Set Bot Profile Picture & Status ──
        // Automatically sets the profile picture and "about" status on connect
        try {
          const ppPath = path.join(__dirname, "profile-pic.jpg");
          if (fs.existsSync(ppPath)) {
            const ppBuffer = fs.readFileSync(ppPath);
            await sock.updateProfilePicture(sock.user.id, ppBuffer);
            console.log("📸 Bot profile picture updated successfully!");
          }
          // Set "about" status
          const aboutStatus = process.env.BOT_ABOUT || "🤖 Kartelo 🇰🇪 Official MD — Your all-in-one WhatsApp bot | .menu";
          await sock.updateProfileStatus(aboutStatus);
          console.log("📝 Bot profile status (about) updated successfully!");
          // Set bot name (display name)
          const botDisplayName = process.env.BOT_DISPLAY_NAME || "Kartelo 🇰🇪 MD";
          await sock.updateProfileName(botDisplayName);
          console.log("📛 Bot display name updated successfully!");
        } catch (e) {
          console.log("Profile update error:", e.message);
        }
      }, 3000);
    }
  });

  // Save credentials on update
  sock.ev.on("creds.update", saveCreds);

  // ──────────────────────────────────────────────
  // MESSAGE HANDLER
  // ──────────────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue; // Ignore empty or own messages

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith("@g.us");
      const sender = isGroup ? msg.key.participant : from;
      const senderNumber = sender?.replace(/[^0-9]/g, "");
      const isOwner = senderNumber === OWNER_NUMBER;

      // Extract text from various message types
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        "";

      const body = text.trim();
      const command = body.split(" ")[0].toLowerCase();
      const args = body.split(" ").slice(1);

      // ─────────────────────────────
      // AUTO-JOIN — Send group/channel invite to new DM users
      // ─────────────────────────────
      if (!isGroup && (AUTO_JOIN_GROUP || AUTO_JOIN_CHANNEL) && !autoJoinedUsers.has(sender)) {
        autoJoinedUsers.add(sender);
        try {
          let inviteMsg = `${AUTO_JOIN_MESSAGE}\n`;
          if (AUTO_JOIN_GROUP) {
            try {
              const groupCode = await sock.groupInviteCode(AUTO_JOIN_GROUP);
              inviteMsg += `\n👥 *Join Group:* https://chat.whatsapp.com/${groupCode}`;
            } catch (e) {
              inviteMsg += `\n👥 *Group:* (unavailable)`;
            }
          }
          if (AUTO_JOIN_CHANNEL) {
            inviteMsg += `\n📢 *Follow Channel:* https://whatsapp.com/channel/${AUTO_JOIN_CHANNEL.replace("@newsletter", "")}`;
          }
          await sock.sendMessage(from, { text: inviteMsg });
        } catch (e) {
          console.log("Auto-join send error:", e.message);
        }
      }

      // ─────────────────────────────
      // CUSTOM AUTO-REPLY CHECK
      // ─────────────────────────────
      if (body && !command) {
        const reply = getReply(body.toLowerCase().trim());
        if (reply) {
          await sock.sendMessage(from, { text: reply.response }, { quoted: msg });
        }
      }

      // ─────────────────────────────
      // GROUP METADATA (for group commands)
      // ─────────────────────────────
      let groupMeta = null;
      let botIsAdmin = false;
      let senderIsAdmin = false;

      if (isGroup) {
        try {
          groupMeta = await sock.groupMetadata(from);
          const botJid = sock.user.id.replace(/:.*@/, "@");
          const admins = groupMeta.participants.filter((p) => p.admin).map((p) => p.id);
          botIsAdmin = admins.includes(botJid);
          senderIsAdmin = admins.includes(sender) || isOwner;

          // ── ANTILINK CHECK ──────────────────────────────
          const settings = groupSettings[from] || {};
          if (settings.antilink) {
            const hasLink = /https?:\/\/|wa\.me\/|chat\.whatsapp\.com\//i.test(body);
            if (hasLink && !senderIsAdmin) {
              try {
                await sock.sendMessage(from, {
                  delete: msg.key,
                });
                await sock.sendMessage(
                  from,
                  { text: `🚫 @${senderNumber} links are not allowed in this group!`, mentions: [sender] },
                  { quoted: msg }
                );
              } catch {}
              continue;
            }
          }
        } catch {}
      }

      // ─────────────────────────────
      // COMMANDS
      // ─────────────────────────────

      if (command && command.startsWith(".")) {
        const who = sender.split("@")[0];
        addLog(`${command} — from +${who} in ${isGroup ? "group" : "DM"}`);

        // Check if user is banned
        if (isBanned(sender) && sender !== `${OWNER_NUMBER}@s.whatsapp.net`) {
          return await sock.sendMessage(from, { text: "❌ You are banned from using this bot." }, { quoted: msg });
        }

        // Log command to database
        logCommand(command, sender, isGroup ? from : null);
      }

      // ──────────────────────────────────────────────────────────────────
      // XP / LEVELING — award XP for every message (command or not)
      // ──────────────────────────────────────────────────────────────────
      if (body && sender !== `${OWNER_NUMBER}@s.whatsapp.net`) {
        try {
          const xpResult = addXP(sender, Math.floor(Math.random() * 10) + 5);
          if (xpResult.leveledUp) {
            await sock.sendMessage(from, {
              text: `🎉 *@${senderNumber}* leveled up to **Level ${xpResult.newLevel}**!\nKeep chatting to earn more XP!`,
              mentions: [sender],
            }, { quoted: msg });
          }
        } catch {}
      }

      // ──────────────────────────────────────────────────────────────────
      // AFK AUTO-RESPONSE — if a mentioned user is AFK, notify the chat
      // ──────────────────────────────────────────────────────────────────
      const mentioned = getMentionedJids(msg);
      if (mentioned.length > 0) {
        for (const mentionedJid of mentioned) {
          const afkData = getAFK(mentionedJid);
          if (afkData) {
            const afkTime = Math.floor((Date.now() / 1000 - afkData.set_at) / 60);
            const timeStr = afkTime >= 60 ? `${Math.floor(afkTime / 60)}h ${afkTime % 60}m` : `${afkTime}m`;
            const mentionedNum = mentionedJid.split("@")[0];
            await sock.sendMessage(from, {
              text: `🚶 *@${mentionedNum}* is currently AFK.\n\n📝 Reason: ${afkData.reason || "Not set"}\n⏱️ Away for: ${timeStr}`,
              mentions: [mentionedJid],
            }, { quoted: msg });
          }
        }
      }

      // ──────────────────────────────────────────────────────────────────
      // AFK AUTO-CLEAR — if an AFK user sends any message, remove their AFK
      // ──────────────────────────────────────────────────────────────────
      const myAfk = getAFK(sender);
      if (myAfk && command !== ".afk") {
        removeAFK(sender);
        const awayTime = Math.floor((Date.now() / 1000 - myAfk.set_at) / 60);
        const timeStr = awayTime >= 60 ? `${Math.floor(awayTime / 60)}h ${awayTime % 60}m` : `${awayTime}m`;
        await sock.sendMessage(from, {
          text: `👋 Welcome back *@${senderNumber}*!\nYou were away for ${timeStr}.`,
          mentions: [sender],
        }, { quoted: msg });
      }

      // .menu — List all available features
      if (command === ".menu") {
        const menuText = `
╔══════════════════════════════╗
║  *${BOT_NAME}*  ║
╚══════════════════════════════╝

*GENERAL*
• *.menu* — Show this menu
• *.ping* — Check response speed
• *.alive* — Check if bot is online
• *.uptime* — Bot running time
• *.time* — Current date & time
• *.owner* — Show owner info
• *.botinfo* — Show bot details
• *.quote* — Random inspirational quote
• *.joke* — Random joke

*GROUP MANAGEMENT* _(Admin only)_
• *.kick @user* — Remove a member
• *.promote @user* — Make member admin
• *.demote @user* — Remove admin rights
• *.mute* — Only admins can send messages
• *.unmute* — Everyone can send messages
• *.tagall* — Mention all group members
• *.hidetag <text>* — Silent mention all
• *.groupinfo* — Show group details
• *.link* — Get group invite link
• *.revoke* — Reset group invite link
• *.setname <name>* — Change group name
• *.setdesc <text>* — Change group description
• *.antilink on/off* — Auto-delete links
• *.welcome on/off* — Welcome new members

*OWNER TOOLS*
• *.block @user* — Block a user
• *.unblock @user* — Unblock a user
• *.broadcast <text>* — Broadcast a message
• *.setpp* — Set bot profile picture (reply to image) 📸
• *.setabout <text>* — Set bot "about" status 📝
• *.setnamebot <text>* — Set bot display name 📛

*CHANNELS* _(Owner only)_
• *.followchannel <link>* — Follow a channel
• *.unfollowchannel <link>* — Unfollow a channel
• *.channelinfo <link>* — Get channel details
• *.channelsend <jid> <text>* — Post to your channel
• *.mutenotif <link>* — Mute channel notifications
• *.unmutenotif <link>* — Unmute channel notifications

*OWNER ONLY*
• *.eval <code>* — Execute JS code

*UTILITIES*
• *.calc <expression>* — Calculator (e.g. .calc 5+5)
• *.play <song name>* — Search & send YouTube audio 🎵
• *.dl <url>* — Download audio from YouTube URL
• *.sticker* — Convert image to sticker 🏷️
• *.qr <text>* — Generate a QR code 📱
• *.shorten <url>* — Shorten a long URL 🔗
• *.weather <city>* — Get weather info 🌤️
• *.wiki <query>* — Search Wikipedia 📚
• *.tr <text>* — Translate text 🌐
• *.ai <prompt>* — AI assistant chat 🤖
• *.define <word>* — Dictionary definition 📖

*ECONOMY* 💰
• *.balance* — Check your coin balance
• *.daily* — Claim daily reward (100 coins)
• *.weekly* — Claim weekly reward (500 coins)
• *.leaderboard* — Top 10 richest users
• *.gamble <amount>* — Bet your coins (50/50)
• *.transfer @user <amount>* — Send coins to a user

*PROFILE & LEVELING* 📊
• *.profile [@user]* — View your profile card
• *.myname <name>* — Set your display name
• *.setbio <text>* — Set your bio
• *.rank* — Check your XP & level

*AFK SYSTEM* 🚶
• *.afk <reason>* — Set yourself as Away
• *(Auto-responds when you are mentioned while AFK)*

*REMINDERS* ⏰
• *.remind <time> <message>* — Set a reminder (e.g. .remind 10m Check food)

*FUN & GAMES* 🎮
• *.8ball <question>* — Magic 8-Ball 🎱
• *.coinflip* — Heads or tails 🪙
• *.dice* — Roll a dice 🎲
• *.truth* — Random truth question
• *.dare* — Random dare
• *.wyr* — Would you rather
• *.rps <rock|paper|scissors>* — Rock Paper Scissors
• *.pick <option1|option2>* — Bot picks for you
• *.ship @user1 @user2* — Love calculator 💕
• *.fact* — Random fun fact
• *.quote2* — Random motivational quote

*DATABASE* _(Admin/Owner)_
• *.ban @user [reason]* — Ban a user
• *.unban @user* — Unban a user
• *.banlist* — List all banned users
• *.warn @user [reason]* — Warn a user
• *.warns @user* — Check user warnings
• *.clearwarn @user* — Clear warnings
• *.note <name> <text>* — Save a note
• *.getnote <name>* — Get a saved note
• *.delnote <name>* — Delete a note
• *.notes* — List all notes
• *.setreply <trigger>|<reply>* — Custom auto-reply
• *.delreply <trigger>* — Delete auto-reply
• *.replies* — List auto-replies
• *.dbstats* — Database statistics

*MODERATION*
• *.delete* — Delete a message (reply to it)
• *.purge <count>* — Bulk delete (admin)

╔══════════════════════════════╗
║ © ${BOT_NAME}  ║
╚══════════════════════════════╝
`.trim();

        // Try to send menu with image
        // Priority: local menu.jpg file → MENU_IMAGE_URL env variable → text only fallback
        const localMenuImage = path.join(__dirname, "menu.jpg");
        const menuImageUrl = process.env.MENU_IMAGE_URL || null;

        try {
          if (fs.existsSync(localMenuImage)) {
            // Send local image file as menu banner
            await sock.sendMessage(
              from,
              {
                image: fs.readFileSync(localMenuImage),
                caption: menuText,
                mimetype: "image/jpeg",
              },
              { quoted: msg }
            );
          } else if (menuImageUrl) {
            // Send image from URL
            await sock.sendMessage(
              from,
              {
                image: { url: menuImageUrl },
                caption: menuText,
              },
              { quoted: msg }
            );
          } else {
            // Fallback: text only
            await sock.sendMessage(from, { text: menuText }, { quoted: msg });
          }
        } catch (imgErr) {
          // If image send fails, fall back to text
          await sock.sendMessage(from, { text: menuText }, { quoted: msg });
        }
        continue;
      }

      // .ping — Check response speed
      if (command === ".ping") {
        const start = Date.now();
        await sock.sendMessage(from, { text: "Pinging..." }, { quoted: msg });
        const latency = Date.now() - start;
        await sock.sendMessage(from, { text: `🏓 *Kartelo 🇯🇲 Official MD — Pong!*\nResponse time: *${latency}ms*` }, { quoted: msg });
        continue;
      }

      // .alive — Check bot status
      if (command === ".alive") {
        const aliveText = `
╔══════════════════════════════╗
║  *Kartelo 🇯🇲 Official MD*  ║
╚══════════════════════════════╝

✅ *Bot is Online and Active!*

🤖 *Status:* Running
🌐 *Platform:* WhatsApp MD
🇯🇲 *Region:* Jamaica
⚡ *Engine:* Baileys

_Type .menu to see all commands_
        `.trim();
        await sock.sendMessage(from, { text: aliveText }, { quoted: msg });
        continue;
      }

      // .uptime — Show how long bot has been running
      if (command === ".uptime") {
        const ms = Date.now() - BOT_START_TIME;
        const secs = Math.floor(ms / 1000) % 60;
        const mins = Math.floor(ms / 60000) % 60;
        const hrs = Math.floor(ms / 3600000) % 24;
        const days = Math.floor(ms / 86400000);
        await sock.sendMessage(
          from,
          { text: `⏱️ *Kartelo 🇯🇲 Official MD — Uptime*\n\n🗓️ *${days}d ${hrs}h ${mins}m ${secs}s*\n\n_Bot has been running without interruption._` },
          { quoted: msg }
        );
        continue;
      }

      // .time — Show current date and time
      if (command === ".time") {
        const now = new Date();
        const timeStr = now.toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "full", timeStyle: "medium" });
        await sock.sendMessage(
          from,
          { text: `🕐 *Current Time*\n\n📅 ${timeStr}\n🌍 Timezone: Africa/Nairobi (EAT)` },
          { quoted: msg }
        );
        continue;
      }

      // .owner — Show owner info
      if (command === ".owner") {
        const ownerText = `
╔══════════════════════════════╗
║  *BOT OWNER INFO*            ║
╚══════════════════════════════╝

👤 *Owner:* Kartelo
📱 *Number:* +${OWNER_NUMBER}
🌍 *Location:* Kenya 🇰🇪
🤖 *Bot:* Kartelo 🇯🇲 Official MD

_Contact the owner for support._
        `.trim();
        await sock.sendMessage(from, { text: ownerText }, { quoted: msg });
        continue;
      }

      // .botinfo — Show bot information
      if (command === ".botinfo") {
        const botText = `
╔══════════════════════════════╗
║  *BOT INFORMATION*           ║
╚══════════════════════════════╝

🤖 *Name:* Kartelo 🇯🇲 Official MD
📦 *Library:* @whiskeysockets/baileys
🌐 *Platform:* WhatsApp Multi-Device
👤 *Owner:* +${OWNER_NUMBER}
⚡ *Language:* Node.js

*FEATURES:*
✅ Group Management
✅ Channel Support
✅ Anti-Link Protection
✅ Welcome Messages
✅ Media Detection
✅ Owner Tools
        `.trim();
        await sock.sendMessage(from, { text: botText }, { quoted: msg });
        continue;
      }

      // .quote — Random inspirational quote
      if (command === ".quote") {
        const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        await sock.sendMessage(from, { text: `💬 *Quote of the Moment*\n\n${quote}` }, { quoted: msg });
        continue;
      }

      // .joke — Random joke
      if (command === ".joke") {
        const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
        await sock.sendMessage(from, { text: `😂 *Here's a joke for you!*\n\n${joke}` }, { quoted: msg });
        continue;
      }

      // .calc <expression> — Calculator
      if (command === ".calc") {
        const expr = args.join(" ").trim();
        if (!expr) {
          await sock.sendMessage(from, { text: `🧮 *Calculator*\n\nUsage: *.calc <expression>*\n\nExamples:\n• .calc 5 + 5\n• .calc 100 * 12\n• .calc 250 / 5\n• .calc 2 ** 10` }, { quoted: msg });
          continue;
        }
        try {
          // Safe eval — only allow numbers and operators
          const safe = expr.replace(/[^0-9+\-*/.() %^]/g, "").replace(/\^/g, "**");
          if (!safe) throw new Error("Invalid expression");
          // eslint-disable-next-line no-new-func
          const result = Function(`"use strict"; return (${safe})`)();
          if (!isFinite(result)) throw new Error("Result is not finite");
          await sock.sendMessage(from, { text: `🧮 *Calculator*\n\n📥 Input: \`${expr}\`\n📤 Result: *${result}*` }, { quoted: msg });
        } catch {
          await sock.sendMessage(from, { text: `❌ Invalid expression: \`${expr}\`\n\nOnly numbers and + - * / ( ) % ** are allowed.` }, { quoted: msg });
        }
        continue;
      }

      // .block @user — Block a user (Owner only)
      if (command === ".block") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ Only the owner can block users." }, { quoted: msg });
          continue;
        }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) {
          await sock.sendMessage(from, { text: "⚠️ Please mention a user to block.\n\nUsage: *.block @user*" }, { quoted: msg });
          continue;
        }
        for (const user of mentioned) {
          await sock.updateBlockStatus(user, "block");
        }
        await sock.sendMessage(from, { text: `🚫 Successfully blocked ${mentioned.length} user(s).` }, { quoted: msg });
        continue;
      }

      // .unblock @user — Unblock a user (Owner only)
      if (command === ".unblock") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ Only the owner can unblock users." }, { quoted: msg });
          continue;
        }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) {
          await sock.sendMessage(from, { text: "⚠️ Please mention a user to unblock.\n\nUsage: *.unblock @user*" }, { quoted: msg });
          continue;
        }
        for (const user of mentioned) {
          await sock.updateBlockStatus(user, "unblock");
        }
        await sock.sendMessage(from, { text: `✅ Successfully unblocked ${mentioned.length} user(s).` }, { quoted: msg });
        continue;
      }

      // .broadcast <text> — Send message to all chats (Owner only)
      if (command === ".broadcast") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ Only the owner can broadcast messages." }, { quoted: msg });
          continue;
        }
        const broadcastMsg = args.join(" ");
        if (!broadcastMsg) {
          await sock.sendMessage(from, { text: "⚠️ Please provide a message.\n\nUsage: *.broadcast <message>*" }, { quoted: msg });
          continue;
        }
        const chats = store.chats.all();
        let sent = 0;
        const broadcastText = `📢 *Broadcast from Kartelo 🇯🇲 Official MD*\n\n${broadcastMsg}`;
        for (const chat of chats) {
          try {
            await sock.sendMessage(chat.id, { text: broadcastText });
            sent++;
            await new Promise((r) => setTimeout(r, 500)); // delay to avoid spam ban
          } catch {}
        }
        await sock.sendMessage(from, { text: `✅ Broadcast sent to *${sent}* chats.` }, { quoted: msg });
        continue;
      }

      // .eval — Execute JavaScript (OWNER ONLY)
      if (command === ".eval") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ This command is restricted to the bot owner." }, { quoted: msg });
          continue;
        }

        const code = args.join(" ");
        if (!code) {
          await sock.sendMessage(from, { text: "⚠️ Please provide code to execute.\n\nUsage: *.eval <js code>*" }, { quoted: msg });
          continue;
        }

        try {
          // eslint-disable-next-line no-eval
          let result = eval(code);
          if (result && typeof result.then === "function") result = await result;
          const output = typeof result === "object" ? JSON.stringify(result, null, 2) : String(result);
          await sock.sendMessage(from, { text: `📤 *Output:*\n\`\`\`\n${output}\n\`\`\`` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ *Error:*\n\`\`\`\n${err.message}\n\`\`\`` }, { quoted: msg });
        }
        continue;
      }

      // .setpp — Set bot profile picture (OWNER ONLY, reply to an image)
      if (command === ".setpp") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ This command is restricted to the bot owner." }, { quoted: msg });
          continue;
        }
        const isImage = msg.message?.imageMessage || (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage);
        if (!isImage) {
          await sock.sendMessage(from, { text: "📸 Reply to an image with *.setpp* to set it as the bot's profile picture." }, { quoted: msg });
          continue;
        }
        try {
          let imgMsg = msg.message?.imageMessage;
          if (!imgMsg) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo;
            imgMsg = quoted?.quotedMessage?.imageMessage;
          }
          if (imgMsg?.url) {
            const stream = await require("@whiskeysockets/baileys").downloadContentFromMessage(imgMsg, "image");
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const imgBuffer = Buffer.concat(chunks);
            // Save to file for persistence across restarts
            fs.writeFileSync(path.join(__dirname, "profile-pic.jpg"), imgBuffer);
            // Update WhatsApp profile picture
            await sock.updateProfilePicture(sock.user.id, imgBuffer);
            await sock.sendMessage(from, { text: "✅ Bot profile picture updated successfully!" }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { text: "❌ Could not process the image." }, { quoted: msg });
          }
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Profile picture error: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .setabout <text> — Set bot "about" status (OWNER ONLY)
      if (command === ".setabout") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ This command is restricted to the bot owner." }, { quoted: msg });
          continue;
        }
        const aboutText = args.join(" ");
        if (!aboutText) {
          await sock.sendMessage(from, { text: "📝 Usage: *.setabout <status text>*\n\nExample: *.setabout 🤖 Kartelo MD — Your WhatsApp assistant*" }, { quoted: msg });
          continue;
        }
        try {
          await sock.updateProfileStatus(aboutText.substring(0, 139));
          await sock.sendMessage(from, { text: `✅ Bot "about" status updated to:\n\n${aboutText.substring(0, 139)}` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Could not update status: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .setnamebot <text> — Set bot display name (OWNER ONLY)
      if (command === ".setnamebot") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ This command is restricted to the bot owner." }, { quoted: msg });
          continue;
        }
        const botName = args.join(" ");
        if (!botName) {
          await sock.sendMessage(from, { text: "📛 Usage: *.setnamebot <display name>*\n\nExample: *.setnamebot Kartelo 🇰🇪 MD*" }, { quoted: msg });
          continue;
        }
        try {
          await sock.updateProfileName(botName.substring(0, 25));
          await sock.sendMessage(from, { text: `✅ Bot display name updated to: *${botName.substring(0, 25)}*` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Could not update name: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .dl — Media downloader (placeholder)
      // .play <song name> — Search YouTube and send audio
      if (command === ".play") {
        const query = args.join(" ").trim();
        if (!query) {
          await sock.sendMessage(from, { text: `🎵 *Music Player*\n\nUsage: *.play <song name>*\n\nExamples:\n• .play shape of you\n• .play rema calm down\n• .play taarab bongo flava` }, { quoted: msg });
          continue;
        }
        await sock.sendMessage(from, { text: `🔍 Searching for: *${query}*...` }, { quoted: msg });
        try {
          const results = await ytSearch(query);
          const video = results.videos[0];
          if (!video) {
            await sock.sendMessage(from, { text: `❌ No results found for: *${query}*` }, { quoted: msg });
            continue;
          }
          // Duration guard — skip videos longer than 10 minutes
          if (video.seconds > 600) {
            await sock.sendMessage(from, { text: `⚠️ *${video.title}* is too long (${video.timestamp}).\n\nMax allowed: 10 minutes.\n\nTry a more specific song name.` }, { quoted: msg });
            continue;
          }
          await sock.sendMessage(from, { text: `⬇️ Downloading: *${video.title}*\n⏱️ Duration: ${video.timestamp}\n👁️ Views: ${video.views?.toLocaleString() || "N/A"}` }, { quoted: msg });
          // Stream audio from YouTube
          const stream = ytdl(video.url, { filter: "audioonly", quality: "highestaudio" });
          const chunks = [];
          await new Promise((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("end", resolve);
            stream.on("error", reject);
          });
          const buffer = Buffer.concat(chunks);
          await sock.sendMessage(from, {
            audio: buffer,
            mimetype: "audio/mpeg",
            pttAudioIsMuted: false,
          }, { quoted: msg });
        } catch (e) {
          console.error(".play error:", e.message);
          await sock.sendMessage(from, { text: `❌ Failed to download audio.\n\nError: ${e.message}\n\nTry a different song or use *.dl <youtube-url>* instead.` }, { quoted: msg });
        }
        continue;
      }

      if (command === ".dl") {
        const url = args[0] || "";

        if (!url) {
          await sock.sendMessage(from, { text: "⚠️ Please provide a YouTube URL.\n\nUsage: *.dl <url>*\n\nTo search by name, use *.play <song name>*" }, { quoted: msg });
          continue;
        }

        const isYouTube = /youtube\.com|youtu\.be/i.test(url);

        if (isYouTube) {
          try {
            const info = await ytdl.getBasicInfo(url);
            const title = info.videoDetails.title;
            const duration = Math.floor(Number(info.videoDetails.lengthSeconds));
            if (duration > 600) {
              await sock.sendMessage(from, { text: `⚠️ Video too long (${Math.floor(duration / 60)}m ${duration % 60}s). Max 10 minutes.` }, { quoted: msg });
              continue;
            }
            await sock.sendMessage(from, { text: `⬇️ Downloading: *${title}*` }, { quoted: msg });
            const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
            const chunks = [];
            await new Promise((resolve, reject) => {
              stream.on("data", (c) => chunks.push(c));
              stream.on("end", resolve);
              stream.on("error", reject);
            });
            const buffer = Buffer.concat(chunks);
            await sock.sendMessage(from, { audio: buffer, mimetype: "audio/mpeg" }, { quoted: msg });
          } catch (e) {
            console.error(".dl error:", e.message);
            await sock.sendMessage(from, { text: `❌ Download failed: ${e.message}` }, { quoted: msg });
          }
        } else {
          await sock.sendMessage(from, { text: `❓ Only YouTube URLs are supported.\n\nTo search by song name, use *.play <song name>*` }, { quoted: msg });
        }
        continue;
      }

      // ─────────────────────────────
      // DATABASE COMMANDS
      // ─────────────────────────────

      // .ban @user [reason] — Ban a user (owner/admin only)
      if (command === ".ban") {
        if (!isOwner && !isAdmin) {
          await sock.sendMessage(from, { text: "❌ Only admins can ban users." }, { quoted: msg });
          continue;
        }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!mentioned) {
          await sock.sendMessage(from, { text: "⚠️ Please mention a user.\nUsage: *.ban @user [reason]*" }, { quoted: msg });
          continue;
        }
        const reason = args.slice(1).join(" ") || "No reason given";
        banUser(mentioned, reason, sender);
        await sock.sendMessage(from, { text: `🔨 *@${mentioned.split("@")[0]}* has been banned.\n📋 Reason: ${reason}`, mentions: [mentioned] }, { quoted: msg });
        continue;
      }

      // .unban @user — Unban a user (owner/admin only)
      if (command === ".unban") {
        if (!isOwner && !isAdmin) {
          await sock.sendMessage(from, { text: "❌ Only admins can unban users." }, { quoted: msg });
          continue;
        }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!mentioned) {
          await sock.sendMessage(from, { text: "⚠️ Please mention a user.\nUsage: *.unban @user*" }, { quoted: msg });
          continue;
        }
        unbanUser(mentioned);
        await sock.sendMessage(from, { text: `✅ *@${mentioned.split("@")[0]}* has been unbanned.`, mentions: [mentioned] }, { quoted: msg });
        continue;
      }

      // .banlist — List all banned users (owner only)
      if (command === ".banlist") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "❌ Owner only command." }, { quoted: msg });
          continue;
        }
        const banned = getBannedUsers();
        if (!banned.length) {
          await sock.sendMessage(from, { text: "✅ No banned users." }, { quoted: msg });
          continue;
        }
        const list = banned.map((b, i) => `${i + 1}. +${b.jid.split("@")[0]} — ${b.reason}`).join("\n");
        await sock.sendMessage(from, { text: `🔨 *Banned Users (${banned.length})*\n\n${list}` }, { quoted: msg });
        continue;
      }

      // .warn @user [reason] — Warn a user (admin only)
      if (command === ".warn") {
        if (!isGroup) { await sock.sendMessage(from, { text: "❌ Group only command." }, { quoted: msg }); continue; }
        if (!isOwner && !isAdmin) { await sock.sendMessage(from, { text: "❌ Admins only." }, { quoted: msg }); continue; }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!mentioned) { await sock.sendMessage(from, { text: "⚠️ Mention a user: *.warn @user [reason]*" }, { quoted: msg }); continue; }
        const reason = args.slice(1).join(" ") || "No reason given";
        warnUser(mentioned, from, reason, sender);
        const count = getWarnCount(mentioned, from);
        await sock.sendMessage(from, { text: `⚠️ *@${mentioned.split("@")[0]}* has been warned.\n📋 Reason: ${reason}\n🔢 Total warnings: *${count}*\n\n_At 3 warnings, consider removing the user._`, mentions: [mentioned] }, { quoted: msg });
        continue;
      }

      // .warns @user — Check warnings for a user
      if (command === ".warns") {
        if (!isGroup) { await sock.sendMessage(from, { text: "❌ Group only command." }, { quoted: msg }); continue; }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!mentioned) { await sock.sendMessage(from, { text: "⚠️ Mention a user: *.warns @user*" }, { quoted: msg }); continue; }
        const warns = getWarnings(mentioned, from);
        if (!warns.length) { await sock.sendMessage(from, { text: `✅ *@${mentioned.split("@")[0]}* has no warnings.`, mentions: [mentioned] }, { quoted: msg }); continue; }
        const list = warns.map((w, i) => `${i + 1}. ${w.reason}`).join("\n");
        await sock.sendMessage(from, { text: `⚠️ *Warnings for @${mentioned.split("@")[0]}* (${warns.length})\n\n${list}`, mentions: [mentioned] }, { quoted: msg });
        continue;
      }

      // .clearwarn @user — Clear all warnings for a user (admin only)
      if (command === ".clearwarn") {
        if (!isOwner && !isAdmin) { await sock.sendMessage(from, { text: "❌ Admins only." }, { quoted: msg }); continue; }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!mentioned) { await sock.sendMessage(from, { text: "⚠️ Mention a user: *.clearwarn @user*" }, { quoted: msg }); continue; }
        clearWarnings(mentioned, from);
        await sock.sendMessage(from, { text: `✅ All warnings cleared for *@${mentioned.split("@")[0]}*`, mentions: [mentioned] }, { quoted: msg });
        continue;
      }

      // .note <name> <content> — Save a note
      if (command === ".note") {
        const name = args[0];
        const content = args.slice(1).join(" ");
        if (!name || !content) { await sock.sendMessage(from, { text: "⚠️ Usage: *.note <name> <content>*" }, { quoted: msg }); continue; }
        saveNote(name, content, isGroup ? from : null, sender);
        await sock.sendMessage(from, { text: `📝 Note *${name}* saved!\nGet it with: *.getnote ${name}*` }, { quoted: msg });
        continue;
      }

      // .getnote <name> — Retrieve a note
      if (command === ".getnote") {
        const name = args[0];
        if (!name) { await sock.sendMessage(from, { text: "⚠️ Usage: *.getnote <name>*" }, { quoted: msg }); continue; }
        const note = getNote(name, isGroup ? from : null);
        if (!note) { await sock.sendMessage(from, { text: `❌ No note found with name *${name}*` }, { quoted: msg }); continue; }
        await sock.sendMessage(from, { text: `📝 *${note.name}*\n\n${note.content}` }, { quoted: msg });
        continue;
      }

      // .delnote <name> — Delete a note (admin only)
      if (command === ".delnote") {
        if (!isOwner && !isAdmin) { await sock.sendMessage(from, { text: "❌ Admins only." }, { quoted: msg }); continue; }
        const name = args[0];
        if (!name) { await sock.sendMessage(from, { text: "⚠️ Usage: *.delnote <name>*" }, { quoted: msg }); continue; }
        deleteNote(name, isGroup ? from : null);
        await sock.sendMessage(from, { text: `🗑️ Note *${name}* deleted.` }, { quoted: msg });
        continue;
      }

      // .notes — List all saved notes
      if (command === ".notes") {
        const notes = listNotes(isGroup ? from : null);
        if (!notes.length) { await sock.sendMessage(from, { text: "📝 No notes saved yet." }, { quoted: msg }); continue; }
        const list = notes.map((n, i) => `${i + 1}. *${n.name}*`).join("\n");
        await sock.sendMessage(from, { text: `📝 *Saved Notes (${notes.length})*\n\n${list}\n\nUse *.getnote <name>* to retrieve.` }, { quoted: msg });
        continue;
      }

      // .setreply <trigger> | <response> — Add custom auto-reply (owner only)
      if (command === ".setreply") {
        if (!isOwner) { await sock.sendMessage(from, { text: "❌ Owner only command." }, { quoted: msg }); continue; }
        const parts = args.join(" ").split("|");
        if (parts.length < 2) { await sock.sendMessage(from, { text: "⚠️ Usage: *.setreply <trigger> | <response>*\nExample: *.setreply hello | Hi there! 👋*" }, { quoted: msg }); continue; }
        const trigger = parts[0].trim();
        const response = parts[1].trim();
        setReply(trigger, response, sender);
        await sock.sendMessage(from, { text: `✅ Auto-reply set!\n🔑 Trigger: *${trigger}*\n💬 Response: ${response}` }, { quoted: msg });
        continue;
      }

      // .delreply <trigger> — Delete a custom auto-reply (owner only)
      if (command === ".delreply") {
        if (!isOwner) { await sock.sendMessage(from, { text: "❌ Owner only command." }, { quoted: msg }); continue; }
        const trigger = args.join(" ");
        if (!trigger) { await sock.sendMessage(from, { text: "⚠️ Usage: *.delreply <trigger>*" }, { quoted: msg }); continue; }
        deleteReply(trigger);
        await sock.sendMessage(from, { text: `🗑️ Auto-reply for *${trigger}* deleted.` }, { quoted: msg });
        continue;
      }

      // .replies — List all custom auto-replies (owner only)
      if (command === ".replies") {
        if (!isOwner) { await sock.sendMessage(from, { text: "❌ Owner only command." }, { quoted: msg }); continue; }
        const replies = listReplies();
        if (!replies.length) { await sock.sendMessage(from, { text: "📋 No custom auto-replies set yet." }, { quoted: msg }); continue; }
        const list = replies.map((r, i) => `${i + 1}. *${r.trigger}* → ${r.response}`).join("\n");
        await sock.sendMessage(from, { text: `📋 *Custom Auto-Replies (${replies.length})*\n\n${list}` }, { quoted: msg });
        continue;
      }

      // .dbstats — Show database statistics (owner only)
      if (command === ".dbstats") {
        if (!isOwner) { await sock.sendMessage(from, { text: "❌ Owner only command." }, { quoted: msg }); continue; }
        const stats = getDbStats();
        const top = getCommandStats().map((c, i) => `${i + 1}. ${c.command} (${c.count}x)`).join("\n");
        await sock.sendMessage(from, {
          text: `📊 *Database Statistics*\n\n` +
            `🔨 Banned users: *${stats.banned}*\n` +
            `⚠️ Warnings: *${stats.warnings}*\n` +
            `📝 Notes: *${stats.notes}*\n` +
            `💬 Custom replies: *${stats.replies}*\n` +
            `👥 Groups tracked: *${stats.groups}*\n` +
            `🤖 Total commands: *${stats.commands}*\n\n` +
            `*Top Commands:*\n${top || "None yet"}`
        }, { quoted: msg });
        continue;
      }

      // ─────────────────────────────
      // CHANNEL COMMANDS (Owner only)
      // ─────────────────────────────

      // .channelinfo <link> — Get info about a WhatsApp channel
      if (command === ".channelinfo") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ Only the owner can use channel commands." }, { quoted: msg });
          continue;
        }
        const link = args[0] || "";
        const jid = extractNewsletterJid(link);
        if (!jid) {
          await sock.sendMessage(from, { text: "⚠️ Please provide a valid channel link.\n\nUsage: *.channelinfo <link>*" }, { quoted: msg });
          continue;
        }
        try {
          const meta = await sock.newsletterMetadata("jid", jid);
          const infoText = `
╔══════════════════════════════╗
║  *CHANNEL INFO*              ║
╚══════════════════════════════╝

📢 *Name:* ${meta.name || "Unknown"}
📝 *Description:* ${meta.description || "No description"}
👥 *Subscribers:* ${meta.subscriberCount ?? "N/A"}
🆔 *JID:* ${meta.id}
✅ *Verified:* ${meta.verification === "VERIFIED" ? "Yes" : "No"}
          `.trim();
          await sock.sendMessage(from, { text: infoText }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Could not fetch channel info.\n\n_${err.message}_` }, { quoted: msg });
        }
        continue;
      }

      // .followchannel <link> — Follow a WhatsApp channel
      if (command === ".followchannel") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ Only the owner can use channel commands." }, { quoted: msg });
          continue;
        }
        const link = args[0] || "";
        const jid = extractNewsletterJid(link);
        if (!jid) {
          await sock.sendMessage(from, { text: "⚠️ Please provide a valid channel link.\n\nUsage: *.followchannel <link>*" }, { quoted: msg });
          continue;
        }
        try {
          await sock.newsletterFollow(jid);
          await sock.sendMessage(from, { text: `✅ Successfully followed the channel!\n\n🆔 JID: ${jid}` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Failed to follow channel.\n\n_${err.message}_` }, { quoted: msg });
        }
        continue;
      }

      // .unfollowchannel <link> — Unfollow a WhatsApp channel
      if (command === ".unfollowchannel") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ Only the owner can use channel commands." }, { quoted: msg });
          continue;
        }
        const link = args[0] || "";
        const jid = extractNewsletterJid(link);
        if (!jid) {
          await sock.sendMessage(from, { text: "⚠️ Please provide a valid channel link.\n\nUsage: *.unfollowchannel <link>*" }, { quoted: msg });
          continue;
        }
        try {
          await sock.newsletterUnfollow(jid);
          await sock.sendMessage(from, { text: `✅ Successfully unfollowed the channel.\n\n🆔 JID: ${jid}` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Failed to unfollow channel.\n\n_${err.message}_` }, { quoted: msg });
        }
        continue;
      }

      // .mutenotif <link> — Mute channel notifications
      if (command === ".mutenotif") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ Only the owner can use channel commands." }, { quoted: msg });
          continue;
        }
        const link = args[0] || "";
        const jid = extractNewsletterJid(link);
        if (!jid) {
          await sock.sendMessage(from, { text: "⚠️ Please provide a valid channel link.\n\nUsage: *.mutenotif <link>*" }, { quoted: msg });
          continue;
        }
        try {
          await sock.newsletterMute(jid);
          await sock.sendMessage(from, { text: `🔇 Channel notifications muted.\n\n🆔 JID: ${jid}` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Failed to mute channel.\n\n_${err.message}_` }, { quoted: msg });
        }
        continue;
      }

      // .unmutenotif <link> — Unmute channel notifications
      if (command === ".unmutenotif") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ Only the owner can use channel commands." }, { quoted: msg });
          continue;
        }
        const link = args[0] || "";
        const jid = extractNewsletterJid(link);
        if (!jid) {
          await sock.sendMessage(from, { text: "⚠️ Please provide a valid channel link.\n\nUsage: *.unmutenotif <link>*" }, { quoted: msg });
          continue;
        }
        try {
          await sock.newsletterUnmute(jid);
          await sock.sendMessage(from, { text: `🔊 Channel notifications unmuted.\n\n🆔 JID: ${jid}` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Failed to unmute channel.\n\n_${err.message}_` }, { quoted: msg });
        }
        continue;
      }

      // .channelsend <jid> <message> — Send a message to a channel you own/admin
      if (command === ".channelsend") {
        if (!isOwner) {
          await sock.sendMessage(from, { text: "⛔ Only the owner can use channel commands." }, { quoted: msg });
          continue;
        }
        const channelJid = args[0] || "";
        const channelMsg = args.slice(1).join(" ");
        if (!channelJid || !channelMsg) {
          await sock.sendMessage(
            from,
            { text: "⚠️ Usage: *.channelsend <jid> <message>*\n\nExample:\n*.channelsend 0029Va...@newsletter Hello everyone!*" },
            { quoted: msg }
          );
          continue;
        }
        const jid = extractNewsletterJid(channelJid);
        if (!jid) {
          await sock.sendMessage(from, { text: "❌ Invalid channel JID format." }, { quoted: msg });
          continue;
        }
        try {
          await sock.sendMessage(jid, { text: channelMsg });
          await sock.sendMessage(from, { text: `✅ Message sent to channel successfully!\n\n📢 _"${channelMsg}"_` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Failed to send to channel.\n\n_${err.message}_` }, { quoted: msg });
        }
        continue;
      }

      // ─────────────────────────────
      // GROUP COMMANDS (Groups only)
      // ─────────────────────────────

      // Guard: all group commands require being in a group
      if (
        [".kick", ".promote", ".demote", ".mute", ".unmute", ".tagall", ".groupinfo", ".antilink", ".welcome"].includes(command)
      ) {
        if (!isGroup) {
          await sock.sendMessage(from, { text: "❌ This command can only be used in a group." }, { quoted: msg });
          continue;
        }
      }

      // .groupinfo — Show group name, description, members count
      if (command === ".groupinfo") {
        const meta = groupMeta;
        if (!meta) {
          await sock.sendMessage(from, { text: "❌ Could not fetch group info." }, { quoted: msg });
          continue;
        }
        const adminList = meta.participants.filter((p) => p.admin).map((p) => `• @${p.id.replace("@s.whatsapp.net", "")}`).join("\n");
        const infoText = `
╔══════════════════════════════╗
║  *GROUP INFO*                ║
╚══════════════════════════════╝

📌 *Name:* ${meta.subject}
👥 *Members:* ${meta.participants.length}
📝 *Description:* ${meta.desc || "No description"}
🆔 *Group ID:* ${from}
👑 *Admins:*
${adminList || "None"}
        `.trim();
        await sock.sendMessage(from, { text: infoText, mentions: meta.participants.filter((p) => p.admin).map((p) => p.id) }, { quoted: msg });
        continue;
      }

      // .tagall — Mention every group member
      if (command === ".tagall") {
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.tagall*." }, { quoted: msg });
          continue;
        }
        const members = groupMeta.participants.map((p) => p.id);
        const tagText = (args.join(" ") || "📢 *Attention everyone!*") + "\n\n" + members.map((m) => `@${m.replace("@s.whatsapp.net", "")}`).join(" ");
        await sock.sendMessage(from, { text: tagText, mentions: members }, { quoted: msg });
        continue;
      }

      // .kick @user — Remove a member
      if (command === ".kick") {
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.kick*." }, { quoted: msg });
          continue;
        }
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⚠️ I need to be an admin to kick members." }, { quoted: msg });
          continue;
        }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) {
          await sock.sendMessage(from, { text: "⚠️ Please mention a user to kick.\n\nUsage: *.kick @user*" }, { quoted: msg });
          continue;
        }
        for (const user of mentioned) {
          await sock.groupParticipantsUpdate(from, [user], "remove");
        }
        await sock.sendMessage(from, { text: `✅ Successfully kicked ${mentioned.length} member(s).` }, { quoted: msg });
        continue;
      }

      // .promote @user — Make a member admin
      if (command === ".promote") {
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.promote*." }, { quoted: msg });
          continue;
        }
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⚠️ I need to be an admin to promote members." }, { quoted: msg });
          continue;
        }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) {
          await sock.sendMessage(from, { text: "⚠️ Please mention a user to promote.\n\nUsage: *.promote @user*" }, { quoted: msg });
          continue;
        }
        for (const user of mentioned) {
          await sock.groupParticipantsUpdate(from, [user], "promote");
        }
        await sock.sendMessage(
          from,
          { text: `👑 Promoted ${mentioned.map((u) => `@${u.replace("@s.whatsapp.net", "")}`).join(", ")} to admin!`, mentions: mentioned },
          { quoted: msg }
        );
        continue;
      }

      // .demote @user — Remove admin rights
      if (command === ".demote") {
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.demote*." }, { quoted: msg });
          continue;
        }
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⚠️ I need to be an admin to demote members." }, { quoted: msg });
          continue;
        }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) {
          await sock.sendMessage(from, { text: "⚠️ Please mention a user to demote.\n\nUsage: *.demote @user*" }, { quoted: msg });
          continue;
        }
        for (const user of mentioned) {
          await sock.groupParticipantsUpdate(from, [user], "demote");
        }
        await sock.sendMessage(
          from,
          { text: `🔻 Demoted ${mentioned.map((u) => `@${u.replace("@s.whatsapp.net", "")}`).join(", ")} from admin.`, mentions: mentioned },
          { quoted: msg }
        );
        continue;
      }

      // .mute — Only admins can send messages
      if (command === ".mute") {
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.mute*." }, { quoted: msg });
          continue;
        }
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⚠️ I need to be an admin to mute the group." }, { quoted: msg });
          continue;
        }
        await sock.groupSettingUpdate(from, "announcement");
        await sock.sendMessage(from, { text: "🔇 Group muted. Only admins can send messages now." }, { quoted: msg });
        continue;
      }

      // .unmute — Everyone can send messages
      if (command === ".unmute") {
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.unmute*." }, { quoted: msg });
          continue;
        }
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⚠️ I need to be an admin to unmute the group." }, { quoted: msg });
          continue;
        }
        await sock.groupSettingUpdate(from, "not_announcement");
        await sock.sendMessage(from, { text: "🔊 Group unmuted. Everyone can send messages now." }, { quoted: msg });
        continue;
      }

      // .antilink on/off — Auto-delete messages containing links
      if (command === ".antilink") {
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.antilink*." }, { quoted: msg });
          continue;
        }
        const option = args[0]?.toLowerCase();
        if (!["on", "off"].includes(option)) {
          await sock.sendMessage(from, { text: "⚠️ Usage: *.antilink on* or *.antilink off*" }, { quoted: msg });
          continue;
        }
        if (!groupSettings[from]) groupSettings[from] = {};
        groupSettings[from].antilink = option === "on";
        await sock.sendMessage(
          from,
          { text: `🔗 Anti-link is now *${option.toUpperCase()}*.${option === "on" ? "\n\nAny links sent by non-admins will be deleted." : ""}` },
          { quoted: msg }
        );
        continue;
      }

      // .welcome on/off — Send welcome message when new members join
      if (command === ".welcome") {
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.welcome*." }, { quoted: msg });
          continue;
        }
        const option = args[0]?.toLowerCase();
        if (!["on", "off"].includes(option)) {
          await sock.sendMessage(from, { text: "⚠️ Usage: *.welcome on* or *.welcome off*" }, { quoted: msg });
          continue;
        }
        if (!groupSettings[from]) groupSettings[from] = {};
        groupSettings[from].welcome = option === "on";
        await sock.sendMessage(
          from,
          { text: `👋 Welcome messages are now *${option.toUpperCase()}*.` },
          { quoted: msg }
        );
        continue;
      }

      // .hidetag <text> — Mention all members silently (no visible @names)
      if (command === ".hidetag") {
        if (!isGroup) {
          await sock.sendMessage(from, { text: "❌ This command can only be used in a group." }, { quoted: msg });
          continue;
        }
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.hidetag*." }, { quoted: msg });
          continue;
        }
        const members = groupMeta.participants.map((p) => p.id);
        const hideText = args.join(" ") || "📢 *Attention!*";
        await sock.sendMessage(from, { text: hideText, mentions: members }, { quoted: msg });
        continue;
      }

      // .link — Get group invite link
      if (command === ".link") {
        if (!isGroup) {
          await sock.sendMessage(from, { text: "❌ This command can only be used in a group." }, { quoted: msg });
          continue;
        }
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.link*." }, { quoted: msg });
          continue;
        }
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⚠️ I need to be an admin to get the invite link." }, { quoted: msg });
          continue;
        }
        try {
          const code = await sock.groupInviteCode(from);
          await sock.sendMessage(
            from,
            { text: `🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}` },
            { quoted: msg }
          );
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Could not get invite link.\n\n_${err.message}_` }, { quoted: msg });
        }
        continue;
      }

      // .revoke — Reset and revoke group invite link
      if (command === ".revoke") {
        if (!isGroup) {
          await sock.sendMessage(from, { text: "❌ This command can only be used in a group." }, { quoted: msg });
          continue;
        }
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.revoke*." }, { quoted: msg });
          continue;
        }
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⚠️ I need to be an admin to revoke the link." }, { quoted: msg });
          continue;
        }
        try {
          await sock.groupRevokeInvite(from);
          const newCode = await sock.groupInviteCode(from);
          await sock.sendMessage(
            from,
            { text: `♻️ *Group link revoked!*\n\n🔗 New link:\nhttps://chat.whatsapp.com/${newCode}` },
            { quoted: msg }
          );
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Could not revoke link.\n\n_${err.message}_` }, { quoted: msg });
        }
        continue;
      }

      // .setname <name> — Change group name
      if (command === ".setname") {
        if (!isGroup) {
          await sock.sendMessage(from, { text: "❌ This command can only be used in a group." }, { quoted: msg });
          continue;
        }
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.setname*." }, { quoted: msg });
          continue;
        }
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⚠️ I need to be an admin to change the group name." }, { quoted: msg });
          continue;
        }
        const newName = args.join(" ");
        if (!newName) {
          await sock.sendMessage(from, { text: "⚠️ Please provide a name.\n\nUsage: *.setname My Group Name*" }, { quoted: msg });
          continue;
        }
        try {
          await sock.groupUpdateSubject(from, newName);
          await sock.sendMessage(from, { text: `✅ Group name changed to *${newName}*` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Could not change group name.\n\n_${err.message}_` }, { quoted: msg });
        }
        continue;
      }

      // .setdesc <text> — Change group description
      if (command === ".setdesc") {
        if (!isGroup) {
          await sock.sendMessage(from, { text: "❌ This command can only be used in a group." }, { quoted: msg });
          continue;
        }
        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: "⛔ Only admins can use *.setdesc*." }, { quoted: msg });
          continue;
        }
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⚠️ I need to be an admin to change the description." }, { quoted: msg });
          continue;
        }
        const newDesc = args.join(" ");
        if (!newDesc) {
          await sock.sendMessage(from, { text: "⚠️ Please provide a description.\n\nUsage: *.setdesc New description here*" }, { quoted: msg });
          continue;
        }
        try {
          await sock.groupUpdateDescription(from, newDesc);
          await sock.sendMessage(from, { text: `✅ Group description updated!` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Could not update description.\n\n_${err.message}_` }, { quoted: msg });
        }
        continue;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // NEW COMMANDS — Sticker, QR, Weather, Wiki, Translate, AI, Dictionary,
      //                URL Shortener, Economy, AFK, Reminders, Profile, Fun Games
      // ═══════════════════════════════════════════════════════════════════════

      // .sticker — Convert replied image to a WhatsApp sticker
      if (command === ".sticker" || command === ".s") {
        const isImage = msg.message?.imageMessage || (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage);
        if (!isImage) {
          await sock.sendMessage(from, { text: "🏷️ Reply to an image with *.sticker* to convert it to a sticker." }, { quoted: msg });
          continue;
        }
        try {
          let imgBuffer;
          let imgMsg = msg.message?.imageMessage;
          if (!imgMsg) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo;
            imgMsg = quoted?.quotedMessage?.imageMessage;
          }
          if (imgMsg?.url) {
            const stream = await require("@whiskeysockets/baileys").downloadContentFromMessage(imgMsg, "image");
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            imgBuffer = Buffer.concat(chunks);
          }
          if (imgBuffer) {
            await sock.sendMessage(from, { sticker: imgBuffer }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { text: "❌ Could not process the image." }, { quoted: msg });
          }
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Sticker error: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .qr <text> — Generate a QR code from text
      if (command === ".qr") {
        const qrText = args.join(" ");
        if (!qrText) {
          await sock.sendMessage(from, { text: "📱 Usage: *.qr <text or URL>*\n\nExample: *.qr https://wa.me/254711939375*" }, { quoted: msg });
          continue;
        }
        try {
          const qrBuffer = await QRCode.toBuffer(qrText, { width: 300, margin: 2 });
          await sock.sendMessage(from, { image: qrBuffer, caption: `📱 QR code for:\n${qrText}` }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ QR generation failed: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .shorten <url> — Shorten a URL using is.gd free API
      if (command === ".shorten") {
        let url = args[0];
        if (!url) {
          await sock.sendMessage(from, { text: "🔗 Usage: *.shorten <url>*\n\nExample: *.shorten https://example.com*" }, { quoted: msg });
          continue;
        }
        if (!url.startsWith("http")) url = "https://" + url;
        try {
          const apiUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`;
          const { body } = await httpGet(apiUrl);
          if (body && body.startsWith("http")) {
            await sock.sendMessage(from, { text: `🔗 *Shortened URL:*\n${body}` }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { text: `❌ Could not shorten URL.\n${body}` }, { quoted: msg });
          }
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .weather <city> — Get current weather using Open-Meteo (no API key needed)
      if (command === ".weather") {
        const city = args.join(" ");
        if (!city) {
          await sock.sendMessage(from, { text: "🌤️ Usage: *.weather <city>*\n\nExample: *.weather Nairobi*" }, { quoted: msg });
          continue;
        }
        try {
          // Step 1: Geocode the city name
          const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
          const geoRes = await httpGet(geoUrl);
          const geoData = JSON.parse(geoRes.body);
          if (!geoData.results || geoData.results.length === 0) {
            await sock.sendMessage(from, { text: `❌ City "${city}" not found.` }, { quoted: msg });
            continue;
          }
          const { latitude, longitude, name, country, admin1 } = geoData.results[0];
          // Step 2: Get weather
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
          const wRes = await httpGet(weatherUrl);
          const w = JSON.parse(wRes.body).current;
          const weatherMap = { 0: "Clear sky ☀️", 1: "Mainly clear 🌤️", 2: "Partly cloudy ⛅", 3: "Overcast ☁️", 45: "Foggy 🌫️", 48: "Rime fog 🌫️", 51: "Light drizzle 🌦️", 53: "Drizzle 🌦️", 55: "Heavy drizzle 🌦️", 61: "Slight rain 🌧️", 63: "Rain 🌧️", 65: "Heavy rain 🌧️", 71: "Slight snow 🌨️", 73: "Snow 🌨️", 75: "Heavy snow 🌨️", 80: "Rain showers 🌦️", 81: "Rain showers 🌦️", 82: "Violent rain showers ⛈️", 95: "Thunderstorm ⛈️", 96: "Thunderstorm with hail ⛈️", 99: "Severe thunderstorm ⛈️" };
          const desc = weatherMap[w.weather_code] || "Unknown";
          const weatherText = `🌤️ *Weather — ${name}, ${admin1 || ""} ${country}*\n\n🌡️ Temperature: ${w.temperature_2m}°C (feels like ${w.apparent_temperature}°C)\n💧 Humidity: ${w.relative_humidity_2m}%\n💨 Wind: ${w.wind_speed_10m} km/h\n☁️ Condition: ${desc}`;
          await sock.sendMessage(from, { text: weatherText }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Weather error: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .wiki <query> — Search Wikipedia
      if (command === ".wiki") {
        const query = args.join(" ");
        if (!query) {
          await sock.sendMessage(from, { text: "📚 Usage: *.wiki <query>*\n\nExample: *.wiki Kenya*" }, { quoted: msg });
          continue;
        }
        try {
          const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
          const { statusCode, body } = await httpGet(wikiUrl);
          if (statusCode !== 200) {
            await sock.sendMessage(from, { text: `❌ No Wikipedia article found for "${query}".` }, { quoted: msg });
            continue;
          }
          const data = JSON.parse(body);
          if (data.type === "disambiguation") {
            await sock.sendMessage(from, { text: `📚 *${data.title}* is a disambiguation page.\n\n${data.extract}\n\n🔗 ${data.content_urls?.desktop?.page || ""}` }, { quoted: msg });
          } else {
            const wikiText = `📚 *${data.title}*\n\n${data.extract}\n\n🔗 Read more: ${data.content_urls?.desktop?.page || ""}`;
            await sock.sendMessage(from, { text: wikiText }, { quoted: msg });
          }
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Wiki search error: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .tr <text> — Translate text using MyMemory free API
      if (command === ".tr") {
        const text = args.join(" ");
        if (!text) {
          await sock.sendMessage(from, { text: "🌐 Usage: *.tr <text>*\n\nTranslates to English automatically.\nExample: *.tr Bonjour le monde*" }, { quoted: msg });
          continue;
        }
        try {
          const trUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|en`;
          const { body } = await httpGet(trUrl);
          const data = JSON.parse(body);
          if (data.responseData) {
            const translated = data.responseData.translatedText;
            const detected = data.responseData.detectedSourceLanguage || "auto";
            await sock.sendMessage(from, { text: `🌐 *Translation*\n\n📝 Original: ${text}\n🔄 English: ${translated}\n📊 Detected: ${detected}` }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { text: "❌ Translation failed." }, { quoted: msg });
          }
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Translate error: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .ai <prompt> — AI chat using Pollinations AI (free, no API key)
      if (command === ".ai") {
        const prompt = args.join(" ");
        if (!prompt) {
          await sock.sendMessage(from, { text: "🤖 Usage: *.ai <your question>*\n\nExample: *.ai Tell me a joke*" }, { quoted: msg });
          continue;
        }
        try {
          await sock.sendMessage(from, { text: "🤖 Thinking..." }, { quoted: msg });
          const aiUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
          const { statusCode, body } = await httpGet(aiUrl, { timeout: 25000 });
          if (statusCode === 200 && body && body.trim()) {
            const response = body.trim().substring(0, 2000);
            await sock.sendMessage(from, { text: `🤖 *AI Assistant*\n\n${response}` }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { text: "❌ AI could not generate a response. Try again later." }, { quoted: msg });
          }
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ AI error: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .define <word> — Dictionary definition using Free Dictionary API
      if (command === ".define") {
        const word = args.join(" ");
        if (!word) {
          await sock.sendMessage(from, { text: "📖 Usage: *.define <word>*\n\nExample: *.define happiness*" }, { quoted: msg });
          continue;
        }
        try {
          const defUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
          const { statusCode, body } = await httpGet(defUrl);
          if (statusCode !== 200) {
            await sock.sendMessage(from, { text: `❌ No definition found for "${word}".` }, { quoted: msg });
            continue;
          }
          const data = JSON.parse(body);
          const entry = data[0];
          const meaning = entry.meanings[0];
          const definition = meaning.definitions[0];
          const defText = `📖 *${entry.word}* (${meaning.partOfSpeech})\n\n${definition.definition}${definition.example ? `\n\n📝 Example: ${definition.example}` : ""}${entry.phonetic ? `\n🔊 ${entry.phonetic}` : ""}`;
          await sock.sendMessage(from, { text: defText }, { quoted: msg });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Dictionary error: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // ECONOMY COMMANDS
      // ═══════════════════════════════════════════════════════════════════════

      // .balance — Check your coin balance
      if (command === ".balance" || command === ".wallet") {
        const bal = getBalance(sender);
        await sock.sendMessage(from, { text: `💰 *Your Balance*\n\n🪙 Coins: *${bal.balance}*\n📊 Total earned: *${bal.total_earned}*\n💸 Total spent: *${bal.total_spent}*\n📈 Net: *${bal.balance}*` }, { quoted: msg });
        continue;
      }

      // .daily — Claim daily reward
      if (command === ".daily") {
        const bal = getBalance(sender);
        const now = Math.floor(Date.now() / 1000);
        if (bal.last_daily && now - bal.last_daily < 86400) {
          const remaining = 86400 - (now - bal.last_daily);
          const hours = Math.floor(remaining / 3600);
          const mins = Math.floor((remaining % 3600) / 60);
          await sock.sendMessage(from, { text: `⏰ You already claimed your daily reward!\n\nCome back in *${hours}h ${mins}m*.` }, { quoted: msg });
          continue;
        }
        addBalance(sender, 100);
        setLastDaily(sender);
        await sock.sendMessage(from, { text: `🎁 *Daily Reward Claimed!*\n\n💰 You received *100 coins*!\n🪙 New balance: *${getBalance(sender).balance}*` }, { quoted: msg });
        continue;
      }

      // .weekly — Claim weekly reward
      if (command === ".weekly") {
        const bal = getBalance(sender);
        const now = Math.floor(Date.now() / 1000);
        if (bal.last_weekly && now - bal.last_weekly < 604800) {
          const remaining = 604800 - (now - bal.last_weekly);
          const days = Math.floor(remaining / 86400);
          const hours = Math.floor((remaining % 86400) / 3600);
          await sock.sendMessage(from, { text: `⏰ You already claimed your weekly reward!\n\nCome back in *${days}d ${hours}h*.` }, { quoted: msg });
          continue;
        }
        addBalance(sender, 500);
        setLastWeekly(sender);
        await sock.sendMessage(from, { text: `🎁 *Weekly Reward Claimed!*\n\n💰 You received *500 coins*!\n🪙 New balance: *${getBalance(sender).balance}*` }, { quoted: msg });
        continue;
      }

      // .leaderboard — Top 10 richest users
      if (command === ".leaderboard" || command === ".lb") {
        const board = getLeaderboard(10);
        if (board.length === 0) {
          await sock.sendMessage(from, { text: "📊 No economy data yet. Use *.daily* to start earning coins!" }, { quoted: msg });
          continue;
        }
        let lbText = "🏆 *Coin Leaderboard*\n\n";
        const medals = ["🥇", "🥈", "🥉"];
        board.forEach((row, i) => {
          const num = row.jid.split("@")[0];
          const medal = medals[i] || `${i + 1}.`;
          lbText += `${medal} +${num} — *${row.balance}* coins\n`;
        });
        await sock.sendMessage(from, { text: lbText.trim() }, { quoted: msg });
        continue;
      }

      // .gamble <amount> — Bet your coins (50/50 double or nothing)
      if (command === ".gamble" || command === ".bet") {
        const amount = parseInt(args[0], 10);
        if (!amount || amount < 1) {
          await sock.sendMessage(from, { text: "🎰 Usage: *.gamble <amount>*\n\nExample: *.gamble 50*\nWin: double your bet. Lose: lose your bet." }, { quoted: msg });
          continue;
        }
        const bal = getBalance(sender);
        if (bal.balance < amount) {
          await sock.sendMessage(from, { text: `❌ You only have *${bal.balance}* coins. Can't bet *${amount}*.` }, { quoted: msg });
          continue;
        }
        const won = Math.random() < 0.5;
        if (won) {
          addBalance(sender, amount);
          await sock.sendMessage(from, { text: `🎉 *You won!*\n\n💰 Bet: ${amount} coins\n📈 Payout: +${amount} coins\n🪙 New balance: *${getBalance(sender).balance}*` }, { quoted: msg });
        } else {
          addBalance(sender, -amount);
          await sock.sendMessage(from, { text: `💀 *You lost!*\n\n💰 Bet: ${amount} coins\n📉 Loss: -${amount} coins\n🪙 New balance: *${getBalance(sender).balance}*` }, { quoted: msg });
        }
        continue;
      }

      // .transfer @user <amount> — Send coins to another user
      if (command === ".transfer" || command === ".pay") {
        const mentionedJids = getMentionedJids(msg);
        const amount = parseInt(args.find((a) => /^\d+$/.test(a)), 10);
        if (!mentionedJids[0] || !amount || amount < 1) {
          await sock.sendMessage(from, { text: "💸 Usage: *.transfer @user <amount>*\n\nExample: *.transfer @254711939375 100*" }, { quoted: msg });
          continue;
        }
        const recipient = mentionedJids[0];
        if (recipient === sender) {
          await sock.sendMessage(from, { text: "❌ You can't transfer coins to yourself!" }, { quoted: msg });
          continue;
        }
        const bal = getBalance(sender);
        if (bal.balance < amount) {
          await sock.sendMessage(from, { text: `❌ Insufficient balance. You have *${bal.balance}* coins.` }, { quoted: msg });
          continue;
        }
        addBalance(sender, -amount);
        addBalance(recipient, amount);
        const recipientNum = recipient.split("@")[0];
        await sock.sendMessage(from, { text: `✅ *Transfer Successful*\n\n💸 Sent: *${amount}* coins to @${recipientNum}\n🪙 Your balance: *${getBalance(sender).balance}*`, mentions: [recipient] }, { quoted: msg });
        continue;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // AFK SYSTEM
      // ═══════════════════════════════════════════════════════════════════════

      // .afk <reason> — Set yourself as Away From Keyboard
      if (command === ".afk") {
        const reason = args.join(" ") || "Not set";
        setAFK(sender, reason);
        await sock.sendMessage(from, { text: `🚶 *@${senderNumber}* is now AFK.\n📝 Reason: ${reason}\n\nI'll auto-respond when someone mentions you.`, mentions: [sender] }, { quoted: msg });
        continue;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // REMINDER SYSTEM
      // ═══════════════════════════════════════════════════════════════════════

      // .remind <time> <message> — Set a persistent reminder
      if (command === ".remind") {
        const timeStr = args[0];
        const message = args.slice(1).join(" ");
        if (!timeStr || !message) {
          await sock.sendMessage(from, { text: "⏰ Usage: *.remind <time> <message>*\n\nTime formats: 30s, 10m, 2h, 1d\nExample: *.remind 10m Check the food*" }, { quoted: msg });
          continue;
        }
        const ms = parseTimeString(timeStr);
        if (!ms) {
          await sock.sendMessage(from, { text: "❌ Invalid time format. Use: 30s, 10m, 2h, or 1d\n\nExample: *.remind 10m Check the food*" }, { quoted: msg });
          continue;
        }
        const remindAt = Math.floor(Date.now() / 1000) + Math.floor(ms / 1000);
        addReminder(sender, from, message, remindAt);
        const timeLabel = timeStr.replace(/(\d+)([smhd])/, (_, n, u) => `${n} ${ { s: "second", m: "minute", h: "hour", d: "day" }[u] }${n > 1 ? "s" : ""}`);
        await sock.sendMessage(from, { text: `⏰ *Reminder set!*\n\n📝 Reminder: ${message}\n⏱️ In: ${timeLabel}\n📍 I'll remind you in this chat.` }, { quoted: msg });
        continue;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PROFILE & LEVELING
      // ═══════════════════════════════════════════════════════════════════════

      // .profile [@user] — View profile card
      if (command === ".profile") {
        const mentionedJids = getMentionedJids(msg);
        const targetJid = mentionedJids[0] || sender;
        const targetNum = targetJid.split("@")[0];
        const profile = getProfile(targetJid);
        const xpForNext = (profile.level * 100) - profile.xp;
        const bal = getBalance(targetJid);
        const profileText = `📊 *Profile Card*\n\n👤 User: @${targetNum}\n📛 Name: ${profile.display_name || "Not set"}\n📝 Bio: ${profile.bio || "Not set"}\n\n📈 Level: *${profile.level}*\n⚡ XP: *${profile.xp}* / ${profile.level * 100}\n📊 XP to next level: *${xpForNext > 0 ? xpForNext : 0}*\n💬 Messages: *${profile.messages_count}*\n\n💰 Coins: *${bal.balance}*`;
        await sock.sendMessage(from, { text: profileText, mentions: [targetJid] }, { quoted: msg });
        continue;
      }

      // .myname <name> — Set display name (personal profile)
      if (command === ".myname") {
        const name = args.join(" ");
        if (!name) {
          await sock.sendMessage(from, { text: "👤 Usage: *.myname <your name>*\n\nSets your profile display name." }, { quoted: msg });
          continue;
        }
        setProfileName(sender, name.substring(0, 50));
        await sock.sendMessage(from, { text: `✅ Display name set to *${name}*` }, { quoted: msg });
        continue;
      }

      // .setbio <text> — Set personal bio
      if (command === ".setbio") {
        const bio = args.join(" ");
        if (!bio) {
          await sock.sendMessage(from, { text: "📝 Usage: *.setbio <your bio>*\n\nSets your profile bio." }, { quoted: msg });
          continue;
        }
        setProfileBio(sender, bio.substring(0, 200));
        await sock.sendMessage(from, { text: `✅ Bio updated!` }, { quoted: msg });
        continue;
      }

      // .rank — Check your XP & level
      if (command === ".rank" || command === ".xp") {
        const profile = getProfile(sender);
        const xpForNext = (profile.level * 100) - profile.xp;
        const progress = Math.min(10, Math.floor(profile.xp % 100 / 10));
        const bar = "█".repeat(progress) + "░".repeat(10 - progress);
        await sock.sendMessage(from, { text: `📊 *Your Rank*\n\n📈 Level: *${profile.level}*\n⚡ XP: *${profile.xp}*\n[${bar}] ${profile.xp % 100}/100\n💬 Messages: *${profile.messages_count}*\n🎯 XP to next level: *${xpForNext > 0 ? xpForNext : 0}*` }, { quoted: msg });
        continue;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // FUN & GAMES
      // ═══════════════════════════════════════════════════════════════════════

      // .8ball <question> — Magic 8-Ball
      if (command === ".8ball" || command === ".8b") {
        const question = args.join(" ");
        if (!question) {
          await sock.sendMessage(from, { text: "🎱 Usage: *.8ball <question>*\n\nExample: *.8ball Will I be rich?*" }, { quoted: msg });
          continue;
        }
        const answers = ["It is certain ✅", "Without a doubt ✅", "Yes definitely ✅", "You may rely on it ✅", "Most likely ✅", "Outlook good ✅", "Yes ✅", "Signs point to yes ✅", "Reply hazy try again 🌫️", "Ask again later 🌫️", "Better not tell you now 🤐", "Cannot predict now 🌫️", "Don't count on it ❌", "My reply is no ❌", "My sources say no ❌", "Outlook not so good ❌", "Very doubtful ❌"];
        await sock.sendMessage(from, { text: `🎱 *Magic 8-Ball*\n\n❓ ${question}\n💬 ${pickRandom(answers)}` }, { quoted: msg });
        continue;
      }

      // .coinflip — Heads or tails
      if (command === ".coinflip" || command === ".coin" || command === ".flip") {
        const result = Math.random() < 0.5 ? "Heads" : "Tails";
        const emoji = result === "Heads" ? "👑" : "🦅";
        await sock.sendMessage(from, { text: `🪙 *Coin Flip*\n\nResult: ${emoji} *${result}*` }, { quoted: msg });
        continue;
      }

      // .dice — Roll a dice
      if (command === ".dice" || command === ".roll") {
        const result = Math.floor(Math.random() * 6) + 1;
        const diceEmoji = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][result - 1];
        await sock.sendMessage(from, { text: `🎲 *Dice Roll*\n\nResult: ${diceEmoji} *${result}*` }, { quoted: msg });
        continue;
      }

      // .truth — Random truth question
      if (command === ".truth") {
        const truths = ["What's your biggest fear?", "What's the most embarrassing thing you've ever done?", "What's a secret you've never told anyone?", "What's your biggest regret?", "Who do you have a crush on?", "What's the worst lie you've ever told?", "What's something you're proud of but never talk about?", "What's your weirdest habit?", "What's the most childish thing you still do?", "Have you ever cheated on a test?", "What's the most expensive thing you've broken?", "What's your most irrational fear?", "What's the last thing you searched on Google?", "What's your biggest insecurity?", "If you could swap lives with anyone, who would it be?"];
        await sock.sendMessage(from, { text: `🤔 *Truth*\n\n${pickRandom(truths)}` }, { quoted: msg });
        continue;
      }

      // .dare — Random dare
      if (command === ".dare") {
        const dares = ["Send a voice note singing a song", "Change your profile picture to a meme for 1 hour", "Send the last photo in your gallery", "Speak in a funny accent for the next 5 messages", "Send a compliment to the person above you", "Do 10 push-ups and send proof", "Tell a joke right now", "Send a selfie with a funny face", "Call the person who sent the last message 'Your Majesty' for the next hour", "Share your most used emoji", "Text someone 'I love you' right now", "Do an impression of someone in this group", "Send the 7th message in your chat with the last person you texted"];
        await sock.sendMessage(from, { text: `😏 *Dare*\n\n${pickRandom(dares)}` }, { quoted: msg });
        continue;
      }

      // .wyr — Would you rather
      if (command === ".wyr") {
        const wyrs = ["Would you rather be able to fly or be invisible?", "Would you rather have unlimited money or unlimited time?", "Would you rather live without music or without movies?", "Would you rather always be 10 minutes late or 20 minutes early?", "Would you rather be able to read minds or see the future?", "Would you rather have the ability to speak all languages or play all instruments?", "Would you rather never use social media again or never watch TV again?", "Would you rather always be hot or always be cold?", "Would you rather have a personal chef or a personal driver?", "Would you rather be the funniest person or the smartest person in the room?", "Would you rather lose all your photos or all your contacts?", "Would you rather be able to teleport or time travel?"];
        await sock.sendMessage(from, { text: `🤷 *Would You Rather*\n\n${pickRandom(wyrs)}` }, { quoted: msg });
        continue;
      }

      // .rps <rock|paper|scissors> — Rock Paper Scissors
      if (command === ".rps") {
        const choice = (args[0] || "").toLowerCase();
        const valid = ["rock", "paper", "scissors"];
        if (!valid.includes(choice)) {
          await sock.sendMessage(from, { text: "✊ Usage: *.rps <rock|paper|scissors>*" }, { quoted: msg });
          continue;
        }
        const botChoice = pickRandom(valid);
        const emojiMap = { rock: "✊", paper: "✋", scissors: "✌️" };
        let result;
        if (choice === botChoice) result = "🤝 It's a tie!";
        else if ((choice === "rock" && botChoice === "scissors") || (choice === "paper" && botChoice === "rock") || (choice === "scissors" && botChoice === "paper")) result = "🎉 You win!";
        else result = "💀 You lose!";
        await sock.sendMessage(from, { text: `✊ *Rock Paper Scissors*\n\nYou: ${emojiMap[choice]} ${choice}\nBot: ${emojiMap[botChoice]} ${botChoice}\n\n${result}` }, { quoted: msg });
        continue;
      }

      // .pick <option1|option2> — Bot picks for you
      if (command === ".pick") {
        const input = args.join(" ");
        const options = input.split("|").map((o) => o.trim()).filter(Boolean);
        if (options.length < 2) {
          await sock.sendMessage(from, { text: "🤔 Usage: *.pick <option1 | option2>*\n\nExample: *.pick pizza | burger*" }, { quoted: msg });
          continue;
        }
        const picked = pickRandom(options);
        await sock.sendMessage(from, { text: `🤔 *I pick...*\n\n🎯 ${picked}` }, { quoted: msg });
        continue;
      }

      // .ship @user1 @user2 — Love calculator
      if (command === ".ship") {
        const mentionedJids = getMentionedJids(msg);
        if (mentionedJids.length < 2) {
          await sock.sendMessage(from, { text: "💕 Usage: *.ship @user1 @user2*\n\nCalculates love compatibility." }, { quoted: msg });
          continue;
        }
        const u1 = mentionedJids[0].split("@")[0];
        const u2 = mentionedJids[1].split("@")[0];
        const score = Math.floor(Math.random() * 50) + 50; // 50-100 for fun
        let heartBar;
        if (score >= 90) heartBar = "💞💞💞💞💞 Perfect Match!";
        else if (score >= 75) heartBar = "💕💕💕💕 Great Match!";
        else if (score >= 60) heartBar = "💖💖💖 Good Match";
        else heartBar = "💘💖 Decent Match";
        await sock.sendMessage(from, { text: `💕 *Love Calculator*\n\n@${u1} ❤️ @${u2}\n\n💌 Compatibility: *${score}%*\n${heartBar}`, mentions: mentionedJids }, { quoted: msg });
        continue;
      }

      // .fact — Random fun fact
      if (command === ".fact") {
        try {
          const { body } = await httpGet("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en");
          const data = JSON.parse(body);
          await sock.sendMessage(from, { text: `🧠 *Random Fact*\n\n${data.text}` }, { quoted: msg });
        } catch (err) {
          const facts = ["Honey never spoils.", "A group of flamingos is called a 'flamboyance'.", "Octopuses have three hearts.", "Bananas are berries, but strawberries aren't.", "A day on Venus is longer than a year on Venus.", "Wombat poop is cube-shaped.", "The first oranges weren't orange.", "Sharks existed before trees.", "A jiffy is an actual unit of time (1/100th of a second).", "Cows have best friends."];
          await sock.sendMessage(from, { text: `🧠 *Random Fact*\n\n${pickRandom(facts)}` }, { quoted: msg });
        }
        continue;
      }

      // .quote2 — Random motivational quote (additional to .quote)
      if (command === ".quote2" || command === ".motivation") {
        const quotes = ["The only way to do great work is to love what you do. — Steve Jobs", "Success is not final, failure is not fatal: it is the courage to continue that counts. — Winston Churchill", "Believe you can and you're halfway there. — Theodore Roosevelt", "The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt", "It does not matter how slowly you go as long as you do not stop. — Confucius", "Everything you've ever wanted is on the other side of fear. — George Addair", "Hardships often prepare ordinary people for an extraordinary destiny. — C.S. Lewis", "Don't watch the clock; do what it does. Keep going. — Sam Levenson", "The secret of getting ahead is getting started. — Mark Twain", "Your limitation—it's only your imagination.", "Great things never come from comfort zones.", "Dream it. Wish it. Do it."];
        await sock.sendMessage(from, { text: `💪 *Motivation*\n\n${pickRandom(quotes)}` }, { quoted: msg });
        continue;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // MODERATION
      // ═══════════════════════════════════════════════════════════════════════

      // .delete — Delete a message (reply to the message to delete)
      if (command === ".delete" || command === ".del") {
        const isOwnerOrAdmin = isOwner || (isGroup && senderIsAdmin);
        if (!isOwnerOrAdmin) {
          await sock.sendMessage(from, { text: "❌ Only admins or the owner can use *.delete*." }, { quoted: msg });
          continue;
        }
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
        if (!quoted) {
          await sock.sendMessage(from, { text: "💬 Reply to a message with *.delete* to delete it." }, { quoted: msg });
          continue;
        }
        try {
          await sock.sendMessage(from, {
            delete: { remoteJid: from, fromMe: quotedParticipant === sock.user.id || quotedParticipant === undefined, id: quoted, participant: quotedParticipant || undefined },
          });
        } catch (err) {
          await sock.sendMessage(from, { text: `❌ Could not delete: ${err.message}` }, { quoted: msg });
        }
        continue;
      }

      // .purge <count> — Bulk delete messages (admin only, max 50)
      if (command === ".purge") {
        if (!isGroup || !senderIsAdmin) {
          await sock.sendMessage(from, { text: "❌ Only group admins can use *.purge*." }, { quoted: msg });
          continue;
        }
        if (!botIsAdmin) {
          await sock.sendMessage(from, { text: "⚠️ I need to be an admin to purge messages." }, { quoted: msg });
          continue;
        }
        const count = Math.min(parseInt(args[0], 10) || 5, 50);
        await sock.sendMessage(from, { text: `🧹 Purging up to ${count} messages... (Note: WhatsApp API limits deletion — only recent bot messages can be deleted automatically.)` }, { quoted: msg });
        continue;
      }

    }
  });

  // ──────────────────────────────────────────────
  // GROUP PARTICIPANT EVENTS (Welcome messages)
  // ──────────────────────────────────────────────
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    if (action !== "add") return;

    const settings = groupSettings[id] || {};
    if (!settings.welcome) return;

    try {
      const meta = await sock.groupMetadata(id);
      for (const participant of participants) {
        const number = participant.replace("@s.whatsapp.net", "");
        const welcomeText = `
╔══════════════════════════════╗
║  *Welcome to ${meta.subject}!* ║
╚══════════════════════════════╝

👋 Hey @${number}, welcome to the group!
We're glad to have you here. 🇯🇲

_Powered by Kartelo 🇯🇲 Official MD_
        `.trim();

        await sock.sendMessage(id, {
          text: welcomeText,
          mentions: [participant],
        });
      }
    } catch {}
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REMINDER CHECKER — Polls the database every 10 seconds for due reminders
  // ─────────────────────────────────────────────────────────────────────────────
  const reminderInterval = setInterval(async () => {
    try {
      const pending = getPendingReminders();
      for (const reminder of pending) {
        try {
          await sock.sendMessage(reminder.chat_jid, {
            text: `⏰ *Reminder!*\n\n📝 ${reminder.message}`,
            mentions: [reminder.jid],
          });
          deleteReminder(reminder.id);
        } catch (err) {
          console.log("Reminder send error:", err.message);
        }
      }
    } catch (err) {
      console.log("Reminder checker error:", err.message);
    }
  }, 10000);

  return sock;
}

// ──────────────────────────────────────────────
// HTTP SERVER — Keep-alive + Status Dashboard
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const BASE_PATH = (process.env.BASE_PATH || "").replace(/\/$/, "");
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "kartelo2024";
const PANEL_TOKEN = Buffer.from(`kartelo:${PANEL_PASSWORD}:secret`).toString("base64");

let botStatus = "starting";
let botConnectedAt = null;
let activeSock = null; // will be set after bot connects
const recentLogs = []; // last 50 activity logs

function addLog(msg) {
  recentLogs.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (recentLogs.length > 50) recentLogs.pop();
}

function parseCookies(req) {
  const list = {};
  const header = req.headers.cookie;
  if (!header) return list;
  header.split(";").forEach((c) => {
    const [k, ...v] = c.trim().split("=");
    list[k.trim()] = v.join("=");
  });
  return list;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return cookies["panel_token"] === PANEL_TOKEN;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      const obj = {};
      data.split("&").forEach((pair) => {
        const [k, v] = pair.split("=").map(decodeURIComponent);
        if (k) obj[k] = v || "";
      });
      resolve(obj);
    });
  });
}

function getUptime() {
  const ms = Date.now() - BOT_START_TIME;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000) % 24;
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

const CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d0d0d;color:#e0e0e0;min-height:100vh}
  a{color:#25D366;text-decoration:none}
  .topbar{background:#111;border-bottom:1px solid #222;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
  .topbar h1{font-size:18px;font-weight:700;color:#fff}
  .topbar .sub{font-size:12px;color:#555;margin-top:2px}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:50px;font-size:12px;font-weight:600}
  .badge.on{background:#25D36622;border:1px solid #25D366;color:#25D366}
  .badge.off{background:#FF3B3022;border:1px solid #FF3B30;color:#FF3B30}
  .badge.wait{background:#FFA50022;border:1px solid #FFA500;color:#FFA500}
  .dot{width:7px;height:7px;border-radius:50%;background:currentColor;animation:pulse 1.5s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  .layout{display:grid;grid-template-columns:200px 1fr;min-height:calc(100vh - 53px)}
  .sidebar{background:#111;border-right:1px solid #1a1a1a;padding:16px 0}
  .nav-item{display:block;padding:10px 20px;font-size:14px;color:#888;border-left:3px solid transparent;transition:.2s}
  .nav-item:hover,.nav-item.active{color:#fff;background:#1a1a1a;border-left-color:#25D366}
  .content{padding:28px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:28px}
  .card{background:#161616;border:1px solid #222;border-radius:12px;padding:20px}
  .card h3{font-size:11px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
  .card .val{font-size:22px;font-weight:700;color:#fff}
  .card .val.green{color:#25D366}
  .section{background:#161616;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:20px}
  .section h2{font-size:15px;font-weight:600;margin-bottom:18px;color:#fff;border-bottom:1px solid #222;padding-bottom:12px}
  label{display:block;font-size:12px;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
  input,textarea,select{width:100%;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:10px 14px;color:#fff;font-size:14px;outline:none;margin-bottom:14px}
  input:focus,textarea:focus{border-color:#25D366}
  textarea{resize:vertical;min-height:90px}
  button{background:#25D366;color:#000;border:none;border-radius:8px;padding:10px 22px;font-size:14px;font-weight:700;cursor:pointer;transition:.2s}
  button:hover{background:#1ebe5a}
  button.danger{background:#FF3B30;color:#fff}
  button.danger:hover{background:#e0332a}
  .alert{padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:16px}
  .alert.ok{background:#25D36622;border:1px solid #25D366;color:#25D366}
  .alert.err{background:#FF3B3022;border:1px solid #FF3B30;color:#FF3B30}
  .log-item{font-size:12px;color:#666;padding:6px 0;border-bottom:1px solid #1a1a1a;font-family:monospace}
  .log-item:last-child{border:none}
  @media(max-width:600px){.layout{grid-template-columns:1fr}.sidebar{display:none}.grid{grid-template-columns:1fr 1fr}}
`;

function loginPage(err = "", B = "") {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Kartelo MD — Login</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d0d0d;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .box{background:#161616;border:1px solid #222;border-radius:16px;padding:40px;width:90%;max-width:380px;text-align:center}
    .flag{font-size:48px;margin-bottom:8px}
    h1{font-size:20px;margin-bottom:4px}
    p{color:#555;font-size:13px;margin-bottom:28px}
    input{width:100%;background:#0d0d0d;border:1px solid #2a2a2a;border-radius:8px;padding:12px 14px;color:#fff;font-size:14px;outline:none;margin-bottom:14px}
    input:focus{border-color:#25D366}
    button{width:100%;background:#25D366;color:#000;border:none;border-radius:8px;padding:12px;font-size:15px;font-weight:700;cursor:pointer}
    .err{color:#FF3B30;font-size:13px;margin-bottom:12px}
  </style></head><body>
  <div class="box">
    <div class="flag">🇯🇲</div>
    <h1>Kartelo Official MD</h1>
    <p>Admin Panel — Enter password to continue</p>
    ${err ? `<p class="err">${err}</p>` : ""}
    <form method="POST" action="${B}/login">
      <input type="password" name="password" placeholder="Enter panel password" autofocus required/>
      <button type="submit">Login</button>
    </form>
  </div></body></html>`;
}

function panelPage(page = "dashboard", alert = "", B = "") {
  const sc = botStatus === "connected" ? "on" : botStatus === "starting" ? "wait" : "off";
  const statusLabel = botStatus === "connected" ? "Connected" : botStatus === "starting" ? "Starting..." : "Disconnected";
  const groups = Object.keys(groupSettings);

  const navItems = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "send", label: "💬 Send Message" },
    { id: "broadcast", label: "📢 Broadcast" },
    { id: "groups", label: "👥 Groups" },
    { id: "logs", label: "📜 Logs" },
  ];

  const nav = navItems.map((n) =>
    `<a href="${B}/panel?page=${n.id}" class="nav-item${page === n.id ? " active" : ""}">${n.label}</a>`
  ).join("");

  let body = "";

  if (page === "dashboard") {
    const qrBanner = (botStatus !== "connected" && currentQRCode) ? `
      <div style="background:#075E54;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
        <p style="color:#25D366;font-size:15px;font-weight:bold;margin:0 0 12px">📷 Scan QR Code to Connect WhatsApp</p>
        <div style="background:#fff;display:inline-block;padding:12px;border-radius:8px">
          <img src="${currentQRCode}" width="220" height="220" style="display:block"/>
        </div>
        <p style="color:#aaa;font-size:12px;margin:12px 0 4px">Open WhatsApp → ⋮ → Linked Devices → Link a Device → Scan QR Code</p>
        <p style="color:#777;font-size:11px;margin:0">⚠️ QR refreshes every 60 seconds — reload page if expired</p>
      </div>` : "";
    const pairingBanner = (botStatus !== "connected" && currentPairingCode && !currentQRCode) ? `
      <div style="background:#075E54;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center">
        <p style="color:#aaa;font-size:13px;margin:0 0 8px">📱 Bot is not connected — enter this code in WhatsApp NOW</p>
        <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#25D366;font-family:monospace">${currentPairingCode}</div>
        <p style="color:#aaa;font-size:12px;margin:10px 0 0">WhatsApp → Linked Devices → Link a Device → Link with phone number</p>
        <p style="color:#777;font-size:11px;margin:6px 0 0">⚠️ Code refreshes every ~20 seconds — reload page for latest</p>
      </div>` : "";
    body = `
      ${qrBanner}
      ${pairingBanner}
      <div class="grid">
        <div class="card"><h3>Bot Status</h3><div class="val ${sc === "on" ? "green" : ""}">${statusLabel}</div></div>
        <div class="card"><h3>Uptime</h3><div class="val">${getUptime()}</div></div>
        <div class="card"><h3>Owner</h3><div class="val">+${OWNER_NUMBER}</div></div>
        <div class="card"><h3>Commands</h3><div class="val green">45+</div></div>
        ${(() => { try { const s = getDbStats(); return `<div class="card"><h3>DB Records</h3><div class="val">${s.commands} cmds · ${s.banned} banned · ${s.warnings} warns</div></div>`; } catch(e) { return ''; } })()}
        <div class="card"><h3>Groups Tracked</h3><div class="val">${groups.length}</div></div>
        <div class="card"><h3>Connected At</h3><div class="val" style="font-size:13px">${botConnectedAt ? new Date(botConnectedAt).toLocaleString() : "—"}</div></div>
      </div>
      <div class="section">
        <h2>Recent Activity</h2>
        ${recentLogs.length ? recentLogs.slice(0, 10).map((l) => `<div class="log-item">${l}</div>`).join("") : '<p style="color:#444;font-size:13px">No activity yet.</p>'}
      </div>`;
  }

  if (page === "send") {
    body = `
      <div class="section">
        <h2>Send Message</h2>
        ${alert}
        <form method="POST" action="${B}/panel/send">
          <label>WhatsApp Number (with country code, no +)</label>
          <input type="text" name="number" placeholder="e.g. 254711939375" required/>
          <label>Message</label>
          <textarea name="message" placeholder="Type your message here..." required></textarea>
          <button type="submit">Send Message</button>
        </form>
      </div>`;
  }

  if (page === "broadcast") {
    body = `
      <div class="section">
        <h2>Broadcast to All Chats</h2>
        ${alert}
        <form method="POST" action="${B}/panel/broadcast">
          <label>Message</label>
          <textarea name="message" placeholder="Type your broadcast message..." required></textarea>
          <button type="submit">📢 Broadcast Now</button>
        </form>
      </div>`;
  }

  if (page === "groups") {
    const rows = groups.length
      ? groups.map((jid) => {
          const s = groupSettings[jid] || {};
          return `<div class="card">
            <h3 style="font-size:10px;word-break:break-all">${jid}</h3>
            <p style="font-size:13px;margin-top:8px">Anti-link: <b style="color:${s.antilink ? "#25D366" : "#FF3B30"}">${s.antilink ? "ON" : "OFF"}</b></p>
            <p style="font-size:13px">Welcome: <b style="color:${s.welcome ? "#25D366" : "#FF3B30"}">${s.welcome ? "ON" : "OFF"}</b></p>
          </div>`;
        }).join("")
      : '<p style="color:#444;font-size:13px">No groups tracked yet. Use .antilink or .welcome in a group to appear here.</p>';
    body = `
      <div class="section">
        <h2>Tracked Groups (${groups.length})</h2>
        <div class="grid">${rows}</div>
      </div>`;
  }

  if (page === "logs") {
    body = `
      <div class="section">
        <h2>Activity Logs (last 50)</h2>
        ${recentLogs.length ? recentLogs.map((l) => `<div class="log-item">${l}</div>`).join("") : '<p style="color:#444;font-size:13px">No logs yet.</p>'}
      </div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Kartelo MD — Panel</title><style>${CSS}</style></head><body>
  <div class="topbar">
    <div>
      <h1>🇯🇲 Kartelo Official MD</h1>
      <div class="sub">Admin Panel</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <span class="badge ${sc}"><span class="dot"></span>${statusLabel}</span>
      <a href="${B}/logout" style="font-size:12px;color:#555">Logout</a>
    </div>
  </div>
  <div class="layout">
    <div class="sidebar">${nav}</div>
    <div class="content">${body}</div>
  </div></body></html>`;
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    // Strip base path prefix so routes are always relative to "/"
    const rawUrl = req.url || "/";
    const stripped = BASE_PATH && rawUrl.startsWith(BASE_PATH)
      ? rawUrl.slice(BASE_PATH.length) || "/"
      : rawUrl;
    const url = stripped.split("?")[0] || "/";
    const query = Object.fromEntries(new URLSearchParams(stripped.includes("?") ? stripped.split("?")[1] : ""));
    const B = BASE_PATH; // shorthand for building links

    // JSON endpoint — returns current pairing code for live polling
    if (url === "/paircode.json") {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
      return res.end(JSON.stringify({ code: currentPairingCode, status: botStatus }));
    }

    // PUBLIC Pairing Code page — no login required
    if (url === "/code") {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pairing Code</title><style>*{box-sizing:border-box}body{background:#111;font-family:sans-serif;min-height:100vh;margin:0;padding:20px;color:#ccc}h1{color:#25D366;text-align:center;font-size:22px;margin:0 0 4px}p.sub{color:#aaa;font-size:13px;text-align:center;margin:0 0 16px}.code-box{background:#075E54;border-radius:16px;padding:22px 16px;text-align:center;margin-bottom:20px;transition:.3s}.code{font-size:52px;font-weight:900;letter-spacing:14px;color:#25D366;font-family:monospace;word-break:break-all;min-height:72px;display:flex;align-items:center;justify-content:center}.code-note{color:#aaa;font-size:12px;margin-top:8px}#status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#25D366;margin-right:6px}#status-text{color:#aaa;font-size:12px}.tabs{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}.tab{padding:8px 16px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;background:#1a1a1a;color:#aaa;border:1px solid #333}.tab.active{background:#075E54;color:#25D366;border-color:#25D366}.panel{display:none;background:#1a1a1a;border-radius:12px;padding:16px 20px}.panel.active{display:block}.panel ol{margin:0;padding-left:20px}.panel li{color:#ccc;margin:8px 0;font-size:14px;line-height:1.5}.panel li b{color:#fff}.note{background:#0d2818;border-left:3px solid #25D366;padding:8px 12px;border-radius:4px;font-size:12px;color:#aaa;margin-top:12px}.spin{animation:spin 1s linear infinite;display:inline-block}@keyframes spin{to{transform:rotate(360deg)}}</style></head><body>
<h1>📱 WhatsApp Pairing Code</h1>
<p class="sub">Kartelo 🇯🇲 Official MD</p>
<div class="code-box">
  <div class="code" id="code"><span class="spin">⏳</span></div>
  <div class="code-note"><span id="status-dot"></span><span id="status-text">Connecting to bot...</span></div>
</div>
<div class="tabs">
  <div class="tab active" onclick="show('phone',this)">📱 Phone</div>
  <div class="tab" onclick="show('web',this)">🌐 WhatsApp Web</div>
  <div class="tab" onclick="show('windows',this)">🖥️ Windows</div>
  <div class="tab" onclick="show('mac',this)">🍎 Mac</div>
</div>
<div id="phone" class="panel active"><ol>
  <li>Open <b>WhatsApp</b> on your phone</li>
  <li>Tap <b>⋮ (3 dots)</b> → <b>Linked Devices</b></li>
  <li>Tap <b>Link a Device</b></li>
  <li>Tap <b>"Link with phone number instead"</b></li>
  <li>Select <b>🇰🇪 Kenya (+254)</b></li>
  <li>Enter number: <b>711939375</b></li>
  <li>Type the code above and tap <b>Next</b></li>
</ol></div>
<div id="web" class="panel"><ol>
  <li>Open <b>web.whatsapp.com</b> in a browser</li>
  <li>Click <b>"Link with phone number"</b> below the QR</li>
  <li>Select <b>🇰🇪 Kenya (+254)</b></li>
  <li>Enter number: <b>711939375</b></li>
  <li>Type the code above and click <b>Next</b></li>
  <div class="note">💡 Works on Chrome, Firefox, Edge, Safari</div>
</ol></div>
<div id="windows" class="panel"><ol>
  <li>Open <b>WhatsApp Desktop</b> on Windows</li>
  <li>Click <b>"Link with phone number"</b> below the QR</li>
  <li>Select <b>🇰🇪 Kenya (+254)</b></li>
  <li>Enter number: <b>711939375</b></li>
  <li>Type the code above and click <b>Next</b></li>
  <div class="note">💡 Get it at <b>whatsapp.com/download</b> or Microsoft Store</div>
</ol></div>
<div id="mac" class="panel"><ol>
  <li>Open <b>WhatsApp Desktop</b> on Mac</li>
  <li>Click <b>"Link with phone number"</b> below the QR</li>
  <li>Select <b>🇰🇪 Kenya (+254)</b></li>
  <li>Enter number: <b>711939375</b></li>
  <li>Type the code above and click <b>Next</b></li>
  <div class="note">💡 Get it at <b>whatsapp.com/download</b> or Mac App Store</div>
</ol></div>
<script>
function show(id,el){
  document.querySelectorAll('.panel').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
}
const codeEl=document.getElementById('code');
const statusEl=document.getElementById('status-text');
const dotEl=document.getElementById('status-dot');
let lastCode='';
async function poll(){
  try{
    const r=await fetch('/api/paircode.json');
    const d=await r.json();
    if(d.status==='connected'){
      codeEl.innerHTML='✅';
      statusEl.textContent='Bot is connected to WhatsApp!';
      dotEl.style.background='#25D366';
      return;
    }
    if(d.code && d.code!==lastCode){
      lastCode=d.code;
      codeEl.textContent=d.code;
      statusEl.textContent='Code updated — enter it in WhatsApp now';
      dotEl.style.background='#25D366';
    } else if(!d.code){
      codeEl.innerHTML='<span class="spin">⏳</span>';
      statusEl.textContent='Generating code...';
      dotEl.style.background='#f0a500';
    }
  }catch(e){
    statusEl.textContent='Reconnecting to bot...';
    dotEl.style.background='#ff4444';
  }
  setTimeout(poll,3000);
}
poll();
</script>
</body></html>`);
    }

    // PUBLIC QR page — no login required
    if (url === "/qr") {
      res.writeHead(200, { "Content-Type": "text/html" });
      if (botStatus === "connected") {
        return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bot Connected</title><style>body{background:#111;color:#25D366;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}</style></head><body><div style="font-size:64px">✅</div><h2>Bot is Connected!</h2><p style="color:#aaa">Kartelo 🇯🇲 Official MD is live on WhatsApp</p></body></html>`);
      }
      if (!currentQRCode) {
        return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Loading QR</title><meta http-equiv="refresh" content="5"><style>body{background:#111;color:#aaa;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}</style></head><body><div style="font-size:48px">⏳</div><h3 style="color:#25D366">Generating QR Code...</h3><p>This page will refresh automatically</p></body></html>`);
      }
      return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Scan QR Code</title><style>body{background:#111;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:20px;box-sizing:border-box}h2{color:#25D366;margin:0 0 8px}p{color:#aaa;font-size:14px;margin:6px 0}.qr-box{background:#fff;padding:16px;border-radius:12px;margin:20px 0}.badge{background:#075E54;color:#25D366;padding:8px 16px;border-radius:20px;font-size:13px;margin-top:8px}</style></head><body><h2>📷 Scan to Connect WhatsApp</h2><p>Kartelo 🇯🇲 Official MD</p><div class="qr-box"><img src="${currentQRCode}" width="260" height="260"/></div><p>Open WhatsApp → ⋮ → <b>Linked Devices</b> → <b>Link a Device</b></p><div class="badge">⚠️ QR expires in ~60 sec — reload if expired</div></body></html>`);
    }

    // Health check
    if (url === "/health" || url === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", bot: botStatus, uptime: getUptime(), connectedAt: botConnectedAt }));
    }

    // Login POST
    if (url === "/login" && req.method === "POST") {
      const body = await readBody(req);
      if (body.password === PANEL_PASSWORD) {
        res.writeHead(302, { "Set-Cookie": `panel_token=${PANEL_TOKEN}; Path=${B || "/"};  HttpOnly`, Location: `${B}/panel` });
        return res.end();
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(loginPage("❌ Wrong password. Try again.", B));
    }

    // Logout
    if (url === "/logout") {
      res.writeHead(302, { "Set-Cookie": `panel_token=; Path=${B || "/"}; Max-Age=0`, Location: `${B}/` });
      return res.end();
    }

    // Root → login
    if (url === "/" || url === "/login") {
      if (isAuthenticated(req)) {
        res.writeHead(302, { Location: `${B}/panel` });
        return res.end();
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(loginPage("", B));
    }

    // All /panel routes require auth
    if (!isAuthenticated(req)) {
      res.writeHead(302, { Location: `${B}/` });
      return res.end();
    }

    // Panel dashboard
    if (url === "/panel") {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(panelPage(query.page || "dashboard", "", B));
    }

    // Send message action
    if (url === "/panel/send" && req.method === "POST") {
      const body = await readBody(req);
      const { number, message } = body;
      let alert = "";
      if (activeSock && number && message) {
        try {
          const jid = number.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
          await activeSock.sendMessage(jid, { text: message });
          addLog(`Panel sent message to +${number}`);
          alert = `<div class="alert ok">✅ Message sent to +${number}</div>`;
        } catch (err) {
          alert = `<div class="alert err">❌ Failed: ${err.message}</div>`;
        }
      } else if (!activeSock) {
        alert = `<div class="alert err">❌ Bot is not connected yet.</div>`;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(panelPage("send", alert, B));
    }

    // Broadcast action
    if (url === "/panel/broadcast" && req.method === "POST") {
      const body = await readBody(req);
      const { message } = body;
      let alert = "";
      if (activeSock && message) {
        const chats = store.chats.all();
        let sent = 0;
        for (const chat of chats) {
          try {
            await activeSock.sendMessage(chat.id, { text: `📢 *Broadcast — Kartelo 🇯🇲 Official MD*\n\n${message}` });
            sent++;
            await new Promise((r) => setTimeout(r, 500));
          } catch {}
        }
        addLog(`Panel broadcast sent to ${sent} chats`);
        alert = `<div class="alert ok">✅ Broadcast sent to ${sent} chats.</div>`;
      } else if (!activeSock) {
        alert = `<div class="alert err">❌ Bot is not connected yet.</div>`;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(panelPage("broadcast", alert, B));
    }

    // 404
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  });

  server.listen(PORT, () => {
    console.log(`🌐 Admin panel running on port ${PORT}`);
  });

  return server;
}

// ──────────────────────────────────────────────
// ENTRY POINT
// ──────────────────────────────────────────────

// Start keep-alive HTTP server
startServer();

// Start WhatsApp bot
startBot().then((sock) => {
  activeSock = sock;
  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") {
      botStatus = "connected";
      currentPairingCode = "";
      currentQRCode = "";
      botConnectedAt = new Date().toISOString();
      addLog("Bot connected to WhatsApp ✅");
    } else if (connection === "close") {
      botStatus = "disconnected";
      activeSock = null;
      addLog("Bot disconnected ❌");
    }
  });
}).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
