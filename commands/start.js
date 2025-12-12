// start.js (Fixed Logic, Callback, and Error Handling)

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
    // নিশ্চিত করুন REQUIRED_CHATS বিদ্যমান এবং অ্যারে
    const requiredChats = global.CONFIG.REQUIRED_CHATS || []; 

    let missingChats = [];
    const inlineButtons = [];

    // --- চেকিং লজিক (প্রথম /start কমান্ডের জন্য) ---
    for (const chat of requiredChats) {
      let isJoined = false;
      try {
        const member = await bot.getChatMember(chat.id, userId);
        // 'member', 'creator', বা 'administrator' হলেই কেবল Joined
        if (member && (member.status === "member" || member.status === "creator" || member.status === "administrator")) {
          isJoined = true;
        }
      } catch (err) {
        // API ত্রুটি বা সদস্যতা না থাকলে, ধরে নিতে হবে Joined নয়
        // console.error(`Error checking membership for ${chat.id}:`, err.message);
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
      // যদি সব গ্রুপে জয়েন করা থাকে
      messageText = "🎉 **অভিনন্দন!** আপনি সব REQUIRED_CHATS এ join করেছেন। এখন bot ব্যবহার করতে পারবেন।";
      if(!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = true;
      
      return bot.sendMessage(chatId, messageText, { parse_mode: "Markdown" });

    } else {
      // যদি কিছু গ্রুপে জয়েন করা না থাকে
      messageText = "⚠️ **আপনাকে নিম্নলিখিত গ্রুপ/চ্যানেলে join হতে হবে:**\n\n";
      messageText += "✅ = Already Joined\n❌ = Not Joined\n\n";
      messageText += "Join করার পরে নিচের **VERIFY** বোতামটি টিপুন।";
      
      // শুধুমাত্র যখন চ্যাট মিসিং, তখনই VERIFY বাটন যোগ করুন
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

  // Callback query listener (VERIFY button)
  initCallback: (bot) => {
    bot.on("callback_query", async (query) => {
      // 🔥 Verification Error Fix: এই try/catch ব্লকটি নিশ্চিত করে যে টেলিগ্রামকে অন্তত একটি সাড়া দেওয়া হয়েছে।
      try {
        if (query.data !== "verify_user") return; 
        
        const userId = query.from.id;
        const requiredChats = global.CONFIG.REQUIRED_CHATS || [];
        let missingChats = [];
        let isSuccess = true;

        // Re-check membership
        for (const chat of requiredChats) {
          try {
            const member = await bot.getChatMember(chat.id, userId);
            if (member.status !== "member" && member.status !== "creator" && member.status !== "administrator") {
              missingChats.push(chat);
              isSuccess = false;
            }
          } catch (err) {
            // API failure is treated as not joined for security/logic
            missingChats.push(chat);
            isSuccess = false;
          }
        }

        if (isSuccess) {
          // Success
          if(!global.verifiedUsers) global.verifiedUsers = {};
          global.verifiedUsers[userId] = true;

          // 1. Edit the message to reflect success and remove buttons
          await bot.editMessageText("🎉 **Verification Successful!** আপনি সব গ্রুপে join করেছেন। এখন bot ব্যবহার করতে পারবেন।", {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [] }
          });
          // 2. Answer the callback query
          return bot.answerCallbackQuery(query.id, { text: "✅ Verification successful!", show_alert: true });
        } else {
          // Failure: Update the buttons to show the new status (if any change occurred)
          
          const updatedButtons = [];
          for (const chat of requiredChats) {
             // Find if the current chat is still missing
             let isMissing = missingChats.some(m => m.id === chat.id);
             updatedButtons.push([{
                text: isMissing ? `❌ ${chat.name}` : `✅ ${chat.name}`,
                url: `https://t.me/${chat.id.replace('@','')}`
             }]);
          }
          updatedButtons.push([{ text: "✅ VERIFY", callback_data: `verify_user` }]);

          await bot.editMessageReplyMarkup({ inline_keyboard: updatedButtons }, {
              chat_id: query.message.chat.id,
              message_id: query.message.message_id
          });
          
          // Answer the callback query
          return bot.answerCallbackQuery(query.id, { text: "❌ এখনও কিছু গ্রুপে join হয়নি। দয়া করে আবার চেষ্টা করুন।", show_alert: true });
        }
      } catch (error) {
        console.error("🔥 FATAL Callback Query Error (Verify):", error);
        // Fallback answer for any unexpected crash inside the callback
        if (query.id) {
            try {
                // Try to answer the query to stop the loading spinner
                return bot.answerCallbackQuery(query.id, { text: "⚠️ Verification error occurred. Check Bot Admin status and Chat IDs.", show_alert: true });
            } catch (e) {
                // Ignore secondary errors
            }
        }
      }
    });
  }
};
