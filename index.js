const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { loadDB, saveDB } = require('./utils/db'); 

let config = {};
try {
  const configPath = path.join(__dirname, 'config', 'config.json');
  if (fs.existsSync(configPath)) {
    config = require(configPath);
    console.log('✅ Config loaded from config/config.json');
  } else {
    throw new Error('config/config.json file not found. Please create it.');
  }
} catch (err) {
  console.error(`❌ FATAL: Configuration load failed: ${err.message}`);
  process.exit(1); 
}

const app = express();
const port = config.PORT || 8080;

global.botStartTime = Date.now();
global.activeEmails = {};
global.CONFIG = config;
global.PREFIX = config.PREFIX || "."; // Default prefix = "."
global.loadedCommands = [];

(async () => {
  try {
    const db = await loadDB();
    global.userDB = db;
    console.log('✅ Database loaded successfully.');
  } catch (err) {
    console.warn('⚠️ Failed to load DB, starting with empty DB:', err.message);
    global.userDB = { approved: [], pending: [], banned: [] };
  }

  const bot = new TelegramBot(config.BOT_TOKEN, {
    polling: true,
    fileDownloadOptions: {
      headers: {
        'User-Agent': 'Telegram Bot'
      }
    }
  });

  bot.on("polling_error", (error) => {
    console.error("❌ Polling error:", error.response?.data || error.message || error);
  });

  const commandsPath = path.join(__dirname, 'commands');

  if (fs.existsSync(commandsPath)) {
    const files = fs.readdirSync(commandsPath);

    for (const file of files) {
      if (file.endsWith(".js")) {
        try {
          const commandModule = require(path.join(commandsPath, file));

          // commandModule = { config: {...}, run: function }
          if (commandModule && commandModule.config && commandModule.run) {

            let name = commandModule.config.name;
            let aliases = commandModule.config.aliases || [];

            // 🔐 PREFIX LOCKED REGEX
            const trigger = new RegExp(
              `^\\${global.PREFIX}(${name}|${aliases.join("|")})$`,
              "i"
            );

            bot.onText(trigger, (msg) => {
              try {
                commandModule.run(bot, msg);
              } catch (e) {
                console.error(`❌ Command Runtime Error (${name}):`, e.message);
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

  console.log(`\n---------------------------------`);
  console.log(`✅ Successfully loaded ${global.loadedCommands.length} command(s).`);

  app.listen(port, () => {
    console.log(`🚀 Bot server running via polling on port ${port}`);
    console.log(`🔐 Command Prefix locked to: "${global.PREFIX}"`);
  });
})();
