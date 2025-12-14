const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports.config = {
    name: "spam",
    credits: "LIKHON AHMED",
    aliases: ["flood"],
    version: "1.0.0",
    permission: 0,
    prefix: true,
    description: "Sends a specified message a certain number of times.",
    category: "fun",
    usages: "/spam [message] [count]",
    cooldowns: 0,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    if (args.length < 2) {
        return bot.sendMessage(chatId, "⚠️ দয়া করে মেসেজ এবং কতবার পাঠাতে চান সেই সংখ্যাটি দিন।\n\nব্যবহার: `/spam ✨🌷💕 10`", { reply_to_message_id: messageId });
    }

    const count = parseInt(args[args.length - 1]);
    const content = args.slice(0, args.length - 1).join(" ");
    
    if (isNaN(count) || count <= 0) {
        return bot.sendMessage(chatId, "❌ কতবার পাঠাতে চান, সেই সংখ্যাটি দিন।", { reply_to_message_id: messageId });
    }
    
    const maxCount = 20;
    if (count > maxCount) {
        return bot.sendMessage(chatId, `⚠️ স্প্যাম সংখ্যা ${maxCount}-এর বেশি হতে পারবে না।`, { reply_to_message_id: messageId });
    }
    
    for (let i = 0; i < count; i++) {
        try {
            await bot.sendMessage(chatId, content);
            await sleep(500); 
        } catch (error) {
            await bot.sendMessage(chatId, `❌ একটি মেসেজ পাঠাতে ব্যর্থ হয়েছে (Iteration ${i + 1})। টেলিগ্রামের Rate Limit এর কারণে বাকি পাঠানো বন্ধ করা হলো।`, { reply_to_message_id: messageId });
            break;
        }
    }
};
