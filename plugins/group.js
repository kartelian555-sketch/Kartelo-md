/**
 * KARTELO MD — Group Management Plugin (plugins/group.js)
 */
const { getMentionedJids } = require("../lib/functions");

module.exports = {
  name: "group",
  commands: ["tagall","hidetag","kick","promote","demote","mute","unmute","mutenotif","unmutenotif","antilink","welcome","goodbye","groupinfo","setname","setdesc","link","revoke"],
  async handler(ctx) {
    const { sock, msg, body, args, isGroup, groupMetadata, config } = ctx;
    if (!isGroup) return sock.sendMessage(msg.key.remoteJid, { text: "❌ This command only works in groups." });
    const gid = msg.key.remoteJid;
    const participants = groupMetadata?.participants || [];
    const senderIsAdmin = participants.some(p => p.id === ctx.sender && (p.admin === "admin" || p.admin === "superadmin"));
    const botIsAdmin = participants.some(p => p.id === sock.user.id && (p.admin === "admin" || p.admin === "superadmin"));

    if (body === ".tagall" || body === ".hidetag") {
      if (!senderIsAdmin && !ctx.isOwner) return sock.sendMessage(gid, { text: "❌ Admin only." });
      const text = body === ".hidetag" && args.length ? args.join(" ") : "*_📢 TAG ALL_*\n" + (groupMetadata.subject||"") + "\n\n";
      const mentions = participants.map(p => p.id);
      if (body === ".hidetag") return sock.sendMessage(gid, { text, mentions });
      const list = participants.map((p,i) => "│ " + (i+1) + ". @" + p.id.split("@")[0]).join("\n");
      return sock.sendMessage(gid, { text: text + "\n╭─❖\n" + list + "\n╰─❖", mentions });
    }
    if (body === ".kick") {
      if (!senderIsAdmin && !ctx.isOwner) return sock.sendMessage(gid, { text: "❌ Admin only." });
      if (!botIsAdmin) return sock.sendMessage(gid, { text: "❌ I need to be admin." });
      const m = getMentionedJids(msg);
      if (!m.length) return sock.sendMessage(gid, { text: "❌ Mention the user. Usage: .kick @user" });
      await sock.groupParticipantsUpdate(gid, m, "remove");
      return sock.sendMessage(gid, { text: "✅ Kicked " + m.length + " user(s)." });
    }
    if (body === ".promote" || body === ".demote") {
      if (!senderIsAdmin && !ctx.isOwner) return sock.sendMessage(gid, { text: "❌ Admin only." });
      if (!botIsAdmin) return sock.sendMessage(gid, { text: "❌ I need to be admin." });
      const m = getMentionedJids(msg);
      if (!m.length) return sock.sendMessage(gid, { text: "❌ Mention a user. Usage: " + body + " @user" });
      await sock.groupParticipantsUpdate(gid, m, body === ".promote" ? "promote" : "demote");
      return sock.sendMessage(gid, { text: "✅ Done." });
    }
    if (body === ".mute" || body === ".unmute") {
      if (!senderIsAdmin && !ctx.isOwner) return sock.sendMessage(gid, { text: "❌ Admin only." });
      if (!botIsAdmin) return sock.sendMessage(gid, { text: "❌ I need to be admin." });
      await sock.groupSettingUpdate(gid, body === ".mute" ? "announcement" : "not_announcement");
      return sock.sendMessage(gid, { text: body === ".mute" ? "🔇 Group muted." : "🔊 Group unmuted." });
    }
    if (body.startsWith(".antilink")) {
      if (!senderIsAdmin && !ctx.isOwner) return sock.sendMessage(gid, { text: "❌ Admin only." });
      const v = args[0]?.toLowerCase();
      const s = ctx.db.getGroupSettings(gid);
      if (v === "on" || v === "off") { ctx.db.setGroupSetting(gid, "antilink", v === "on" ? 1 : 0); return sock.sendMessage(gid, { text: "✅ Anti-link " + v.toUpperCase() }); }
      return sock.sendMessage(gid, { text: "Anti-link: " + (s.antilink ? "ON" : "OFF") + ". Use .antilink on/off" });
    }
    if (body.startsWith(".welcome")) {
      if (!senderIsAdmin && !ctx.isOwner) return sock.sendMessage(gid, { text: "❌ Admin only." });
      const v = args[0]?.toLowerCase();
      const s = ctx.db.getGroupSettings(gid);
      if (v === "on" || v === "off") { ctx.db.setGroupSetting(gid, "welcome", v === "on" ? 1 : 0); return sock.sendMessage(gid, { text: "✅ Welcome " + v.toUpperCase() }); }
      return sock.sendMessage(gid, { text: "Welcome: " + (s.welcome ? "ON" : "OFF") + ". Use .welcome on/off" });
    }
    if (body === ".groupinfo") {
      return sock.sendMessage(gid, { text: "📋 *Group Info*\n\n🏷️ Name: " + (groupMetadata.subject||"") + "\n👥 Members: " + participants.length + "\n👑 Owner: " + (groupMetadata.owner || "Unknown") + "\n📝 Desc: " + (groupMetadata.desc || "No description") });
    }
    if (body.startsWith(".setname ") && isGroup) {
      if (!senderIsAdmin && !ctx.isOwner) return sock.sendMessage(gid, { text: "❌ Admin only." });
      const n = args.join(" "); if (!n) return sock.sendMessage(gid, { text: "❌ Usage: .setname [name]" });
      await sock.groupUpdateSubject(gid, n); return sock.sendMessage(gid, { text: "✅ Name changed." });
    }
    if (body.startsWith(".setdesc ")) {
      if (!senderIsAdmin && !ctx.isOwner) return sock.sendMessage(gid, { text: "❌ Admin only." });
      await sock.groupUpdateDescription(gid, args.join(" ")); return sock.sendMessage(gid, { text: "✅ Description updated." });
    }
    if (body === ".link") {
      if (!botIsAdmin) return sock.sendMessage(gid, { text: "❌ I need to be admin." });
      const c = await sock.groupInviteCode(gid); return sock.sendMessage(gid, { text: "🔗 https://chat.whatsapp.com/" + c });
    }
    if (body === ".revoke") {
      if (!senderIsAdmin && !ctx.isOwner) return sock.sendMessage(gid, { text: "❌ Admin only." });
      if (!botIsAdmin) return sock.sendMessage(gid, { text: "❌ I need to be admin." });
      await sock.groupRevokeInvite(gid); return sock.sendMessage(gid, { text: "✅ Link revoked." });
    }
    return null;
  },
};
