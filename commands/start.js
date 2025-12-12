module.exports = {
  config: {
    name: "start",
    aliases: [],
    description: "Force join REQUIRED_CHATS with inline verification button",
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

    // Prepare inline buttons for each chat (✅ / ❌)
    for (const chat of requiredChats) {
      try {
        const member = await bot.getChatMember(chat.id, userId);
        if (member.status === "left" || member.status === "kicked") {
          missingChats.push(chat);
          inlineButtons.push([{
            text: `❌ ${chat.name}`,
            url: `https://t.me/${chat.id.replace('@','')}`
          }]);
        } else {
          inlineButtons.push([{
            text: `✅ ${chat.name}`,
            url: `https://t.me/${chat.id.replace('@','')}`
          }]);
        }
      } catch (err) {
        missingChats.push(chat);
        inlineButtons.push([{
          text: `❌ ${chat.name}`,
          url: `https://t.me/${chat.id.replace('@','')}`
        }]);
      }
    }

    // Add VERIFY button at the bottom
    inlineButtons.push([{
      text: "✅ VERIFY",
      callback_data: `verify_user`
    }]);

    let messageText = "";
    if (missingChats.length === 0) {
      messageText = "🎉 আপনি সব REQUIRED_CHATS এ join করেছেন। এখন bot ব্যবহার করতে পারবেন।";
      if(!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = true;
    } else {
      messageText = "⚠️ আপনাকে নিম্নলিখিত গ্রুপ/চ্যানেলে join হতে হবে:\n\n";
      messageText += "✅ = Already Joined\n❌ = Not Joined\n\n";
      messageText += "Join করার পরে VERIFY button টিপুন।";
      if(!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = false;
    }

    bot.sendMessage(chatId, messageText, {
      reply_markup: { inline_keyboard: inlineButtons },
      parse_mode: "Markdown"
    });
  }
};

// Callback query listener (verify button)
module.exports.initCallback = (bot) => {
  bot.on("callback_query", async (query) => {
    const userId = query.from.id;
    const chatId = query.message.chat.id;

    if (query.data === "verify_user") {
      const requiredChats = global.CONFIG.REQUIRED_CHATS;
      let missingChats = [];

      for (const chat of requiredChats) {
        try {
          const member = await bot.getChatMember(chat.id, userId);
          if (member.status === "left" || member.status === "kicked") {
            missingChats.push(chat);
          }
        } catch (err) {
          missingChats.push(chat);
        }
      }

      if (missingChats.length === 0) {
        global.verifiedUsers[userId] = true;
        return bot.answerCallbackQuery(query.id, { text: "✅ Verification successful!", show_alert: true });
      } else {
        return bot.answerCallbackQuery(query.id, { text: "❌ এখনও কিছু গ্রুপে join হয়নি।", show_alert: true });
      }
    }
  });
};
