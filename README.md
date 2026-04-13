# Kartelo 🇯🇲 Official MD

A powerful WhatsApp Multi-Device bot built with [Baileys](https://github.com/WhiskeySockets/Baileys), featuring 30+ commands, group management, an admin panel, and dual authentication support.

---

## Features

- ✅ 30+ commands (general, group management, owner tools, channels)
- ✅ Dual auth: Pairing Code or Session ID
- ✅ Web admin panel (Dashboard, Send Message, Broadcast, Groups, Logs)
- ✅ Anti-link protection per group
- ✅ Welcome messages for new members
- ✅ Tag all members / Hide tag
- ✅ Group info, invite link, revoke link
- ✅ Owner broadcast to all chats
- ✅ Keep-alive HTTP server

---

## Commands

### General
| Command | Description |
|---|---|
| `.menu` | Show all commands with image |
| `.ping` | Check bot response speed |
| `.alive` | Check if bot is online |
| `.uptime` | Bot running time |
| `.time` | Current date & time |
| `.owner` | Show owner contact |
| `.botinfo` | Bot details |
| `.quote` | Random inspirational quote |
| `.joke` | Random joke |

### Group Management *(Admin only)*
| Command | Description |
|---|---|
| `.kick @user` | Remove a member |
| `.promote @user` | Make member admin |
| `.demote @user` | Remove admin rights |
| `.mute` | Mute group (admins only) |
| `.unmute` | Unmute group |
| `.tagall` | Tag all members |
| `.hidetag [msg]` | Tag all silently |
| `.groupinfo` | Show group details |
| `.link` | Get invite link |
| `.revoke` | Reset invite link |
| `.setname [name]` | Change group name |
| `.setdesc [text]` | Change group description |
| `.antilink on/off` | Toggle anti-link |
| `.welcome on/off` | Toggle welcome messages |

### Owner Tools
| Command | Description |
|---|---|
| `.eval [code]` | Run JavaScript code |
| `.block @user` | Block a user |
| `.unblock @user` | Unblock a user |
| `.broadcast [msg]` | Send to all chats |

### Channel Commands
| Command | Description |
|---|---|
| `.channelinfo` | Channel details |
| `.followchannel` | Follow a channel |
| `.unfollowchannel` | Unfollow a channel |
| `.channelsend [msg]` | Send to channel |
| `.mutenotif` | Mute notifications |
| `.unmutenotif` | Unmute notifications |

---

## Installation

### Requirements
- Node.js v18+
- A WhatsApp account

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/kartelian555-sketch/Kartelo-md.git
cd Kartelo-md

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your details

# 4. Start the bot
node index.js
```

### Configuration (`.env`)

```env
OWNER_NUMBER=254711939375      # Your WhatsApp number (no + or spaces)
USE_PAIRING_CODE=true          # true = pairing code, false = QR code
SESSION_ID=                    # Leave empty for first run
MENU_IMAGE_URL=                # Optional menu banner image URL
PANEL_PASSWORD=kartelo2024     # Admin panel password
```

---

## Admin Panel

The bot comes with a built-in web admin panel — no extra software needed.

### How to Access

| Location | URL |
|---|---|
| **Local / Replit** | `http://localhost:3000` |
| **VPS Server** | `http://YOUR_SERVER_IP:3000` |
| **Heroku / Railway** | `https://your-app-url/panel` |

**Default password:** `kartelo2024` (change in `.env` → `PANEL_PASSWORD`)

---

### Panel Pages

#### 📊 Dashboard
- Live bot connection status (Connected / Disconnected / Starting)
- Bot uptime counter
- Owner number
- Total commands available (30+)
- Number of groups tracked
- Connected at timestamp
- **Pairing code shown in big green** when bot is not connected
- Recent activity log (last 10 commands)

#### ✉️ Send Message
- Send a WhatsApp message to **any number** directly from your browser
- Enter number (with country code, no +) and message
- Useful for sending messages without opening WhatsApp

#### 📢 Broadcast
- Send one message to **all chats at once**
- Reaches all groups and private chats the bot is in
- Perfect for announcements

#### 👥 Groups
- View all groups the bot is tracking
- See Anti-link status (ON/OFF) per group
- See Welcome message status (ON/OFF) per group

#### 📋 Logs
- Live feed of all commands used
- Shows who used which command and when
- Helps monitor bot activity

---

### Panel Security

- Password protected — no one can access without `PANEL_PASSWORD`
- Session cookie expires when browser closes
- Change password anytime in `.env`:
```
PANEL_PASSWORD=your_new_password
```
Then restart the bot.

---

### Open Firewall Port for Panel on VPS

```bash
sudo ufw allow 3000
sudo ufw allow 22
sudo ufw enable
sudo ufw status
```

---

## Connecting to WhatsApp

### Pairing Code (Recommended)
1. Start the bot: `node index.js`
2. Open WhatsApp → **Linked Devices → Link a Device**
3. Tap **"Link with phone number instead"**
4. Enter your number and the 8-digit code shown in the console

### Session ID (For cloud hosting)
1. Connect once using pairing code
2. Run: `cat auth_info/creds.json | base64`
3. Paste the output as `SESSION_ID` in your `.env`

---

## Hosting

### Ubuntu VPS Control Panels

Control panels let you manage your VPS from a browser — no terminal needed for daily tasks.

#### Option 1 — aaPanel *(Most recommended for bot hosting)*

```bash
# Install aaPanel on Ubuntu
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh
sudo bash install.sh aapanel
```

After install you'll see:
```
aaPanel Internet Address: http://YOUR_IP:7800/xxxxxxxx
username: admin
password: xxxxxxxx
```

Open that URL in your browser to access the panel.

**aaPanel features for the bot:**
| Feature | What you can do |
|---|---|
| File Manager | Edit `.env`, view logs from browser |
| Terminal | Run PM2 commands from browser |
| Monitor | See CPU, RAM, network usage live |
| Task Manager | Start/stop/restart the bot |
| Firewall | Open/close ports (3000, 22) |

#### Option 2 — Webmin

```bash
curl -o setup-repos.sh https://raw.githubusercontent.com/webmin/webmin/master/setup-repos.sh
sudo sh setup-repos.sh
sudo apt install -y webmin
```

Access at: `https://YOUR_SERVER_IP:10000`
Login with your Linux `root` username and password.

#### Option 3 — HestiaCP

```bash
wget https://raw.githubusercontent.com/hestiacp/hestiacp/release/install/hst-install.sh
sudo bash hst-install.sh
```

Access at: `https://YOUR_SERVER_IP:8083`

---

#### After Installing Any Panel — Run the Bot

Open the panel's **Terminal** tab and run:
```bash
cd /root/Kartelo-md
pm2 start index.js --name kartelo-bot
pm2 save
```

Then open `http://YOUR_SERVER_IP:3000` in your browser to see the bot's own admin panel with the pairing code.

---

### VPS Requirements (Ubuntu 20.04 / 22.04)

| Resource | Minimum | Recommended |
|---|---|---|
| **CPU** | 1 vCPU | 1–2 vCPU |
| **RAM** | 512 MB | 1 GB |
| **Storage** | 5 GB | 10 GB |
| **Network** | 100 Mbps | 100 Mbps+ |
| **OS** | Ubuntu 20.04 | Ubuntu 22.04 LTS |

### Monthly Data Usage

| Activity | Estimated Usage |
|---|---|
| Bot idle (connected) | ~1–3 GB/month |
| Active messaging | ~3–8 GB/month |
| Broadcast to many groups | Varies |

### Recommended VPS Providers

| Provider | Price | Specs |
|---|---|---|
| [Contabo](https://contabo.com) | $5/month | 4 vCPU, 4 GB RAM |
| [Hetzner](https://hetzner.com) | $4/month | 2 vCPU, 2 GB RAM |
| [DigitalOcean](https://digitalocean.com) | $6/month | 1 vCPU, 1 GB RAM |
| [Vultr](https://vultr.com) | $5/month | 1 vCPU, 1 GB RAM |
| [Hostinger VPS](https://hostinger.com) | $4/month | 1 vCPU, 1 GB RAM |

### Ubuntu VPS Full Setup

```bash
# 1. Update server
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git

# 3. Clone the bot
cd /root
git clone https://github.com/kartelian555-sketch/Kartelo-md.git
cd Kartelo-md
npm install

# 4. Configure environment
cp .env.example .env
nano .env   # fill in your details, save with Ctrl+X → Y → Enter

# 5. Install PM2 (keeps bot running 24/7)
npm install -g pm2

# 6. Start the bot
pm2 start index.js --name kartelo-bot
pm2 startup
pm2 save
```

### PM2 Commands

| Command | What it does |
|---|---|
| `pm2 logs kartelo-bot` | View live logs + pairing code |
| `pm2 restart kartelo-bot` | Restart the bot |
| `pm2 stop kartelo-bot` | Stop the bot |
| `pm2 status` | Check running status |

### Connecting to WhatsApp from VPS

#### Step 1 — SSH into your server
```bash
ssh root@YOUR_SERVER_IP
```

#### Step 2 — Clone and install
```bash
cd /root
git clone https://github.com/kartelian555-sketch/Kartelo-md.git
cd Kartelo-md
npm install
```

#### Step 3 — Configure environment
```bash
cp .env.example .env
nano .env
```
Set these values:
```
OWNER_NUMBER=254711939375
USE_PAIRING_CODE=true
PANEL_PASSWORD=kartelo2024
PORT=3000
```
Save with `Ctrl+X` → `Y` → `Enter`

#### Step 4 — Start the bot
```bash
npm install -g pm2
pm2 start index.js --name kartelo-bot
pm2 save
```

#### Step 5 — Get your pairing code
```bash
pm2 logs kartelo-bot
```
Look for:
```
║   >>> XXXXXXXX <<<   ║
```

#### Step 6 — Open firewall for admin panel
```bash
sudo ufw allow 3000
sudo ufw allow 22
sudo ufw enable
```

#### Step 7 — Open admin panel in browser
Go to: `http://YOUR_SERVER_IP:3000`
Login password: `kartelo2024`

The pairing code will appear in **big green** on the dashboard automatically.

#### Step 8 — Enter code in WhatsApp
1. Open WhatsApp on your phone
2. Tap **⋮ → Linked Devices → Link a Device**
3. Tap **"Link with phone number instead"**
4. Select country 🇰🇪 **Kenya (+254)**
5. Enter number: **`711939375`** (no 254, no 0)
6. Enter the 8-digit code shown on the panel
7. Tap **Link** ✅

#### ⚠️ Common Mistakes When Entering Number

| Wrong | Correct |
|---|---|
| `254711939375` with Kenya selected | `711939375` |
| `0711939375` | `711939375` |
| Wrong country selected | Must be 🇰🇪 Kenya (+254) |

### Keep Bot Running 24/7 on VPS

#### Disable Power Saving / Sleep on the Server
```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

#### Enable PM2 Auto-Start on Reboot
```bash
pm2 startup systemd -u root --hp /root
pm2 save
```

#### Set PM2 to Auto-Restart on Crash
```bash
pm2 start index.js --name kartelo-bot --restart-delay=3000 --max-restarts=10
pm2 save
```

#### Verify it Survives Reboot
```bash
sudo reboot
# After reboot:
pm2 status    # should show kartelo-bot as online
pm2 logs kartelo-bot
```

#### Keep Server Awake (Prevent Idle Shutdown)
```bash
sudo apt install -y screen
screen -S kartelo
pm2 start index.js --name kartelo-bot
# Press Ctrl+A then D to detach
# To re-attach later:
screen -r kartelo
```

#### PM2 Config for Maximum Uptime
Create a `ecosystem.config.js` file:
```js
module.exports = {
  apps: [{
    name: 'kartelo-bot',
    script: 'index.js',
    watch: false,
    autorestart: true,
    restart_delay: 3000,
    max_restarts: 50,
    exp_backoff_restart_delay: 100,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```
Then run:
```bash
pm2 start ecosystem.config.js
pm2 save
```

### Open the Admin Panel on VPS

In your browser: `http://YOUR_SERVER_IP:3000`

To open the firewall port:
```bash
sudo ufw allow 3000
sudo ufw allow 22
sudo ufw enable
```

### Heroku Deployment

| Step | Action |
|---|---|
| 1 | Go to [dashboard.heroku.com](https://dashboard.heroku.com) → New → Create new app |
| 2 | Settings → Config Vars → add your `.env` values |
| 3 | Deploy → GitHub → connect `Kartelo-md` → Deploy Branch |
| 4 | Resources → turn ON the `worker` dyno |
| 5 | More → View logs → find pairing code → connect WhatsApp |

### Heroku Network & Bandwidth

| Resource | Limit | Notes |
|---|---|---|
| **Bandwidth** | 2 TB/month | More than enough for a WhatsApp bot |
| **Network In** | Unlimited | Incoming messages |
| **Network Out** | 2 TB/month | Outgoing messages and media |
| **Connections** | Unlimited | WebSocket connections supported |
| **Dyno RAM** | 512 MB (Basic) | Sufficient for bot operation |
| **Request Timeout** | 30 seconds | HTTP requests only |
| **Dyno Uptime** | 24/7 | Basic/Standard dynos never sleep |

### Heroku Dyno Plans

| Plan | Price | RAM | Sleep? | Best For |
|---|---|---|---|---|
| **Eco** | $5/month (shared) | 512 MB | Yes — avoid | Testing only |
| **Basic** | $5/month | 512 MB | No | WhatsApp bot |
| **Standard-1X** | $25/month | 512 MB | No | High traffic |
| **Standard-2X** | $50/month | 1 GB | No | Heavy usage |

> Use **Basic** dyno — it runs 24/7 and costs only $5/month. Eco dynos sleep after 30 minutes of inactivity which will disconnect the bot.

### Heroku Useful Commands

```bash
heroku logs --tail --app kartelo-md-bot     # Live logs
heroku ps --app kartelo-md-bot              # Dyno status
heroku restart --app kartelo-md-bot         # Restart bot
heroku config --app kartelo-md-bot          # View env vars
heroku ps:scale worker=1 --app kartelo-md-bot  # Start worker
```

### Railway Server Deployment

| Step | Action |
|---|---|
| 1 | Go to [railway.app](https://railway.app) → Login with GitHub |
| 2 | Click **New Project → Deploy from GitHub repo** |
| 3 | Select your `Kartelo-md` repository |
| 4 | Click **Add Variables** and add your `.env` values |
| 5 | Railway auto-detects Node.js and deploys automatically |
| 6 | Click **View Logs** → find pairing code → connect WhatsApp |

### Railway Network & Bandwidth

| Resource | Free Tier | Pro Plan |
|---|---|---|
| **Bandwidth** | 100 GB/month | 100 GB included + $0.10/GB |
| **RAM** | 512 MB | Up to 32 GB |
| **CPU** | Shared | Dedicated |
| **Uptime** | 500 hrs/month | 24/7 unlimited |
| **Sleep** | No | No |
| **Network** | Public URL included | Custom domain supported |

### Railway Plans

| Plan | Price | Hours | Best For |
|---|---|---|---|
| **Hobby** | $5/month | Unlimited | WhatsApp bot (recommended) |
| **Pro** | $20/month | Unlimited | High traffic bots |
| **Free** | $0 | 500 hrs/month | Testing only |

> Use **Hobby ($5/month)** — runs 24/7 without sleeping, perfect for a WhatsApp bot.

### Railway Environment Variables

In Railway dashboard → your project → **Variables** tab, add:
```
OWNER_NUMBER      = 254711939375
USE_PAIRING_CODE  = true
SESSION_ID        =
PANEL_PASSWORD    = kartelo2024
PORT              = 3000
```

### Railway Useful Commands (CLI)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# View live logs
railway logs

# Restart the service
railway up
```

### Other Hosting Options

| Platform | Cost | Notes |
|---|---|---|
| [Replit](https://replit.com) | ~$7/month | Reserved VM plan needed |
| [Railway](https://railway.app) | Free / $5 | Easy GitHub deploy |
| [Render](https://render.com) | Free | Spins down when idle |

---

## Owner

**Kartelo 🇯🇲 Official MD**
WhatsApp: +254711939375

---

## License

MIT License — free to use and modify.
