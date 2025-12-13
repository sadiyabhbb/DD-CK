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

// *** নতুন ফাংশন: গ্রিটিং পাঠানো এবং রিপ্লাই হ্যান্ডলার সেট করা ***
async function sendGreetingAndSetHandler(bot, msg) {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    const sentMessage = await bot.sendMessage(
        chatId,
        getRandomGreeting(),
        { reply_to_message_id: messageId }
    );

    // রিপ্লাই হ্যান্ডলার সেট করা
    if (!global.activeReplies) global.activeReplies = {};
    
    global.activeReplies[sentMessage.message_id] = {
        command: "bot", 
        authorId: msg.from.id, 
        chatId: chatId, 
        expires: Date.now() + 60000 // 60 সেকেন্ড পর এক্সপায়ার হবে
    };
}


// AI চ্যাট লজিক
async function handleAIChat(bot, msg, usermsg) {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    if (!usermsg) {
        // যদি AI চ্যাট ফাংশনে খালি মেসেজ আসে, তবে গ্রিটিং ফাংশন কল করবে।
        return sendGreetingAndSetHandler(bot, msg);
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

        // কনভারসেশন চালিয়ে যাওয়ার জন্য রিপ্লাই হ্যান্ডলার সেট করা
        if (!global.activeReplies) global.activeReplies = {};
        
        global.activeReplies[sentMessage.message_id] = {
            command: "bot", 
            authorId: msg.from.id, 
            chatId: chatId, 
            expires: Date.now() + 60000 
        };
        
    } catch (err) {
        console.error("❌ Simsimi API error:", err.message);
        
        return bot.sendMessage(
            chatId, 
            "⚠️ এআই বর্তমানে ব্যস্ত অথবা কাজ করছে না।",
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
    
    // আর্গুমেন্ট না থাকলে নতুন হেল্পার ফাংশন ব্যবহার
    if (!usermsg) {
        return sendGreetingAndSetHandler(bot, msg);
    }

    await handleAIChat(bot, msg, usermsg);
};


// 2. মেসেজ হ্যান্ডলার, যা প্রিফিক্স ছাড়া মেসেজ এবং রিপ্লাই হ্যান্ডেল করবে
module.exports.handleMessage = async (bot, msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text.trim() : "";

    if (!text) return; 

    // --- কনভারসেশন মোড হ্যান্ডলিং (ইউজার রিপ্লাই করেছে) ---
    if (msg.reply_to_message && global.activeReplies) {
        const repliedToMsgId = msg.reply_to_message.message_id;
        const replyHandler = global.activeReplies[repliedToMsgId];
        
        if (replyHandler && replyHandler.command === "bot") {
            // ইউজার রিপ্লাই করলে পুরনো হ্যান্ডলারটি ডিলিট করা
            delete global.activeReplies[repliedToMsgId]; 
            
            // কনভারসেশন চালিয়ে যান
            return handleAIChat(bot, msg, text);
        }
    }


    // --- শুধুমাত্র "Bot" শব্দটি বা "Bot " দিয়ে শুরু হওয়া টেক্সট ---
    
    // শুধু "bot" (কেস ইনসেনসিটিভ)
    if (text.toLowerCase() === "bot") {
        return sendGreetingAndSetHandler(bot, msg);
    }
    
    // "Bot " দিয়ে শুরু হওয়া টেক্সট
    if (text.toLowerCase().startsWith("bot ")) {
        const usermsg = text.substring(4).trim(); 
        
        // আর্গুমেন্ট না থাকলে র্যান্ডম গ্রিটিং (এবং হ্যান্ডলার সেট)
        if (!usermsg) {
             return sendGreetingAndSetHandler(bot, msg);
        }

        await handleAIChat(bot, msg, usermsg);
    }
};
