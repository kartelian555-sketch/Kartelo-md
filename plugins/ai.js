/**
 * KARTELO MD — AI Plugin (plugins/ai.js)
 * Commands: ai, imagine, wiki, define, tr
 */
const { httpGet } = require("../lib/functions");

module.exports = {
  name: "ai",
  commands: ["ai", "imagine", "wiki", "define", "tr"],
  async handler(ctx) {
    const { sock, msg, body, args, config } = ctx;
    const jid = msg.key.remoteJid;

    if (body.startsWith(".ai ")) {
      const prompt = args.join(" ");
      if (!prompt) return sock.sendMessage(jid, { text: "❌ Usage: .ai [question]" });
      try {
        let reply;
        if (config.openaiApiKey) {
          const https = require("https");
          const data = JSON.stringify({ model: config.openaiModel, messages: [{ role: "system", content: "You are " + config.botName + ", a helpful WhatsApp bot. Be concise." }, { role: "user", content: prompt }] });
          reply = await new Promise((resolve, reject) => {
            const req = https.request("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + config.openaiApiKey } }, (res) => {
              let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d).choices[0].message.content); } catch { reject(new Error("OpenAI parse error")); } });
            }); req.on("error", reject); req.write(data); req.end();
          });
        } else {
          reply = (await httpGet("https://text.pollinations.ai/" + encodeURIComponent(prompt))).trim();
        }
        return sock.sendMessage(jid, { text: "🤖 " + reply });
      } catch (e) { return sock.sendMessage(jid, { text: "❌ AI error: " + e.message }); }
    }

    if (body.startsWith(".imagine ")) {
      const prompt = args.join(" ");
      if (!prompt) return sock.sendMessage(jid, { text: "❌ Usage: .imagine [description]" });
      const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) + "?width=512&height=512&nologo=true";
      return sock.sendMessage(jid, { image: { url }, caption: "🎨 " + prompt });
    }

    if (body.startsWith(".wiki ")) {
      const q = args.join(" "); if (!q) return sock.sendMessage(jid, { text: "❌ Usage: .wiki [search term]" });
      try {
        const s = JSON.parse(await httpGet("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(q) + "&format=json&srlimit=1"));
        if (!s.query.search.length) return sock.sendMessage(jid, { text: "❌ No results." });
        const t = s.query.search[0].title;
        const d = JSON.parse(await httpGet("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t)));
        return sock.sendMessage(jid, { text: "📚 *" + d.title + "*\n\n" + d.extract + "\n\n🔗 " + d.content_urls.desktop.page });
      } catch { return sock.sendMessage(jid, { text: "❌ Wiki error." }); }
    }

    if (body.startsWith(".define ")) {
      const w = args.join(" "); if (!w) return sock.sendMessage(jid, { text: "❌ Usage: .define [word]" });
      try {
        const d = JSON.parse(await httpGet("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(w)));
        if (!Array.isArray(d)) return sock.sendMessage(jid, { text: "❌ Not found." });
        const m = d[0].meanings[0]; const def = m.definitions[0];
        return sock.sendMessage(jid, { text: "📖 *" + w + "* (" + m.partOfSpeech + ")\n\n" + def.definition + (def.example ? "\n\n💡 " + def.example : "") });
      } catch { return sock.sendMessage(jid, { text: "❌ Not found." }); }
    }

    if (body.startsWith(".tr ")) {
      const t = args.join(" "); if (!t) return sock.sendMessage(jid, { text: "❌ Usage: .tr [text]" });
      try {
        const d = JSON.parse(await httpGet("https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=" + encodeURIComponent(t)));
        return sock.sendMessage(jid, { text: "🌐 " + d[0].map(x => x[0]).join("") });
      } catch { return sock.sendMessage(jid, { text: "❌ Translation failed." }); }
    }
    return null;
  },
};
