module.exports.config = {
  name: "2fa",
  aliases: ["totp"],
  version: "1.0.0",
  permission: 0,
  prefix: true,
  description: "Generate 2FA (TOTP) code from secret.",
  category: "utility",
  credits: "LIKHON AHMED",
  cooldowns: 3
};

const speakeasy = require('speakeasy');

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;

  if (!args[0]) {
    return bot.sendMessage(chatId, "⚠️ Use: /2fa <secret>", { reply_to_message_id: msg.message_id });
  }

  const secret = args.join('').replace(/\s/g, '').toUpperCase();

  try {
    const token = speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    });

    if (!token || token.length !== 6) throw new Error("Invalid Secret");

    return bot.sendMessage(chatId, `🔐 𝐘𝐨𝐮𝐫 𝟐𝐅𝐀 𝐂𝐨𝐝𝐞: \n\n👉 ${token}`, { reply_to_message_id: msg.message_id });

  } catch (e) {
    return bot.sendMessage(chatId, "❌ Invalid Secret! Please provide a valid Base32 secret.", { reply_to_message_id: msg.message_id });
  }
};
