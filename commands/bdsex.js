const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { Readable } = require('stream');

module.exports.config = {
  name: "bdsex",
  version: "1.0.1",
  credits: "LIKHON AHMED",
  permission: 2, 
  prefix: true,
  description: "Sends a random image link from a local JSON file.",
  category: "utility",
  usages: "/rosmalai",
  cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    const jsonPath = path.join(__dirname, "assets_json/rosmalai.json");
    
    if (!fs.existsSync(jsonPath)) {
        return bot.sendMessage(
            chatId, 
            "❌ ফাইল খুঁজে পাওয়া যায়নি! নিশ্চিত করুন `assets_json/rosmalai.json` ফাইলটি বিদ্যমান।", 
            { reply_to_message_id: messageId }
        );
    }

    let links;
    try {
        links = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch (e) {
        return bot.sendMessage(
            chatId, 
            "❌ JSON ফাইলটি ভুল ফরম্যাটে আছে।", 
            { reply_to_message_id: messageId }
        );
    }

    if (!Array.isArray(links) || links.length === 0) {
        return bot.sendMessage(
            chatId, 
            "⚠️ JSON ফাইলে কোনো ছবির লিঙ্ক নেই।", 
            { reply_to_message_id: messageId }
        );
    }

    const imageLink = links[Math.floor(Math.random() * links.length)];
    
    try {
        const response = await axios.get(imageLink, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        const imageStream = Readable.from(buffer);

        await bot.sendPhoto(
            chatId,
            imageStream,
            {
                caption: `এখানে আপনার র্যান্ডম Rosmalai ছবি! \nলিঙ্ক: ${imageLink}`,
                reply_to_message_id: messageId
            }
        );

    } catch (error) {
        console.error("❌ Rosmalai Image Error:", error.message);
        return bot.sendMessage(
            chatId, 
            `❌ ছবিটি লোড করা সম্ভব হয়নি। লিঙ্কে সমস্যা থাকতে পারে: ${imageLink}`, 
            { reply_to_message_id: messageId }
        );
    }
};
