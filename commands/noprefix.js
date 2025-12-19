const fs = require('fs-extra');
const path = require('path');

const settingsPath = path.join(__dirname, '..', 'noprefix_settings.json');

module.exports.config = {
  name: "noprefix",
  version: "1.0.1",
  credits: "LIKHON AHMED modified by Gemini",
  permission: 2,
  prefix: true,
  description: "Turns global noprefix mode ON or OFF.",
  category: "admin",
  usages: "/noprefix [on | off]",
  cooldowns: 5,
};

async function loadSettings() {
  if (fs.existsSync(settingsPath)) {
    return await fs.readJson(settingsPath);
  }
  return { isNoprefixActive: false };
}

async function saveSettings(settings) {
  await fs.writeJson(settingsPath, settings, { spaces: 2 });
}

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  const ownerID = global.CONFIG.OWNER.ID.toString();
  const senderID = msg.from.id.toString();

  if (senderID !== ownerID) {
    return bot.sendMessage(
      chatId,
      "❌ **Permission denied.** This command can only be used by the bot owner.",
      { reply_to_message_id: messageId, parse_mode: "Markdown" }
    );
  }

  if (args.length === 0) {
    const status = global.isNoprefixActive ? "✅ ON" : "❌ OFF";
    return bot.sendMessage(
      chatId,
      `✨ **No-prefix mode status:** ${status}\nUsage: \`${global.CONFIG.BOT_SETTINGS.PREFIX || "/"}noprefix [on|off]\``,
      { reply_to_message_id: messageId, parse_mode: "Markdown" }
    );
  }

  const action = args[0].toLowerCase();

  if (action === "on" || action === "off") {
    const settings = await loadSettings();
    const newState = action === "on";

    if (settings.isNoprefixActive === newState) {
      return bot.sendMessage(
        chatId,
        `⚠️ No-prefix mode is already ${newState ? "ON" : "OFF"}.`,
        { reply_to_message_id: messageId }
      );
    }

    settings.isNoprefixActive = newState;
    await saveSettings(settings);

    if (typeof global.reloadNoprefixSettings === "function") {
      await global.reloadNoprefixSettings();
    }

    return bot.sendMessage(
      chatId,
      `✅ **No-prefix mode has been successfully turned ${newState ? "ON" : "OFF"}.**\n\n✨ **Changes applied without restart.**`,
      { reply_to_message_id: messageId, parse_mode: "Markdown" }
    );
  } else {
    return bot.sendMessage(
      chatId,
      "❌ Invalid argument. Use `on` or `off`.",
      { reply_to_message_id: messageId }
    );
  }
};
