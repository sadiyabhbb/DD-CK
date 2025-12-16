const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { Readable } = require("stream");

module.exports.config = {
  name: "random",
  version: "1.0.4",
  credits: "LIKHON AHMED",
  permission: 0,
  prefix: true,
  description: "Sends a random image from random.json",
  category: "utility",
  usages: "/random",
  cooldowns: 5,
};

module.exports.run = async (bot, msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const jsonPath = path.join(__dirname, "..", "assets_json/random.json");

  const processing = await bot.sendMessage(
    chatId,
    "⏳ **র্যান্ডম ছবি লোড হচ্ছে...**",
    { reply_to_message_id: messageId, parse_mode: "Markdown" }
  );

  let links;
  try {
    links = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (e) {
    await bot.deleteMessage(chatId, processing.message_id).catch(() => {});
    return bot.sendMessage(chatId, "❌ random.json পড়া যাচ্ছে না!", {
      reply_to_message_id: messageId,
    });
  }

  if (!Array.isArray(links) || !links.length) {
    await bot.deleteMessage(chatId, processing.message_id).catch(() => {});
    return bot.sendMessage(chatId, "⚠️ JSON ফাঁকা!", {
      reply_to_message_id: messageId,
    });
  }

  const imageLink = links[Math.floor(Math.random() * links.length)];

  try {
    const res = await axios.get(imageLink, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const contentType = res.headers["content-type"] || "";

    // যদি সত্যিকারের image হয়
    if (contentType.startsWith("image/")) {
      const buffer = Buffer.from(res.data);
      await bot.sendPhoto(chatId, buffer, {
        caption: "🖼️ র্যান্ডম ছবি",
        reply_to_message_id: messageId,
      });
    } else {
      // direct image না হলে URL দিয়েই পাঠাও
      await bot.sendPhoto(chatId, imageLink, {
        caption: "🖼️ র্যান্ডম ছবি",
        reply_to_message_id: messageId,
      });
    }

    await bot.deleteMessage(chatId, processing.message_id).catch(() => {});
  } catch (err) {
    await bot.deleteMessage(chatId, processing.message_id).catch(() => {});
    return bot.sendMessage(
      chatId,
      `❌ ছবি পাঠানো যায়নি\nলিঙ্ক: ${imageLink}`,
      { reply_to_message_id: messageId }
    );
  }
};
