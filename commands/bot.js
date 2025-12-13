const axios = require("axios");

// নতুন সিম API URL
const SIM_API_URL = "http://65.109.80.126:20392/sim";

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
async function handleAIChat(bot, chatId, messageId, usermsg, isReplyHandler = false) {
    if (!usermsg) {
        return bot.sendMessage(
            chatId,
            getRandomGreeting(),
            { reply_to_message_id: messageId }
        );
    }
    
    // API কল
    try {
        const response = await axios.get(
            `${SIM_API_URL}?type=ask&ask=${encodeURIComponent(usermsg)}`
        );

        const replyText = response.data.data?.msg || "🤖 আমি বুঝতে পারিনি, বা API রেসপন্স দেয়নি।";

        const sentMessage = await bot.sendMessage(
            chatId, 
            replyText, 
            { reply_to_message_id: messageId }
        );

        // যদি কমান্ড মোড থেকে আসে, তবে কনভারসেশন চালু করার জন্য রিপ্লাই হ্যান্ডলার সেট করা হবে।
        if (!isReplyHandler) {
            if (!global.activeReplies) global.activeReplies = {};
            
            // মেসেজ আইডি দিয়ে রিপ্লাই হ্যান্ডলার সেভ করা
            global.activeReplies[sentMessage.message_id] = {
                command: "bot", 
                authorId: msg.from.id, 
                threadId: chatId, 
                expires: Date.now() + 60000 // 60 সেকেন্ড পর অটোমেটিক এক্সপায়ার হবে
            };
        }

    } catch (err) {
        console.error("❌ Simsimi API error:", err.message);
        return bot.sendMessage(
            chatId, 
            "❌ AI API বর্তমানে কাজ করছে না, অনুগ্রহ করে পরে চেষ্টা করুন।",
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
  description: "AI Chat using Simsimi API with conversation mode.",
  tags: ["ai", "chat"]
};

// 1. প্রিফিক্স সহ কমান্ড ট্রিগার হলে এই ফাংশনটি রান হবে (/bot)
module.exports.run = async (bot, msg) => {
    const commandName = msg.text.split(" ")[0].toLowerCase().replace(global.PREFIX, "");
    const usermsg = msg.text.substring(msg.text.indexOf(commandName) + commandName.length).trim();
    
    await handleAIChat(bot, msg.chat.id, msg.message_id, usermsg);
};


// 2. মেসেজ হ্যান্ডলার, যা প্রিফিক্স ছাড়া মেসেজ (শুধু "Bot") হ্যান্ডেল করবে
module.exports.handleMessage = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const text = msg.text.trim();
    
    // কনভারসেশন মোড হ্যান্ডলিং (যদি ইউজার বটের মেসেজ রিপ্লাই করে)
    if (msg.reply_to_message && global.activeReplies && global.activeReplies[msg.reply_to_message.message_id]) {
        const replyHandler = global.activeReplies[msg.reply_to_message.message_id];
        
        // নিশ্চিত করুন এটি এই কমান্ডের জন্য এবং রিপ্লাইকারী সঠিক ইউজার কিনা
        if (replyHandler.command === "bot") {
            // যদি এটি একটি নতুন চ্যাট হয়, তবে পুরনো হ্যান্ডলার মুছে দিন
            delete global.activeReplies[msg.reply_to_message.message_id];
            
            // কনভারসেশন চালিয়ে যান
            return handleAIChat(bot, chatId, messageId, text, true);
        }
    }


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

