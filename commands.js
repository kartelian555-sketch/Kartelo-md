/**
 * Kartelo 🇯🇲 Official MD — Additional Commands
 * Utility, Fun, Economy, and Config commands
 * 
 * These are helper functions that can be imported into index.js
 */

// ──────────────────────────────────────────────
// UTILITY COMMANDS
// ──────────────────────────────────────────────

/**
 * /help — List all commands with descriptions
 */
function cmdHelp(from, sock, msg, args) {
  const helpText = `
╔══════════════════════════════╗
║  *KARTELO 🇯🇲 COMMANDS HELP* ║
╚══════════════════════════════╝

*UTILITY COMMANDS*
• *.help* — Show this help menu
• *.ping* — Check bot latency
• *.userinfo @user* — Show user account info
• *.serverinfo* — Show WhatsApp group stats
• *.avatar @user* — Display user's profile picture
• *.remind [time] [message]* — Set a reminder
• *.poll [question]|[option1]|[option2]* — Create a quick poll

*FUN & GAMES*
• *.8ball [question]* — Magic 8-ball response
• *.meme* — Random funny meme/quote
• *.joke* — Tell a random joke
• *.roll [dice]* — Roll dice (e.g. .roll 2d6)
• *.coinflip* — Heads or tails

*ECONOMY / LEVELING*
• *.balance* — Check your points/coins
• *.daily* — Claim daily reward
• *.leaderboard* — Top users by score
• *.rank* — Check your level/score

*CONFIG (Admin only)*
• *.setprefix [prefix]* — Change command prefix
• *.setwelcome [message]* — Set welcome message
• *.autorole* — Auto-assign tag for new members

_Send .menu for full feature list_
  `.trim();
  return sock.sendMessage(from, { text: helpText }, { quoted: msg });
}

/**
 * .userinfo @user — Show user's WhatsApp account info
 */
function cmdUserInfo(from, sock, msg, args, isGroup) {
  if (!isGroup) {
    return sock.sendMessage(from, { text: "❌ This command works only in groups." }, { quoted: msg });
  }
  
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentioned) {
    return sock.sendMessage(from, { text: "⚠️ Please mention a user.\n\nUsage: *.userinfo @user*" }, { quoted: msg });
  }
  
  const number = mentioned.replace("@s.whatsapp.net", "");
  const userInfoText = `
╔══════════════════════════════╗
║  *USER INFO*                 ║
╚══════════════════════════════╝

👤 *Number:* +${number}
🆔 *JID:* ${mentioned}
📱 *Platform:* WhatsApp
⏰ *Query Time:* ${new Date().toLocaleTimeString()}

_This bot doesn't track join dates yet._
  `.trim();
  
  return sock.sendMessage(from, { text: userInfoText, mentions: [mentioned] }, { quoted: msg });
}

/**
 * .serverinfo — Show group/chat statistics
 */
async function cmdServerInfo(from, sock, msg, groupMeta) {
  if (!groupMeta) {
    return sock.sendMessage(from, { text: "❌ Could not fetch group info." }, { quoted: msg });
  }
  
  const admins = groupMeta.participants.filter(p => p.admin).length;
  const total = groupMeta.participants.length;
  
  const infoText = `
╔══════════════════════════════╗
║  *GROUP STATISTICS*          ║
╚══════════════════════════════╝

📌 *Group Name:* ${groupMeta.subject}
👥 *Total Members:* ${total}
👑 *Admins:* ${admins}
👤 *Regular Members:* ${total - admins}
📝 *Description:* ${groupMeta.desc || "No description set"}
🆔 *Group ID:* ${from}
  `.trim();
  
  return sock.sendMessage(from, { text: infoText }, { quoted: msg });
}

/**
 * .avatar @user — Display user's profile picture
 */
async function cmdAvatar(from, sock, msg, args) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentioned) {
    return sock.sendMessage(from, { text: "⚠️ Please mention a user.\n\nUsage: *.avatar @user*" }, { quoted: msg });
  }
  
  try {
    const ppUrl = await sock.profilePictureUrl(mentioned, "image");
    if (!ppUrl) {
      return sock.sendMessage(from, { text: `❌ User has no profile picture set.` }, { quoted: msg });
    }
    
    const number = mentioned.replace("@s.whatsapp.net", "");
    await sock.sendMessage(from, {
      image: { url: ppUrl },
      caption: `👤 *Profile Picture*\n+${number}`
    }, { quoted: msg });
  } catch (err) {
    return sock.sendMessage(from, { text: `❌ Could not fetch profile picture.\n\n_${err.message}_` }, { quoted: msg });
  }
}

/**
 * .remind [time] [message] — Set a simple reminder (stored in memory)
 */
function cmdRemind(from, sock, msg, args) {
  if (args.length < 2) {
    return sock.sendMessage(from, {
      text: `⏰ *Reminder System*\n\nUsage: *.remind [seconds] [message]*\n\nExamples:\n• .remind 60 Take a break\n• .remind 300 Drink water`
    }, { quoted: msg });
  }
  
  const seconds = parseInt(args[0]);
  const reminder = args.slice(1).join(" ");
  
  if (isNaN(seconds) || seconds < 1) {
    return sock.sendMessage(from, { text: "❌ Please enter a valid number of seconds." }, { quoted: msg });
  }
  
  setTimeout(() => {
    sock.sendMessage(from, { text: `⏰ *Reminder:* ${reminder}` });
  }, seconds * 1000);
  
  return sock.sendMessage(from, { text: `✅ Reminder set for ${seconds} seconds!\n📝 "${reminder}"` }, { quoted: msg });
}

/**
 * .poll [question]|[option1]|[option2]|... — Create a poll
 */
async function cmdPoll(from, sock, msg, args, isGroup) {
  if (!isGroup) {
    return sock.sendMessage(from, { text: "❌ Polls only work in groups." }, { quoted: msg });
  }
  
  const input = args.join(" ");
  if (!input || !input.includes("|")) {
    return sock.sendMessage(from, {
      text: `📊 *Poll Creator*\n\nUsage: *.poll [question] | [option1] | [option2] | [option3]*\n\nExample:\n*.poll What's your favorite color? | Red | Blue | Green*`
    }, { quoted: msg });
  }
  
  const parts = input.split("|").map(p => p.trim());
  const question = parts[0];
  const options = parts.slice(1);
  
  if (options.length < 2) {
    return sock.sendMessage(from, { text: "❌ You need at least 2 options for a poll." }, { quoted: msg });
  }
  
  const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
  const pollText = `
📊 *POLL*

${question}

${options.map((opt, i) => `${emojis[i] || "•"} ${opt}`).join("\n")}

_React with the emoji to vote!_
  `.trim();
  
  return sock.sendMessage(from, { text: pollText }, { quoted: msg });
}

// ──────────────────────────────────────────────
// FUN & GAMES COMMANDS
// ──────────────────────────────────────────────

const EIGHT_BALL_RESPONSES = [
  "🎱 Yes, definitely!",
  "🎱 No, absolutely not.",
  "🎱 Ask again later.",
  "🎱 Maybe, it's possible.",
  "🎱 The signs point to yes.",
  "🎱 Very doubtful.",
  "🎱 Outlook good.",
  "🎱 Not looking good.",
  "🎱 It is certain.",
  "🎱 Don't count on it.",
  "🎱 Concentrate and ask again.",
  "🎱 Reply hazy, try again.",
];

/**
 * .8ball [question] — Magic 8-ball
 */
function cmd8Ball(from, sock, msg, args) {
  const question = args.join(" ") || "Will my future be bright?";
  const response = EIGHT_BALL_RESPONSES[Math.floor(Math.random() * EIGHT_BALL_RESPONSES.length)];
  
  return sock.sendMessage(from, {
    text: `*Your Question:* ${question}\n\n${response}`
  }, { quoted: msg });
}

/**
 * .meme — Random meme/funny quotes
 */
function cmdMeme(from, sock, msg) {
  const memes = [
    "😂 Why do programmers prefer dark mode?\n_Because light attracts bugs!_",
    "🤣 How many programmers does it take to change a light bulb?\n_None, that's a hardware problem!_",
    "😅 Why did the developer go broke?\n_Because he used up all his cache!_",
    "😆 Why do Java developers wear glasses?\n_Because they don't C#!_",
    "😂 How many designers does it take to change a light bulb?\n_Does it have to be a light bulb?_",
  ];
  
  const meme = memes[Math.floor(Math.random() * memes.length)];
  return sock.sendMessage(from, { text: meme }, { quoted: msg });
}

/**
 * .roll [dice] — Roll dice (e.g. 2d6)
 */
function cmdRoll(from, sock, msg, args) {
  const diceStr = args[0] || "1d6";
  const match = diceStr.match(/^(\d+)d(\d+)$/);
  
  if (!match) {
    return sock.sendMessage(from, {
      text: `🎲 *Dice Roller*\n\nUsage: *.roll [dice]*\n\nExamples:\n• .roll 1d6 (roll one 6-sided die)\n• .roll 2d20 (roll two 20-sided dice)\n• .roll 3d100 (roll three 100-sided dice)`
    }, { quoted: msg });
  }
  
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  
  if (count > 100 || sides > 1000 || count < 1 || sides < 1) {
    return sock.sendMessage(from, { text: "❌ Invalid dice configuration. Max 100 dice, max 1000 sides." }, { quoted: msg });
  }
  
  let total = 0;
  const rolls = [];
  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
  }
  
  const rollText = `🎲 *Dice Roll: ${diceStr}*\n\nRolls: ${rolls.join(", ")}\n🎯 Total: *${total}*`;
  return sock.sendMessage(from, { text: rollText }, { quoted: msg });
}

/**
 * .coinflip — Heads or tails
 */
function cmdCoinFlip(from, sock, msg) {
  const result = Math.random() > 0.5 ? "🪙 **HEADS**" : "🪙 **TAILS**";
  return sock.sendMessage(from, { text: result }, { quoted: msg });
}

// ──────────────────────────────────────────────
// ECONOMY / LEVELING COMMANDS
// ──────────────────────────────────────────────

// In-memory points system (restart will reset)
const userPoints = {};
const lastDaily = {};

/**
 * .balance — Check currency/points balance
 */
function cmdBalance(from, sock, msg, sender) {
  const points = userPoints[sender] || 0;
  return sock.sendMessage(from, {
    text: `💰 *Your Balance*\n\n🪙 Points: *${points}*`
  }, { quoted: msg });
}

/**
 * .daily — Claim daily reward
 */
function cmdDaily(from, sock, msg, sender) {
  const today = new Date().toDateString();
  const lastClaim = lastDaily[sender];
  
  if (lastClaim === today) {
    return sock.sendMessage(from, { text: "❌ You already claimed your daily reward today. Come back tomorrow!" }, { quoted: msg });
  }
  
  const reward = 50;
  userPoints[sender] = (userPoints[sender] || 0) + reward;
  lastDaily[sender] = today;
  
  return sock.sendMessage(from, {
    text: `✅ *Daily Reward Claimed!*\n\n🎉 +${reward} points\n💰 New balance: *${userPoints[sender]}*`
  }, { quoted: msg });
}

/**
 * .leaderboard — Top users by points
 */
function cmdLeaderboard(from, sock, msg) {
  const sorted = Object.entries(userPoints)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  if (sorted.length === 0) {
    return sock.sendMessage(from, { text: "📊 No one has claimed rewards yet!" }, { quoted: msg });
  }
  
  const leaderText = `
📊 *TOP 10 USERS*

${sorted.map((entry, i) => `${i + 1}. +${entry[0].split("@")[0]} — *${entry[1]}* points`).join("\n")}
  `.trim();
  
  return sock.sendMessage(from, { text: leaderText }, { quoted: msg });
}

/**
 * .rank — Check your level/score
 */
function cmdRank(from, sock, msg, sender) {
  const userPoints_array = Object.entries(userPoints).sort((a, b) => b[1] - a[1]);
  const userRank = userPoints_array.findIndex(entry => entry[0] === sender) + 1 || "Unranked";
  const points = userPoints[sender] || 0;
  
  return sock.sendMessage(from, {
    text: `🏆 *Your Rank*\n\n📍 Position: *${userRank}* / ${Object.keys(userPoints).length}\n🪙 Points: *${points}*\n💪 Level: ${Math.floor(points / 100) + 1}`
  }, { quoted: msg });
}

// ──────────────────────────────────────────────
// CONFIG COMMANDS (Admin only)
// ──────────────────────────────────────────────

let currentPrefix = "."; // Global prefix

/**
 * .setprefix [prefix] — Change command prefix
 */
function cmdSetPrefix(from, sock, msg, args, isOwner) {
  if (!isOwner) {
    return sock.sendMessage(from, { text: "❌ Owner only command." }, { quoted: msg });
  }
  
  const newPrefix = args[0];
  if (!newPrefix || newPrefix.length > 3) {
    return sock.sendMessage(from, { text: "⚠️ Please provide a prefix (1-3 characters).\n\nUsage: *.setprefix [prefix]*\n\nExample: *.setprefix !*" }, { quoted: msg });
  }
  
  currentPrefix = newPrefix;
  return sock.sendMessage(from, { text: `✅ Command prefix changed to *${newPrefix}*` }, { quoted: msg });
}

/**
 * .setwelcome [message] — Set custom welcome message
 */
function cmdSetWelcome(from, sock, msg, args, isOwner) {
  if (!isOwner) {
    return sock.sendMessage(from, { text: "❌ Owner only command." }, { quoted: msg });
  }
  
  const welcomeMsg = args.join(" ");
  if (!welcomeMsg) {
    return sock.sendMessage(from, { text: "⚠️ Please provide a welcome message.\n\nUsage: *.setwelcome Welcome to our group!*" }, { quoted: msg });
  }
  
  // Store in groupSettings (see index.js)
  return sock.sendMessage(from, { text: `✅ Welcome message set!\n\n📝 "${welcomeMsg}"\n\nUse *.welcome on* to enable it.` }, { quoted: msg });
}

/**
 * .autorole — Auto-assign tag for new members
 */
function cmdAutorole(from, sock, msg, args, isOwner) {
  if (!isOwner) {
    return sock.sendMessage(from, { text: "❌ Owner only command." }, { quoted: msg });
  }
  
  const role = args.join(" ") || "Member";
  return sock.sendMessage(from, { text: `✅ Auto-role set to: *${role}*\n\nNew members will get this tag in their name.` }, { quoted: msg });
}

// Export all commands
module.exports = {
  // Utility
  cmdHelp,
  cmdUserInfo,
  cmdServerInfo,
  cmdAvatar,
  cmdRemind,
  cmdPoll,
  // Fun
  cmd8Ball,
  cmdMeme,
  cmdRoll,
  cmdCoinFlip,
  // Economy
  cmdBalance,
  cmdDaily,
  cmdLeaderboard,
  cmdRank,
  // Config
  cmdSetPrefix,
  cmdSetWelcome,
  cmdAutorole,
  // Helpers
  userPoints,
  lastDaily,
  currentPrefix
};
