const axios = require("axios");

module.exports.config = {
  name: "tikdown",
  aliases: ["tiktok", "tk"],
  version: "1.2.2",
  permission: 0,
  prefix: true,
  category: "downloader",
  credits: "LIKHON AHMED",
  description: "Download TikTok videos or photo slides without buttons.",
  usages: "tikdown [link]",
  cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    let url = args[0] || (msg.reply_to_message ? msg.reply_to_message.text : null);

    if (!url || !url.includes("tiktok.com")) {
        return bot.sendMessage(chatId, "❌ Please provide a valid TikTok link.", { reply_to_message_id: messageId });
    }

    const waitMsg = await bot.sendMessage(chatId, "⏳ Processing...", { reply_to_message_id: messageId });

    try {
        const res = await axios.get(`https://nayan-video-downloader.vercel.app/tikdown?url=${encodeURIComponent(url)}`);
        const data = res.data.data;

        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
            const mediaGroup = data.images.map((imgUrl, index) => ({
                type: 'photo',
                media: imgUrl,
                caption: index === 0 ? "✅ Download Successful" : ""
            }));

            await bot.sendMediaGroup(chatId, mediaGroup, { reply_to_message_id: messageId });
            return bot.deleteMessage(chatId, waitMsg.message_id);
        } 
        
        else if (data.video) {
            await bot.sendVideo(chatId, data.video, {
                caption: "✅ Download Successful",
                reply_to_message_id: messageId
            });
            return bot.deleteMessage(chatId, waitMsg.message_id);
        } else {
            throw new Error("No media found");
        }

    } catch (error) {
        await bot.editMessageText("❌ Error downloading content.", { chat_id: chatId, message_id: waitMsg.message_id });
    }
};
