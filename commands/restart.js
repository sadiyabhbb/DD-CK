const path = require('path');
const fs = require('fs');

module.exports.config = {
    name: "restart",
    credits: "LIKHON AHMED",
    aliases: ["reboot"],
    version: "1.1.0",
    permission: 2, 
    prefix: true,
    description: "Restarts the bot process and shows restart duration.",
    category: "system",
    usages: "/restart",
    cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    // Check if sender is Admin
    if (!global.CONFIG.BOT_SETTINGS.ADMINS.includes(msg.from.id.toString())) {
        return bot.sendMessage(chatId, "❌ Only admins or the bot owner can use this command.", { reply_to_message_id: messageId });
    }

    try {
        const sentMsg = await bot.sendMessage(chatId, 
            "🔄 **Restarting...**\nPlease wait a moment while the bot process reboots.", 
            { reply_to_message_id: messageId, parse_mode: 'Markdown' }
        );

        // Save restart info to a temporary file
        const restartInfo = {
            chatId: chatId,
            messageId: sentMsg.message_id,
            startTime: Date.now()
        };
        fs.writeFileSync(path.join(__dirname, 'restart_info.json'), JSON.stringify(restartInfo));

        // Clearing cache
        Object.keys(require.cache).forEach(key => {
            if (!key.includes('node_modules')) {
                delete require.cache[key];
            }
        });

        // Exit process
        setTimeout(() => {
            process.exit(1); 
        }, 1500); 

    } catch (error) {
        console.error("❌ RESTART COMMAND ERROR:", error.message);
        return bot.sendMessage(chatId, 
            "❌ An error occurred during restart. Check logs or restart manually.", 
            { reply_to_message_id: messageId }
        );
    }
};
