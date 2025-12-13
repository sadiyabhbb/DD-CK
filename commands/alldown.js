const axios = require('axios');
const { alldown } = require('nayan-media-downloaders');

module.exports = {
  config: {
    name: "alldown",
    credits: "Nayan (Adapted for Telegram by Gemini)",
    aliases: ["alldl", "dl", "down"],
    prefix: true,
    permission: 0,
    description: "Download videos from various platforms using link or command.",
    tags: ["media", "downloader"]
  },

  run: async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    const args = msg.text.split(/\s+/).slice(1);
    const inputText = args.join(" ").trim();
    
    if (!inputText || !inputText.startsWith("http")) {
      return bot.sendMessage(
        chatId,
        `❌ লিংক দিন! উদাহরণ: ${global.PREFIX}alldown <লিংক>`,
        { reply_to_message_id: messageId }
      );
    }

    await module.exports.handleMessage(bot, msg);
  },

  handleMessage: async function (bot, msg) {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const text = msg.text || "";
    
    if (text.startsWith(global.PREFIX)) {
      const commandName = text.split(/\s+/)[0].toLowerCase().slice(global.PREFIX.length);
      const config = module.exports.config;
      // যদি এটি /alldown কমান্ডের মাধ্যমে আসে, তবে শুধুমাত্র আর্গুমেন্ট (লিংক) ব্যবহার করবে
      if (commandName === config.name || config.aliases.includes(commandName)) {
          const args = text.split(/\s+/).slice(1);
          if (args.length > 0 && args[0].startsWith("http")) {
              text = args[0]; // কমান্ডের আর্গুমেন্ট থেকে লিংক নেওয়া
          } else {
              return; // লিংক ছাড়া শুধু কমান্ড হলে উপেক্ষা করা
          }
      } else {
          return; // অন্য কমান্ড হলে উপেক্ষা করা
      }
    }

    if (!text || !text.startsWith("http")) return;

    const waitMsg = await bot.sendMessage(
        chatId,
        "⏳ স্বয়ংক্রিয় ডাউনলোড প্রক্রিয়া চলছে...",
        { reply_to_message_id: messageId }
    );
    const waitMsgId = waitMsg.message_id;

    try {
      const res = await alldown(text);
      const { high, title } = res.data;

      const vidResponse = await axios.get(high, { responseType: 'stream' });
      const videoStream = vidResponse.data;

      const caption = `✅ *ডাউনলোড সফল* 🎬\n*Title:* ${title}`;

      const replyMarkup = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 Bot Owner', url: 'https://t.me/LIKHONAHMED009' }],
          ],
        },
      };

      await bot.deleteMessage(chatId, waitMsgId);

      await bot.sendVideo(chatId, videoStream, {
        caption: caption,
        parse_mode: 'Markdown',
        reply_to_message_id: messageId,
        ...replyMarkup,
      });

    } catch (error) {
      console.error('❌ Error in alldown handleMessage:', error.message);
      
      await bot.editMessageText(
        '❌ স্বয়ংক্রিয়ভাবে ডাউনলোড করতে ব্যর্থ হয়েছে। লিংকটি যাচাই করুন বা পরে আবার চেষ্টা করুন।',
        {
          chat_id: chatId,
          message_id: waitMsgId
        }
      );
    }
  },
};
