const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { Readable } = require('stream');

module.exports.config = {
  name: "bdsex", // /random কমান্ডের জন্য নাম পরিবর্তন করা হলো
  version: "1.0.2",
  credits: "LIKHON AHMED modified for Local JSON by Gemini",
  permission: 0, // সর্বসাধারণের জন্য
  prefix: true,
  description: "Sends a random image link from a local random.json file.",
  category: "utility",
  usages: "/random",
  cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    // ফাইলপাথ: commands/ থেকে এক লেভেল উপরে (..) assets_json/random.json কে নির্দেশ করছে
    const jsonPath = path.join(__dirname, "..", "assets_json/bdsex.json");
    
    // 1. JSON ফাইল চেক এবং লোড করা
    if (!fs.existsSync(jsonPath)) {
        return bot.sendMessage(
            chatId, 
            "❌ ফাইল খুঁজে পাওয়া যায়নি! নিশ্চিত করুন রুট ফোল্ডারে `assets_json/random.json` ফাইলটি বিদ্যমান।", 
            { reply_to_message_id: messageId }
        );
    }

    let links;
    try {
        links = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch (e) {
        return bot.sendMessage(
            chatId, 
            "❌ JSON ফাইলটি ভুল ফরম্যাটে আছে। নিশ্চিত করুন এটি অ্যারে ([]) ফরম্যাটে আছে।", 
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

    // 2. র্যান্ডম লিঙ্ক নির্বাচন
    const imageLink = links[Math.floor(Math.random() * links.length)];
    
    const processingMessage = await bot.sendMessage(
        chatId, 
        `⏳ **র্যান্ডম ছবি লোড হচ্ছে...**`,
        { reply_to_message_id: messageId, parse_mode: 'Markdown' }
    );

    // 3. ছবি ডাউনলোড করে Telegram এ পাঠানো
    try {
        const response = await axios.get(imageLink, { 
            responseType: 'arraybuffer',
            timeout: 15000 // টাইমআউট সেট করা হয়েছে
        });
        const buffer = Buffer.from(response.data);
        const imageStream = Readable.from(buffer);

        await bot.sendPhoto(
            chatId,
            imageStream,
            {
                caption: `এখানে আপনার র্যান্ডম ছবি! \nলিঙ্ক: ${imageLink}`,
                reply_to_message_id: messageId
            }
        );

        await bot.deleteMessage(chatId, processingMessage.message_id).catch(() => {});

    } catch (error) {
        await bot.deleteMessage(chatId, processingMessage.message_id).catch(() => {});
        console.error("❌ Random Image Error:", error.message);
        return bot.sendMessage(
            chatId, 
            `❌ ছবিটি লোড করা সম্ভব হয়নি। লিঙ্কে সমস্যা থাকতে পারে: ${imageLink}`, 
            { reply_to_message_id: messageId }
        );
    }
};
