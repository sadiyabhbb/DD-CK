const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports.config = {
  name: "spam",
  credits: "LIKHON AHMED",
  aliases: ["flood"],
  version: "1.0.0",
  permission: 0,
  prefix: true,
  description: "Sends a specified message a certain number of times.",
  category: "fun",
  usages: "/spam [message] [count]",
  cooldowns: 0,
};

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  if (args.length < 2) {
    return bot.sendMessage(
      chatId,
      "⚠️ Please provide a message and the number of times to send it.\n\nUsage: `/spam Hello 10`",
      { reply_to_message_id: messageId }
    );
  }

  const count = parseInt(args[args.length - 1]);
  const content = args.slice(0, args.length - 1).join(" ");

  if (isNaN(count) || count <= 0) {
    return bot.sendMessage(chatId, "❌ Please provide a valid number of times to send.", { reply_to_message_id: messageId });
  }

  const maxCount = 20;
  if (count > maxCount) {
    return bot.sendMessage(chatId, `⚠️ You cannot spam more than ${maxCount} times at once.`, { reply_to_message_id: messageId });
  }

  for (let i = 0; i < count; i++) {
    try {
      await bot.sendMessage(chatId, content);
      await sleep(500);
    } catch (error) {
      await bot.sendMessage(
        chatId,
        `❌ Failed to send a message (Iteration ${i + 1}). Stopping due to Telegram rate limits.`,
        { reply_to_message_id: messageId }
      );
      break;
    }
  }
};
