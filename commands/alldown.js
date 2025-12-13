const axios = require('axios');
const { alldown } = require('nayan-media-downloaders');

module.exports = {
  config: {
    name: "alldown",
    credits: "LIKHON X TISHA",
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
        `❌ Uses: ${global.PREFIX}alldown <link>`,
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
      
      if (commandName === config.name || config.aliases.includes(commandName)) {
          const args = text.split(/\s+/).slice(1);
          if (args.length > 0 && args[0].startsWith("http")) {
              text = args[0]; 
          } else {
              return; 
          }
      } else {
          return; 
      }
    }

    if (!text || !text.startsWith("http")) return;

    const waitMsg = await bot.sendMessage(
        chatId,
        "⏳ Downloading Please Wait...!",
        { reply_to_message_id: messageId }
    );
    const waitMsgId = waitMsg.message_id;

    try {
      const res = await alldown(text);
      const { high, title } = res.data;

      const vidResponse = await axios.get(high, { responseType: 'stream' });
      const videoStream = vidResponse.data;

      const caption = `🎬 *Title:* ${title}`;

      const replyMarkup = {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 𝐁𝐎𝐓 𝐎𝐖𝐍𝐄𝐑', url: 'https://t.me/LIKHONAHMED009' }],
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
        '❌ 𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐚𝐮𝐭𝐨𝐦𝐚𝐭𝐢𝐜𝐚𝐥𝐥𝐲. 𝐏𝐥𝐞𝐚𝐬𝐞 𝐯𝐞𝐫𝐢𝐟𝐲 𝐭𝐡𝐞 𝐥𝐢𝐧𝐤 𝐨𝐫 𝐭𝐫𝐲 𝐚𝐠𝐚𝐢𝐧 𝐥𝐚𝐭𝐞𝐫.',
        {
          chat_id: chatId,
          message_id: waitMsgId
        }
      );
    }
  },
};
