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
global.verifiedUsers = {}; // Stores verified users: { userId: true }

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

            // Prefix locked trigger for text commands
            const trigger = new RegExp(
              `^\\${global.PREFIX}(${name}|${aliases.join("|")})$`,
              "i"
            );

            bot.onText(trigger, async (msg) => {
              const chatId = msg.chat.id;
              const userId = msg.from.id;

              // Force Verification Check (for all commands except /start)
              if (name !== "start" && Array.isArray(config.REQUIRED_CHATS) && config.REQUIRED_CHATS.length > 0) {
                 if (!global.verifiedUsers[userId]) {
                     let text = `⚠️ বটটি ব্যবহার করার আগে আপনাকে ভেরিফাই করতে হবে। অনুগ্রহ করে ${global.PREFIX}start দিন।`;
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

  // --- Callback Listeners Initialization ---
  // This is crucial for button responses (like 'Verify')
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
