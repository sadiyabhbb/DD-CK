module.exports = {
  config: {
    name: "start",
    aliases: [],
    description: "Force join REQUIRED_CHATS",
    prefix: true,
    permission: 0,
    tags: ["core"]
  },

  run: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const requiredChats = global.CONFIG.REQUIRED_CHATS;

    let missingChats = [];

    for (const chat of requiredChats) {
      try {
        // check member status
        const member = await bot.getChatMember(chat.id, userId);
        if (member.status === "left" || member.status === "kicked") {
          missingChats.push(chat);
        }
      } catch (err) {
        // member check failed, consider as missing
        missingChats.push(chat);
      }
    }

    if (missingChats.length > 0) {
      let text = `⚠️ আপনাকে নিম্নলিখিত গ্রুপ/চ্যানেলে join হতে হবে:\n\n`;
      missingChats.forEach(c => {
        text += `• ${c.name}: ${c.id}\n`;
      });
      text += `\nJoin করার পরে /start আবার দিন।`;

      return bot.sendMessage(chatId, text);
    }

    // সব গ্রুপে আছে → bot use করতে পারবে
    bot.sendMessage(chatId, `✅ সব REQUIRED_CHATS-এ আপনি আছেন। এখন bot ব্যবহার করতে পারবেন।`);
  }
};
