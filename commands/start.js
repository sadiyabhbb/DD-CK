module.exports = {
  config: {
    name: "start",
    credits: " LIKHON X TISHA",
    aliases: [],
    description: "Force join REQUIRED_CHATS with inline verify button + leave detection",
    prefix: true,
    permission: 0,
    tags: ["core"]
  },

  run: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!global.verifiedUsers) global.verifiedUsers = {};
    if (global.verifiedUsers[userId] === undefined) global.verifiedUsers[userId] = false;

    await checkJoinStatus(bot, userId, chatId);
  },

  initCallback: (bot) => {
    bot.on("callback_query", async (query) => {
      if (!query.data.startsWith("verify_join")) return;

      const chatId = query.message.chat.id;
      const msgId = query.message.message_id;
      const userId = query.from.id;

      await checkJoinStatus(bot, userId, chatId, msgId, true);

      await bot.answerCallbackQuery(query.id, { text: "✅ Checked!" });
    });

    bot.on("message", async (msg) => {
      const userId = msg.from.id;
      if (global.verifiedUsers[userId]) {
        await checkJoinStatus(bot, userId, msg.chat.id);
      }
    });
  }
};

// ==================== HELPER FUNCTION ====================
async function checkJoinStatus(bot, userId, chatId, msgId = null, isCallback = false) {
  const requiredChats = global.CONFIG.REQUIRED_CHATS || [];
  let missingChats = [];
  let buttons = [];

  for (const chat of requiredChats) {
    let joined = false;
    try {
      const member = await bot.getChatMember(chat.id, userId);
      if (member && ["member","administrator","creator","subscriber"].includes(member.status)) {
        joined = true;
      }
    } catch {}
    if (!joined) missingChats.push(chat);

    buttons.push([
      { text: (joined ? "✅ " : "❌ ") + chat.name, url: `https://t.me/${chat.username}` }
    ]);
  }

  if (missingChats.length === 0) {
    global.verifiedUsers[userId] = true;

    if (isCallback && msgId) {
      await bot.editMessageText(
        "🎉 **Verification Successful!**\n\nআপনি সব group/channel এ join করেছেন ✅",
        { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", reply_markup: { inline_keyboard: [] } }
      ).catch(() => {});
    } else if (!isCallback) {
      await bot.sendMessage(chatId,
        "🎉 **অভিনন্দন!**\n\nআপনি সব required group/channel এ join করেছেন। এখন bot ব্যবহার করতে পারবেন ✅",
        { parse_mode: "Markdown" }
      );
    }
    return;
  }

  global.verifiedUsers[userId] = false;
  buttons.push([{ text: "✅ VERIFY", callback_data: "verify_join" }]);

  const messageText =
    "⚠️ **আপনাকে নিচের group/channel গুলোতে join করতে হবে:**\n\n" +
    missingChats.map(c => `❌ ${c.name}`).join("\n") +
    "\n\nJoin করার পর **VERIFY** বাটনে চাপ দিন 👇";

  if (isCallback && msgId) {
    await bot.editMessageText(messageText, {
      chat_id: chatId,
      message_id: msgId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    }).catch(() => {});
  } else {
    await bot.sendMessage(chatId, messageText, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  }
}
