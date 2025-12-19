const { exec } = require('child_process');

module.exports.config = {
  name: "pullrequest",
  version: "1.0.0",
  credits: "LIKHON X TISHA",
  aliases: ["pr"],
  permission: 2,
  prefix: true,
  description: "Pulls latest changes from GitHub and restarts the bot.",
  category: "admin",
  usages: "/pullrequest",
  cooldowns: 3,
};

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  const pullingMessage = await bot.sendMessage(
    chatId,
    "🔄 **Pulling latest changes from GitHub...**\nPlease wait.",
    { reply_to_message_id: messageId, parse_mode: "Markdown" }
  );

  exec("git pull", async (error, stdout, stderr) => {
    if (error) {
      console.error(`Git Pull Error: ${error.message}`);
      await bot.deleteMessage(chatId, pullingMessage.message_id).catch(() => {});
      return bot.sendMessage(
        chatId,
        `❌ **Git Pull Failed!**\nError:\n\`${error.message}\n${stderr}\``,
        { reply_to_message_id: messageId, parse_mode: "Markdown" }
      );
    }

    const pullOutput = stdout.trim();

    if (pullOutput.includes("Already up to date")) {
      await bot.deleteMessage(chatId, pullingMessage.message_id).catch(() => {});
      return bot.sendMessage(
        chatId,
        "✅ **No new changes found.**\nThe bot is already up to date.",
        { reply_to_message_id: messageId, parse_mode: "Markdown" }
      );
    }

    await bot
      .editMessageText(
        `✅ **Changes pulled successfully.**\n\n⚙️ **Installing dependencies and restarting...**\n\n\`${pullOutput}\``,
        {
          chat_id: chatId,
          message_id: pullingMessage.message_id,
          parse_mode: "Markdown",
        }
      )
      .catch(() => {});

    exec("npm install", async (npmError, npmStdout, npmStderr) => {
      if (npmError) {
        console.error(`NPM Install Error: ${npmError.message}`);
        return bot.sendMessage(
          chatId,
          `⚠️ **NPM install failed!**\nYou need to restart manually.\n\nError:\n\`${npmError.message}\``,
          { reply_to_message_id: messageId, parse_mode: "Markdown" }
        );
      }

      await bot.sendMessage(
        chatId,
        "🚀 **Update completed successfully!**\nThe bot will now restart (or use /restart manually).",
        { reply_to_message_id: messageId, parse_mode: "Markdown" }
      );

      setTimeout(() => {
        process.exit(1);
      }, 3000);
    });
  });
};
