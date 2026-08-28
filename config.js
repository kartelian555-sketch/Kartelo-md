/**
 * KARTELO MD — Global Configuration (JUNE-X Style)
 * All bot settings live here. Edit this file OR set
 * environment variables to override at deploy time.
 */
require("dotenv").config();

const global = {
  owner: [process.env.OWNER_NUMBER || "254711939375"],
  ownerName: process.env.OWNER_NAME || "KARTELO OFFICIAL",
  botName: process.env.BOT_NAME || "KARTELO MD",
  prefix: process.env.PREFIX || ".",
  packname: process.env.PACKNAME || "KARTELO MD",
  author: process.env.AUTHOR || "By Kartelo",
  channelLink: process.env.CHANNEL_LINK || "https://whatsapp.com/channel/0029VaZQBCKHk6Z5i3lQL83g",
  githubRepo: process.env.GITHUB_REPO || "https://github.com/kartelian555-sketch/Kartelo-md",
  pairingCode: process.env.USE_PAIRING_CODE !== "false",
  sessionId: process.env.SESSION_ID || "",
  port: parseInt(process.env.PORT || "3000", 10),
  public: (process.env.MODE || "public").toLowerCase() !== "self",
  panelPassword: process.env.PANEL_PASSWORD || "kartelo2024",
  apiKey: process.env.API_KEY || "kartelo-secret-api-key-2024",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  weatherApiKey: process.env.WEATHER_API_KEY || "",
  autoTyping: process.env.AUTO_TYPING !== "false",
  autoRead: process.env.AUTO_READ !== "false",
  autoStatusView: process.env.AUTO_STATUS_VIEW !== "false",
  botAbout: process.env.BOT_ABOUT || "🤖 KARTELO MD — The Most Powerful WhatsApp Bot | Type .menu",
  botDisplayName: process.env.BOT_DISPLAY_NAME || "KARTELO MD",
  autoJoinGroup: process.env.AUTO_JOIN_GROUP || "",
  autoJoinChannel: process.env.AUTO_JOIN_CHANNEL || "",
  autoJoinMessage: process.env.AUTO_JOIN_MESSAGE || "👋 Welcome! Join our group and channel below:",
};

module.exports = global;
