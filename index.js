const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');
const fse = require('fs-extra'); 
const axios = require('axios'); 

const commandsPath = path.join(__dirname, 'commands');
const VERIFIED_USERS_FILE = path.join(__dirname, 'verified_users.json');
const CLONED_BOTS_FILE = path.join(__dirname, 'config', 'cloned_bots_data.json'); 

let config = {};
try {
  const configPath = path.join(__dirname, 'config', 'config.js');
  if (fs.existsSync(configPath)) {
    config = require(configPath);
  } else {
    throw new Error('config.js file not found. Please create it.');
  }
} catch (err) {
  console.error(`❌ FATAL: Configuration load failed: ${err.message}`);
  process.exit(1);
}

const app = express();
const port = process.env.PORT || config.PORT || 8080; 

global.botStartTime = Date.now();
global.activeEmails = {};
global.CONFIG = config;
global.PREFIX = config.BOT_SETTINGS.PREFIX || "/"; 
global.COMMANDS = {}; 
global.ALIASES = {}; 
global.loadedCommands = []; 
global.BOT_LISTENERS = []; 
global.utils = {}; 
global.BOT_INSTANCES = []; 

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
        console.error("❌ Error fetching stream from URL:", error.message);
        throw new Error("Failed to fetch stream from URL.");
    }
};

global.loadCommand = function(commandName, botInstance) {
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

    if (botInstance && commandModule.initCallback) { 
        commandModule.initCallback(botInstance);
    }
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

global.loadClonedBots = async function() {
    try {
        if (fse.existsSync(CLONED_BOTS_FILE)) {
            return await fse.readJson(CLONED_BOTS_FILE);
        }
        return config.CLONED_BOTS || [];
    } catch (error) {
        console.error("❌ Error loading cloned bots data:", error.message);
        return [];
    }
}

global.saveClonedBots = async function(bots) {
    try {
        await fse.writeJson(CLONED_BOTS_FILE, bots, { spaces: 2 });
    } catch (error) {
        console.error("❌ Error saving cloned bots data:", error.message);
    }
};

// 🌟 এই ফাংশনটি গ্লোবাল করা হলো যাতে clone.js এটিকে ব্যবহার করতে পারে
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
                
                if (botConfig.isMain && commandModule.config.name !== "start" && Array.isArray(global.CONFIG.REQUIRED_CHATS) && global.CONFIG.REQUIRED_CHATS.length > 0) {
                    if (!global.verifiedUsers[userId]) {
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

            // 🌟 গ্লোবাল ফাংশন কল করা হলো
            global.setupBotListeners(telegramBot, botConfig); 
            global.BOT_INSTANCES.push(telegramBot);

            console.log(`✅ [${botConfig.name}] Bot Started! ID: ${botConfig.id}, Username: @${botConfig.username}`);
            
            let initialLoadCount = 0;
            if (fs.existsSync(commandsPath)) {
                const files = fs.readdirSync(commandsPath);
                for (const file of files) {
                    if (file.endsWith(".js")) {
                        const commandName = file.slice(0, -3);
                        try {
                            global.loadCommand(commandName, telegramBot); 
                            initialLoadCount++;
                        } catch (err) {
                            console.error(`❌ Error loading command ${file}:`, err.message);
                        }
                    }
                }
            }
            global.loadedCommands.sort((a, b) => a.name.localeCompare(b.name));
            console.log(`[${botConfig.name}] Loaded ${initialLoadCount} command(s).`);


        } catch (err) {
            console.error(`❌ Failed to start bot with token ending in ...${botConfig.token.slice(-4)}:`, err.message);
        }
    }
}


(async () => {
    global.verifiedUsers = await loadVerifiedUsers();
    console.log(`✅ Loaded ${Object.keys(global.verifiedUsers).length} verified users from JSON.`);

    global.userDB = { approved: [], pending: [], banned: [] }; 
    console.log('⚠️ Database loading skipped. Using in-memory dummy DB.');

    const clonedBots = await global.loadClonedBots();
    const allBotConfigs = [
        {
            token: config.BOT_TOKEN,
            name: global.CONFIG.BOT_SETTINGS.NAME || "Main Bot",
            isMain: true 
        },
        ...clonedBots.filter(bot => bot.token !== config.BOT_TOKEN) 
    ];
    
    await startBots(allBotConfigs);
    
    const botUsername = global.bot ? global.bot.options.username || "N/A" : "N/A";
    const botName = global.CONFIG.BOT_SETTINGS.NAME || (global.bot ? global.bot.options.first_name : "N/A");
    const botId = global.bot ? global.bot.token.split(':')[0] : "N/A";

    const adminInfo = `
╭────────────────────────────── ADMIN INFO ───────────────────────────────╮
  │                                                                         │
  │    Facebook: ${global.CONFIG.BOT_SETTINGS.ADMIN_FACEBOOK_URL || "N/A"}    │
  │                       WhatsApp: ${global.CONFIG.BOT_SETTINGS.ADMIN_WHATSAPP || "N/A"}                    │
  │                     Credit: ${global.CONFIG.BOT_SETTINGS.CREDIT || "Developed by Mohammad Nayan"}                 │
  │       Notification: This bot is protected and monitored by the admin.   │
  │                             Version : ${global.CONFIG.BOT_SETTINGS.VERSION || "2.0.1.9"}                          │
  │                                                                         │
  ╰─────────────────────────────────────────────────────────────────────────╯
  `;
    const botInfo = `
╭──────────────── BOT INFO ─────────────────╮
   │                                           │
   │      Login: Successfully Login Done (${global.BOT_INSTANCES.length} bots active) │
   │       Main Bot User Name: @${botUsername}   │
   │         Main Bot Name: ${botName}      │
   │            Main Bot User ID: ${botId}        │
   │                                           │
   ╰───────────────────────────────────────────╯
  `;

    console.log(adminInfo);
    console.log(botInfo);


    app.listen(port, () => {
        console.log(` Bot server running via polling on port ${port}`);
        console.log(` Command Prefix locked to: "${global.PREFIX}"`);
    });

})();
