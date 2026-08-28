/**
 * KARTELO MD — Fancy Menu (lib/menu.js)
 * JUNE-X style decorated box menu.
 */
const { runtime } = require("./functions");

function buildMenu(opts = {}) {
  const pushName = opts.pushName || "User";
  const isPublic = opts.isPublic !== false;
  const startTime = opts.startTime || Date.now();
  const p = opts.prefix || ".";
  const botName = opts.botName || "KARTELO MD";
  const ownerName = opts.ownerName || "KARTELO OFFICIAL";
  const uptime = runtime(startTime);
  const mode = isPublic ? "PUBLIC" : "SELF";
  const date = new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" });

  return `
╭───『 ${botName} 』───❖
│ 👤 User: ${pushName}
│ 🤖 Mode: ${mode}
│ ⏱️ Uptime: ${uptime}
│ 📅 ${date}
│ 👑 Owner: ${ownerName}
╰───────────────❖

╭───『 📥 DOWNLOAD 』───❖
│ • ${p}play [song name]
│ • ${p}video [video name]
│ • ${p}ytmp3 / ${p}ytmp4 [url]
│ • ${p}dl [url]
╰───────────────❖

╭───『 🤖 AI 』───❖
│ • ${p}ai [question]
│ • ${p}imagine [prompt]
│ • ${p}wiki [query]
│ • ${p}define [word]
│ • ${p}tr [text]
╰───────────────❖

╭───『 😀 STICKER 』───❖
│ • ${p}sticker (reply to image)
│ • ${p}s (reply to image/video)
│ • ${p}toimg (reply to sticker)
│ • ${p}qr [text]
╰───────────────❖

╭───『 👥 GROUP 』───❖
│ • ${p}tagall / ${p}hidetag
│ • ${p}kick / ${p}promote / ${p}demote
│ • ${p}mute / ${p}unmute
│ • ${p}antilink / ${p}welcome
│ • ${p}groupinfo / ${p}link / ${p}revoke
│ • ${p}setname / ${p}setdesc
╰───────────────❖

╭───『 🛡️ MODERATION 』───❖
│ • ${p}ban / ${p}unban
│ • ${p}warn / ${p}warns / ${p}clearwarn
│ • ${p}banlist / ${p}purge
╰───────────────❖

╭───『 💰 ECONOMY 』───❖
│ • ${p}wallet / ${p}balance
│ • ${p}daily / ${p}weekly
│ • ${p}gamble / ${p}bet
│ • ${p}pay / ${p}transfer
│ • ${p}leaderboard / ${p}lb
╰───────────────❖

╭───『 🎮 FUN & GAMES 』───❖
│ • ${p}truth / ${p}dare / ${p}wyr
│ • ${p}8ball / ${p}coin / ${p}dice / ${p}rps
│ • ${p}ship / ${p}pick
│ • ${p}joke / ${p}quote / ${p}fact
│ • ${p}motivation
╰───────────────❖

╭───『 📊 LEVELING 』───❖
│ • ${p}profile / ${p}rank / ${p}xp
│ • ${p}setbio / ${p}myname
╰───────────────❖

╭───『 ⚡ UTILITIES 』───❖
│ • ${p}afk / ${p}remind
│ • ${p}weather / ${p}shorten / ${p}calc
│ • ${p}ping / ${p}alive / ${p}uptime / ${p}time
╰───────────────❖

╭───『 📝 NOTES 』───❖
│ • ${p}note / ${p}getnote / ${p}notes / ${p}delnote
│ • ${p}setreply / ${p}replies / ${p}delreply
╰───────────────❖

╭───『 👑 OWNER 』───❖
│ • ${p}setpp / ${p}setabout / ${p}setnamebot
│ • ${p}broadcast / ${p}block / ${p}unblock
│ • ${p}mode / ${p}eval / ${p}dbstats / ${p}restart
╰───────────────❖

╭───『 📺 CHANNEL 』───❖
│ • ${p}followchannel / ${p}unfollowchannel
│ • ${p}channelsend / ${p}channelinfo
╰───────────────❖

> 🔥 Powered by ${botName}
> 📦 https://github.com/kartelian555-sketch/Kartelo-md
> 💬 https://whatsapp.com/channel/0029VaZQBCKHk6Z5i3lQL83g
`;
}

module.exports = { buildMenu };
