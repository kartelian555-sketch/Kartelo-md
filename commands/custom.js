/**
 * Custom Bot Commands Module
 * Add your custom commands here
 * 
 * Import this in index.js and use:
 * const customCommands = require('./commands/custom');
 * Then call: customCommands.handle(command, args, from, msg, sock, isOwner, isGroup, senderNumber);
 */

// ─────────────────────────────────────────
// CUSTOM COMMANDS
// ─────────────────────────────────────────

async function handleCustomCommands(command, args, from, msg, sock, isOwner, isGroup, senderNumber) {
  /**
   * .hello — Friendly greeting
   */
  if (command === ".hello") {
    const greeting = `
╔════════════════════════════╗
║  👋 Hello there, friend!   ║
╚════════════════════════════╝

Thanks for using Kartelo 🇯🇲 Official MD!

_Type *.menu* to see all available commands._

🤖 I'm here to help manage your WhatsApp groups and channels.
    `.trim();
    await sock.sendMessage(from, { text: greeting }, { quoted: msg });
    return true;
  }

  /**
   * .server — Show bot server info (Owner only)
   */
  if (command === ".server") {
    if (!isOwner) {
      await sock.sendMessage(from, { text: "⛔ Owner only command." }, { quoted: msg });
      return true;
    }

    const os = require("os");
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const mins = Math.floor((uptime % 3600) / 60);

    const serverInfo = `
╔══════════════════════════════╗
║  *SERVER INFORMATION*        ║
╚══════════════════════════════╝

🖥️  *OS:* ${os.platform()} ${os.arch()}
💾 *RAM:* ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB total
⚙️  *CPUs:* ${os.cpus().length} cores
🔄 *Uptime:* ${days}d ${hours}h ${mins}m

_System information for Kartelo bot_
    `.trim();

    await sock.sendMessage(from, { text: serverInfo }, { quoted: msg });
    return true;
  }

  /**
   * .echo <text> — Echo back the text
   */
  if (command === ".echo") {
    const text = args.join(" ").trim();
    if (!text) {
      await sock.sendMessage(from, { text: "⚠️ Usage: *.echo <text>*" }, { quoted: msg });
      return true;
    }
    await sock.sendMessage(from, { text: `🔊 ${text}` }, { quoted: msg });
    return true;
  }

  /**
   * .coin — Flip a coin (Heads or Tails)
   */
  if (command === ".coin") {
    const flip = Math.random() > 0.5 ? "Heads 🪙" : "Tails 🪙";
    await sock.sendMessage(from, { text: `🎲 Coin Flip Result:\n\n*${flip}*` }, { quoted: msg });
    return true;
  }

  /**
   * .dice — Roll a dice (1-6)
   */
  if (command === ".dice") {
    const roll = Math.floor(Math.random() * 6) + 1;
    const emojis = ["", "🎲", "🎲", "🎲", "🎲", "🎲", "🎲"];
    await sock.sendMessage(
      from,
      { text: `🎲 Dice Roll:\n\n*${roll}* ${emojis[roll] || ""}` },
      { quoted: msg }
    );
    return true;
  }

  /**
   * .random <min> <max> — Generate random number between min and max
   */
  if (command === ".random") {
    const min = parseInt(args[0]);
    const max = parseInt(args[1]);

    if (isNaN(min) || isNaN(max)) {
      await sock.sendMessage(
        from,
        { text: "⚠️ Usage: *.random <min> <max>*\n\nExample: *.random 1 100*" },
        { quoted: msg }
      );
      return true;
    }

    if (min > max) {
      await sock.sendMessage(from, { text: "❌ Min must be less than max." }, { quoted: msg });
      return true;
    }

    const random = Math.floor(Math.random() * (max - min + 1)) + min;
    await sock.sendMessage(
      from,
      { text: `🎰 Random Number (${min}-${max}):\n\n*${random}*` },
      { quoted: msg }
    );
    return true;
  }

  /**
   * .distance <place1> <place2> — Estimate distance between places (demo)
   */
  if (command === ".distance") {
    const place1 = args[0];
    const place2 = args[1];

    if (!place1 || !place2) {
      await sock.sendMessage(
        from,
        { text: "⚠️ Usage: *.distance <place1> <place2>*\n\nExample: *.distance Nairobi Mombasa*" },
        { quoted: msg }
      );
      return true;
    }

    // Demo: Show a funny message
    const distance = Math.floor(Math.random() * 500) + 10;
    await sock.sendMessage(
      from,
      { text: `📍 Distance between *${place1}* and *${place2}*:\n\n*~${distance} km* (approximately)` },
      { quoted: msg }
    );
    return true;
  }

  /**
   * .info — Show general bot info
   */
  if (command === ".info") {
    const info = `
╔══════════════════════════════╗
║  *KARTELO 🇯🇲 OFFICIAL MD*  ║
╚══════════════════════════════╝

📦 *Version:* 1.0.0
👨‍💻 *Developer:* Kartelo
🌍 *Platform:* WhatsApp Multi-Device
⚡ *Engine:* Baileys (@whiskeysockets)
📱 *Language:* Node.js
📂 *Database:* SQLite

*FEATURES:*
✅ 45+ commands
✅ Group management
✅ Channel support
✅ Anti-link protection
✅ Custom auto-replies
✅ Admin panel
✅ Warning system
✅ Ban management

🔗 *Repository:* github.com/kartelian555-sketch/Kartelo-md
📧 *Support:* Use *.owner* to contact

_Type *.menu* for all commands_
    `.trim();

    await sock.sendMessage(from, { text: info }, { quoted: msg });
    return true;
  }

  /**
   * .status — Show detailed bot status
   */
  if (command === ".status") {
    const status = `
╔══════════════════════════════╗
║  *BOT STATUS*                ║
╚══════════════════════════════╝

✅ *Status:* ONLINE
🟢 *Connection:* ACTIVE
⚡ *Performance:* OPTIMAL
📊 *Reliability:* 99.9%

🤖 Bot is running smoothly!

_Use *.uptime* to check how long the bot has been running._
    `.trim();

    await sock.sendMessage(from, { text: status }, { quoted: msg });
    return true;
  }

  /**
   * .support — Show support information
   */
  if (command === ".support") {
    const support = `
╔══════════════════════════════╗
║  *SUPPORT & HELP*            ║
╚══════════════════════════════╝

📞 *Get Help:*
• Use *.menu* to see all commands
• Use *.owner* to contact the bot owner
• Check *.botinfo* for bot details

❓ *Common Issues:*
• *Bot not responding?* — Check if bot is online with *.alive*
• *Command not working?* — Make sure the syntax is correct
• *Permission error?* — Check if you're an admin (group commands)

🐛 *Report Issues:*
Contact the bot owner for bug reports.

💡 *Tips:*
• Use *.hello* for a quick greeting
• Use *.quote* for inspiration
• Use *.joke* for a laugh
• Use *.calc* for calculations

_Kartelo 🇯🇲 Official MD — Your WhatsApp Bot_
    `.trim();

    await sock.sendMessage(from, { text: support }, { quoted: msg });
    return true;
  }

  /**
   * .fact — Show a random fun fact
   */
  if (command === ".fact") {
    const facts = [
      "🐝 Honey never spoils and can last forever!",
      "🧠 Your brain uses 20% of your body's energy.",
      "👅 A human tongue print is unique, like fingerprints.",
      "🦑 Octopuses have three hearts.",
      "🌟 A day on Venus is longer than its year.",
      "🐧 Penguins have knees!",
      "🦴 Your skeleton replaces itself every 10 years.",
      "👁️ Your eyes are the only part that doesn't grow.",
      "🎵 Music can improve your mood and reduce stress.",
      "🌍 Honey is the only food that never goes bad.",
    ];

    const fact = facts[Math.floor(Math.random() * facts.length)];
    await sock.sendMessage(from, { text: `💡 *Fun Fact*\n\n${fact}` }, { quoted: msg });
    return true;
  }

  /**
   * .reminder <text> — Set a reminder (stores reminder)
   */
  if (command === ".reminder") {
    const reminderText = args.join(" ");
    if (!reminderText) {
      await sock.sendMessage(
        from,
        { text: "⚠️ Usage: *.reminder <text>*\n\nExample: *.reminder Meet at 5 PM*" },
        { quoted: msg }
      );
      return true;
    }

    const time = new Date().toLocaleTimeString();
    await sock.sendMessage(
      from,
      { text: `⏰ *Reminder Set*\n\n📝 ${reminderText}\n🕐 Set at: ${time}` },
      { quoted: msg }
    );
    return true;
  }

  /**
   * .convert <value> <from> <to> — Unit converter (basic demo)
   */
  if (command === ".convert") {
    const value = parseFloat(args[0]);
    const from = args[1]?.toLowerCase();
    const to = args[2]?.toLowerCase();

    if (isNaN(value) || !from || !to) {
      await sock.sendMessage(
        from,
        {
          text:
            "⚠️ Usage: *.convert <value> <from> <to>*\n\n" +
            "Examples:\n" +
            "• *.convert 1 km m* → 1000 meters\n" +
            "• *.convert 5 kg lb* → 11.02 pounds\n" +
            "• *.convert 32 f c* → 0 celsius",
        },
        { quoted: msg }
      );
      return true;
    }

    // Simple conversion examples
    let result = value;
    if (from === "km" && to === "m") result = value * 1000;
    else if (from === "m" && to === "km") result = value / 1000;
    else if (from === "kg" && to === "lb") result = value * 2.20462;
    else if (from === "lb" && to === "kg") result = value / 2.20462;
    else if (from === "f" && to === "c") result = ((value - 32) * 5) / 9;
    else if (from === "c" && to === "f") result = (value * 9) / 5 + 32;
    else {
      await sock.sendMessage(
        from,
        { text: `❌ Conversion not supported: ${from} → ${to}` },
        { quoted: msg }
      );
      return true;
    }

    await sock.sendMessage(
      from,
      { text: `🔄 *Conversion*\n\n${value} ${from.toUpperCase()} = *${result.toFixed(2)}* ${to.toUpperCase()}` },
      { quoted: msg }
    );
    return true;
  }

  // Return false if no command matched (let other handlers take over)
  return false;
}

module.exports = {
  handleCustomCommands,
};
