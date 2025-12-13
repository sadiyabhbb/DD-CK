module.exports = {
  config: {
    name: "start",
    credits: "LIKHON X TISHA",
    aliases: [],
    prefix: true,
    permission: 0,
    description: "Force join REQUIRED_CHATS with inline verify button",
    tags: ["core"]
  },

  run: async (bot, msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const msgId = msg.message_id;
    const requiredChats = global.CONFIG.REQUIRED_CHATS || [];
    
    
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

    
    if (missingChats.length === 0) {
      if (!global.verifiedUsers) global.verifiedUsers = {};
      global.verifiedUsers[userId] = true;
      
      // *** JSON সেভ লজিক যুক্ত করা হয়েছে (কমান্ড রান করার সময়) ***
      if (global.saveVerifiedUsers) {
        await global.saveVerifiedUsers(); 
      }
      // ********************************************************

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

© Developed by 𝐗-𝐓𝐑𝐄𝐌 𝐋𝐈𝐊𝐇𝐎𝐍 𝐀𝐇𝐌𝐄𝐃 💕
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

    
    buttons.push([{ text: "✅ 𝐕𝐄𝐑𝐈𝐅𝐘", callback_data: "verify_join" }]);

    if (!global.verifiedUsers) global.verifiedUsers = {};
    global.verifiedUsers[userId] = false;

    
    const customWarningMessage = `
╭━━━ • ❉ • ✦ • ❉ • ━━━╮
┃  
┃    **𝐖𝐚𝐫𝐧𝐢𝐧𝐠!**  
┃  **𝐉𝐨𝐢𝐧 𝐨𝐮𝐫 𝐜𝐡𝐚𝐧𝐧𝐞𝐥 𝐟𝐢𝐫𝐬𝐭**  
┃  
┃ ➤ **𝐓𝐡𝐚𝐧𝐤 𝐘𝐨𝐮 🩷**
┃  
╰━━━ • ❉ • ✦ • ❉ • ━━━╯

`.trim();

    return bot.sendMessage(
      chatId,
      customWarningMessage, 
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
        
        // *** JSON সেভ লজিক যুক্ত করা হয়েছে (কলব্যাক সফল হওয়ার পর) ***
        if (global.saveVerifiedUsers) {
          await global.saveVerifiedUsers(); 
        }
        // **********************************************************

        await bot.answerCallbackQuery(query.id, {
          text: "✔ Verification Successful!"
        });

        
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

© Developed by 𝐗-𝐓𝐑𝐄𝐌 𝐋𝐈𝐊𝐇𝐎𝐍 𝐀𝐇𝐌𝐄𝐃 💕
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
      
      
      const customWarningMessage = `
╭━━━ • ❉ • ✦ • ❉ • ━━━╮
┃  
┃    **𝐖𝐚𝐫𝐧𝐢𝐧𝐠!**  
┃  **𝐉𝐨𝐢𝐧 𝐨𝐮𝐫 𝐜𝐡𝐚𝐧𝐧𝐞𝐥 𝐟𝐢𝐫𝐬𝐭**  
┃  
┃ ➤ **𝐓𝐡𝐚𝐧𝐤 𝐘𝐨𝐮 🩷**
┃  
╰━━━ • ❉ • ✦ • ❉ • ━━━╯

`.trim();

      buttons.push([{ text: "✅ 𝐕𝐄𝐑𝐈𝐅𝐘", callback_data: "verify_join" }]);

      await bot.answerCallbackQuery(query.id, {
        text: "𝐌𝐮𝐬𝐭 𝐁𝐞 𝐉𝐨𝐢𝐧 𝐎𝐮𝐫 𝐂𝐡𝐚𝐧𝐧𝐞𝐥 𝐎𝐫 𝐆𝐫𝐨𝐮𝐩𝐬 ❌"
      });

    
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
