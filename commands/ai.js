const axios = require("axios");

module.exports.config = {
  name: "ai",
  credits: "LIKHON X TISHA",
  aliases: ["gpt"],
  prefix: true,
  permission: 0,
  description: "Chat with GPT AI using an external API.",
  tags: ["ai", "chat"]
};

module.exports.run = async (bot, msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  
  let args = msg.text.split(/\s+/).slice(1);
  let text = args.join(" ").trim();

  if (!text) {
    if (msg.reply_to_message && msg.reply_to_message.text) {
        text = msg.reply_to_message.text.trim();
    } else {
        return bot.sendMessage(
            chatId,
            `❌ অনুগ্রহ করে AI এর জন্য একটি মেসেজ প্রদান করুন।\nব্যবহার: ${global.PREFIX}ai <আপনার প্রশ্ন>`,
            { reply_to_message_id: messageId }
        );
    }
  }

  const waitingMessage = await bot.sendMessage(
    chatId,
    "💬 AI উত্তর প্রস্তুত করছে, অপেক্ষা করুন...",
    { reply_to_message_id: messageId }
  );
  const waitingMessageId = waitingMessage.message_id;

  try {
    const apiss = await axios.get(`https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/refs/heads/main/api.json`);
    const apis = apiss.data;

    const response = await axios.get(`${apis.api}/nayan/gpt3?text=${encodeURIComponent(text)}`);
    const data = response.data;
    
    if (data.status !== "Success" || !data.response) {
      await bot.editMessageText(
        "❌ GPT থেকে উত্তর পেতে ব্যর্থ হয়েছে। API স্ট্যাটাস ঠিক নেই।",
        {
            chat_id: chatId,
            message_id: waitingMessageId
        }
      );
      return;
    }
    
    const aiResponse = `💬 *AI Response:*\n\n${data.response}\n\n🤖 Powered by GPT`;

    await bot.editMessageText(
      aiResponse,
      {
        chat_id: chatId,
        message_id: waitingMessageId,
        parse_mode: "Markdown"
      }
    );

  } catch (err) {
    console.error("❌ Error contacting GPT-3 API:", err.message);

    await bot.editMessageText(
      "❌ GPT-3 API এর সাথে যোগাযোগ করার সময় একটি ত্রুটি হয়েছে। সার্ভার বা ইন্টারনেট সংযোগ পরীক্ষা করুন।",
      {
        chat_id: chatId,
        message_id: waitingMessageId
      }
    );
  }
};
