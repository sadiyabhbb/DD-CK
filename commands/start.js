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
    const requiredChats = global.CONFIG.REQUIRED_CHATS || [];
    let missingChats = [];
    const inlineButtons = [];

    for (const chat of requiredChats) {
      let isJoined = false;
      try {
        const member = await bot.getChatMember(chat.id, userId);
        if (member && (member.status === "member" || member.status === "creator" || member.status === "administrator")) {
          isJoined = true;
        }
      } catch (_) {}

      if (isJoined) {
        inlineButtons.push([{ text: `✅ ${chat.name}`, url: `https://t.me/${chat.id.replace('@','')}` }]);
      } else {
        missingChats.push(chat);
        inlineButtons.push([{ text: `❌ ${chat.name}`, url: `https://t.me/${chat.id.replace('@','')}` }]);
      }
    }

    let messageText = "";

    if (missingChats.length === 0) {
      messageText = "🎉 **অভিনন্দন!** আপনি সব REQUIRED_CHATS এ join করেছেন। এখন bot ব্যবহার করতে পারবেন।";

      if (!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = true;

      return bot.sendMessage(chatId, messageText, { parse_mode: "Markdown" });
    } else {
      messageText = "⚠️ **আপনাকে নিম্নলিখিত গ্রুপ/চ্যানেলে join হতে হবে:**\n\n";
      messageText += "✅ = Already Joined\n❌ = Not Joined\n\n";
      messageText += "Join করার পরে নিচের **VERIFY** বোতামটি টিপুন।";

      inlineButtons.push([{ text: "✅ VERIFY", callback_data: "verify_user" }]);

      if (!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = false;

      bot.sendMessage(chatId, messageText, {
        reply_markup: { inline_keyboard: inlineButtons },
        parse_mode: "Markdown"
      });
    }
  },

  initCallback: (bot) => {
    bot.on("callback_query", async (query) => {
      try {
        if (!query.data.startsWith("verify_user")) return;

        const chatId = query.message.chat.id;
        const msgId = query.message.message_id;
        const userId = query.from.id;
        const requiredChats = global.CONFIG.REQUIRED_CHATS || [];
        let missingChats = [];

        for (const chat of requiredChats) {
          try {
            const m = await bot.getChatMember(chat.id, userId);
            if (!["member", "creator", "administrator"].includes(m.status)) {
              missingChats.push(chat);
            }
          } catch (_) {
            missingChats.push(chat);
          }
        }

        if (missingChats.length === 0) {
          await bot.answerCallbackQuery(query.id, { text: "✔ Verification Successful!" });

          return bot.editMessageText(
            "🎉 **Verification Successful!** আপনি সব গ্রুপে join করেছেন।",
            {
              chat_id: chatId,
              message_id: msgId,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [] }
            }
          ).catch(() => {});
        }

        const updatedButtons = [];

        for (const chat of requiredChats) {
          const isMissing = missingChats.some(m => m.id === chat.id);
          updatedButtons.push([
            {
              text: (isMissing ? "❌ " : "✅ ") + chat.name,
              url: `https://t.me/${chat.id.replace('@', '')}`
            }
          ]);
        }

        updatedButtons.push([
          { text: "✅ VERIFY", callback_data: "verify_user_" + Date.now() }
        ]);

        await bot.answerCallbackQuery(query.id, { text: "❌ এখনও কিছু গ্রুপে join হয়নি!" });

        return bot.editMessageReplyMarkup(
          { inline_keyboard: updatedButtons },
          { chat_id: chatId, message_id: msgId }
        ).catch(() => {});

      } catch (_) {
        try {
          await bot.answerCallbackQuery(query.id, { text: "⚠ Error occurred!" });
        } catch (_) {}
      }
    });
  }
};
