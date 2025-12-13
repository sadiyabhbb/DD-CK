const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');
const fse = require('fs-extra'); 

// Configuration Loading
let config = {};
try {
  const configPath = path.join(__dirname, 'config', 'config.js');
  if (fs.existsSync(configPath)) {
    config = require(configPath);
    console.log('✅ Config loaded from config/config.js');
  } else {
    throw new Error('config/config.js file not found. Please create it.');
  }
} catch (err) {
  console.error(`❌ FATAL: Configuration load failed: ${err.message}`);
  process.exit(1);
}

// Global Variables Setup
const app = express();
const port = process.env.PORT || config.PORT || 8080; 

const VERIFIED_USERS_FILE = path.join(__dirname, 'verified_users.json');

global.botStartTime = Date.now();
global.activeEmails = {};
global.CONFIG = config;
global.PREFIX = config.BOT_SETTINGS.PREFIX || "/"; 
global.loadedCommands = [];

// --- ডেটা লোডিং ফাংশন ---
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

// --- ডেটা সেভিং ফাংশন (Global Access) ---
global.saveVerifiedUsers = async function() {
    try {
        await fse.writeJson(VERIFIED_USERS_FILE, global.verifiedUsers, { spaces: 2 });
    } catch (error) {
        console.error("❌ Error saving verified users data:", error.message);
    }
};

(async () => {
  // *** ভেরিফাইড ইউজার ডেটা লোড করা হচ্ছে ***
  global.verifiedUsers = await loadVerifiedUsers();
  console.log(`✅ Loaded ${Object.keys(global.verifiedUsers).length} verified users from JSON.`);

  // Dummy DB Object
  global.userDB = { approved: [], pending: [], banned: [] }; 
  console.log('⚠️ Database loading skipped. Using in-memory dummy DB.');

  // Init bot
  const bot = new TelegramBot(config.BOT_TOKEN, {
    polling: true,
    fileDownloadOptions: {
      headers: { 'User-Agent': 'Telegram Bot' }
    }
  });

  bot.on("polling_error", (error) => {
    console.error("❌ Polling error:", error.response?.data || error.message || error);
  });

  // --- Command Loading and Prefix Listener ---
  const commandsPath = path.join(__dirname, 'commands');
  const commandModules = []; 

  if (fs.existsSync(commandsPath)) {
    const files = fs.readdirSync(commandsPath);

    for (const file of files) {
      if (file.endsWith(".js")) {
        try {
          const commandModule = require(path.join(commandsPath, file));

          if (commandModule && commandModule.config && commandModule.run) {
            const name = commandModule.config.name;
            const aliases = commandModule.config.aliases || [];
            
            commandModules.push(commandModule);

            const trigger = new RegExp(
              `^\\${global.PREFIX}(${name}|${aliases.join("|")})(\\s|$)`,
              "i"
            );

            bot.onText(trigger, async (msg) => {
              const chatId = msg.chat.id;
              const userId = msg.from.id;

              if (name !== "start" && Array.isArray(config.REQUIRED_CHATS) && config.REQUIRED_CHATS.length > 0) {
                 if (!global.verifiedUsers[userId]) {
                     let text = `⚠️ 𝐈𝐟 𝐘𝐨𝐮 𝐖𝐚𝐧𝐭 𝐓𝐨 𝐔𝐬𝐞 𝐎𝐮𝐫 𝐁𝐨𝐭, 𝐘𝐨𝐮 𝐌𝐮𝐬𝐭 𝐁𝐞 𝐀 𝐌𝐞𝐦𝐛𝐞𝐫 𝐎𝐟 𝐓𝐡𝐞 𝐆𝐫𝐨𝐮𝐩. 𝐅𝐨𝐫 𝐉𝐨𝐢𝐧𝐢𝐧𝐠 ${global.PREFIX}start `;
                     return bot.sendMessage(chatId, text);
                 }
              }

              try {
                await commandModule.run(bot, msg);
              } catch (err) {
                console.error(`❌ Command Runtime Error (${name}):`, err.message);
              }
            });

            global.loadedCommands.push(commandModule.config);
            console.log(`📌 Loaded Command: ${name} (Prefix: ${global.PREFIX})`);
          }
        } catch (err) {
          console.error(`❌ Error loading command ${file}:`, err.message);
        }
      }
    }
  }

  bot.on('message', async (msg) => {
      if (!msg.text || msg.text.startsWith(global.PREFIX)) return; 
      
      for (const module of commandModules) {
          if (module.handleMessage) {
              try {
                  await module.handleMessage(bot, msg);
              } catch (err) {
                  console.error(`❌ handleMessage Runtime Error (${module.config.name}):`, err.message);
              }
          }
      }
  });

  // --- Callback Listeners Initialization ---
  console.log(`\n--- Initializing Callback Listeners ---`);
  for (const module of commandModules) {
      if (module.initCallback) {
          module.initCallback(bot);
          console.log(`✅ Initialized Callback for: ${module.config.name}`);
      }
  }
  console.log(`---------------------------------`);
  console.log(`✅ Successfully loaded ${global.loadedCommands.length} command(s).`);


  // --- Express server to keep the bot alive ---
  app.listen(port, () => {
    console.log(`🚀 Bot server running via polling on port ${port}`);
    console.log(`🔐 Command Prefix locked to: "${global.PREFIX}"`);
  });

})();
