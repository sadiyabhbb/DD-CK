const path = require('path');
const { exec } = require('child_process');

module.exports.config = {
    name: "restart",
    credits: "LIKHON AHMED",
    aliases: ["reboot"],
    version: "1.0.0",
    permission: 2, 
    prefix: true,
    description: "Restarts the bot process.",
    category: "system",
    usages: "/restart",
    cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    if (!global.CONFIG.BOT_SETTINGS.ADMINS.includes(msg.from.id.toString())) {
        return bot.sendMessage(chatId, "❌ শুধুমাত্র অ্যাডমিন বা বট মালিক এই কমান্ডটি ব্যবহার করতে পারবে।", { reply_to_message_id: messageId });
    }

    try {
        await bot.sendMessage(chatId, 
            "🔄 **রিস্টার্ট করা হচ্ছে...**\n" +
            "বট প্রক্রিয়াটি পুনরায় চালু হচ্ছে। দয়া করে এক মিনিট অপেক্ষা করুন।", 
            { reply_to_message_id: messageId, parse_mode: 'Markdown' }
        );

        // 🌟 আসল রিস্টার্ট লজিক 🌟
        // ১. ক্যাশে সাফ করা (যদি থাকে)
        // ২. process.exit() ব্যবহার করে প্রক্রিয়াটি বন্ধ করা (হোস্টিং প্ল্যাটফর্ম এটি পুনরায় চালু করবে)
        
        // Node.js ক্যাশে সাফ করা (যদি দরকার হয়)
        Object.keys(require.cache).forEach(key => {
            if (!key.includes('node_modules')) {
                delete require.cache[key];
            }
        });

        // 2 সেকেন্ডের মধ্যে প্রক্রিয়াটি বন্ধ করুন
        setTimeout(() => {
            process.exit(1); 
        }, 2000); 

    } catch (error) {
        console.error("❌ RESTART COMMAND ERROR:", error.message);
        return bot.sendMessage(chatId, 
            "❌ রিস্টার্টের সময় একটি ত্রুটি হয়েছে। লগ চেক করুন বা ম্যানুয়ালি রিস্টার্ট করুন।", 
            { reply_to_message_id: messageId }
        );
    }
};
