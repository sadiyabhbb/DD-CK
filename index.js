const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');

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

global.botStartTime = Date.now();
global.activeEmails = {};
global.CONFIG = config;
global.PREFIX = config.BOT_SETTINGS.PREFIX || "/"; 
global.loadedCommands = [];
global.verifiedUsers = {};

(async () => {
  // Dummy DB Object (Since real DB loading is skipped)
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

            // *** ফিক্স #১: রেজেক্স পরিবর্তন (সকল কমান্ডের আর্গুমেন্ট কাজ করার জন্য) ***
            const trigger = new RegExp(
              `^\\${global.PREFIX}(${name}|${aliases.join("|")})(\\s|$)`,
              "i"
            );

            bot.onText(trigger, async (msg) => {
              const chatId = msg.chat.id;
              const userId = msg.from.id;

              // Force Verification Check (for all commands except /start)
              if (name !== "start" && Array.isArray(config.REQUIRED_CHATS) && config.REQUIRED_CHATS.length > 0) {
                 if (!global.verifiedUsers[userId]) {
                     let text = `⚠️ 𝐈𝐟 𝐘𝐨𝐮 𝐖𝐚𝐧𝐭 𝐓𝐨 𝐔𝐬𝐞 𝐎𝐮𝐫 𝐁𝐨𝐭, 𝐘𝐨𝐮 𝐌𝐮𝐬𝐭 𝐁𝐞 𝐀 𝐌𝐞𝐦𝐛𝐞𝐫 𝐎𝐟 𝐓𝐡𝐞 𝐆𝐫𝐨𝐮𝐩. 𝐅𝐨𝐫 𝐉𝐨𝐢𝐧𝐢𝐧𝐠 ${global.PREFIX}start `;
                     return bot.sendMessage(chatId, text);
                 }
              }

              // Run the command
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

  // *** ফিক্স #২: গ্লোবাল মেসেজ হ্যান্ডলার যোগ (Auto Download বা handleMessage এর জন্য) ***
  bot.on('message', async (msg) => {
      // যদি মেসেজে টেক্সট না থাকে বা সেটি কোনো কমান্ড হয় (যা bot.onText হ্যান্ডেল করবে), তবে উপেক্ষা করবে
      if (!msg.text || msg.text.startsWith(global.PREFIX)) return; 
      
      // commandModules এর উপর লুপ চালিয়ে handleMessage ফাংশনটি কল করা
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
  // *** ফিক্স #২ শেষ ***

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
