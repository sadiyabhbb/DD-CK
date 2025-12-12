module.exports = {
  config: {
    name: "start",
    aliases: [],
    description: "Force join REQUIRED_CHATS with inline verification",
    prefix: true,
    permission: 0,
    tags: ["core"]
  },

  run: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const requiredChats = global.CONFIG.REQUIRED_CHATS;

    let missingChats = [];

    const inlineButtons = [];

    for (const chat of requiredChats) {
      try {
        const member = await bot.getChatMember(chat.id, userId);
        if (member.status === "left" || member.status === "kicked") {
          missingChats.push(chat);
          inlineButtons.push([{
            text: `❌ ${chat.name}`,
            url: `https://t.me/${chat.id.replace('@', '')}`
          }]);
        } else {
          inlineButtons.push([{
            text: `✅ ${chat.name}`,
            url: `https://t.me/${chat.id.replace('@', '')}`
          }]);
        }
      } catch (err) {
        // consider missing
        missingChats.push(chat);
        inlineButtons.push([{
          text: `❌ ${chat.name}`,
          url: `https://t.me/${chat.id.replace('@', '')}`
        }]);
      }
    }

    let messageText = "📌 নিচের গ্রুপ/চ্যানেলে join হতে হবে:\n\n";
    messageText += "✅ = Already Joined\n❌ = Not Joined\n\n";

    if (missingChats.length === 0) {
      messageText = "🎉 আপনি সব REQUIRED_CHATS এ join করেছেন। এখন bot ব্যবহার করতে পারবেন।";
    } else {
      messageText += "Join করার পরে /start আবার দিন।";
    }

    bot.sendMessage(chatId, messageText, {
      reply_markup: {
        inline_keyboard: inlineButtons
      },
      parse_mode: "Markdown"
    });
  }
};
