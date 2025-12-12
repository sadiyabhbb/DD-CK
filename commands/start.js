Module.exports = {
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
    const requiredChats = global.CONFIG.REQUIRED_CHATS || []; // Fallback for safety

    let missingChats = [];
    const inlineButtons = [];

    // --- চেকিং লজিক ---
    // Prepare inline buttons for each chat (✅ / ❌)
    for (const chat of requiredChats) {
      let isJoined = false;
      try {
        const member = await bot.getChatMember(chat.id, userId);
        // Status should be 'member', 'creator', or 'administrator'
        if (member && (member.status === "member" || member.status === "creator" || member.status === "administrator")) {
          isJoined = true;
        }
      } catch (err) {
        // Any error, assume not joined or chat ID is wrong
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
      // Assuming global.verifiedUsers is initialized elsewhere, e.g., in your main bot file
      if(!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = true;
      
      // No need for buttons if all joined, but let's send a simple message
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
    }

    bot.sendMessage(chatId, messageText, {
      reply_markup: { inline_keyboard: inlineButtons },
      parse_mode: "Markdown"
    });
  },

  // Callback query listener (verify button)
  initCallback: (bot) => {
    bot.on("callback_query", async (query) => {
      // Check if it's the correct callback
      if (query.data !== "verify_user") return; 
      
      const userId = query.from.id;
      const requiredChats = global.CONFIG.REQUIRED_CHATS || [];
      let missingChats = [];

      for (const chat of requiredChats) {
        try {
          const member = await bot.getChatMember(chat.id, userId);
          // Check for 'member', 'creator', or 'administrator' status
          if (member.status === "left" || member.status === "kicked" || member.status === "restricted") {
            missingChats.push(chat);
          }
        } catch (err) {
          missingChats.push(chat); // Error usually means not found/not joined
        }
      }

      if (missingChats.length === 0) {
        // Successfully verified
        if(!global.verifiedUsers) global.verifiedUsers = {};
        global.verifiedUsers[userId] = true;
        // Edit the original message to reflect success
        await bot.editMessageText("🎉 **Verification Successful!** আপনি সব গ্রুপে join করেছেন। এখন bot ব্যবহার করতে পারবেন।", {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: [] } // Remove buttons
        });
        return bot.answerCallbackQuery(query.id, { text: "✅ Verification successful!", show_alert: true });
      } else {
        // Still missing chats
        await bot.answerCallbackQuery(query.id, { text: "❌ এখনও কিছু গ্রুপে join হয়নি।", show_alert: true });
        
        // OPTIONAL: You can update the inline buttons here as well, showing the new status (good practice)
        // For simplicity, I'm just answering the callback, but the user should run /start again
      }
    });
  }
};
