/**
 * KARTELO MD — Owner Plugin (plugins/owner.js)
 * ─────────────────────────────────────────────
 * Commands: setpp, setabout, setnamebot, broadcast, block, unblock,
 *           mode, eval, dbstats, restart
 * Owner-only commands.
 */

const fs = require("fs");
const path = require("path");

module.exports = {
  name: "owner",
  commands: [
    "setpp", "setabout", "setnamebot", "broadcast",
    "block", "unblock", "mode", "eval", "dbstats", "restart",
  ],

  async handler(ctx) {
    const { sock, msg, body, args, config, isOwner } = ctx;
    const jid = msg.key.remoteJid;

    if (!isOwner) {
      return sock.sendMessage(jid, { text: "❌ Owner only command." });
    }

    // ── .setpp (set profile picture) ──
    if (body === ".setpp") {
      const imageMsg = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      if (!imageMsg)
        return sock.sendMessage(jid, { text: "❌ Reply to an image. Usage: .setpp (reply to image)" });
      try {
        const stream = await (
          await import("@whiskeysockets/baileys")
        ).downloadContentFromMessage(imageMsg, "image");
        const chunks = [];
        for await (const c of stream) chunks.push(c);
        const buffer = Buffer.concat(chunks);
        const ppPath = path.join(__dirname, "..", "profile-pic.jpg");
        fs.writeFileSync(ppPath, buffer);
        await sock.updateProfilePicture(sock.user.id, buffer);
        return sock.sendMessage(jid, { text: "✅ Profile picture updated!" });
      } catch (e) {
        return sock.sendMessage(jid, { text: "❌ Error: " + e.message });
      }
    }

    // ── .setabout ──
    if (body.startsWith(".setabout ")) {
      const text = args.join(" ");
      if (!text) return sock.sendMessage(jid, { text: "❌ Usage: .setabout [about text]" });
      try {
        await sock.updateProfileStatus(text);
        return sock.sendMessage(jid, { text: `✅ About updated to: ${text}` });
      } catch (e) {
        return sock.sendMessage(jid, { text: "❌ Error: " + e.message });
      }
    }

    // ── .setnamebot ──
    if (body.startsWith(".setnamebot ")) {
      const text = args.join(" ");
      if (!text) return sock.sendMessage(jid, { text: "❌ Usage: .setnamebot [name]" });
      try {
        await sock.updateProfileName(text);
        return sock.sendMessage(jid, { text: `✅ Bot name updated to: ${text}` });
      } catch (e) {
        return sock.sendMessage(jid, { text: "❌ Error: " + e.message });
      }
    }

    // ── .broadcast ──
    if (body.startsWith(".broadcast ")) {
      const text = args.join(" ");
      if (!text) return sock.sendMessage(jid, { text: "❌ Usage: .broadcast [message]" });
      let sent = 0;
      const store = ctx.store;
      if (store && store.chats) {
        for (const [cid] of store.chats) {
          try {
            await sock.sendMessage(cid, { text: `📢 *BROADCAST*\n\n${text}` });
            sent++;
          } catch {}
        }
      }
      return sock.sendMessage(jid, { text: `✅ Broadcast sent to ${sent} chats.` });
    }

    // ── .block / .unblock ──
    if (body === ".block" || body === ".unblock") {
      const mentions = ctx.mentions || [];
      if (!mentions.length)
        return sock.sendMessage(jid, { text: `❌ Mention a user. Usage: ${body} @user` });
      const action = body === ".block" ? "add" : "remove";
      await sock.updateBlockStatus(mentions[0], action);
      return sock.sendMessage(jid, { text: `✅ ${body === ".block" ? "Blocked" : "Unblocked"}` });
    }

    // ── .mode ──
    if (body === ".mode") {
      config.public = !config.public;
      return sock.sendMessage(jid, {
        text: `✅ Bot is now in ${config.public ? "PUBLIC" : "SELF"} mode.`,
      });
    }

    // ── .eval ──
    if (body.startsWith(".eval ")) {
      const code = args.join(" ");
      try {
        const result = eval(code);
        return sock.sendMessage(jid, { text: `📤 ${String(result)}` });
      } catch (e) {
        return sock.sendMessage(jid, { text: `❌ ${e.message}` });
      }
    }

    // ── .dbstats ──
    if (body === ".dbstats") {
      try {
        const stats = ctx.db.getDbStats();
        return sock.sendMessage(jid, {
          text:
            `📊 *Database Stats*\n\n` +
            `👥 Users: ${stats.users || 0}\n` +
            `💰 Economy: ${stats.economy || 0}\n` +
            `⏰ Reminders: ${stats.reminders || 0}\n` +
            `📝 Notes: ${stats.notes || 0}\n` +
            `🚫 Banned: ${stats.banned || 0}\n` +
            `🏆 Profiles: ${stats.profiles || 0}`,
        });
      } catch (e) {
        return sock.sendMessage(jid, { text: "❌ " + e.message });
      }
    }

    // ── .restart ──
    if (body === ".restart") {
      await sock.sendMessage(jid, { text: "🔄 Restarting bot..." });
      setTimeout(() => process.exit(0), 1000);
      return;
    }

    return null;
  },
};
