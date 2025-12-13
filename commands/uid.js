const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports.config = {
  name: "uid",
  credits: "LIKHON X TISHA (Adapted by Gemini)",
  aliases: ["id", "userid", "whois"],
  prefix: true,
  permission: 0,
  description: "Displays user details and profile picture.",
  tags: ["utility", "info"]
};

module.exports.run = async (bot, msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  let targetUser;
  let targetUserId;
  
  if (msg.reply_to_message) {
    targetUser = msg.reply_to_message.from;
  } else {
    targetUser = msg.from;
  }

  if (!targetUser) {
    return bot.sendMessage(
      chatId,
      "❌ ইউজার তথ্য খুঁজে পাওয়া যায়নি।",
      { reply_to_message_id: messageId }
    );
  }

  targetUserId = targetUser.id;
  const userName = targetUser.first_name || "N/A";
  const userUsername = targetUser.username || "N/A"; 

  const responseText = 
    `👤 𝐔𝐬𝐞𝐫 𝐈𝐧𝐟𝐨:\n` +
    ` 🪪 𝐍𝐚𝐦𝐞: ${userName}\n` +
    ` 🔗 𝐔𝐬𝐞𝐫𝐧𝐚𝐦𝐞: ${userUsername}\n` +
    ` 🆔 𝐔𝐢𝐝: \`${targetUserId}\``;

  let fileId = null;
  
  try {
    const photos = await bot.getUserProfilePhotos(targetUserId, { limit: 1 });
    
    if (photos.total_count > 0) {
      // সবচেয়ে বড় ছবিটির ফাইল আইডি নেওয়া হলো
      const photoFile = photos.photos[0].pop(); 
      fileId = photoFile.file_id;
    }

    if (fileId) {
      // ফাইল স্ট্রিম ব্যবহার করে ছবি পাঠানো
      // এটি getFileLink এর চেয়ে অনেক বেশি নির্ভরযোগ্য
      const fileStream = bot.getFileStream(fileId);
      
      await bot.sendPhoto(
        chatId,
        fileStream, // স্ট্রিম পাস করা হলো
        {
          caption: responseText,
          reply_to_message_id: messageId,
          parse_mode: "Markdown"
        }
      );
    } else {
      // ছবি না পেলে শুধু টেক্সট পাঠানো
      await bot.sendMessage(
        chatId,
        responseText + `\n\n(⚠️ প্রোফাইল পিকচার খুঁজে পাওয়া যায়নি)`,
        {
          reply_to_message_id: messageId,
          parse_mode: "Markdown"
        }
      );
    }
    
  } catch (error) {
    console.error("Error fetching or sending user info:", error.message);
    
    // ব্যর্থ হলে শুধু আইডি ও টেক্সট আউটপুট
    bot.sendMessage(
      chatId, 
      responseText + `\n\n(❌ ইউজার তথ্য বা ছবি দেখাতে ব্যর্থ)`, 
      { 
        reply_to_message_id: messageId,
        parse_mode: "Markdown"
      }
    );
  }
};
