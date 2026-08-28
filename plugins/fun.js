/**
 * KARTELO MD — Fun & Games Plugin (plugins/fun.js)
 */
const { pickRandom, getMentionedJids } = require("../lib/functions");

const TRUTHS = ["What's the most embarrassing thing you've ever done?","What's a secret you've never told anyone?","What's your biggest fear?","Who do you have a crush on?","What's the weirdest dream you've ever had?","What's the most childish thing you still do?","Have you ever lied to a friend? About what?","What's the worst gift you've ever received?","What's something you've never told your parents?","What's your biggest regret?"];
const DARES = ["Send a voice note singing a song.","Change your profile picture to a meme for 1 hour.","Text the 5th person in your chat 'I love you'.","Do 10 push-ups and send a video.","Speak in a funny accent for 5 messages.","Send your last screenshot.","Compliment everyone in the group.","Tell a joke right now.","Send a funny selfie.","Write a poem about the person above you."];
const WYR = ["Have unlimited money or unlimited time?","Be able to fly or be invisible?","Have super speed or super strength?","Always be 10 min late or 20 min early?","Lose all memories or never make new ones?","Be the best at one thing or good at everything?","Live without music or without movies?","Always tell the truth or never speak again?","Fight 100 duck-sized horses or 1 horse-sized duck?","Have free WiFi for life or free food for life?"];
const BALL = ["🟢 It is certain.","🟢 Without a doubt.","🟢 Yes definitely.","🟡 Most likely.","🟡 Ask again later.","🟡 Better not tell you now.","🔴 Don't count on it.","🔴 My reply is no.","🔴 Very doubtful.","🟡 Cannot predict now.","🟢 Outlook good.","🟡 Concentrate and ask again."];
const FACTS = ["Honey never spoils. 3000-year-old honey was found still edible.","Octopuses have three hearts and blue blood.","A group of flamingos is called a 'flamboyance'.","Bananas are berries, but strawberries aren't.","The shortest war in history lasted 38 minutes.","Wombat poop is cube-shaped.","A shrimp's heart is in its head.","Cows have best friends and get stressed when separated.","The unicorn is the national animal of Scotland.","Sharks existed before trees did."];
const JOKES = ["Why don't scientists trust atoms? They make up everything! 😂","I told my wife she was drawing her eyebrows too high. She looked surprised. 😮","Why did the scarecrow win an award? He was outstanding in his field! 🌾","I'm reading a book about anti-gravity. It's impossible to put down! 📖","Why don't skeletons fight? They don't have the guts. 💀","What do you call a fake noodle? An impasta! 🍝","Why did the math book look sad? It had too many problems. 📐"];
const QUOTES = ["The only way to do great work is to love what you do. — Steve Jobs","Success is not final, failure is not fatal: it is the courage to continue that counts. — Churchill","The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt","In the middle of every difficulty lies opportunity. — Einstein","Be the change you wish to see in the world. — Gandhi","The best time to plant a tree was 20 years ago. The second best time is now.","Whether you think you can or you think you can't, you're right. — Henry Ford","The journey of a thousand miles begins with a single step. — Lao Tzu"];
const MOTIVATION = ["🔥 You are stronger than you think. Keep pushing!","⭐ Every expert was once a beginner. Don't give up!","🚀 Your only limit is your mind. Break through it!","💎 Diamonds are formed under pressure. So are you!","🌈 After every storm comes a rainbow. Stay strong!","🏆 Success is the sum of small efforts repeated daily!","💪 Fall seven times, stand up eight!","✨ Believe in yourself and you're halfway there!"];

module.exports = {
  name: "fun",
  commands: ["truth","dare","wyr","8ball","8b","coin","coinflip","flip","dice","roll","rps","ship","pick","joke","quote","fact","motivation"],
  async handler(ctx) {
    const { sock, msg, body, args } = ctx;
    const jid = msg.key.remoteJid;
    if (body === ".truth") return sock.sendMessage(jid, { text: "🤔 *Truth:*\n" + pickRandom(TRUTHS) });
    if (body === ".dare") return sock.sendMessage(jid, { text: "😈 *Dare:*\n" + pickRandom(DARES) });
    if (body === ".wyr") return sock.sendMessage(jid, { text: "🤷 *Would You Rather:*\n" + pickRandom(WYR) });
    if (body === ".8ball" || body === ".8b") return sock.sendMessage(jid, { text: "🎱 " + pickRandom(BALL) });
    if (body === ".coin" || body === ".coinflip" || body === ".flip") return sock.sendMessage(jid, { text: "🪙 Coin flip: **" + pickRandom(["HEADS","TAILS"]) + "**" });
    if (body === ".dice" || body === ".roll") return sock.sendMessage(jid, { text: "🎲 Dice: **" + (Math.floor(Math.random()*6)+1) + "**" });
    if (body === ".rps" || body.startsWith(".rps ")) {
      const c = args[0]?.toLowerCase(); const v = ["rock","paper","scissors"];
      if (!v.includes(c)) return sock.sendMessage(jid, { text: "❌ Usage: .rps [rock/paper/scissors]" });
      const bot = pickRandom(v); let r;
      if (c === bot) r = "🤝 Tie!"; else if ((c==="rock"&&bot==="scissors")||(c==="paper"&&bot==="rock")||(c==="scissors"&&bot==="paper")) r = "🎉 You win!"; else r = "😢 You lose!";
      return sock.sendMessage(jid, { text: "✊ You: " + c + "\n🤖 Bot: " + bot + "\n" + r });
    }
    if (body.startsWith(".ship ")) {
      const m = getMentionedJids(msg); if (m.length < 2) return sock.sendMessage(jid, { text: "❌ Mention 2 users. Usage: .ship @user1 @user2" });
      const s = Math.floor(Math.random()*100)+1; let e, st;
      if (s>=90){e="💖";st="Perfect match!";} else if(s>=70){e="💕";st="Great couple!";} else if(s>=50){e="💗";st="Could work...";} else if(s>=30){e="💔";st="Not great...";} else {e="💀";st="Better as friends.";}
      return sock.sendMessage(jid, { text: "💏 @" + m[0].split("@")[0] + " x @" + m[1].split("@")[0] + "\n" + e + " Love: " + s + "%\n" + st, mentions: m });
    }
    if (body.startsWith(".pick ")) {
      const o = args.join(" ").split("|").map(s => s.trim()).filter(Boolean);
      if (o.length < 2) return sock.sendMessage(jid, { text: "❌ Usage: .pick option1 | option2" });
      return sock.sendMessage(jid, { text: "🤔 I pick: **" + pickRandom(o) + "**" });
    }
    if (body === ".joke") return sock.sendMessage(jid, { text: pickRandom(JOKES) });
    if (body === ".quote" || body === ".quote2") return sock.sendMessage(jid, { text: "💬 " + pickRandom(QUOTES) });
    if (body === ".fact") return sock.sendMessage(jid, { text: "📚 " + pickRandom(FACTS) });
    if (body === ".motivation") return sock.sendMessage(jid, { text: pickRandom(MOTIVATION) });
    return null;
  },
};
