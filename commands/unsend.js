const path = require('path');

module.exports.config = {
    name: "unsend",
    credits: "LIKHON AHMED",
    aliases: ["delete", "del"],
    prefix: true,
    permission: 1,
    description: "Deletes a message using command.",
    tags: ["utility", "admin"]
};

async function deleteMessage(bot, chatId, messageId, senderId) {
    try {
        await bot.deleteMessage(chatId, messageId);
        return true;
    } catch (e) {
        console.error(`❌ Failed to delete message ${messageId} in chat ${chatId}:`, e.message);
        if (senderId) {
             const errorMsg = "❌ মেসেজটি ডিলিট করা সম্ভব হয়নি। নিশ্চিত করুন যে বটটির 'Delete Messages' পারমিশন আছে এবং মেসেজটি খুব পুরনো নয়।";
             bot.sendMessage(chatId, errorMsg, { reply_to_message_id: messageId });
        }
        return false;
    }
}

module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const senderId = msg.from.id;

    const targetMessage = msg.reply_to_message;

    if (!targetMessage) {
        return bot.sendMessage(chatId, "⚠️ একটি মেসেজে রিপ্লাই করে /unsend দিন, যা আপনি ডিলিট করতে চান।", { reply_to_message_id: messageId });
    }
    
    await bot.deleteMessage(chatId, messageId).catch(err => console.error("Self-delete error:", err.message));

    await deleteMessage(bot, chatId, targetMessage.message_id, senderId);
};
