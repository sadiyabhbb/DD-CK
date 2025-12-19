const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports.config = {
  name: "bdsex",
  version: "1.0.5",
  credits: "LIKHON AHMED",
  permission: 0,
  prefix: true,
  description: "Send a random image from JSON",
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
  } catch {
    return bot.sendMessage(chatId, "❌ Unable to read bdsex.json!", {
      reply_to_message_id: messageId,
    });
  }

  if (!Array.isArray(links) || links.length === 0) {
    return bot.sendMessage(chatId, "⚠️ No links found in the JSON file!", {
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
        caption: "🖼️ LewRa 🙊🔥",
        reply_to_message_id: messageId,
      });
    } else {
      await bot.sendPhoto(chatId, imageLink, {
        caption: "🖼️ LewRa Ne 🙊🔥",
        reply_to_message_id: messageId,
      });
    }
  } catch {
    return bot.sendMessage(chatId, `❌ Failed to send image\n${imageLink}`, {
      reply_to_message_id: messageId,
    });
  }
};
