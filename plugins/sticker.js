/**
 * KARTELO MD — Sticker Plugin (plugins/sticker.js)
 * Commands: sticker, s, toimg, qr
 */
module.exports = {
  name: "sticker",
  commands: ["sticker", "s", "toimg", "qr"],
  async handler(ctx) {
    const { sock, msg, body, args, config } = ctx;
    const jid = msg.key.remoteJid;

    if (body === ".sticker" || body === ".s") {
      const imgMsg = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      const vidMsg = msg.message?.videoMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
      if (!imgMsg && !vidMsg) return sock.sendMessage(jid, { text: "❌ Reply to an image/video. Usage: .sticker (reply to media)" });
      try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
          ? { key: { remoteJid: jid, id: msg.message.extendedTextMessage.contextInfo.stanzaId }, message: msg.message.extendedTextMessage.contextInfo.quotedMessage }
          : msg;
        const Sticker = ctx.Sticker;
        if (!Sticker) return sock.sendMessage(jid, { text: "❌ Sticker library not available." });
        const sticker = new Sticker(quoted, { packname: config.packname || "KARTELO MD", author: config.author || "By Kartelo", type: "full", categories: ["🤖"] });
        const buffer = await sticker.toBuffer();
        return sock.sendMessage(jid, { sticker: buffer });
      } catch (e) { return sock.sendMessage(jid, { text: "❌ Error: " + e.message }); }
    }

    if (body === ".toimg") {
      const stMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
      if (!stMsg) return sock.sendMessage(jid, { text: "❌ Reply to a sticker. Usage: .toimg" });
      try {
        const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
        const stream = await downloadContentFromMessage(stMsg, "sticker");
        const chunks = []; for await (const c of stream) chunks.push(c);
        return sock.sendMessage(jid, { image: Buffer.concat(chunks), caption: "✅ Converted!" });
      } catch (e) { return sock.sendMessage(jid, { text: "❌ Error: " + e.message }); }
    }

    if (body.startsWith(".qr ")) {
      const t = args.join(" "); if (!t) return sock.sendMessage(jid, { text: "❌ Usage: .qr [text]" });
      return sock.sendMessage(jid, { image: { url: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(t) }, caption: "✅ QR Code!" });
    }
    return null;
  },
};
