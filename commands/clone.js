const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

// 🌟 চূড়ান্ত পরিবর্তন: index.js থেকে setupBotListeners সরাসরি লোড করা
const mainModule = require(path.resolve(__dirname, '..', 'index.js'));
const setupBotListeners = mainModule.setupBotListeners || global.setupBotListeners;


module.exports.config = {
    name: "clone",
    credits: "LIKHON AHMED",
    aliases: ["newbot"],
    version: "1.0.1",
    permission: 2, 
    prefix: true,
    description: "Clones the bot functionalities by providing a new bot token.",
    category: "system",
    usages: "/clone [New Bot Token]",
    cooldowns: 10,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    if (!global.CONFIG.BOT_SETTINGS.ADMINS.includes(msg.from.id.toString())) {
        return bot.sendMessage(chatId, "❌ শুধুমাত্র অ্যাডমিন বা বট মালিক এই কমান্ডটি ব্যবহার করতে পারবে।", { reply_to_message_id: messageId });
    }

    if (args.length < 1) {
        return bot.sendMessage(chatId, "⚠️ ব্যবহার: `/clone [New Bot Token]`", { reply_to_message_id: messageId });
    }

    const token = args[0];
    const inputName = args.slice(1).join(" "); 
    
    if (!token.includes(':')) {
        return bot.sendMessage(chatId, "❌ টোকেন ফরম্যাট ভুল। দয়া করে একটি বৈধ টেলিগ্রাম বট টোকেন দিন।", { reply_to_message_id: messageId });
    }
    
    const tokenPart = token.split(':')[0];
    
    const activeInstances = global.BOT_INSTANCES || []; 
    if (activeInstances.some(instance => instance.token && instance.token.startsWith(tokenPart))) {
        return bot.sendMessage(chatId, "⚠️ এই টোকেনটি দিয়ে একটি বট ইতিমধ্যেই সক্রিয় রয়েছে।", { reply_to_message_id: messageId });
    }

    const waitMsg = await bot.sendMessage(chatId, `⏳ বটটি যাচাই এবং ইনিশিয়ালাইজ করা হচ্ছে...`);

    try {
        const newBotInstance = new TelegramBot(token, { polling: true, fileDownloadOptions: { headers: { 'User-Agent': 'Telegram Bot' } } });
        const me = await newBotInstance.getMe();
        
        const botConfig = {
            token: token,
            name: inputName, 
            id: me.id,
            username: me.username,
            isMain: false 
        };

        const success = await initializeNewBot(newBotInstance, botConfig);
        
        await bot.deleteMessage(chatId, waitMsg.message_id);

        if (success) {
             const finalName = botConfig.name || me.first_name || me.username;
            return bot.sendMessage(chatId, 
                `✅ **সফলভাবে বট ক্লোন করা হয়েছে!**\n` + 
                `বটের নাম: **${finalName}**\n` + 
                `ইউজারনেম: @${me.username}\n` + 
                `আপনার সমস্ত কমান্ড এখন এই বটটিতেও কাজ করবে।`, 
                { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        } else {
             return bot.sendMessage(chatId, "❌ বট ইনিশিয়ালাইজ করা সম্ভব হয়নি। কোড লগে ত্রুটি দেখুন।", { reply_to_message_id: messageId });
        }


    } catch (err) {
        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
        console.error("❌ CLONE COMMAND FATAL ERROR (Caught by Run):", err.message); 
        return bot.sendMessage(chatId, `❌ বট টোকেনটি অবৈধ অথবা টেলিগ্রাম API এ সংযোগ স্থাপন করা সম্ভব হয়নি। টোকেন চেক করুন।`, { reply_to_message_id: messageId });
    }
};

async function initializeNewBot(botInstance, botConfig) {
    try {
        const me = await botInstance.getMe();
        botConfig.id = me.id;
        botConfig.username = me.username || "N/A";
        botConfig.name = botConfig.name || me.first_name || `Clone ${me.id}`;

        if (!global.BOT_INSTANCES) {
            global.BOT_INSTANCES = [];
        }
        global.BOT_INSTANCES.push(botInstance); 
        
        // 🌟 চূড়ান্ত ফিক্স: সরাসরি লোড করা setupBotListeners ব্যবহার করা
        if (typeof setupBotListeners === 'function') {
            setupBotListeners(botInstance, botConfig);
        } else {
             console.error("❌ INIT ERROR: Failed to load setupBotListeners from index.js.");
             return false;
        }
        
        // initCallback কল করা
        for (const commandName in global.COMMANDS) {
            const commandModule = global.COMMANDS[commandName];
            if (commandModule.initCallback) {
                try {
                    commandModule.initCallback(botInstance); 
                } catch (err) {
                     console.error(`❌ INIT ERROR: Error running initCallback for ${commandName}:`, err.message);
                }
            }
        }

        console.log(`✅ [${botConfig.name}] New Clone Bot Activated! ID: ${botConfig.id}`);
        return true; 
    } catch (err) {
        console.error(`❌ FAILED TO INITIALIZE NEW BOT (Caught by Init):`, err.message); 
        return false;
    }
}
