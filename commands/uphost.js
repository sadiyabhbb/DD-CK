const fs = require('fs');
const path = require('path');
const fse = require('fs-extra'); 
const axios = require('axios');

const DATA_FILE = path.join(__dirname, 'uphost_data.json');
let hostedUrls = []; 

module.exports.config = {
    name: "uphost",
    credits: "LIKHON AHMED",
    aliases: ["host", "up"],
    prefix: true,
    permission: 1,
    description: "URL uptime host and status checker.",
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
        console.error("❌ Uphost: Error loading data:", e.message);
        hostedUrls = [];
    }
}

async function saveData() {
    try {
        await fse.writeJson(DATA_FILE, hostedUrls, { spaces: 2 });
    } catch (e) {
        console.error("❌ Uphost: Error saving data:", e.message);
    }
}

async function checkUrlStatus(url) {
    try {
        const response = await axios.head(url, { timeout: 5000, maxRedirects: 5 }); 
        const statusCode = response.status;
        
        if (statusCode >= 200 && statusCode < 300) {
            return { status: "LIVE (2xx)", emoji: "🟢" };
        } else if (statusCode >= 300 && statusCode < 400) {
             return { status: "Redirect (3xx)", emoji: "🟡" };
        } else {
            return { status: `Error (${statusCode})`, emoji: "🔴" };
        }
    } catch (e) {
        if (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') {
            return { status: "Timeout/Unavailable", emoji: "🔴" };
        }
        return { status: `Failed (${e.response?.status || 'No Response'})`, emoji: "🔴" };
    }
}

module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const args = msg.text.split(/\s+/).slice(1);
    const command = args[0]?.toLowerCase();

    if (hostedUrls.length === 0) {
        await loadData();
    }
    
    if (command === 'add') {
        const url = args[1];
        if (!url || !url.startsWith('http')) {
            return bot.sendMessage(chatId, "⚠️ দয়া করে একটি বৈধ URL দিন। উদাহরণ: `/uphost add https://example.com`", { reply_to_message_id: messageId });
        }

        if (hostedUrls.some(item => item.url === url)) {
            return bot.sendMessage(chatId, "❌ এই URL টি ইতিমধ্যেই তালিকায় আছে।", { reply_to_message_id: messageId });
        }

        hostedUrls.push({ url: url, addedBy: msg.from.id, addedOn: Date.now() });
        await saveData();
        return bot.sendMessage(chatId, `✅ URL যুক্ত করা হয়েছে: ${url}`, { reply_to_message_id: messageId });
    }

    else if (command === 'list') {
        if (hostedUrls.length === 0) {
            return bot.sendMessage(chatId, "ℹ️ কোনো URL হোস্টিংয়ের জন্য যুক্ত করা হয়নি।", { reply_to_message_id: messageId });
        }

        let listMessage = "🌟 **হোস্টেড URL স্ট্যাটাস** 🌟\n\n";
        
        const statusChecks = hostedUrls.map(item => checkUrlStatus(item.url));
        const results = await Promise.all(statusChecks);

        results.forEach((result, index) => {
            const item = hostedUrls[index];
            const urlDisplay = item.url.length > 40 ? item.url.substring(0, 37) + "..." : item.url;
            listMessage += `${index + 1}. ${result.emoji} \`${urlDisplay}\`\n  └ Status: *${result.status}*\n`;
        });

        listMessage += `\n╭──────────────────╮\n│ Total URLs: ${hostedUrls.length} │\n╰──────────────────╯\n`;
        
        return bot.sendMessage(chatId, listMessage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }

    else if (command === 'remove') {
        const identifier = args[1];
        let indexToRemove = -1;

        if (hostedUrls.length === 0) {
             return bot.sendMessage(chatId, "ℹ️ কোনো URL নেই, তাই রিমুভ করার কিছু নেই।", { reply_to_message_id: messageId });
        }
        
        const indexNum = parseInt(identifier);
        if (!isNaN(indexNum) && indexNum > 0 && indexNum <= hostedUrls.length) {
            indexToRemove = indexNum - 1;
        } 
        else if (identifier && identifier.startsWith('http')) {
            indexToRemove = hostedUrls.findIndex(item => item.url === identifier);
        }

        else if (msg.reply_to_message && !isNaN(parseInt(msg.text.split(/\s+/).slice(1)[0]))){
             const replyIndexNum = parseInt(msg.text.split(/\s+/).slice(1)[0]);
             if (replyIndexNum > 0 && replyIndexNum <= hostedUrls.length) {
                 indexToRemove = replyIndexNum - 1;
             }
        }
        
        if (indexToRemove >= 0) {
            const removedUrl = hostedUrls.splice(indexToRemove, 1)[0].url;
            await saveData();
            return bot.sendMessage(chatId, `🗑️ সফলভাবে সরানো হয়েছে: ${removedUrl}`, { reply_to_message_id: messageId });
        } else {
            return bot.sendMessage(chatId, "❌ ভুল ইনপুট। রিমুভ করার জন্য সঠিক নম্বর বা সম্পূর্ণ URL দিন।", { reply_to_message_id: messageId });
        }
    }

    else {
        const helpMessage = `
⚙️ **Uphost Command Usage**

* 🟢 /uphost add [url]
  - Example: \`/uphost add https://mybot.glitch.me\`

* 🟡 /uphost list
  - Check the status (live/down) of all hosted URLs.

* 🔴 /uphost remove [number/url]
  - Remove a URL. Example: \`/uphost remove 3\` (removes 3rd link) or \`/uphost remove https://link.com\`

* 🔑 Permission: Admin Only
`;
        return bot.sendMessage(chatId, helpMessage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }
};

loadData();
