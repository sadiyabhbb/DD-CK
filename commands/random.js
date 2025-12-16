const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports.config = {
  name: "bdsex",
  version: "1.0.5",
  credits: "LIKHON AHMED",
  permission: 0,
  prefix: true,
  description: "Send random image from json",
  category: "utility",
  usages: "/random",
  cooldowns: 5,
};

module.exports.run = async (bot, msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const jsonPath = path.join(__dirname, "..", "assets_json/bdsex.json");

  let links;
  try {
    links = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (e) {
    return bot.sendMessage(chatId, "❌ bdsex.json পড়া যাচ্ছে না!", {
      reply_to_message_id: messageId,
    });
  }

  if (!Array.isArray(links) || links.length === 0) {
    return bot.sendMessage(chatId, "⚠️ JSON ফাইলে কোনো লিঙ্ক নেই!", {
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

    const type = res.headers["content-type"] || "";

    if (type.startsWith("image/")) {
      await bot.sendPhoto(chatId, Buffer.from(res.data), {
        caption: "🖼️ BDSex",
        reply_to_message_id: messageId,
      });
    } else {
      await bot.sendPhoto(chatId, imageLink, {
        caption: "🖼️ BDSex",
        reply_to_message_id: messageId,
      });
    }
  } catch (err) {
    return bot.sendMessage(chatId, `❌ ছবি পাঠানো যায়নি\n${imageLink}`, {
      reply_to_message_id: messageId,
    });
  }
};
