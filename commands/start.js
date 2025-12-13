module.exports = {
  config: {
    name: "start",
    credits: "LIKHON X TISHA",
    aliases: [],
    description: "Force join REQUIRED_CHATS with inline verify button",
    prefix: true,
    permission: 0,
    tags: ["core"]
  },

  run: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const msgId = msg.message_id;
    const requiredChats = global.CONFIG.REQUIRED_CHATS || [];
    
    // 💡 CONFIG থেকে বটের নাম লোড করা হচ্ছে
    const botName = global.CONFIG.BOT_SETTINGS?.NAME || "Likhon Bot"; 

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
          text: (joined ? "❌ " : "✅ ") + chat.name,
          url: chat.username
            ? `https://t.me/${chat.username}`
            : `https://t.me/c/${String(chat.id).replace("-100", "")}`
        }
      ]);
    }

    // All joined - SEND WELCOME MESSAGE AS A REPLY
    if (missingChats.length === 0) {
      if (!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = true;

      const welcomeMessage = `
✨ **Welcome to ${botName}!** ✨

👋 Hello, **${msg.from.first_name || "User"}**

💡 I am your all-in-one assistant, ready to help you with:
─────────────────────────────
📌 **Features:**
• 🔒 Chat Lock System → \`/lock\`
• 🤖 AI Chat (Gemini) → \`/gemini\`
• 🖼 AI Image Tools → \`/img\`
• 🤖 AI Chat (GPT) → \`/ai\`
• ⚙️ Help See All cmnd → \`/help\`
─────────────────────────────

🚀 **Quick Tips:**
• Type \`/help\` to see all commands.
• Reply to images with \`/img\` to use AI tools.
• Use \`/lock\` to manage chat locks.
• Explore Gemini AI with \`/gemini\`.

💎 **Premium Experience Activated!** Enjoy smooth, fast, and responsive commands.
─────────────────────────────

© Developed by **Likhon Ahmed X Nayan Vai**
      `.trim();

      return bot.sendMessage(
        chatId,
        welcomeMessage,
        {
          parse_mode: "Markdown",
          reply_to_message_id: msgId
        }
      );
    }

    // Not joined - SEND VERIFICATION MESSAGE AS A REPLY
    buttons.push([{ text: "✅ 𝐕𝐄𝐑𝐈𝐅𝐘", callback_data: "verify_join" }]);

    if (!global.verifiedUsers) global.verifiedUsers = {};
    global.verifiedUsers[userId] = false;

    // 🔴 কাস্টম ওয়ার্নিং মেসেজ
    const customWarningMessage = `
╭━━━ • ❉ • ✦ • ❉ • ━━━╮
┃  
┃    **𝐖𝐚𝐫𝐧𝐢𝐧𝐠!**  
┃  **𝐉𝐨𝐢𝐧 𝐨𝐮𝐫 𝐜𝐡𝐚𝐧𝐧𝐞𝐥 𝐟𝐢𝐫𝐬𝐭**  
┃  
┃ ➤ **𝐓𝐡𝐚𝐧𝐤 𝐘𝐨𝐮 🩷**
┃  
╰━━━ • ❉ • ✦ • ❉ • ━━━╯

**আপনাকে নিচের group/channel গুলোতে join করতে হবে:**
Join করার পর **VERIFY** বাটনে চাপ দিন 👇
`.trim();

    return bot.sendMessage(
      chatId,
      customWarningMessage, // পরিবর্তিত মেসেজ
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons },
        reply_to_message_id: msgId
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
      
      // 💡 CONFIG থেকে বটের নাম লোড করা হচ্ছে
      const botName = global.CONFIG.BOT_SETTINGS?.NAME || "Likhon Bot"; 

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
            text: (joined ? "❌ " : "✅ ") + chat.name,
            url: chat.username
              ? `https://t.me/${chat.username}`
              : `https://t.me/c/${String(chat.id).replace("-100", "")}`
          }
        ]);
      }

      if (missing.length === 0) {
        if (!global.verifiedUsers) global.verifiedUsers = {};
        global.verifiedUsers[userId] = true;

        await bot.answerCallbackQuery(query.id, {
          text: "✔ Verification Successful!"
        });

        // SEND WELCOME MESSAGE AFTER SUCCESSFUL VERIFICATION (using editMessageText)
        const welcomeMessage = `
✨ **Welcome to ${botName}!** ✨

👋 Hello, **${query.from.first_name || "User"}**

💡 I am your all-in-one assistant, ready to help you with:
─────────────────────────────
📌 **Features:**
• 🔒 Chat Lock System → \`/lock\`
• 🤖 AI Chat (Gemini) → \`/gemini\`
• 🖼 AI Image Tools → \`/img\`
• 🤖 AI Chat (GPT) → \`/ai\`
• ⚙️ Help See All cmnd → \`/help\`
─────────────────────────────

🚀 **Quick Tips:**
• Type \`/help\` to see all commands.
• Reply to images with \`/img\` to use AI tools.
• Use \`/lock\` to manage chat locks.
• Explore Gemini AI with \`/gemini\`.

💎 **Premium Experience Activated!** Enjoy smooth, fast, and responsive commands.
─────────────────────────────

© Developed by **Likhon Ahmed X Nayan Vai**
        `.trim();

        return bot.editMessageText(
          welcomeMessage,
          {
            chat_id: chatId,
            message_id: msgId,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [] }
          }
        );
      }
      
      // 🔴 কাস্টম ওয়ার্নিং মেসেজ (Edit-এর জন্যও)
      const customWarningMessage = `
╭━━━ • ❉ • ✦ • ❉ • ━━━╮
┃  
┃    **𝐖𝐚𝐫𝐧𝐢𝐧𝐠!**  
┃  **𝐉𝐨𝐢𝐧 𝐨𝐮𝐫 𝐜𝐡𝐚𝐧𝐧𝐞𝐥 𝐟𝐢𝐫𝐬𝐭**  
┃  
┃ ➤ **𝐓𝐡𝐚𝐧𝐤 𝐘𝐨𝐮 🩷**
┃  
╰━━━ • ❉ • ✦ • ❉ • ━━━╯

**আপনাকে নিচের group/channel গুলোতে join করতে হবে:**
Join করার পর **VERIFY** বাটনে চাপ দিন 👇
`.trim();

      buttons.push([{ text: "✅ 𝐕𝐄𝐑𝐈𝐅𝐘", callback_data: "verify_join" }]);

      await bot.answerCallbackQuery(query.id, {
        text: "❌ এখনও কিছু group/channel এ join করা হয়নি!"
      });

      // বাটনের সাথে মেসেজ টেক্সটও এডিট করতে হবে
      return bot.editMessageText(
        customWarningMessage,
        {
          chat_id: chatId,
          message_id: msgId,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: buttons }
        }
      );
    });
  }
};
