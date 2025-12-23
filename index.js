Const TelegramBot = require('node-telegram-bot-api');

const fs = require('fs');

const path = require('path');

const express = require('express');

const fse = require('fs-extra'); 

const axios = require('axios'); 

const commandsPath = path.join(__dirname, 'commands');

const VERIFIED_USERS_FILE = path.join(__dirname, 'verified_users.json');

const CONFIG_PATH = path.join(__dirname, 'config', 'config.js');

const NOPREFIX_SETTINGS_FILE = path.join(__dirname, 'noprefix_settings.json'); 

let config = {};

// 💡 ফাংশন: config/config.js ফাইল লোড বা রিলোড করা

global.reloadConfig = function() {

    try {

        if (fs.existsSync(CONFIG_PATH)) {

            delete require.cache[require.resolve(CONFIG_PATH)];

            config = require(CONFIG_PATH);

            global.CONFIG = config; 

            return true;

        } else {

            throw new Error('config.js file not found. Please create it.');

        }

    } catch (err) {

        console.error(`❌ CONFIG RELOAD FAILED: ${err.message}`);

        return false;

    }

};

// 💡 ফাংশন: noprefix_settings.json রিলোড করা

global.reloadNoprefixSettings = async function() {

    try {

        if (fse.existsSync(NOPREFIX_SETTINGS_FILE)) {

            const data = await fse.readJson(NOPREFIX_SETTINGS_FILE);

            global.isNoprefixActive = data.isNoprefixActive || false;

        } else {

            global.isNoprefixActive = false;

        }

        return true;

    } catch (error) {

        console.error("❌ NOPREFIX SETTINGS RELOAD FAILED:", error.message);

        global.isNoprefixActive = false;

        return false;

    }

}

// প্রথমবার কনফিগারেশন লোড করা

if (!global.reloadConfig()) {

    process.exit(1);

}

const app = express();

const port = process.env.PORT || config.PORT || 8080; 

// ✅ এই লাইনটি public/index.html রেন্ডার করার জন্য যুক্ত করা হয়েছে

app.use(express.static(path.join(__dirname, 'public')));

// 🌟 গ্লোবাল ভ্যারিয়েবল ইনিশিয়ালাইজেশন

global.botStartTime = Date.now();

global.activeEmails = {};

global.COMMANDS = {}; 

global.ALIASES = {}; 

global.loadedCommands = []; 

global.BOT_LISTENERS = []; 

global.utils = {}; 

global.BOT_INSTANCES = []; 

global.SESSION_CLONES = []; 

global.isNoprefixActive = false; 

global.utils.getStreamFromURL = async function(url) {

    try {

        const response = await axios({

            url,

            method: 'GET',

            responseType: 'stream', 

            headers: { 'User-Agent': 'Telegram Bot' } 

        });

        return response.data; 

    } catch (error) {

        console.error(`❌ Error fetching stream from URL:`, error.message);

        throw new Error("Failed to fetch stream from URL.");

    }

};

global.loadCommand = function(commandName) {

    const filename = `${commandName}.js`;

    const filePath = path.join(commandsPath, filename);

    if (!fs.existsSync(filePath)) {

        throw new Error(`Command file ${filename} not found.`);

    }

    if (global.COMMANDS[commandName]) {

        global.unloadCommand(commandName);

    }

    

    if (require.cache[require.resolve(filePath)]) {

        delete require.cache[require.resolve(filePath)];

    }

    const commandModule = require(filePath);

    if (!commandModule.config || !commandModule.run) {

        throw new Error(`Invalid command structure. Missing 'config' or 'run' in ${filename}.`);

    }

    global.COMMANDS[commandName] = commandModule;

    

    global.loadedCommands.push(commandModule.config);

    

    if (commandModule.config.aliases) {

         commandModule.config.aliases.forEach(alias => {

             global.ALIASES[alias] = commandName;

         });

    }

    const commandConfigName = commandModule.config.name || commandName;

    console.log(`[ BOT ] cmd Loaded → Name: ${commandConfigName} | File: ${commandName}.js`);

};

global.unloadCommand = function(commandName) {

    const commandModule = global.COMMANDS[commandName];

    if (!commandModule) return;

    

    const index = global.loadedCommands.findIndex(cmd => cmd.name === commandName);

    if (index > -1) {

        global.loadedCommands.splice(index, 1);

    }

    if (commandModule.config && commandModule.config.aliases) {

        commandModule.config.aliases.forEach(alias => {

            delete global.ALIASES[alias];

        });

    }

    

    const filePath = path.join(commandsPath, `${commandName}.js`);

    if (require.cache[require.resolve(filePath)]) {

        delete require.cache[require.resolve(filePath)];

    }

    delete global.COMMANDS[commandName];

};

async function loadVerifiedUsers() {

    try {

        if (fse.existsSync(VERIFIED_USERS_FILE)) {

            const data = await fse.readJson(VERIFIED_USERS_FILE);

            return data;

        }

        return {}; 

    } catch (error) {

        console.error("❌ Error loading verified users data:", error.message);

        return {};

    }

}

global.saveVerifiedUsers = async function() {

    try {

        await fse.writeJson(VERIFIED_USERS_FILE, global.verifiedUsers, { spaces: 2 });

    } catch (error) {

        console.error("❌ Error saving verified users data:", error.message);

    }

};

// 🌟 গ্লোবাল লিসেনার ফাংশন (কমান্ড হ্যান্ডলার) 

global.setupBotListeners = function(botInstance, botConfig) {

    

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
╭─━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃          ${botConfig.name}          ┃
┃━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃  🧾 𝐌𝐄𝐒𝐒𝐀𝐆𝐄 𝐈𝐃 : ${msg.message_id}
┃
┃  👤 𝐔𝐒𝐄𝐑 𝐍𝐀𝐌𝐄 : ${userName}
┃
┃  ⛩️ 𝐆𝐑𝐎𝐔𝐏 𝐍𝐀𝐌𝐄 : ${groupName}
┃
┃  🆔 𝐆𝐑𝐎𝐔𝐏 𝐈𝐃  : ${msg.chat.id}
┃
┃  📜 𝐌𝐄𝐒𝐒𝐀𝐆𝐄  : ${msg.text || '[Non-text Message]'}
┃
┃  ⌚ 𝐓𝐈𝐌𝐄 : ${formattedDate}, ${formattedTime}
┃━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃  🤸🏽‍♂️ 𝐁𝐎𝐓 𝐃𝐄𝐕𝐄𝐋𝐎𝐏𝐄𝐃 𝐁𝐘 𝐋𝐈𝐊𝐇𝐎𝐍
╰─━━━━━━━━━━━━━━━━━━━━━━━━━━╯
`;
        console.log(logMessage);

        

        

        const text = msg.text;

        let isCommandExecuted = false;

        const currentPrefix = global.CONFIG.BOT_SETTINGS.PREFIX || '/';

        let commandFound = false;

        

        const noprefixActive = global.isNoprefixActive;

        let commandNameOrAlias;

        let args;

        let actualCommandName;

        let commandModule;

        if (text && text.startsWith(currentPrefix)) {

            args = text.slice(currentPrefix.length).trim().split(/\s+/);

            commandNameOrAlias = args.shift().toLowerCase();

            

            actualCommandName = global.ALIASES[commandNameOrAlias] || commandNameOrAlias;

            commandModule = global.COMMANDS[actualCommandName];

            

            if (commandModule && commandModule.run) {

                commandFound = true;

            }

        }

        

        if (!commandFound && text && noprefixActive) {

            

            args = text.trim().split(/\s+/);

            commandNameOrAlias = args.shift().toLowerCase();

            

            actualCommandName = global.ALIASES[commandNameOrAlias] || commandNameOrAlias;

            commandModule = global.COMMANDS[actualCommandName];

            

            if (commandModule && commandModule.run && commandModule.config.prefix !== false) { 

                commandFound = true;

            }

        }

        

        if (commandFound) {

            

            const commandToRun = global.COMMANDS[actualCommandName];

            if (commandToRun) {

                

                const userId = msg.from.id;

                

                if (botConfig.isMain && commandToRun.config.name !== "start" && Array.isArray(global.CONFIG.REQUIRED_CHATS) && global.CONFIG.REQUIRED_CHATS.length > 0) {

                    if (!global.verifiedUsers[userId]) {

                        let warningText = `⚠️ 𝐈𝐟 𝐘𝐨𝐮 𝐖𝐚𝐧𝐭 𝐓𝐨 𝐔𝐬𝐞 𝐎𝐮𝐫 𝐁𝐨𝐭, 𝐘𝐨𝐮 𝐌𝐮𝐬𝐭 𝐁𝐞 𝐀 𝐌𝐞𝐦𝐛𝐞𝐫 𝐎𝐟 𝐓হের 𝐆𝐫𝐨𝐮𝐩. 𝐅𝐨র 𝐉𝐨𝐢𝐧𝐢𝐧𝐠 ${currentPrefix}start `;

                        return botInstance.sendMessage(msg.chat.id, warningText);

                    }

                }

                

                try {

                    await commandToRun.run(botInstance, msg, args); 

                    isCommandExecuted = true;

                } catch (err) {

                    console.error(`❌ Command Runtime Error (${commandToRun.config.name}, Bot: ${botConfig.name}):`, err.message);

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

        

        // --- 🌟 লজিক আপডেট: handleMessage এবং handleEvent হ্যান্ডলার ---

        for (const commandName in global.COMMANDS) {

            const module = global.COMMANDS[commandName];

            

            // handleMessage চেক

            if (module.handleMessage) {

                try {

                    await module.handleMessage(botInstance, msg); 

                } catch (err) {

                    console.error(`❌ handleMessage Error (${commandName}):`, err.message);

                }

            }

            // handleEvent চেক (অটো রিঅ্যাকশন বা অন্যান্য ইভেন্টের জন্য)

            if (module.handleEvent) {

                try {

                    await module.handleEvent(botInstance, msg); 

                } catch (err) {

                    // ইভেন্ট এরর সাধারণত সাইলেন্ট রাখা হয়

                }

            }

        }

    });

}

function loadAllCommands() {

    let initialLoadCount = 0;

    if (fs.existsSync(commandsPath)) {

        const files = fs.readdirSync(commandsPath);

        for (const file of files) {

            if (file.endsWith(".js")) {

                const commandName = file.slice(0, -3);

                try {

                    global.loadCommand(commandName); 

                    initialLoadCount++;

                } catch (err) {

                    console.error(`❌ Error loading command ${file}:`, err.message);

                }

            }

        }

    }

    global.loadedCommands.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`[ CORE ] Loaded ${initialLoadCount} global command(s).`);

}

function initializeBotCallbacks(telegramBot) {

    for (const commandName in global.COMMANDS) {

        const commandModule = global.COMMANDS[commandName];

        if (commandModule.initCallback) {

            try {

                commandModule.initCallback(telegramBot); 

            } catch (err) {

                 console.error(`❌ Error running initCallback for ${commandName}:`, err.message);

            }

        }

    }

}

async function startBots(botConfigs) {

    for (const botConfig of botConfigs) {

        try {

            const telegramBot = new TelegramBot(botConfig.token, {

                polling: true,

                fileDownloadOptions: {

                    headers: { 'User-Agent': 'Telegram Bot' }

                }

            });

            if (botConfig.isMain) {

                 global.bot = telegramBot;

            }

            

            const me = await telegramBot.getMe();

            botConfig.id = me.id;

            botConfig.username = me.username || "N/A";

            botConfig.name = botConfig.name || me.first_name || "N/A";

            global.setupBotListeners(telegramBot, botConfig); 

            global.BOT_INSTANCES.push(telegramBot);

            

            initializeBotCallbacks(telegramBot);

            console.log(`✅ [${botConfig.name}] Bot Started! ID: ${botConfig.id}, Username: @${botConfig.username}`);

            

            // --- 🔄 RESTART NOTIFICATION LOGIC ---

            const restartPath = path.join(__dirname, 'commands', 'restart_info.json');

            if (fs.existsSync(restartPath)) {

                try {

                    const { chatId, messageId, startTime } = JSON.parse(fs.readFileSync(restartPath));

                    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

                    

                    telegramBot.editMessageText(`✅ **Restart Successful!**\nBot is now online.\n⏱️ **Duration:** ${duration}s`, {

                        chat_id: chatId,

                        message_id: messageId,

                        parse_mode: 'Markdown'

                    }).then(() => {

                        fs.unlinkSync(restartPath); 

                    }).catch(err => console.error("Error updating restart message:", err));

                } catch (e) {

                    console.error("Restart info processing error:", e.message);

                }

            }

        } catch (err) {

            console.error(`❌ Failed to start bot with token ending in ...${botConfig.token.slice(-4)}:`, err.message);

        }

    }

}

(async () => {

    loadAllCommands();

    global.verifiedUsers = await loadVerifiedUsers();

    console.log(`✅ Loaded ${Object.keys(global.verifiedUsers).length} verified users from JSON.`);

    

    await global.reloadNoprefixSettings();

    global.userDB = { approved: [], pending: [], banned: [] }; 

    console.log('⚠️ Database loading skipped. Using in-memory dummy DB.');

    const allBotConfigs = [

        {

            token: config.BOT_TOKEN,

            name: global.CONFIG.BOT_SETTINGS.NAME || "Main Bot",

            isMain: true 

        }

    ];

    

    await startBots(allBotConfigs);

    

    const botUsername = global.bot ? global.bot.options.username || "N/A" : "N/A";

    const botName = global.CONFIG.BOT_SETTINGS.NAME || (global.bot ? global.bot.options.first_name : "N/A");

    const botId = global.bot ? global.bot.token.split(':')[0] : "N/A";

    const adminInfo = `

╭─━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 𝐀𝐃𝐌𝐈𝐍 𝐈𝐍𝐅𝐎        ┃
┃━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃  👤 𝐍𝐀𝐌𝐄     : ${global.CONFIG.BOT_SETTINGS.CREDIT || "LIKHON AHMED"}
┃
┃  🔰 𝐔𝐒𝐄𝐑𝐍𝐀𝐌𝐄 : ${global.CONFIG.OWNER.USERNAME || "LIKHONAHMED009"}
┃
┃  🆔 𝐈𝐃      : ${global.CONFIG.OWNER.ID || "8287206585"}
┃━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃  🌐 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊     : ${global.CONFIG.BOT_SETTINGS.ADMIN_FACEBOOK_URL || "N/A"}
┃
┃  💬 𝐖𝐇𝐀𝐓𝐒𝐀𝐏𝐏     : ${global.CONFIG.BOT_SETTINGS.ADMIN_WHATSAPP || "N/A"}
┃
┃  🔔 𝐍𝐎𝐓𝐈𝐅𝐈𝐂𝐀𝐓𝐈𝐎𝐍 : This bot is protected and monitored by the admin.
┃
┃  📍 𝐕𝐄𝐑𝐒𝐈𝐎𝐍  : ${global.CONFIG.BOT_SETTINGS.VERSION || "2.0.1.9"}
╰─━━━━━━━━━━━━━━━━━━━━━━━━━━╯
  `;

    const botInfo = `

╭─━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  🤖 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎          ┃
┃━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃  📛 𝐁𝐎𝐓 𝐍𝐀𝐌𝐄    : ${botName}
┃
┃  👤 𝐁𝐎𝐓 𝐔𝐒𝐄𝐑𝐍𝐀𝐌𝐄 : @${botUsername}
┃
┃  🆔 𝐁𝐎𝐓 𝐔𝐒𝐄𝐑𝐈𝐃  : ${botId}
┃━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃  ⚙️ 𝐒𝐓𝐀𝐓𝐔𝐒       : 𝐀𝐂𝐓𝐈𝐕𝐄
┃
┃  ⏱️ 𝐔𝐏𝐓𝐈𝐌𝐄       : 𝟐𝟒/𝟕
╰─━━━━━━━━━━━━━━━━━━━━━━━━━━╯
  `;
    console.log(adminInfo);

    console.log(botInfo);

    

    const finalPrefix = global.CONFIG.BOT_SETTINGS.PREFIX || '/';

    const noprefixStatus = global.isNoprefixActive ? '✅ ON' : '❌ OFF';

    app.listen(port, () => {

        console.log(`╭─━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  
┃ 🚦  𝐒𝐄𝐑𝐕𝐄𝐑 𝐑𝐔𝐍𝐍𝐈𝐍𝐆 𝐎𝐍 𝐏𝐎𝐑𝐓 : ${port}
┃
╰─━━━━━━━━━━━━━━━━━━━━━━━━━━╯`);

        console.log(`╭─━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  
┃  ☃️ 𝐁𝐎𝐓 𝐏𝐑𝐄𝐅𝐈𝐗  : "${finalPrefix}"
┃
╰─━━━━━━━━━━━━━━━━━━━━━━━━━━╯`);

        console.log(`╭─━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  
┃  🌚 𝐍𝐎-𝐏𝐑𝐄𝐅𝐈𝐗 𝐌𝐎𝐎𝐃 : ${noprefixStatus}
┃
╰─━━━━━━━━━━━━━━━━━━━━━━━━━━╯`);

    });

})();

module.exports = {

    setupBotListeners: global.setupBotListeners

};
