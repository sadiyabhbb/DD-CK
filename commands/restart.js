module.exports.config = {
  name: "restart",
  credits: "LIKHON AHMED",
  aliases: ["reboot"],
  version: "1.0.0",
  permission: 2,
  prefix: true,
  description: "Restarts the bot process.",
  category: "system",
  usages: "/restart",
  cooldowns: 5,
};

module.exports.run = async (bot, msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const userId = msg.from.id.toString();

  if (
    !global.CONFIG ||
    !global.CONFIG.BOT_SETTINGS ||
    !Array.isArray(global.CONFIG.BOT_SETTINGS.ADMINS) ||
    !global.CONFIG.BOT_SETTINGS.ADMINS.includes(userId)
  ) {
    return bot.sendMessage(
      chatId,
      "❌ Only bot admins or the bot owner can use this command.",
      { reply_to_message_id: messageId }
    );
  }

  try {
    await bot.sendMessage(
      chatId,
      "🔄 **Restarting bot...**\nPlease wait a moment.",
      { reply_to_message_id: messageId, parse_mode: "Markdown" }
    );

    Object.keys(require.cache).forEach((key) => {
      if (!key.includes("node_modules")) {
        delete require.cache[key];
      }
    });

    setTimeout(() => {
      process.exit(1);
    }, 2000);

  } catch (error) {
    console.error("RESTART COMMAND ERROR:", error.message);
    return bot.sendMessage(
      chatId,
      "❌ An error occurred while restarting the bot. Please check logs or restart manually.",
      { reply_to_message_id: messageId }
    );
  }
};
