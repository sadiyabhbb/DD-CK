// start.js (Fixed Logic and Case Sensitivity)

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

    // --- চেকিং লজিক ---
    for (const chat of requiredChats) {
      let isJoined = false;
      try {
        const member = await bot.getChatMember(chat.id, userId);
        if (member && (member.status === "member" || member.status === "creator" || member.status === "administrator")) {
          isJoined = true;
        }
      } catch (err) {
        // Assume not joined on error
      }

      if (isJoined) {
        inlineButtons.push([{
          text: `✅ ${chat.name}`,
          url: `https://t.me/${chat.id.replace('@','')}`
        }]);
      } else {
        missingChats.push(chat);
        inlineButtons.push([{
          text: `❌ ${chat.name}`,
          url: `https://t.me/${chat.id.replace('@','')}`
        }]);
      }
    }

    // --- মেসেজ ও বাটন তৈরি ---
    let messageText = "";
    if (missingChats.length === 0) {
      messageText = "🎉 **অভিনন্দন!** আপনি সব REQUIRED_CHATS এ join করেছেন। এখন bot ব্যবহার করতে পারবেন।";
      if(!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = true;
      
      return bot.sendMessage(chatId, messageText, { parse_mode: "Markdown" });

    } else {
      messageText = "⚠️ **আপনাকে নিম্নলিখিত গ্রুপ/চ্যানেলে join হতে হবে:**\n\n";
      messageText += "✅ = Already Joined\n❌ = Not Joined\n\n";
      messageText += "Join করার পরে নিচের **VERIFY** বোতামটি টিপুন।";
      
      // Add VERIFY button at the bottom ONLY if chats are missing
      inlineButtons.push([{
        text: "✅ VERIFY",
        callback_data: `verify_user`
      }]);
      
      if(!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = false;

      bot.sendMessage(chatId, messageText, {
        reply_markup: { inline_keyboard: inlineButtons },
        parse_mode: "Markdown"
      });
    }
  },

  // Callback query listener (verify button)
  initCallback: (bot) => {
    bot.on("callback_query", async (query) => {
      if (query.data !== "verify_user") return; 
      
      const userId = query.from.id;
      const requiredChats = global.CONFIG.REQUIRED_CHATS || [];
      let missingChats = [];

      for (const chat of requiredChats) {
        try {
          const member = await bot.getChatMember(chat.id, userId);
          if (member.status === "left" || member.status === "kicked" || member.status === "restricted") {
            missingChats.push(chat);
          }
        } catch (err) {
          missingChats.push(chat);
        }
      }

      if (missingChats.length === 0) {
        if(!global.verifiedUsers) global.verifiedUsers = {};
        global.verifiedUsers[userId] = true;

        await bot.editMessageText("🎉 **Verification Successful!** আপনি সব গ্রুপে join করেছেন। এখন bot ব্যবহার করতে পারবেন।", {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: [] }
        });
        return bot.answerCallbackQuery(query.id, { text: "✅ Verification successful!", show_alert: true });
      } else {
        // Edit the message to show the updated (still missing) button list
        const updatedButtons = [];
        for (const chat of requiredChats) {
           let isJoined = missingChats.some(m => m.id === chat.id) ? false : true;
           updatedButtons.push([{
              text: isJoined ? `✅ ${chat.name}` : `❌ ${chat.name}`,
              url: `https://t.me/${chat.id.replace('@','')}`
           }]);
        }
        updatedButtons.push([{ text: "✅ VERIFY", callback_data: `verify_user` }]);

        await bot.editMessageReplyMarkup({ inline_keyboard: updatedButtons }, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id
        });
        
        return bot.answerCallbackQuery(query.id, { text: "❌ এখনও কিছু গ্রুপে join হয়নি। দয়া করে আবার চেষ্টা করুন।", show_alert: true });
      }
    });
  }
};
