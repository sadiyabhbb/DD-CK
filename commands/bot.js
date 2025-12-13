const axios = require("axios");

module.exports.config = {
  name: "bot",
  credits: "LIKHON X TISHA",
  aliases: ["sim"],
  prefix: true, 
  permission: 0,
  description: "AI Chat using Simsimi API with conversation mode.",
  tags: ["ai", "chat"]
};

const SIM_API_URL = "http://65.109.80.126:20392/sim";

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

async function sendGreetingAndSetHandler(bot, msg) {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    const sentMessage = await bot.sendMessage(
        chatId,
        getRandomGreeting(),
        { reply_to_message_id: messageId }
    );

    if (!global.activeReplies) global.activeReplies = {};
    
    global.activeReplies[sentMessage.message_id] = {
        command: "bot", 
        authorId: msg.from.id, 
        chatId: chatId, 
        expires: Date.now() + 60000 
    };
}

async function handleAIChat(bot, msg, usermsg) {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    if (!usermsg) {
        return sendGreetingAndSetHandler(bot, msg);
    }
    
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


module.exports.run = async (bot, msg) => {
    const commandName = msg.text.split(" ")[0].toLowerCase().replace(global.PREFIX, "");
    const usermsg = msg.text.substring(msg.text.indexOf(commandName) + commandName.length).trim();
    
    if (!usermsg) {
        return sendGreetingAndSetHandler(bot, msg);
    }

    await handleAIChat(bot, msg, usermsg);
};

module.exports.handleMessage = async (bot, msg) => {
    const text = msg.text ? msg.text.trim() : "";

    if (!text) return; 

    if (msg.reply_to_message && global.activeReplies) {
        const repliedToMsgId = msg.reply_to_message.message_id;
        const replyHandler = global.activeReplies[repliedToMsgId];
        
        if (replyHandler && replyHandler.command === "bot") {
            delete global.activeReplies[repliedToMsgId]; 
            
            return handleAIChat(bot, msg, text);
        }
    }

    if (text.toLowerCase() === "bot") {
        return sendGreetingAndSetHandler(bot, msg);
    }
    
    if (text.toLowerCase().startsWith("bot ")) {
        const usermsg = text.substring(4).trim(); 
        
        if (!usermsg) {
             return sendGreetingAndSetHandler(bot, msg);
        }

        await handleAIChat(bot, msg, usermsg);
    }
};
