const axios = require("axios");

// গ্লোবাল API URL লোড করার জন্য
const API_URL_SOURCE = "https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/main/api.json";
let nayanApiUrl = null;

async function fetchNayanApiUrl() {
    if (nayanApiUrl) return nayanApiUrl;
    try {
        const response = await axios.get(API_URL_SOURCE);
        nayanApiUrl = response.data.api;
        return nayanApiUrl;
    } catch (err) {
        console.error("❌ Failed to fetch Nayan API URL:", err.message);
        return null;
    }
}

// র্যান্ডম মেসেজ দেওয়ার ফাংশন
function getRandomGreeting() {
    const greetings = [
        "আহ শুনা আমার তোমার অলিতে গলিতে উম্মাহ😇😘",
        "কি গো সোনা আমাকে ডাকছ কেনো",
        "বার বার আমাকে ডাকস কেন😡",
        "আহ শোনা আমার আমাকে এতো ডাকতাছো কেনো আসো বুকে আশো🥱",
        "হুম জান তোমার অইখানে উম্মমাহ😷😘",
        "আসসালামু আলাইকুম বলেন আপনার জন্য কি করতে পারি",
        "আমাকে এতো না ডেকে বস নয়নকে একটা গফ দে 🙄"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
}

// AI চ্যাট লজিক
async function handleAIChat(bot, chatId, messageId, usermsg) {
    const apiUrl = await fetchNayanApiUrl();
    if (!apiUrl) {
        return bot.sendMessage(
            chatId, 
            "❌ AI API URL লোড করতে ব্যর্থ।",
            { reply_to_message_id: messageId }
        );
    }

    try {
        const response = await axios.get(
            `${apiUrl}/sim?type=ask&ask=${encodeURIComponent(usermsg)}`
        );

        const replyText = response.data.data?.msg || "🤖 আমি বুঝতে পারিনি, বা API রেসপন্স দেয়নি।";

        return bot.sendMessage(
            chatId, 
            replyText, 
            { reply_to_message_id: messageId }
        );

    } catch (err) {
        console.log("❌ Bot API error:", err.message);
        return bot.sendMessage(
            chatId, 
            "❌ Bot API বর্তমানে কাজ করছে না, অনুগ্রহ করে পরে চেষ্টা করুন।",
            { reply_to_message_id: messageId }
        );
    }
}


module.exports.config = {
  name: "bot",
  credits: "LIKHON X TISHA (Adapted by Gemini)",
  aliases: ["sim"],
  prefix: true, 
  permission: 0,
  description: "AI Chat using Simsimi API (Telegram)",
  tags: ["ai", "chat"]
};

// প্রিফিক্স সহ কমান্ড ট্রিগার হলে এই ফাংশনটি রান হবে (/bot)
module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    const commandName = msg.text.split(" ")[0].toLowerCase().replace(global.PREFIX, "");
    const usermsg = msg.text.substring(msg.text.indexOf(commandName) + commandName.length).trim();
    
    if (!usermsg) {
        return bot.sendMessage(
            chatId,
            getRandomGreeting(),
            { reply_to_message_id: messageId }
        );
    }
    
    await handleAIChat(bot, chatId, messageId, usermsg);
};


// মেসেজ হ্যান্ডলার, যা প্রিফিক্স ছাড়া মেসেজ (শুধু "Bot") হ্যান্ডেল করবে
module.exports.handleMessage = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const text = msg.text.trim();
    
    // শুধুমাত্র "bot" শব্দটি (case insensitive) চেক করা হলো
    if (text.toLowerCase() === "bot") {
        return bot.sendMessage(
            chatId,
            getRandomGreeting(),
            { reply_to_message_id: messageId }
        );
    }
    
    // যদি কেউ "Bot" লেখার পরে কিছু লেখে, তবে তা AI চ্যাটের জন্য ব্যবহার করা হবে
    if (text.toLowerCase().startsWith("bot ")) {
        const usermsg = text.substring(4).trim(); // "bot " এর পরের অংশ
        
        if (!usermsg) {
             return bot.sendMessage(
                chatId,
                getRandomGreeting(),
                { reply_to_message_id: messageId }
            );
        }

        await handleAIChat(bot, chatId, messageId, usermsg);
    }
};
