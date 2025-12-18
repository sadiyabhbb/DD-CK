const fs = require('fs-extra');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'config.js');

module.exports.config = {
  name: "prefix",
  version: "1.0.5",
  credits: "Dipto modified for Telegram Prefix by Gemini",
  permission: 2,
  prefix: false,
  description: "Shows the current prefix and allows changing it.",
  category: "utility",
  usages: "/prefix [new prefix]",
  cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  let currentConfig;
  try {
    delete require.cache[require.resolve(configPath)];
    currentConfig = require(configPath);
  } catch (e) {
    return bot.sendMessage(
      chatId,
      "❌ Failed to load configuration file. Make sure `config/config.js` exists.",
      { reply_to_message_id: messageId }
    );
  }

  const currentPrefix = currentConfig.BOT_SETTINGS.PREFIX || "/";
  const ownerID = currentConfig.OWNER.ID.toString();
  const senderID = msg.from.id.toString();

  if (args.length > 0) {
    if (module.exports.config.permission > 0 && senderID !== ownerID) {
      return bot.sendMessage(
        chatId,
        "❌ **You are not authorized to change the prefix.** This command is owner-only.",
        { reply_to_message_id: messageId, parse_mode: "Markdown" }
      );
    }

    const newPrefix = args[0].trim();
    if (newPrefix.length > 5) {
      return bot.sendMessage(
        chatId,
        "❌ The prefix is too long. Please keep it within 5 characters.",
        { reply_to_message_id: messageId }
      );
    }

    try {
      currentConfig.BOT_SETTINGS.PREFIX = newPrefix;
      const newContent = `module.exports = ${JSON.stringify(currentConfig, null, 2)};\n`;
      fs.writeFileSync(configPath, newContent, "utf8");

      if (typeof global.reloadConfig === "function") {
        global.reloadConfig();
      }

      await bot.sendMessage(
        chatId,
        `✅ **Prefix updated successfully.**\nNew prefix: \`${newPrefix}\`\n\n✨ **Changes applied without restart.**`,
        { reply_to_message_id: messageId, parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("❌ Prefix change failed:", error);
      return bot.sendMessage(
        chatId,
        "❌ Failed to change prefix. Make sure `config/config.js` is writable.",
        { reply_to_message_id: messageId }
      );
    }
  } else {
    return bot.sendMessage(
      chatId,
      `✨ **Current prefix:** \`${currentPrefix}\``,
      { reply_to_message_id: messageId, parse_mode: "Markdown" }
    );
  }
};
