const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "kartelo.db"));

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS banned_users (
    jid TEXT PRIMARY KEY,
    reason TEXT,
    banned_by TEXT,
    banned_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jid TEXT NOT NULL,
    group_jid TEXT NOT NULL,
    reason TEXT,
    warned_by TEXT,
    warned_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    group_jid TEXT,
    created_by TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS custom_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger TEXT NOT NULL UNIQUE,
    response TEXT NOT NULL,
    created_by TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS group_settings (
    group_jid TEXT PRIMARY KEY,
    antilink INTEGER DEFAULT 0,
    welcome_on INTEGER DEFAULT 1,
    goodbye_on INTEGER DEFAULT 1,
    antispam INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS command_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    sender TEXT,
    group_jid TEXT,
    used_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS economy (
    jid TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    last_daily INTEGER DEFAULT 0,
    last_weekly INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS afk (
    jid TEXT PRIMARY KEY,
    reason TEXT DEFAULT 'AFK',
    group_jid TEXT,
    set_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jid TEXT NOT NULL,
    chat_jid TEXT NOT NULL,
    message TEXT NOT NULL,
    remind_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    jid TEXT PRIMARY KEY,
    display_name TEXT,
    bio TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    messages_count INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );
`);

// ─────────────────────────────────────────────────────────────────────────────
// BANNED USERS
// ─────────────────────────────────────────────────────────────────────────────
const banUser = (jid, reason = "No reason", banned_by = "") =>
  db.prepare("INSERT OR REPLACE INTO banned_users (jid, reason, banned_by) VALUES (?, ?, ?)").run(jid, reason, banned_by);

const unbanUser = (jid) =>
  db.prepare("DELETE FROM banned_users WHERE jid = ?").run(jid);

const isBanned = (jid) =>
  !!db.prepare("SELECT 1 FROM banned_users WHERE jid = ?").get(jid);

const getBannedUsers = () =>
  db.prepare("SELECT * FROM banned_users ORDER BY banned_at DESC").all();

// ─────────────────────────────────────────────────────────────────────────────
// WARNINGS
// ─────────────────────────────────────────────────────────────────────────────
const warnUser = (jid, group_jid, reason = "No reason", warned_by = "") =>
  db.prepare("INSERT INTO warnings (jid, group_jid, reason, warned_by) VALUES (?, ?, ?, ?)").run(jid, group_jid, reason, warned_by);

const getWarnings = (jid, group_jid) =>
  db.prepare("SELECT * FROM warnings WHERE jid = ? AND group_jid = ? ORDER BY warned_at DESC").all(jid, group_jid);

const getWarnCount = (jid, group_jid) =>
  db.prepare("SELECT COUNT(*) as count FROM warnings WHERE jid = ? AND group_jid = ?").get(jid, group_jid).count;

const clearWarnings = (jid, group_jid) =>
  db.prepare("DELETE FROM warnings WHERE jid = ? AND group_jid = ?").run(jid, group_jid);

// ─────────────────────────────────────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────────────────────────────────────
const saveNote = (name, content, group_jid, created_by) =>
  db.prepare("INSERT OR REPLACE INTO notes (name, content, group_jid, created_by) VALUES (?, ?, ?, ?)").run(name.toLowerCase(), content, group_jid, created_by);

const getNote = (name, group_jid) =>
  db.prepare("SELECT * FROM notes WHERE name = ? AND group_jid = ?").get(name.toLowerCase(), group_jid);

const deleteNote = (name, group_jid) =>
  db.prepare("DELETE FROM notes WHERE name = ? AND group_jid = ?").run(name.toLowerCase(), group_jid);

const listNotes = (group_jid) =>
  db.prepare("SELECT name FROM notes WHERE group_jid = ? ORDER BY name").all(group_jid);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM REPLIES
// ─────────────────────────────────────────────────────────────────────────────
const setReply = (trigger, response, created_by) =>
  db.prepare("INSERT OR REPLACE INTO custom_replies (trigger, response, created_by) VALUES (?, ?, ?)").run(trigger.toLowerCase(), response, created_by);

const getReply = (trigger) =>
  db.prepare("SELECT * FROM custom_replies WHERE trigger = ?").get(trigger.toLowerCase());

const deleteReply = (trigger) =>
  db.prepare("DELETE FROM custom_replies WHERE trigger = ?").run(trigger.toLowerCase());

const listReplies = () =>
  db.prepare("SELECT trigger, response FROM custom_replies ORDER BY trigger").all();

// ─────────────────────────────────────────────────────────────────────────────
// GROUP SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
const getGroupSettings = (group_jid) => {
  let s = db.prepare("SELECT * FROM group_settings WHERE group_jid = ?").get(group_jid);
  if (!s) {
    db.prepare("INSERT OR IGNORE INTO group_settings (group_jid) VALUES (?)").run(group_jid);
    s = db.prepare("SELECT * FROM group_settings WHERE group_jid = ?").get(group_jid);
  }
  return s;
};

const setGroupSetting = (group_jid, key, value) => {
  getGroupSettings(group_jid);
  db.prepare(`UPDATE group_settings SET ${key} = ?, updated_at = strftime('%s','now') WHERE group_jid = ?`).run(value, group_jid);
};

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND LOGS
// ─────────────────────────────────────────────────────────────────────────────
const logCommand = (command, sender, group_jid) =>
  db.prepare("INSERT INTO command_logs (command, sender, group_jid) VALUES (?, ?, ?)").run(command, sender, group_jid);

const getCommandStats = () =>
  db.prepare("SELECT command, COUNT(*) as count FROM command_logs GROUP BY command ORDER BY count DESC LIMIT 10").all();

const getTotalCommands = () =>
  db.prepare("SELECT COUNT(*) as count FROM command_logs").get().count;

// ─────────────────────────────────────────────────────────────────────────────
// DB STATS
// ─────────────────────────────────────────────────────────────────────────────
const getDbStats = () => ({
  banned: db.prepare("SELECT COUNT(*) as c FROM banned_users").get().c,
  warnings: db.prepare("SELECT COUNT(*) as c FROM warnings").get().c,
  notes: db.prepare("SELECT COUNT(*) as c FROM notes").get().c,
  replies: db.prepare("SELECT COUNT(*) as c FROM custom_replies").get().c,
  groups: db.prepare("SELECT COUNT(*) as c FROM group_settings").get().c,
  commands: db.prepare("SELECT COUNT(*) as c FROM command_logs").get().c,
});

// ─────────────────────────────────────────────────────────────────────────────
// ECONOMY (DB-backed, persists across restarts)
// ─────────────────────────────────────────────────────────────────────────────
const getBalance = (jid) => {
  let row = db.prepare("SELECT * FROM economy WHERE jid = ?").get(jid);
  if (!row) {
    db.prepare("INSERT OR IGNORE INTO economy (jid) VALUES (?)").run(jid);
    row = db.prepare("SELECT * FROM economy WHERE jid = ?").get(jid);
  }
  return row;
};

const addBalance = (jid, amount) => {
  getBalance(jid);
  db.prepare("UPDATE economy SET balance = balance + ?, updated_at = strftime('%s','now') WHERE jid = ?").run(amount, jid);
  return getBalance(jid).balance;
};

const setLastDaily = (jid, ts) =>
  db.prepare("UPDATE economy SET last_daily = ? WHERE jid = ?").run(ts, jid);

const setLastWeekly = (jid, ts) =>
  db.prepare("UPDATE economy SET last_weekly = ? WHERE jid = ?").run(ts, jid);

const getLeaderboard = (limit = 10) =>
  db.prepare("SELECT jid, balance FROM economy ORDER BY balance DESC LIMIT ?").all(limit);

// ─────────────────────────────────────────────────────────────────────────────
// AFK (Away From Keyboard)
// ─────────────────────────────────────────────────────────────────────────────
const setAFK = (jid, reason = "AFK", group_jid = null) =>
  db.prepare("INSERT OR REPLACE INTO afk (jid, reason, group_jid, set_at) VALUES (?, ?, ?, strftime('%s','now'))").run(jid, reason, group_jid);

const getAFK = (jid) =>
  db.prepare("SELECT * FROM afk WHERE jid = ?").get(jid);

const removeAFK = (jid) =>
  db.prepare("DELETE FROM afk WHERE jid = ?").run(jid);

// ─────────────────────────────────────────────────────────────────────────────
// REMINDERS (DB-backed)
// ─────────────────────────────────────────────────────────────────────────────
const addReminder = (jid, chat_jid, message, remind_at) =>
  db.prepare("INSERT INTO reminders (jid, chat_jid, message, remind_at) VALUES (?, ?, ?, ?)").run(jid, chat_jid, message, remind_at);

const getPendingReminders = () =>
  db.prepare("SELECT * FROM reminders WHERE remind_at <= strftime('%s','now')").all();

const deleteReminder = (id) =>
  db.prepare("DELETE FROM reminders WHERE id = ?").run(id);

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILES (XP / Leveling)
// ─────────────────────────────────────────────────────────────────────────────
const getProfile = (jid) => {
  let row = db.prepare("SELECT * FROM user_profiles WHERE jid = ?").get(jid);
  if (!row) {
    db.prepare("INSERT OR IGNORE INTO user_profiles (jid) VALUES (?)").run(jid);
    row = db.prepare("SELECT * FROM user_profiles WHERE jid = ?").get(jid);
  }
  return row;
};

const addXP = (jid, amount) => {
  getProfile(jid);
  db.prepare("UPDATE user_profiles SET xp = xp + ?, messages_count = messages_count + 1, updated_at = strftime('%s','now') WHERE jid = ?").run(amount, jid);
  const profile = getProfile(jid);
  const newLevel = Math.floor(profile.xp / 100) + 1;
  if (newLevel > profile.level) {
    db.prepare("UPDATE user_profiles SET level = ? WHERE jid = ?").run(newLevel, jid);
    return { leveledUp: true, newLevel, profile: getProfile(jid) };
  }
  return { leveledUp: false, newLevel, profile };
};

const setProfileName = (jid, name) => {
  getProfile(jid);
  db.prepare("UPDATE user_profiles SET display_name = ?, updated_at = strftime('%s','now') WHERE jid = ?").run(name, jid);
};

const setProfileBio = (jid, bio) => {
  getProfile(jid);
  db.prepare("UPDATE user_profiles SET bio = ?, updated_at = strftime('%s','now') WHERE jid = ?").run(bio, jid);
};

module.exports = {
  db,
  banUser, unbanUser, isBanned, getBannedUsers,
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
};
