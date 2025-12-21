const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, 'reaction_settings.json');

// Settings load korar logic
function getSettings() {
    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify({ status: "on" }));
        return { status: "on" };
    }
    return JSON.parse(fs.readFileSync(settingsPath));
}

module.exports.config = {
    name: "reaction",
    version: "1.1.0",
    credits: "LIKHON AHMED",
    description: "Automatic reaction on/off system",
    category: "system",
    prefix: true, 
    usages: "/reaction on | off",
    cooldowns: 5,
};

module.exports.handleEvent = async (bot, msg) => {
    const settings = getSettings();
    
    // Status 'off' thakle ba message empty hole kichu korbe na
    if (settings.status === "off" || !msg.text || msg.from.is_bot) return;

    try {
        const emojis = ["👍", "❤️", "🔥", "😁", "👌", "🤩", "✨", "🙌"];
        const pick = emojis[Math.floor(Math.random() * emojis.length)];

        await bot._request("setMessageReaction", {
            form: {
                chat_id: msg.chat.id,
                message_id: msg.message_id,
                reaction: JSON.stringify([{ type: "emoji", emoji: pick }]),
                is_big: false
            }
        });
    } catch (err) {
        // Reaction permission na thakle error ignore korbe
    }
};

module.exports.run = async (bot, msg, args) => {
    const input = args[0]?.toLowerCase();
    const chatId = msg.chat.id;

    if (input === "on") {
        fs.writeFileSync(settingsPath, JSON.stringify({ status: "on" }));
        return bot.sendMessage(chatId, "✅ Automatic reaction has been enabled.");
    } 
    
    if (input === "off") {
        fs.writeFileSync(settingsPath, JSON.stringify({ status: "off" }));
        return bot.sendMessage(chatId, "❌ Automatic reaction has been disabled.");
    }

    return bot.sendMessage(chatId, "⚠️ Use `/reaction on` to enable or `/reaction off` to disable.");
};
