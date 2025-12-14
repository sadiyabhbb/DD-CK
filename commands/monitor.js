const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const axios = require('axios');

const DATA_FILE = path.join(__dirname, 'uphost_data.json');
let hostedUrls = [];

module.exports.config = {
    name: "monitor",
    credits: "LIKHON AHMED",
    aliases: ["host", "up"],
    prefix: true,
    permission: 1,
    description: "URL uptime host + auto keep alive system",
    tags: ["utility", "admin", "host"]
};

async function loadData() {
    try {
        if (fse.existsSync(DATA_FILE)) {
            hostedUrls = await fse.readJson(DATA_FILE);
        } else {
            hostedUrls = [];
        }
    } catch (e) {
        hostedUrls = [];
    }
}

async function saveData() {
    try {
        await fse.writeJson(DATA_FILE, hostedUrls, { spaces: 2 });
    } catch (e) {}
}

async function checkUrlStatus(url) {
    try {
        const res = await axios.head(url, { timeout: 5000 });
        if (res.status >= 200 && res.status < 300) {
            return { status: "LIVE (2xx)", emoji: "🟢" };
        } else if (res.status >= 300 && res.status < 400) {
            return { status: "Redirect (3xx)", emoji: "🟡" };
        } else {
            return { status: `Error (${res.status})`, emoji: "🔴" };
        }
    } catch {
        return { status: "DOWN / NO RESPONSE", emoji: "🔴" };
    }
}

async function pingAllUrls() {
    if (!hostedUrls.length) return;
    for (const item of hostedUrls) {
        try {
            await axios.get(item.url, {
                timeout: 10000,
                headers: { "User-Agent": "Uphost-KeepAlive" }
            });
        } catch {}
    }
}

setInterval(pingAllUrls, 5 * 60 * 1000);

module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const args = msg.text.split(/\s+/).slice(1);
    const command = args[0]?.toLowerCase();

    if (!hostedUrls.length) await loadData();

    if (command === "add") {
        const url = args[1];
        if (!url || !url.startsWith("http")) {
            return bot.sendMessage(
                chatId,
                "⚠️ সঠিক URL দিন\nউদাহরণ: `/uphost add https://example.com`",
                { reply_to_message_id: messageId, parse_mode: "Markdown" }
            );
        }

        if (hostedUrls.some(u => u.url === url)) {
            return bot.sendMessage(
                chatId,
                "❌ এই URL আগেই যোগ করা আছে।",
                { reply_to_message_id: messageId }
            );
        }

        hostedUrls.push({
            url,
            addedBy: msg.from.id,
            addedOn: Date.now()
        });

        await saveData();
        return bot.sendMessage(
            chatId,
            `✅ URL যোগ করা হয়েছে:\n${url}`,
            { reply_to_message_id: messageId }
        );
    }

    else if (command === "list") {
        if (!hostedUrls.length) {
            return bot.sendMessage(
                chatId,
                "ℹ️ কোনো URL যোগ করা নেই।",
                { reply_to_message_id: messageId }
            );
        }

        let text = "🌐 **Hosted URL Status**\n\n";
        const checks = await Promise.all(
            hostedUrls.map(u => checkUrlStatus(u.url))
        );

        checks.forEach((r, i) => {
            text += `${i + 1}. ${r.emoji} \`${hostedUrls[i].url}\`\n   └ ${r.status}\n`;
        });

        text += `\n⏱️ Auto ping: Every 5 minutes`;

        return bot.sendMessage(chatId, text, {
            reply_to_message_id: messageId,
            parse_mode: "Markdown"
        });
    }

    else if (command === "remove") {
        const id = args[1];
        let index = -1;

        if (!isNaN(id)) {
            index = parseInt(id) - 1;
        } else if (id?.startsWith("http")) {
            index = hostedUrls.findIndex(u => u.url === id);
        }

        if (index < 0 || index >= hostedUrls.length) {
            return bot.sendMessage(
                chatId,
                "❌ সঠিক নাম্বার বা URL দিন।",
                { reply_to_message_id: messageId }
            );
        }

        const removed = hostedUrls.splice(index, 1)[0];
        await saveData();

        return bot.sendMessage(
            chatId,
            `🗑️ Removed:\n${removed.url}`,
            { reply_to_message_id: messageId }
        );
    }

    else {
        return bot.sendMessage(
            chatId,
`⚙️ **Uphost Commands**

🟢 /uphost add <url>
🟡 /uphost list
🔴 /uphost remove <number|url>

⏱️ Auto Keep Alive: ON (5 min)
🔐 Admin only`,
            { reply_to_message_id: messageId, parse_mode: "Markdown" }
        );
    }
};

loadData();
