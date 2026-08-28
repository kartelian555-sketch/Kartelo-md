/**
 * KARTELO MD — Download Plugin (plugins/download.js)
 * Commands: play, video, ytmp3, ytmp4, dl
 */
const { httpGet } = require("../lib/functions");

module.exports = {
  name: "download",
  commands: ["play", "video", "ytmp3", "ytmp4", "dl"],
  async handler(ctx) {
    const { sock, msg, body, args } = ctx;
    const jid = msg.key.remoteJid;

    if (body.startsWith(".play ")) {
      const q = args.join(" "); if (!q) return sock.sendMessage(jid, { text: "❌ Usage: .play [song name]" });
      try {
        await sock.sendMessage(jid, { text: "🔄 Searching: " + q + "..." });
        const html = await httpGet("https://www.youtube.com/results?search_query=" + encodeURIComponent(q));
        const m = html.match(/"videoId":"([^"]+)"/);
        if (!m) return sock.sendMessage(jid, { text: "❌ No results." });
        const vid = m[1]; const tm = html.match(/"title":\{"runs":\[\{"text":"([^"]+)"/); const title = tm ? tm[1] : q;
        try {
          const d = JSON.parse(await httpGet("https://api.dl.yt-dlp.app/v1/audio?url=https://youtube.com/watch?v=" + vid, { timeout: 20000 }));
          if (d.url) return sock.sendMessage(jid, { audio: { url: d.url }, mimetype: "audio/mpeg", fileName: title + ".mp3" });
        } catch {}
        return sock.sendMessage(jid, { text: "🎵 *" + title + "*\n\n▶️ https://youtube.com/watch?v=" + vid });
      } catch (e) { return sock.sendMessage(jid, { text: "❌ Error: " + e.message }); }
    }

    if (body.startsWith(".video ")) {
      const q = args.join(" "); if (!q) return sock.sendMessage(jid, { text: "❌ Usage: .video [video name]" });
      try {
        await sock.sendMessage(jid, { text: "🔄 Searching: " + q + "..." });
        const html = await httpGet("https://www.youtube.com/results?search_query=" + encodeURIComponent(q));
        const m = html.match(/"videoId":"([^"]+)"/);
        if (!m) return sock.sendMessage(jid, { text: "❌ No results." });
        const vid = m[1]; const tm = html.match(/"title":\{"runs":\[\{"text":"([^"]+)"/); const title = tm ? tm[1] : q;
        try {
          const d = JSON.parse(await httpGet("https://api.dl.yt-dlp.app/v1/video?url=https://youtube.com/watch?v=" + vid, { timeout: 30000 }));
          if (d.url) return sock.sendMessage(jid, { video: { url: d.url }, caption: "📹 " + title });
        } catch {}
        return sock.sendMessage(jid, { text: "📹 *" + title + "*\n\n▶️ https://youtube.com/watch?v=" + vid });
      } catch (e) { return sock.sendMessage(jid, { text: "❌ Error: " + e.message }); }
    }

    if (body.startsWith(".ytmp3 ") || body.startsWith(".ytmp4 ")) {
      const url = args[0];
      if (!url || (!url.includes("youtube.com") && !url.includes("youtu.be")))
        return sock.sendMessage(jid, { text: "❌ Usage: .ytmp3 [youtube url]" });
      const type = body.startsWith(".ytmp4") ? "video" : "audio";
      try {
        const d = JSON.parse(await httpGet("https://api.dl.yt-dlp.app/v1/" + type + "?url=" + url, { timeout: 30000 }));
        if (d.url) return type === "video" ? sock.sendMessage(jid, { video: { url: d.url } }) : sock.sendMessage(jid, { audio: { url: d.url }, mimetype: "audio/mpeg" });
        return sock.sendMessage(jid, { text: "❌ Download failed." });
      } catch (e) { return sock.sendMessage(jid, { text: "❌ Error: " + e.message }); }
    }

    if (body.startsWith(".dl ")) {
      const url = args[0]; if (!url) return sock.sendMessage(jid, { text: "❌ Usage: .dl [url]" });
      return sock.sendMessage(jid, { text: "🔗 " + url + "\n\n_Use .play/.video/.ytmp3/.ytmp4 for YouTube._" });
    }
    return null;
  },
};
