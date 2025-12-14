const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const setupBotListeners = global.setupBotListeners; 

function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

module.exports.config = {
    name: "clone",
    credits: "LIKHON AHMED",
    aliases: ["newbot"],
    version: "1.1.1", 
    permission: 2, 
    prefix: true,
    description: "Clones the bot functionalities, lists active bots, and removes them.",
    category: "system",
    usages: "/clone [New Token] | /clone botlist | /clone remove [Number]",
    cooldowns: 10,
};

async function handleBotList(bot, chatId, messageId) {
    const mainBotTokenPart = global.CONFIG.BOT_TOKEN.split(':')[0];
    const clonedBots = global.BOT_INSTANCES.filter(instance => !instance.token.startsWith(mainBotTokenPart)); 

    if (clonedBots.length === 0) {
        return bot.sendMessage(chatId, "⚠️ বর্তমানে কোনো অতিরিক্ত ক্লোন করা বট সক্রিয় নেই।", { reply_to_message_id: messageId });
    }

    let list = "🤖 **সক্রিয় ক্লোন করা বটের তালিকা:**\n\n";
    clonedBots.forEach((instance, index) => {
        const botName = escapeMarkdown(instance.options.name || `Clone #${index + 1}`); 
        const botUsername = escapeMarkdown(instance.options.username || 'N/A');
        const tokenSuffix = instance.token.slice(-4);

        list += `${index + 1}. **${botName}**\n` +
                `   › ইউজারনেম: @${botUsername}\n` +
                `   › টোকেন (শেষ ৪): **...${tokenSuffix}**\n\n`;
    });

    list += `\nব্যবহার: \`/clone remove [Number]\` অথবা \`/clone remove [...Last 4 Token]\` দিয়ে বন্ধ করুন।`;

    return bot.sendMessage(chatId, list, { reply_to_message_id: messageId, parse_mode: 'Markdown' }); 
}

async function handleBotRemove(bot, chatId, messageId, identifier) {
    if (!identifier) {
        return bot.sendMessage(chatId, "⚠️ ব্যবহার: `/clone remove [Number/Token Suffix]`", { reply_to_message_id: messageId });
    }
    
    const mainBotTokenPart = global.CONFIG.BOT_TOKEN.split(':')[0];
    
    let targetBotInstance = null;
    let targetIndex = -1;

    const index = parseInt(identifier) - 1;
    if (!isNaN(index) && index >= 0) {
        const clonedBots = global.BOT_INSTANCES.filter(instance => !instance.token.startsWith(mainBotTokenPart));
        if (index < clonedBots.length) {
            targetBotInstance = clonedBots[index];
            targetIndex = global.BOT_INSTANCES.findIndex(inst => inst === targetBotInstance);
        }
    } 
    
    if (!targetBotInstance) {
        const tokenPart = identifier.slice(-4);
        targetIndex = global.BOT_INSTANCES.findIndex(instance => {
            const isMain = instance.token.startsWith(mainBotTokenPart);
            return !isMain && instance.token.slice(-4) === tokenPart;
        });
        if (targetIndex !== -1) {
             targetBotInstance = global.BOT_INSTANCES[targetIndex];
        }
    }
    
    if (!targetBotInstance) {
        return bot.sendMessage(chatId, "❌ এই টোকেন বা নাম্বারের কোনো সক্রিয় ক্লোন বট খুঁজে পাওয়া যায়নি।", { reply_to_message_id: messageId });
    }

    try {
        const me = await targetBotInstance.getMe();
        const botName = escapeMarkdown(me.first_name || me.username || "Unknown Bot");
        const username = escapeMarkdown(me.username);
        
        await targetBotInstance.sendMessage(chatId, 
            `👋 **বিদায়!**\n` +
            `আমি, **${botName}** (@${username}), এখন অফলাইন হয়ে যাচ্ছি। আমাকে সরিয়ে দেওয়ার জন্য ধন্যবাদ।`, 
            { parse_mode: 'Markdown' }
        ).catch(err => console.error("Could not send goodbye message:", err.message));

        await targetBotInstance.stopPolling().catch(err => console.error("Error stopping polling:", err.message));

        if (targetIndex !== -1) {
            global.BOT_INSTANCES.splice(targetIndex, 1);
        }

        return bot.sendMessage(chatId, 
            `✅ **সফলভাবে বটটি সরিয়ে দেওয়া হয়েছে!**\n` +
            `বট: **${botName}** (@${username})। এখন ${global.BOT_INSTANCES.length}টি বট সক্রিয় আছে।`, 
            { reply_to_message_id: messageId, parse_mode: 'Markdown' }
        );

    } catch (err) {
        console.error("Error removing cloned bot:", err.message);
        return bot.sendMessage(chatId, "❌ ক্লোন বটটি সরানোর সময় একটি ত্রুটি হয়েছে। লগ চেক করুন।", { reply_to_message_id: messageId });
    }
}


function setupCloneBotListeners(botInstance, botConfig) {
    
    botInstance.on("polling_error", (error) => {
        console.error(`❌ [${botConfig.name}] Polling error:`, error.response?.data || error.message || error);
    });

    botInstance.on('message', async (msg) => {
        
        const date = new Date(msg.date * 1000);
        const formattedTime = date.toLocaleTimeString('en-US', { hour12: false });
        const formattedDate = date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        const userName = msg.from.username || msg.from.first_name || 'N/A';
        const chatType = msg.chat.type;
        
        let groupName = chatType === 'private' ? 'Private Chat' : (msg.chat.title || 'Group Chat');

        const logMessage = `
╔════════════ [${botConfig.name}] ${formattedTime} ════════════╗
║ Message ID: ${msg.message_id} 
║ User Name: ${userName} 
║ Group Name: ${groupName} 
║ Group ID: ${msg.chat.id} 
║ Message: ${msg.text || '[Non-text Message]'} 
║ Time: ${formattedDate}, ${formattedTime} 
╚══════════════════════════════════╝
`;
        console.log(logMessage);
        
        
        const text = msg.text;
        let isCommandExecuted = false;

        if (text && text.startsWith(global.PREFIX)) {
            const args = text.slice(global.PREFIX.length).trim().split(/\s+/);
            const commandNameOrAlias = args.shift().toLowerCase();
            
            const actualCommandName = global.ALIASES[commandNameOrAlias] || commandNameOrAlias;
            const commandModule = global.COMMANDS[actualCommandName];

            if (commandModule && commandModule.run) {
                const userId = msg.from.id;
                
                if (global.CONFIG.REQUIRED_CHATS && global.CONFIG.REQUIRED_CHATS.length > 0) {
                    if (!global.verifiedUsers || !global.verifiedUsers[userId]) {
                        let warningText = `⚠️ 𝐈𝐟 𝐘𝐨𝐮 𝐖𝐚𝐧𝐭 𝐓𝐨 𝐔𝐬𝐞 𝐎𝐮𝐫 𝐁𝐨𝐭, 𝐘𝐨𝐮 𝐌𝐮𝐬𝐭 𝐁𝐞 𝐀 𝐌𝐞𝐦𝐛𝐞𝐫 𝐎𝐟 𝐓𝐡𝐞 𝐆𝐫𝐨𝐮𝐩. 𝐅𝐨𝐫 𝐉𝐨𝐢𝐧𝐢𝐧𝐠 ${global.PREFIX}start `;
                        return botInstance.sendMessage(msg.chat.id, warningText);
                    }
                }
                
                try {
                    await commandModule.run(botInstance, msg, args); 
                    isCommandExecuted = true;
                } catch (err) {
                    console.error(`❌ Command Runtime Error (${actualCommandName}, Bot: ${botConfig.name}):`, err.message);
                }
            }
        }
        
        if (!isCommandExecuted && text) {
            const lowerText = text.toLowerCase();
            
            for (const commandName in global.COMMANDS) {
                const module = global.COMMANDS[commandName];
                
                if (module.config && module.config.prefix === false && module.run) {
                    
                    const commandTriggers = [module.config.name, ...(module.config.aliases || [])]
                        .map(trigger => trigger.toLowerCase());
                        
                    const foundTrigger = commandTriggers.find(trigger => {
                        return lowerText === trigger || lowerText.startsWith(trigger + ' ');
                    });

                    if (foundTrigger) {
                        const args = lowerText.slice(foundTrigger.length).trim().split(/\s+/).filter(a => a);

                        try {
                            await module.run(botInstance, msg, args); 
                            isCommandExecuted = true;
                            break; 
                        } catch (err) {
                            console.error(`❌ Non-Prefix Command Runtime Error (${commandName}, Bot: ${botConfig.name}):`, err.message);
                        }
                    }
                }
            }
        }
        
        for (const commandName in global.COMMANDS) {
            const module = global.COMMANDS[commandName];
            if (module.handleMessage) {
                try {
                    await module.handleMessage(botInstance, msg); 
                } catch (err) {
                    console.error(`❌ handleMessage Runtime Error (${commandName}, Bot: ${botConfig.name}):`, err.message);
                }
            }
        }
    });
}


async function initializeNewBot(botInstance, botConfig, chatId) {
    try {
        const me = await botInstance.getMe();
        botConfig.id = me.id;
        botConfig.username = me.username || "N/A";
        botConfig.name = botConfig.name || me.first_name || `Clone ${me.id}`;
        
        botInstance.options.name = botConfig.name;
        botInstance.options.username = botConfig.username;

        if (!global.BOT_INSTANCES) {
            global.BOT_INSTANCES = [];
        }
        global.BOT_INSTANCES.push(botInstance); 
        
        setupCloneBotListeners(botInstance, botConfig);
        
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

        const finalName = escapeMarkdown(botConfig.name || me.first_name || me.username);
        const username = escapeMarkdown(me.username);
        
        botInstance.sendMessage(chatId, 
            `👋 **হ্যালো!** আমি এখন সক্রিয় হয়েছি।\n` +
            `বটের নাম: **${finalName}** (@${username})\n` +
            `আমাকে ক্লোন করার জন্য ধন্যবাদ!`,
            { parse_mode: 'Markdown' }
        ).catch(err => console.error("Could not send clone welcome message:", err.message));


        console.log(`✅ [${botConfig.name}] New Clone Bot Activated! ID: ${botConfig.id}`);
        return true; 
    } catch (err) {
        console.error(`❌ FAILED TO INITIALIZE NEW BOT (Caught by Init):`, err.message); 
        return false;
    }
}


module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    if (!global.CONFIG.BOT_SETTINGS.ADMINS.includes(msg.from.id.toString())) {
        return bot.sendMessage(chatId, "❌ শুধুমাত্র অ্যাডমিন বা বট মালিক এই কমান্ডটি ব্যবহার করতে পারবে।", { reply_to_message_id: messageId });
    }

    if (args.length < 1) {
        return bot.sendMessage(chatId, "⚠️ ব্যবহার: `/clone [New Token]`, `/clone botlist`, অথবা `/clone remove [Number]`", { reply_to_message_id: messageId });
    }

    const subcommand = args[0].toLowerCase();
    
    if (subcommand === 'botlist') {
        return handleBotList(bot, chatId, messageId);
    }
    
    if (subcommand === 'remove') {
        const identifier = args[1] || '';
        return handleBotRemove(bot, chatId, messageId, identifier);
    }
    
    const token = args[0];
    const inputName = args.slice(1).join(" "); 
    
    if (!token.includes(':')) {
        return bot.sendMessage(chatId, "❌ টোকেন ফরম্যাট ভুল। দয়া করে একটি বৈধ টেলিগ্রাম বট টোকেন দিন।", { reply_to_message_id: messageId });
    }
    
    const tokenPart = token.split(':')[0];
    
    const activeInstances = global.BOT_INSTANCES || []; 
    if (tokenPart === global.CONFIG.BOT_TOKEN.split(':')[0]) {
         return bot.sendMessage(chatId, "⚠️ এটি আপনার প্রধান বটের টোকেন। এটি ক্লোন করা যাবে না।", { reply_to_message_id: messageId });
    }
    
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

        const success = await initializeNewBot(newBotInstance, botConfig, chatId);
        
        await bot.deleteMessage(chatId, waitMsg.message_id);

        if (success) {
             const finalName = escapeMarkdown(botConfig.name || me.first_name || me.username);
             const username = escapeMarkdown(me.username);
            return bot.sendMessage(chatId, 
                `✅ **ক্লোনিং সফল!** নতুন বটটি (@${username}) এখন থেকে কাজ শুরু করেছে।`, 
                { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        } else {
             return bot.sendMessage(chatId, "❌ বট ইনিশিয়ালাইজ করা সম্ভব হয়নি। কোড লগে ত্রুটি দেখুন।", { reply_to_message_id: messageId });
        }


    } catch (err) {
        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
        console.error("❌ CLONE COMMAND FATAL ERROR:", err.message); 
        return bot.sendMessage(chatId, `❌ বট টোকেনটি অবৈধ অথবা টেলিগ্রাম API এ সংযোগ স্থাপন করা সম্ভব হয়নি। টোকেন চেক করুন।`, { reply_to_message_id: messageId });
    }
};
