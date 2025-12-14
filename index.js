const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');
const fse = require('fs-extra'); 

const commandsPath = path.join(__dirname, 'commands');
const VERIFIED_USERS_FILE = path.join(__dirname, 'verified_users.json');

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

    if (global.bot && commandModule.initCallback) {
        commandModule.initCallback(global.bot);
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

(async () => {
  global.verifiedUsers = await loadVerifiedUsers();
  console.log(`✅ Loaded ${Object.keys(global.verifiedUsers).length} verified users from JSON.`);

  global.userDB = { approved: [], pending: [], banned: [] }; 
  console.log('⚠️ Database loading skipped. Using in-memory dummy DB.');

  const telegramBot = new TelegramBot(config.BOT_TOKEN, {
    polling: true,
    fileDownloadOptions: {
      headers: { 'User-Agent': 'Telegram Bot' }
    }
  });
  global.bot = telegramBot; 

  global.bot.on("polling_error", (error) => {
    console.error("❌ Polling error:", error.response?.data || error.message || error);
  });
  
  let botUsername = "N/A";
  let botName = "N/A";
  let botId = config.BOT_TOKEN.split(':')[0]; 
  
  try {
      const me = await global.bot.getMe();
      botUsername = me.username || "N/A";
      botName = me.first_name || "N/A";
      botName = global.CONFIG.BOT_SETTINGS.NAME || botName; 
  } catch (err) {
      console.error("❌ Failed to fetch bot info (getMe):", err.message);
  }

  let initialLoadCount = 0;
  
  console.log(`\n╭─────────COMMANDS─────────╮`);
  console.log(`   │                          │`);
  console.log(`   │   Deploying all COMMANDS   │`);
  console.log(`   │                          │`);
  console.log(`   ╰──────────────────────────╯`);

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


  global.bot.on('message', async (msg) => {
    
      const date = new Date(msg.date * 1000);
      const formattedTime = date.toLocaleTimeString('en-US', { hour12: false });
      const formattedDate = date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      const userName = msg.from.username || msg.from.first_name || 'N/A';
      const chatType = msg.chat.type;
      
      let groupName;
      if (chatType === 'private') {
          groupName = 'Private Chat';
      } else if (msg.chat.title) {
          groupName = msg.chat.title;
      } else {
          groupName = 'Group Chat';
      }
      
      const logMessage = `
╔════════════ ${formattedTime} ════════════╗
║                                        ║
║ Message ID: ${msg.message_id} 
║ User Name: ${userName} 
║ Group Name: ${groupName} 
║ Group ID: ${msg.chat.id} 
║ Message: ${msg.text || '[Non-text Message]'} 
║ Time: ${formattedDate}, ${formattedTime} 
║                                        ║
╚══════════════════════════════════╝
`;
      console.log(logMessage);
      
      
      const text = msg.text;
      
      if (text && text.startsWith(global.PREFIX)) {
        const args = text.slice(global.PREFIX.length).trim().split(/\s+/);
        const commandNameOrAlias = args.shift().toLowerCase();
        
        const actualCommandName = global.ALIASES[commandNameOrAlias] || commandNameOrAlias;
        const commandModule = global.COMMANDS[actualCommandName];

        if (commandModule && commandModule.run) {
            const userId = msg.from.id;
            
            if (commandModule.config.name !== "start" && Array.isArray(global.CONFIG.REQUIRED_CHATS) && global.CONFIG.REQUIRED_CHATS.length > 0) {
                if (!global.verifiedUsers[userId]) {
                    let text = `⚠️ 𝐈𝐟 𝐘𝐨𝐮 𝐖𝐚𝐧𝐭 𝐓𝐨 𝐔𝐬𝐞 𝐎𝐮𝐫 𝐁𝐨𝐭, 𝐘𝐨𝐮 𝐌𝐮𝐬𝐭 𝐁𝐞 𝐀 𝐌𝐞𝐦𝐛𝐞𝐫 𝐎𝐟 𝐓𝐡𝐞 𝐆𝐫𝐨𝐮𝐩. 𝐅𝐨𝐫 𝐉𝐨𝐢𝐧𝐢𝐧𝐠 ${global.PREFIX}start `;
                    return global.bot.sendMessage(msg.chat.id, text);
                }
            }
            
            try {
                await commandModule.run(global.bot, msg);
            } catch (err) {
                console.error(`❌ Command Runtime Error (${actualCommandName}):`, err.message);
            }
            return; 
        }
      }
      
      if (text) {
          for (const commandName in global.COMMANDS) {
              const module = global.COMMANDS[commandName];
              if (module.handleMessage) {
                  try {
                      await module.handleMessage(global.bot, msg);
                  } catch (err) {
                      console.error(`❌ handleMessage Runtime Error (${commandName}):`, err.message);
                  }
              }
          }
      }
  });
  
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
   │      Login: Successfully Login Done       │
   │       Bot User Name: @${botUsername}   │
   │         Bot Name: ${botName}      │
   │            Bot User ID: ${botId}        │
   │                                           │
   ╰───────────────────────────────────────────╯
  `;

  console.log(`\n Successfully loaded ${initialLoadCount} command(s).`);
  console.log(adminInfo);
  console.log(botInfo);


  app.listen(port, () => {
    console.log(` Bot server running via polling on port ${port}`);
    console.log(` Command Prefix locked to: "${global.PREFIX}"`);
  });

})();
