# 🎬 KARTELO MD OFFICIAL — YOUTUBE STARTER KIT

> The complete launch package for the KARTELO MD YouTube channel.
> Everything you need to go from zero to your first 1,000 subscribers.
> Created by **KARTELO OFFICIAL**.

---

## 📦 WHAT'S IN THIS KIT

| Asset | File | Purpose |
|-------|------|---------|
| YouTube Banner | `assets/youtube-banner.png` | Channel art (2560×1440) |
| Viral Thumbnail | `assets/video1-thumbnail.png` | First video thumbnail |
| Logo Intro Frame | `assets/logo-intro-frame.png` | Cinematic channel intro |
| Bot Banner Logo | `assets/kartelo-banner.png` | Profile picture / branding |
| This Guide | `YOUTUBE-KIT.md` | Scripts, SEO, strategy |

---

## 📺 CHANNEL SETUP GUIDE

### Channel Name
**KARTELO MD OFFICIAL**

### @Handle
`@KarteloMDOfficial` (or `@KarteloTech` if taken)

### Channel Description (copy-paste into YouTube Studio)
```
Welcome to KARTELO MD OFFICIAL — the home of the most powerful WhatsApp bot on the planet.

Here you'll find:
✅ Step-by-step deploy tutorials (100% free)
✅ Pair code site setup
✅ 80+ command showcases
✅ Bot fixes & troubleshooting
✅ Q&A and community spotlights

KARTELO MD is a multi-device WhatsApp bot built on Baileys with AI, economy, leveling, stickers, downloads, group admin tools, and more.

🔗 GitHub: https://github.com/kartelian555-sketch/Kartelo-md
🔗 Pair Code: coming soon
👨‍💻 Owner: +254 711 939 375

Subscribe and turn on the bell 🔔 — we drop new tutorials every week.

BUILD. DEPLOY. DOMINATE.
```

### Banner Text (already on the generated banner)
- Title: **KARTELO MD OFFICIAL**
- Subtitle: THE MOST POWERFUL WHATSAPP BOT
- Tagline: BUILD. DEPLOY. DOMINATE.
- Social: GitHub + WhatsApp owner number

### Profile Picture
Use `assets/kartelo-banner.png` (the cyborg crown "K" logo).

---

## 🎥 THE 5 LAUNCH VIDEOS

### Video 1 — HOW TO DEPLOY KARTELO MD BOT (100% FREE, NO CODING)
**Thumbnail:** `assets/video1-thumbnail.png`
**Target length:** 8–10 minutes
**Status:** FULL SCRIPT BELOW ✅

### Video 2 — HOW TO GET A PAIR CODE (LINK WHATSAPP IN 30 SECONDS)
**Target length:** 5–6 minutes
**Status:** FULL SCRIPT BELOW ✅

### Video 3 — 80+ COMMANDS SHOWCASE (KARTELO MD FULL FEATURE TOUR)
**Target length:** 12–15 minutes
**Status:** FULL SCRIPT BELOW ✅

### Video 4 — FIX: BOT NOT CONNECTING / PAIR CODE INVALID
**Target length:** 6–8 minutes
**Status:** FULL SCRIPT BELOW ✅

### Video 5 — KARTELO MD vs JUNE-X vs X-ASYLUM (WHICH BOT IS BEST?)
**Target length:** 8–10 minutes
**Status:** FULL SCRIPT BELOW ✅

---

## 📝 VIDEO 1 — FULL WORD-FOR-WORD SCRIPT
### "HOW TO DEPLOY KARTELO MD BOT | 100% FREE | NO CODING"

> Reading guide: Lines in **[brackets]** are visual/camera cues.
> Lines in plain text are what you SAY out loud.
> ⏱ timestamps are approximate targets.

---

**[0:00 — INTRO HOOK — Fast cuts, high energy, viral thumbnail flashes on screen]**

What's good everyone! In the next eight minutes I'm gonna show you how to deploy the KARTELO MD WhatsApp bot completely free — no VPS, no coding, no credit card, no skills required. By the end of this video you will have a fully running WhatsApp bot with AI, stickers, downloads, economy, group admin tools, and over eighty commands. And the best part? It stays online twenty four seven. Let's go.

**[0:20 — TITLE CARD: "KARTELO MD — BUILD. DEPLOY. DOMINATE."]**

**[0:22 — Screen recording begins: GitHub repo open]**

Alright, first thing. Open your browser and go to the KARTELO MD GitHub repository. I've put the link in the description and pinned comment so you can just click it. Once you're on the repo page, you're gonna see the README with the typing animation, the badges, and all the deploy buttons. Don't worry about reading everything right now — I'll walk you through it.

**[0:45 — Click the green "Code" button, then copy the repo URL]**

Scroll up and find the green button that says "Code". Click it, and copy the HTTPS link. Now open a new tab.

**[1:00 — Screen: render.com or heroku signup]**

We're gonna deploy this on a free hosting platform. I recommend Render because it's the easiest and it gives you a free tier with no credit card. Go to render.com and sign up with your GitHub account — it takes ten seconds. If you already have Heroku, that works too, and I'll show that method at the end.

**[1:25 — Render dashboard: click "New +" → "Web Service"]**

Once you're logged in to Render, click the blue "New" button in the top right, and select "Web Service". Now you'll see an option to connect a repository. Paste the KARTELO MD repo URL here, or if you forked it to your own GitHub, just select it from the list.

**[1:45 — Render config screen]**

Okay, this is the important part — the configuration. Leave the name as whatever you want, something like "kartelo-md-bot". The runtime should auto-detect as Node. The build command is "npm install" and the start command is "npm start" — these should already be filled in from the render.yaml file that's included in the repo. Scroll down to environment variables. This is where the magic happens.

**[2:15 — Environment variables section]**

You need to add these environment variables. First one: OWNER_NUMBER. This is YOUR WhatsApp number with the country code, no plus sign, no spaces. So for example, two-five-four-seven-one-one-nine-three-nine-three-seven-five. This is the number that will control the bot. Add it exactly like that.

Second: PREFIX. This is the symbol that triggers commands. I use a dot, so type a period. You can use an exclamation mark or a hash if you want, but dot is the cleanest.

Third: MODE. Type "public" if you want anyone in your groups to use the bot, or "private" if you want only you to use it. For your first deploy, go with public.

Fourth: USE_PAIRING_CODE. Type "true". This is important — it lets you link the bot with a pair code instead of a QR code, which is way easier.

Fifth: BOT_NAME. Type "KARTELO MD".

**[3:20 — Click "Create Web Service"]**

That's it for config. Scroll down and click the big blue button that says "Create Web Service". Render is now building your bot. This takes about two to three minutes the first time because it has to install all the dependencies and compile the SQLite database. You can watch the logs in real time — just wait until you see "KARTELO MD is running" in the logs.

**[3:50 — Waiting screen, logs scrolling]**

While we wait, let me explain what's actually happening under the hood. Render is spinning up a container with Node.js version twenty, installing all the npm packages including Baileys — that's the WhatsApp library — and better-sqlite3 for the database. Once it's done, the bot will start and generate a pair code that you'll use to link your WhatsApp.

**[4:20 — Logs show "Your Pairing Code: XXXXXXXX"]**

There it is! Look in the logs — you should see a line that says "Your Pairing Code" followed by eight characters. In my case it's showing right now. Write this down or screenshot it, because you'll need it in a second.

**[4:35 — Screen: open WhatsApp on phone]**

Now pick up your phone and open WhatsApp. This is the number you put as your OWNER_NUMBER — or actually, it can be any number you want the bot to run on. A lot of people use a second number for their bot. Go to Settings, then Linked Devices, then tap "Link a Device".

**[4:55 — WhatsApp shows QR scanner]**

Normally this would show a QR scanner, but since we're using a pair code, look for the option at the bottom that says "Link with phone number instead". Tap that.

**[5:10 — Enter the 8-digit pair code]**

Now type in the eight-digit pair code you got from the Render logs. Enter it carefully — no spaces, no dashes. And hit OK.

**[5:25 — WhatsApp says "Linked!"]**

BOOM. If you see "Linked!" on your phone, congratulations — your KARTELO MD bot is now connected to WhatsApp and it's live. The bot will automatically set its profile picture, about status, and display name. Give it about ten seconds.

**[5:45 — Screen: send a test message in WhatsApp]**

Let's test it. Open any chat — your own chat, a group, anywhere — and type dot-menu. That's a period followed by the word menu. Send it.

**[6:00 — Bot replies with the fancy menu]**

And there it is! The KARTELO MD menu just dropped. You can see all the categories — Download, AI, Sticker, Group, Economy, Fun and Games, Leveling, Utilities, and more. Every single category is packed with commands. Try a few with me.

**[6:20 — Demo: .ai hello]**

Type dot-A-I and then any question. Watch — "dot-A-I, what is the capital of Kenya?" Send. And the bot replies with an AI-generated answer. That's using the built-in AI — you can plug in your own OpenAI key later for even better responses.

**[6:40 — Demo: .sticker]**

Now send any image and reply to it with dot-sticker. The bot converts it to a sticker instantly. Boom.

**[6:50 — Demo: .play song name]**

Type dot-play and a song name. The bot searches YouTube, downloads the audio, and sends it as a voice note. This one takes a few seconds but it works every time.

**[7:10 — Screen: back to face camera]**

And that's it. You now have a fully functional KARTELO MD bot running twenty four seven on Render's free tier. Let me recap the whole process one more time so you can follow along. One: go to the GitHub repo. Two: deploy on Render. Three: add your environment variables — owner number, prefix, mode, pair code, bot name. Four: wait for the build. Five: grab the pair code from the logs. Six: link it in WhatsApp. Seven: type dot-menu and start using your bot.

**[7:50 — Outro]**

If this video helped you, smash that like button, subscribe to the channel, and ring the bell so you don't miss the next tutorial where I show you how to set up your own pair code website so other people can link the bot without touching the logs. The link to the GitHub repo and all the commands are in the description. I'm KARTELO OFFICIAL — build, deploy, dominate. See you in the next one.

**[8:10 — End screen with subscribe button + video 2 thumbnail]**

---

## 📝 VIDEO 2 — FULL WORD-FOR-WORD SCRIPT
### "HOW TO GET A PAIR CODE (LINK WHATSAPP IN 30 SECONDS)"

**[0:00 — Hook]**

If you've ever struggled with scanning QR codes to link your WhatsApp bot, this video is for you. I'm gonna show you the pair code method — it's faster, it's cleaner, and you don't even need your phone near your computer. Thirty seconds. Let's go.

**[0:15 — Explain what a pair code is]**

So a pair code is an eight-digit number that links your WhatsApp to a bot without scanning a QR code. Instead of pointing your camera at a screen, you just type eight digits into WhatsApp and you're linked. It's perfect for cloud deployments where you can't see the QR code anyway.

**[0:35 — Screen: pair code website or Render logs]**

There are two ways to get your pair code. Method one: from the deployment logs. When you deploy KARTELO MD on Render, Heroku, or any host, the bot prints your pair code in the logs. Just open the logs and search for "Pairing Code". Method two: from a pair code website — and I'll show you how to set one up in the next video.

**[1:00 — Method 1: logs]**

Let's do method one right now. Open your Render dashboard, click on your KARTELO MD service, and go to the Logs tab. Scroll through and look for the green text that says "Your Pairing Code". There it is — eight characters. Copy it.

**[1:25 — Phone: WhatsApp Linked Devices]**

Now on your phone, open WhatsApp, go to Linked Devices, tap Link a Device, and this time don't scan the QR. Instead tap "Link with phone number instead" at the bottom. Type your eight digits. Hit OK. And you're linked.

**[1:50 — Troubleshooting]**

Quick troubleshooting. If your pair code doesn't work, it's probably expired — pair codes are valid for about sixty seconds. Just restart the bot or refresh the logs to get a new one. If you get "invalid code", double check you typed it right — no spaces, no dashes, case doesn't matter.

**[2:15 — Recap + outro]**

That's the pair code method. Way easier than QR, right? In the next video I'll show you how to build your own pair code website so your users can get codes without you. Subscribe and I'll see you there.

---

## 📝 VIDEO 3 — FULL WORD-FOR-WORD SCRIPT
### "80+ COMMANDS SHOWCASE (KARTELO MD FULL FEATURE TOUR)"

**[0:00 — Hook with rapid command demos]**

Dot-menu. Dot-A-I. Dot-sticker. Dot-play. Dot-tagall. Dot-balance. Dot-truth. Dot-wiki. That's eight commands in eight seconds. KARTELO MD has over eighty. In this video I'm gonna show you every single category and the best commands in each one. Let's tour the whole bot.

**[0:25 — DOWNLOAD category]**

Starting with the Download category. Dot-play plus a song name downloads audio from YouTube and sends it as a voice note. Dot-video plus a name does the same but for video. Dot-ytmp3 and dot-ytmp4 let you paste a YouTube link directly. These all use the built-in ytdl engine — no API key needed.

**[1:20 — AI category]**

Next, AI. Dot-A-I plus any question gives you a response from the AI engine. If you set an OpenAI key in your env vars, it uses GPT. If not, it falls back to a free engine automatically. Dot-imagine plus a prompt generates an AI image. Dot-wiki searches Wikipedia. Dot-define gives dictionary definitions. Dot-tr translates text between languages.

**[2:30 — STICKER category]**

Sticker commands. Dot-sticker or dot-S converts any image to a sticker. Reply to a sticker with dot-toimg to convert it back to an image. Dot-Q-R generates a QR code from any text or link.

**[3:00 — GROUP category]**

Group admin tools. Dot-tagall mentions every member of the group. Dot-hidetag does the same but hidden. Dot-kick removes a member. Dot-promote and dot-demote change admin status. Dot-mute and dot-unmute lock or unlock the group. Dot-antilink turns on auto-delete for WhatsApp links. Dot-welcome and dot-goodbye set custom join and leave messages. Dot-groupinfo shows group stats. Dot-setname and dot-setdesc change the group name and description. Dot-link gets the invite link. Dot-revoke resets it.

**[4:30 — ECONOMY category]**

The economy system. Every user has a coin balance. Dot-balance checks yours. Dot-daily claims your daily reward. Dot-gamble lets you bet coins on a coin flip. Dot-leaderboard shows the richest users in the group. Dot-pay sends coins to another user. This whole system runs on SQLite so it's persistent — your coins never reset.

**[5:30 — FUN & GAMES category]**

Fun and games. Dot-truth and dot-dare for the classic party game. Dot-W-Y-R gives you "would you rather" questions. Dot-8ball or dot-8b for the magic eight ball. Dot-coin or dot-coinflip for a quick flip. Dot-dice or dot-roll for a random number. Dot-R-P-S for rock paper scissors. Dot-ship to calculate love compatibility between two users. Dot-pick to make the bot choose between options. Dot-joke, dot-quote, dot-fact, and dot-motivation for random content.

**[7:00 — LEVELING category]**

Leveling. Every message you send earns XP. Dot-rank shows your current level and XP. Dot-leaderboard for levels shows the most active users. Higher levels unlock special perks in some groups.

**[7:30 — UTILITIES category]**

Utilities. Dot-weather plus a city name gives you live weather. Dot-delete lets you delete the bot's messages. Dot-A-F-K sets an away message. Every time someone mentions you while you're AFK, the bot replies with your away message. Dot-reminder plus a time and message sets a timed reminder.

**[8:30 — OWNER category]**

Owner-only commands. Dot-setpp changes the bot's profile picture. Dot-setabout changes the about status. Dot-setnamebot changes the display name. Dot-broadcast sends a message to every chat. Dot-block and dot-unblock manage blocked users. Dot-mode switches between public and private. Dot-eval runs JavaScript code directly — powerful but use with care.

**[9:30 — Outro]**

That's the full tour — over eighty commands across nine categories. And the bot is constantly being updated with more. If you want the full command list, it's in the GitHub README — link in the description. Subscribe for more showcases and tutorials.

---

## 📝 VIDEO 4 — FULL WORD-FOR-WORD SCRIPT
### "FIX: BOT NOT CONNECTING / PAIR CODE INVALID"

**[0:00 — Hook]**

Your KARTELO MD bot won't connect? Pair code saying invalid? Bot was working yesterday but now it's offline? I've seen every single one of these issues and I'm gonna fix all of them in this video. Let's go.

**[0:20 — Issue 1: Pair code invalid]**

Issue number one: pair code says invalid. This is the most common one. Pair codes expire after about sixty seconds. If you took too long between getting the code and typing it into WhatsApp, it's already dead. Solution: restart the bot to get a fresh code, then link immediately. On Render, just go to your service and click "Manual Deploy" then "Clear build cache and deploy". Wait for the new code in the logs and link within thirty seconds.

**[1:10 — Issue 2: Bot was working, now offline]**

Issue number two: the bot was working and now it's offline. This is almost always a session expiry. WhatsApp multi-device sessions can drop after a few weeks of inactivity or if WhatsApp detects unusual behavior. Solution: delete the auth folder and re-link. On Render, go to your service shell and run "rm -rf auth_info_baileys". Then restart. You'll get a new pair code — link it again and you're back.

**[2:00 — Issue 3: Build fails on Render]**

Issue number three: the build fails on Render with a better-sqlite3 error. This happens when the build tools aren't available. The Dockerfile in the repo already installs make and g-plus-plus, so if you're using Docker you're fine. If you're using Render's native Node environment and it fails, switch the environment to Docker — it's a toggle in the service settings. That fixes it every time.

**[2:50 — Issue 4: Commands not responding]**

Issue number four: the bot is connected but commands don't respond. First check your PREFIX — if you set it to a dot in your env vars, you need to type dot-menu, not exclamation-menu. Second, check your MODE — if it's set to private, only your owner number can use commands. Switch to public if you want everyone to use it. Third, make sure you're not in a group where the bot is muted or where antilink is blocking messages.

**[3:40 — Issue 5: Stickers or downloads not working]**

Issue number five: stickers or downloads don't work. For stickers, make sure you're replying to an actual image — not a forwarded sticker or a document. For downloads, the YouTube engine sometimes rate-limits. Wait a minute and try again. If it persists, make sure your ytdl-core package is up to date — the repo always uses the latest version.

**[4:20 — Issue 6: Bot crashes on startup]**

Issue number six: the bot crashes immediately on startup. Check the logs for the error. The most common cause is a missing or malformed environment variable. Make sure OWNER_NUMBER has no plus sign and no spaces. Make sure PREFIX is a single character. Make sure MODE is either "public" or "private" — lowercase. Fix those and redeploy.

**[5:00 — General tip: always check logs]**

Here's the golden rule: always read the logs. Ninety percent of issues show an error message right in the logs. Open the Logs tab on Render, scroll to the red text, and read it. If you still can't figure it out, drop a comment with the error message and I'll help you fix it personally.

**[5:25 — Outro]**

That's six common issues fixed. If this saved you, hit like and subscribe. Drop a comment if you have a different error — I read every single one. See you in the next video.

---

## 📝 VIDEO 5 — FULL WORD-FOR-WORD SCRIPT
### "KARTELO MD vs JUNE-X vs X-ASYLUM (WHICH BOT IS BEST?)"

**[0:00 — Hook]**

KARTELO MD, JUNE-X, or X-ASYLUM — which WhatsApp bot is actually the best in twenty-twenty-five? I've deployed all three, tested every command, and I'm gonna give you the honest breakdown. No bias. Let's compare.

**[0:20 — Intro to all three]**

So these are three of the most popular WhatsApp multi-device bots right now. All three are built on Baileys, all three are open source, and all three have active communities. But they are not equal. Let's break it down by category.

**[0:45 — Commands comparison]**

Commands. KARTELO MD has over eighty commands across nine categories — download, AI, sticker, group, economy, fun, leveling, utilities, and owner. JUNE-X has around sixty commands with a similar category structure. X-ASYLUM has about fifty but leans heavily into media downloads. Winner for pure command count and variety: KARTELO MD.

**[2:00 — Ease of deployment]**

Deployment. KARTELO MD ships with a Dockerfile, render-dot-YAML, and app-dot-json for Heroku one-click deploy. Plus a standalone pair code server. JUNE-X has a similar setup. X-ASYLUM requires more manual configuration. For a beginner, KARTELO MD and JUNE-X are tied for easiest. X-ASYLUM is for more advanced users.

**[3:00 — AI features]**

AI. KARTELO MD has built-in AI chat with OpenAI support and a free fallback engine, plus AI image generation. JUNE-X has AI chat but no image generation in the base build. X-ASYLUM has limited AI. Winner: KARTELO MD.

**[3:45 — Economy & leveling]**

Economy and leveling. KARTELO MD has a full coin economy with daily rewards, gambling, leaderboards, and payments, plus an XP leveling system. JUNE-X has a basic economy. X-ASYLUM doesn't have one. Winner: KARTELO MD.

**[4:20 — Stability]**

Stability. All three use Baileys so they're roughly equal on connection stability. KARTELO MD uses better-sqlite3 for persistent storage which is faster than JSON-based storage. JUNE-X uses a mix. X-ASYLUM is solid but heavier on resources. Slight edge: KARTELO MD for the SQLite performance.

**[5:00 — Community & updates]**

Community and updates. JUNE-X has the largest community right now. KARTELO MD is growing fast with weekly updates. X-ASYLUM updates less frequently. If community size matters to you, JUNE-X. If you want the most features per command, KARTELO MD.

**[5:40 — Final verdict]**

So which one should you use? Here's my honest take. If you want the most features out of the box — AI, economy, leveling, eighty-plus commands, easy deploy — go with KARTELO MD. If you want the biggest community and the most tutorials already out there, JUNE-X is a solid choice. If you're a power user who mainly wants media downloads, X-ASYLUM works. But for most people watching this channel, KARTELO MD gives you the most value with the least setup.

**[6:20 — Outro]**

Link to all three repos in the description. Try them yourself and let me know in the comments which one you prefer. Subscribe for more bot comparisons and tutorials. Build, deploy, dominate.

---

## 🎬 LOGO INTRO VIDEO CONCEPT
### "KARTELO MD — Cinematic Channel Intro (5 seconds)"

> This is a production concept for a 5-second animated logo intro
> to play at the start of every KARTELO MD video.
> Reference frame: `assets/logo-intro-frame.png`

---

### Visual Sequence (shot-by-shot)

**Frame 1 (0.0s – 0.5s): Black screen, single green particle**
- Pure black screen
- A single neon-green particle appears center screen
- Subtle ambient hum sound begins

**Frame 2 (0.5s – 1.5s): Particles converge**
- Hundreds of green and red-orange particles fly in from all edges
- They converge toward the center, forming a swirling vortex
- Sound: rising whoosh / energy build-up
- Camera slowly pushes in

**Frame 3 (1.5s – 2.5s): The cyborg head emerges**
- The particles explode outward and the KARTELO cyborg helmet materializes from the center
- Green neon glow radiates from the visor eyes
- The helmet is metallic, angular, cyberpunk style
- Sound: deep bass impact + metallic clang
- Particles continue floating around the head

**Frame 4 (2.5s – 3.5s): Text reveal**
- The text "KARTELO MD" slams in below the helmet in bold lime-green font
- Letters have a subtle glitch / scan-line effect as they appear
- The shield emblem with "ID" fades in beneath
- Sound: electronic zap / digital shimmer

**Frame 5 (3.5s – 4.5s): Glow intensifies**
- The green glow ramps up to maximum brightness
- Energy lines pulse outward from the text
- The whole composition "locks in" and stabilizes
- Sound: final resonant boom

**Frame 6 (4.5s – 5.0s): Hold + fade**
- Hold the final composition for half a second
- Then fade to black with the green glow lingering last
- Sound: hum fades out

### Audio
- **Music style:** Dark cinematic electronic, cyberpunk synth
- **Key elements:** Rising whoosh → bass impact → metallic clang → digital shimmer → resonant boom → fade
- **Tempo:** Builds from calm to intense over 5 seconds
- **Reference vibe:** Think a mix between a Marvel studio intro and a MrBeast logo sting, but darker and more tech

### Text Animation
- **Font:** Bold, angular, futuristic (recommend Orbitron, Rajdhani, or similar)
- **Color:** Lime green (#39FF14) with black outline
- **Animation:** Letters slam in one by one with a slight overshoot, then a glitch flicker, then stabilize
- **Glow:** Green outer glow that pulses with the music

### How to actually make this
1. **Easiest:** Use Canva or CapCut — import `assets/logo-intro-frame.png` as the key frame, add particle overlays (CapCut has built-in particle effects), add text animation, add music from the CapCut library.
2. **Pro:** Use After Effects with Trapcode Particular for the particle vortex, Element 3D for the helmet, and a custom sound design.
3. **Quick AI method:** Use RunwayML or Pika Labs to animate the static frame with a "zoom in with particles" prompt, then add text and music in CapCut.

### Recommended tools
| Tool | Use | Cost |
|------|-----|------|
| CapCut | Particles, text, music, export | Free |
| Canva | Simple version with templates | Free |
| After Effects | Pro version, full control | Paid |
| RunwayML | AI animate the static frame | Freemium |
| Epidemic Sound | Royalty-free cinematic music | Paid |

---

## 🏷️ SEO TAGS (copy-paste into YouTube)

### Video 1 — Deploy Tutorial
```
kartelo md, kartelo md bot, how to deploy whatsapp bot, deploy whatsapp bot free, free whatsapp bot, whatsapp bot tutorial, baileys bot, whatsapp multi device bot, kartelo md deploy, render deploy whatsapp bot, heroku whatsapp bot, no coding whatsapp bot, whatsapp bot 2025, kartelo official, june-x alternative, best whatsapp bot, ai whatsapp bot, sticker bot whatsapp
```

### Video 2 — Pair Code
```
whatsapp pair code, pair code whatsapp bot, link whatsapp without qr, whatsapp bot pair code, kartelo md pair code, baileys pairing code, whatsapp linked devices, connect whatsapp bot, whatsapp bot setup, qr code alternative, kartelo pair code, how to link whatsapp bot
```

### Video 3 — Commands Showcase
```
kartelo md commands, whatsapp bot commands, whatsapp bot features, ai whatsapp bot, sticker bot, whatsapp economy bot, whatsapp group admin bot, kartelo md showcase, whatsapp bot demo, 80 commands whatsapp, best whatsapp bot features, kartelo md menu
```

### Video 4 — Fix Not Connecting
```
whatsapp bot not connecting, kartelo md not working, pair code invalid, whatsapp bot offline, baileys session expired, fix whatsapp bot, whatsapp bot troubleshooting, render bot crash, better-sqlite3 error, whatsapp bot fix 2025, kartelo md error
```

### Video 5 — Bot Comparison
```
kartelo md vs june-x, june-x whatsapp bot, x-asylum whatsapp bot, best whatsapp bot 2025, whatsapp bot comparison, kartelo vs june-x vs x-asylum, top whatsapp bots, which whatsapp bot is best, baileys bot comparison, whatsapp multi device comparison
```

---

## 📝 VIDEO DESCRIPTION TEMPLATES

### Video 1 Description
```
In this video I show you how to deploy the KARTELO MD WhatsApp bot 100% free on Render — no VPS, no coding, no credit card. Your bot stays online 24/7 with AI, stickers, downloads, economy, and 80+ commands.

🔗 GitHub Repo: https://github.com/kartelian555-sketch/Kartelo-md
🔗 Render: https://render.com
👨‍💻 Owner: +254 711 939 375

⏱ Timestamps:
0:00 Intro
0:22 GitHub repo
1:00 Render signup
1:45 Config & env vars
3:20 Deploy
4:20 Pair code
4:35 Link WhatsApp
5:45 Test commands
7:50 Recap

Subscribe for more WhatsApp bot tutorials! 🔔

#KarteloMD #WhatsAppBot #Baileys #FreeBot #TechTutorial
```

### Video 2 Description
```
Learn the pair code method to link your WhatsApp bot in 30 seconds — no QR scanning needed. Faster, easier, and perfect for cloud deployments.

🔗 GitHub Repo: https://github.com/kartelian555-sketch/Kartelo-md

⏱ Timestamps:
0:00 Intro
0:15 What is a pair code
0:35 Two methods
1:00 Method 1: logs
1:25 Link on phone
1:50 Troubleshooting

#KarteloMD #PairCode #WhatsAppBot
```

### Video 3 Description
```
Full tour of all 80+ KARTELO MD commands across 9 categories: Download, AI, Sticker, Group, Economy, Fun & Games, Leveling, Utilities, and Owner.

🔗 Full command list: https://github.com/kartelian555-sketch/Kartelo-md

⏱ Timestamps:
0:00 Intro
0:25 Download
1:20 AI
2:30 Sticker
3:00 Group
4:30 Economy
5:30 Fun & Games
7:00 Leveling
7:30 Utilities
8:30 Owner

#KarteloMD #WhatsAppBot #BotShowcase
```

### Video 4 Description
```
Fix the 6 most common KARTELO MD bot issues: invalid pair code, bot offline, build fails, commands not responding, stickers/downloads broken, and startup crashes.

🔗 GitHub Repo: https://github.com/kartelian555-sketch/Kartelo-md

⏱ Timestamps:
0:00 Intro
0:20 Pair code invalid
1:10 Bot offline
2:00 Build fails
2:50 Commands not responding
3:40 Stickers/downloads
4:20 Startup crash
5:00 Read the logs

#KarteloMD #WhatsAppBot #Troubleshooting
```

### Video 5 Description
```
KARTELO MD vs JUNE-X vs X-ASYLUM — honest comparison of the top 3 WhatsApp bots in 2025. Commands, deployment, AI, economy, stability, and community.

🔗 Kartelo MD: https://github.com/kartelian555-sketch/Kartelo-md

⏱ Timestamps:
0:00 Intro
0:45 Commands
2:00 Deployment
3:00 AI
3:45 Economy
4:20 Stability
5:00 Community
5:40 Verdict

#KarteloMD #JuneX #XAsylum #WhatsAppBot #BotComparison
```

---

## 🎨 THUMBNAIL STRATEGY GUIDE

### Style Rules (MrBeast / JUNEX inspired)
1. **High contrast:** Black background + neon green + bright yellow + red accents
2. **Big bold text:** Maximum 4-5 words, readable on mobile, font size huge
3. **Faces/characters:** Include the cyborg head or a shocked face — faces increase CTR
4. **Arrows & circles:** Red arrows pointing at the key element
5. **Emotional words:** "FREE", "100% WORKING", "NO SKILLS", "EXPOSED"
6. **No clutter:** One focal point, lots of negative space

### Color Palette
| Element | Color | Hex |
|---------|-------|-----|
| Background | Black | #000000 |
| Primary accent | Neon green | #39FF14 |
| Warning/CTA | Red | #FF0000 |
| Highlight text | Yellow | #FFFF00 |
| Body text | White | #FFFFFF |

### Recommended Thumbnail Text by Video
| Video | Text on thumbnail |
|-------|-------------------|
| 1 | HOW TO DEPLOY FREE / 100% WORKING |
| 2 | PAIR CODE IN 30 SEC / NO QR NEEDED |
| 3 | 80+ COMMANDS / FULL TOUR |
| 4 | BOT NOT WORKING? / FIX IN 5 MIN |
| 5 | KARTELO vs JUNE-X / WHO WINS? |

### Tools for making thumbnails
- **Canva** (free) — YouTube thumbnail templates, easy drag-and-drop
- **Photopea** (free, browser) — Photoshop alternative
- **Adobe Express** (free tier) — good templates
- **Generate more with this bot** — use the `.imagine` command to generate base images

---

## 📅 LAUNCH SCHEDULE (First 2 Weeks)

| Day | Action |
|-----|--------|
| Day 1 | Set up channel, upload banner + profile pic, write description |
| Day 1 | Upload Video 1 (Deploy Tutorial) — this is your flagship |
| Day 3 | Upload Video 2 (Pair Code) |
| Day 5 | Upload Video 3 (Commands Showcase) |
| Day 7 | Upload Video 4 (Fix Not Connecting) |
| Day 9 | Upload Video 5 (Bot Comparison) |
| Day 10 | Share all videos in WhatsApp groups, Reddit r/whatsapp, Telegram |
| Day 14 | Review analytics, plan next 5 videos based on what performed best |

### Growth Tips
- Pin a comment on every video with the GitHub link
- Make shorts from each video (cut the best 30-60 seconds)
- Reply to every comment in the first 48 hours
- Use the same green/black branding everywhere
- Collab with other bot channels for shoutouts
- Post your videos in the KARTELO MD WhatsApp group

---

## ✅ QUICK CHECKLIST

- [ ] Create YouTube channel "KARTELO MD OFFICIAL"
- [ ] Upload banner (`assets/youtube-banner.png`)
- [ ] Set profile picture (`assets/kartelo-banner.png`)
- [ ] Paste channel description
- [ ] Create logo intro video (use `assets/logo-intro-frame.png`)
- [ ] Record Video 1 using the script above
- [ ] Set Video 1 thumbnail (`assets/video1-thumbnail.png`)
- [ ] Add SEO tags + description to Video 1
- [ ] Upload and publish Video 1
- [ ] Repeat for Videos 2-5
- [ ] Share on all social platforms
- [ ] Pin comment with GitHub link on every video

---

> **KARTELO MD OFFICIAL** — BUILD. DEPLOY. DOMINATE.
> Created by KARTELO OFFICIAL · Owner: +254 711 939 375
> GitHub: https://github.com/kartelian555-sketch/Kartelo-md
