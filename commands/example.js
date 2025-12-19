module.exports.config = {
  name: "example",
  credits: "LIKHON AHMED",
  aliases: ["cmdtemplate", "demo"],
  prefix: true,
  permission: 0,
  description: "This is a template command that can be used to create new command files.",
  tags: ["utility", "dev"],
};

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const senderName = msg.from.first_name || "User";

  if (args.length === 0) {
    const usage = `
👋 Hello ${senderName}! This is an example command.

You did not provide any arguments.
Usage: \`${global.PREFIX}example [your message]\`
    `;
    return bot.sendMessage(chatId, usage, {
      reply_to_message_id: messageId,
      parse_mode: "Markdown",
    });
  }

  const message = args.join(" ");

  const replyText = `
🤖 **Example Successful!**
You wrote: "${message}"

💡 Copy this file to create a new command.
  `;

  await bot.sendMessage(chatId, replyText, {
    reply_to_message_id: messageId,
    parse_mode: "Markdown",
  });
};

module.exports.handleMessage = async (bot, msg) => {
  const text = msg.text;

  if (text && text.toLowerCase().includes("template")) {
    return;
  }
};
