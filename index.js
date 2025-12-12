const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { loadDB, saveDB } = require('./utils/db');

let config = {};
try {
  const configPath = path.join(__dirname, 'config', 'config.js'); // module.exports
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

const app = express();
const port = config.PORT || 8080;

global.botStartTime = Date.now();
global.activeEmails = {};
global.CONFIG = config;
global.PREFIX = config.BOT_SETTINGS.PREFIX || "/"; 
global.loadedCommands = [];

(async () => {
  // Load DB
  try {
    const db = await loadDB();
    global.userDB = db;
    console.log('✅ Database loaded successfully.');
  } catch (err) {
    console.warn('⚠️ Failed to load DB, starting with empty DB:', err.message);
    global.userDB = { approved: [], pending: [], banned: [] };
  }

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

  // Load commands
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const files = fs.readdirSync(commandsPath);

    for (const file of files) {
      if (file.endsWith(".js")) {
        try {
          const commandModule = require(path.join(commandsPath, file));

          if (commandModule && commandModule.config && commandModule.run) {
            const name = commandModule.config.name;
            const aliases = commandModule.config.aliases || [];

            // Prefix locked trigger
            const trigger = new RegExp(
              `^\\${global.PREFIX}(${name}|${aliases.join("|")})$`,
              "i"
            );

            bot.onText(trigger, async (msg) => {
              const chatId = msg.chat.id;
              const userId = msg.from.id;

              // FORCE JOIN REQUIRED_CHATS logic
              if (name !== "start" && Array.isArray(config.REQUIRED_CHATS) && config.REQUIRED_CHATS.length > 0) {
                let missingChats = [];

                for (const chat of config.REQUIRED_CHATS) {
                  try {
                    const member = await bot.getChatMember(chat.id, userId);
                    if (member.status === "left" || member.status === "kicked") {
                      missingChats.push(chat);
                    }
                  } catch (err) {
                    missingChats.push(chat);
                  }
                }

                if (missingChats.length > 0) {
                  let text = `⚠️ আপনাকে নিম্নলিখিত গ্রুপ/চ্যানেলে join হতে হবে:\n\n`;
                  missingChats.forEach(c => {
                    text += `• ${c.name}: ${c.id}\n`;
                  });
                  text += `\nJoin করার পরে আবার ${global.PREFIX}start দিন।`;

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

  console.log(`\n---------------------------------`);
  console.log(`✅ Successfully loaded ${global.loadedCommands.length} command(s).`);

  // Express server
  app.listen(port, () => {
    console.log(`🚀 Bot server running via polling on port ${port}`);
    console.log(`🔐 Command Prefix locked to: "${global.PREFIX}"`);
  });

})();
