module.exports = {
  config: {
    name: "start",
    aliases: [],
    description: "Force join REQUIRED_CHATS with inline verify button",
    prefix: true,
    permission: 0,
    tags: ["core"]
  },

  run: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const requiredChats = global.CONFIG.REQUIRED_CHATS || [];

    let missingChats = [];
    let buttons = [];

    for (const chat of requiredChats) {
      let joined = false;

      try {
        const member = await bot.getChatMember(chat.id, userId);

        if (
          member &&
          ["member", "administrator", "creator", "subscriber"].includes(member.status)
        ) {
          joined = true;
        }
      } catch (e) {
        joined = false;
      }

      if (!joined) {
        missingChats.push(chat);
      }

      buttons.push([
        {
          text: (joined ? "✅ " : "❌ ") + chat.name,
          url: `https://t.me/c/${String(chat.id).replace("-100", "")}`
        }
      ]);
    }

    // All joined
    if (missingChats.length === 0) {
      if (!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = true;

      return bot.sendMessage(
        chatId,
        "🎉 **অভিনন্দন!**\n\nআপনি সব required group/channel এ join করেছেন। এখন bot ব্যবহার করতে পারবেন ✅",
        { parse_mode: "Markdown" }
      );
    }

    // Not joined
    buttons.push([{ text: "✅ VERIFY", callback_data: "verify_join" }]);

    if (!global.verifiedUsers) global.verifiedUsers = {};
    global.verifiedUsers[userId] = false;

    return bot.sendMessage(
      chatId,
      "⚠️ **আপনাকে নিচের group/channel গুলোতে join করতে হবে:**\n\n"
      + "Join করার পর **VERIFY** বাটনে চাপ দিন 👇",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      }
    );
  },

  initCallback: (bot) => {
    bot.on("callback_query", async (query) => {
      if (query.data !== "verify_join") return;

      const chatId = query.message.chat.id;
      const msgId = query.message.message_id;
      const userId = query.from.id;
      const requiredChats = global.CONFIG.REQUIRED_CHATS || [];

      let missing = [];
      let buttons = [];

      for (const chat of requiredChats) {
        let joined = false;

        try {
          const member = await bot.getChatMember(chat.id, userId);

          if (
            member &&
            ["member", "administrator", "creator", "subscriber"].includes(member.status)
          ) {
            joined = true;
          }
        } catch (e) {
          joined = false;
        }

        if (!joined) {
          missing.push(chat);
        }

        buttons.push([
          {
            text: (joined ? "✅ " : "❌ ") + chat.name,
            url: `https://t.me/c/${String(chat.id).replace("-100", "")}`
          }
        ]);
      }

      if (missing.length === 0) {
        if (!global.verifiedUsers) global.verifiedUsers = {};
        global.verifiedUsers[userId] = true;

        await bot.answerCallbackQuery(query.id, {
          text: "✔ Verification Successful!"
        });

        return bot.editMessageText(
          "🎉 **Verification Successful!**\n\nআপনি সব group/channel এ join করেছেন ✅",
          {
            chat_id: chatId,
            message_id: msgId,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [] }
          }
        );
      }

      buttons.push([{ text: "✅ VERIFY", callback_data: "verify_join" }]);

      await bot.answerCallbackQuery(query.id, {
        text: "❌ এখনও কিছু group/channel এ join করা হয়নি!"
      });

      return bot.editMessageReplyMarkup(
        { inline_keyboard: buttons },
        { chat_id: chatId, message_id: msgId }
      );
    });
  }
};
