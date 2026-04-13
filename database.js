const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "kartelo.db"));

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// ─── SCHEMA ───────────────────────────────────────────────
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
`);

// ─── BANNED USERS ─────────────────────────────────────────
const banUser = (jid, reason = "No reason", banned_by = "") =>
  db.prepare("INSERT OR REPLACE INTO banned_users (jid, reason, banned_by) VALUES (?, ?, ?)").run(jid, reason, banned_by);

const unbanUser = (jid) =>
  db.prepare("DELETE FROM banned_users WHERE jid = ?").run(jid);

const isBanned = (jid) =>
  !!db.prepare("SELECT 1 FROM banned_users WHERE jid = ?").get(jid);

const getBannedUsers = () =>
  db.prepare("SELECT * FROM banned_users ORDER BY banned_at DESC").all();

// ─── WARNINGS ─────────────────────────────────────────────
const warnUser = (jid, group_jid, reason = "No reason", warned_by = "") =>
  db.prepare("INSERT INTO warnings (jid, group_jid, reason, warned_by) VALUES (?, ?, ?, ?)").run(jid, group_jid, reason, warned_by);

const getWarnings = (jid, group_jid) =>
  db.prepare("SELECT * FROM warnings WHERE jid = ? AND group_jid = ? ORDER BY warned_at DESC").all(jid, group_jid);

const getWarnCount = (jid, group_jid) =>
  db.prepare("SELECT COUNT(*) as count FROM warnings WHERE jid = ? AND group_jid = ?").get(jid, group_jid).count;

const clearWarnings = (jid, group_jid) =>
  db.prepare("DELETE FROM warnings WHERE jid = ? AND group_jid = ?").run(jid, group_jid);

// ─── NOTES ────────────────────────────────────────────────
const saveNote = (name, content, group_jid, created_by) =>
  db.prepare("INSERT OR REPLACE INTO notes (name, content, group_jid, created_by) VALUES (?, ?, ?, ?)").run(name.toLowerCase(), content, group_jid, created_by);

const getNote = (name, group_jid) =>
  db.prepare("SELECT * FROM notes WHERE name = ? AND group_jid = ?").get(name.toLowerCase(), group_jid);

const deleteNote = (name, group_jid) =>
  db.prepare("DELETE FROM notes WHERE name = ? AND group_jid = ?").run(name.toLowerCase(), group_jid);

const listNotes = (group_jid) =>
  db.prepare("SELECT name FROM notes WHERE group_jid = ? ORDER BY name").all(group_jid);

// ─── CUSTOM REPLIES ───────────────────────────────────────
const setReply = (trigger, response, created_by) =>
  db.prepare("INSERT OR REPLACE INTO custom_replies (trigger, response, created_by) VALUES (?, ?, ?)").run(trigger.toLowerCase(), response, created_by);

const getReply = (trigger) =>
  db.prepare("SELECT * FROM custom_replies WHERE trigger = ?").get(trigger.toLowerCase());

const deleteReply = (trigger) =>
  db.prepare("DELETE FROM custom_replies WHERE trigger = ?").run(trigger.toLowerCase());

const listReplies = () =>
  db.prepare("SELECT trigger, response FROM custom_replies ORDER BY trigger").all();

// ─── GROUP SETTINGS ───────────────────────────────────────
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

// ─── COMMAND LOGS ─────────────────────────────────────────
const logCommand = (command, sender, group_jid) =>
  db.prepare("INSERT INTO command_logs (command, sender, group_jid) VALUES (?, ?, ?)").run(command, sender, group_jid);

const getCommandStats = () =>
  db.prepare("SELECT command, COUNT(*) as count FROM command_logs GROUP BY command ORDER BY count DESC LIMIT 10").all();

const getTotalCommands = () =>
  db.prepare("SELECT COUNT(*) as count FROM command_logs").get().count;

// ─── DB STATS ─────────────────────────────────────────────
const getDbStats = () => ({
  banned: db.prepare("SELECT COUNT(*) as c FROM banned_users").get().c,
  warnings: db.prepare("SELECT COUNT(*) as c FROM warnings").get().c,
  notes: db.prepare("SELECT COUNT(*) as c FROM notes").get().c,
  replies: db.prepare("SELECT COUNT(*) as c FROM custom_replies").get().c,
  groups: db.prepare("SELECT COUNT(*) as c FROM group_settings").get().c,
  commands: db.prepare("SELECT COUNT(*) as c FROM command_logs").get().c,
});

module.exports = {
  db,
  banUser, unbanUser, isBanned, getBannedUsers,
  warnUser, getWarnings, getWarnCount, clearWarnings,
  saveNote, getNote, deleteNote, listNotes,
  setReply, getReply, deleteReply, listReplies,
  getGroupSettings, setGroupSetting,
  logCommand, getCommandStats, getTotalCommands,
  getDbStats,
};
