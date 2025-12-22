const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

module.exports.config = {
    name: "clone",
    credits: "LIKHON AHMED",
    aliases: ["newbot"],
    version: "2.0.0", 
    permission: 2, 
    prefix: true,
    description: "Clones all features of the main bot and creates a new bot.",
    category: "system",
    usages: "/clone [Token] | /clone botlist | /clone remove [Number]",
    cooldowns: 10,
};

async function handleBotList(bot, chatId, messageId) {
    const mainBotTokenPart = global.CONFIG.BOT_TOKEN.split(':')[0];
    const clonedBots = global.BOT_INSTANCES.filter(instance => !instance.token.startsWith(mainBotTokenPart)); 

    if (clonedBots.length === 0) {
        return bot.sendMessage(chatId, "⚠️ There are no active cloned bots at the moment.", { reply_to_message_id: messageId });
    }

    let list = "🤖 **Active Cloned Bots List:**\n\n";
    clonedBots.forEach((instance, index) => {
        const botName = escapeMarkdown(instance.options.name || "Clone Bot"); 
        const botUsername = escapeMarkdown(instance.options.username || 'N/A');
        const tokenSuffix = instance.token.slice(-4);

        list += `${index + 1}. **${botName}**\n` +
                `   › Username: @${botUsername}\n` +
                `   › Token last 4 digits: **...${tokenSuffix}**\n\n`;
    });

    list += `Usage: Close a bot using \`/clone remove [Number]\`.`;
    return bot.sendMessage(chatId, list, { reply_to_message_id: messageId, parse_mode: 'Markdown' }); 
}

async function handleBotRemove(bot, chatId, messageId, identifier) {
    if (!identifier) {
        return bot.sendMessage(chatId, "⚠️ Usage: `/clone remove [Number]`", { reply_to_message_id: messageId });
    }
    
    const mainBotTokenPart = global.CONFIG.BOT_TOKEN.split(':')[0];
    let targetIndex = -1;

    const index = parseInt(identifier) - 1;
    const clonedBots = global.BOT_INSTANCES.filter(instance => !instance.token.startsWith(mainBotTokenPart));

    if (!isNaN(index) && index >= 0 && index < clonedBots.length) {
        const targetBot = clonedBots[index];
        targetIndex = global.BOT_INSTANCES.findIndex(inst => inst === targetBot);
    } 
    
    if (targetIndex === -1) {
        return bot.sendMessage(chatId, "❌ Invalid number. Bot not found.", { reply_to_message_id: messageId });
    }

    const targetBotInstance = global.BOT_INSTANCES[targetIndex];

    try {
        await targetBotInstance.stopPolling();
        global.BOT_INSTANCES.splice(targetIndex, 1);
        return bot.sendMessage(chatId, "✅ The cloned bot has been successfully stopped and removed.", { reply_to_message_id: messageId });
    } catch (err) {
        return bot.sendMessage(chatId, "❌ Error: " + err.message, { reply_to_message_id: messageId });
    }
}

async function initializeNewBot(botInstance, botConfig, chatId) {
    try {
        const me = await botInstance.getMe();
        botConfig.id = me.id;
        botConfig.username = me.username;
        botConfig.name = me.first_name;
        
        botInstance.options.name = me.first_name;
        botInstance.options.username = me.username;

        global.setupBotListeners(botInstance, botConfig); 
        
        global.BOT_INSTANCES.push(botInstance); 

        for (const commandName in global.COMMANDS) {
            const module = global.COMMANDS[commandName];
            if (module.initCallback) module.initCallback(botInstance);
        }

        botInstance.sendMessage(
            chatId,
            `✅ **Successfully connected!**\nBot Name: ${me.first_name}\nUsername: @${me.username}`
        );
        return true;
    } catch (err) {
        console.error("Initialization Error:", err.message);
        return false;
    }
}

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const admins = global.CONFIG.BOT_SETTINGS.ADMINS || [];
    
    if (!admins.includes(msg.from.id.toString())) {
        return bot.sendMessage(chatId, "❌ You are not an admin.");
    }

    if (args.length < 1) {
        return bot.sendMessage(
            chatId,
            "⚠️ Usage: `/clone [Token]`, `/clone botlist`, or `/clone remove [Number]`"
        );
    }

    const subcommand = args[0].toLowerCase();
    
    if (subcommand === 'botlist') return handleBotList(bot, chatId, messageId);
    if (subcommand === 'remove') return handleBotRemove(bot, chatId, messageId, args[1]);

    const token = args[0];
    if (!token.includes(':')) return bot.sendMessage(chatId, "❌ Invalid token.");

    const waitMsg = await bot.sendMessage(chatId, "⏳ Cloning the bot...");

    try {
        const newBot = new TelegramBot(token, { polling: true });
        const botConfig = { token, isMain: false };

        const success = await initializeNewBot(newBot, botConfig, chatId);
        await bot.deleteMessage(chatId, waitMsg.message_id);

        if (!success) {
            bot.sendMessage(chatId, "❌ Failed to start the bot. Please check the token.");
        }
    } catch (err) {
        bot.sendMessage(chatId, "❌ Error: " + err.message);
    }
};
