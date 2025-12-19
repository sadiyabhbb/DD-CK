const path = require('path');

module.exports.config = {
    name: "unsend",
    credits: "LIKHON AHMED",
    aliases: ["delete", "del"],
    prefix: true,
    permission: 1,
    description: "Deletes a message using this command.",
    tags: ["utility", "admin"]
};

async function deleteMessage(bot, chatId, messageId, senderId) {
    try {
        await bot.deleteMessage(chatId, messageId);
        return true;
    } catch (e) {
        console.error(`❌ Failed to delete message ${messageId} in chat ${chatId}:`, e.message);
        if (senderId) {
             const errorMsg = "❌ Could not delete the message. Make sure the bot has 'Delete Messages' permission and the message is not too old.";
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
        return bot.sendMessage(chatId, "⚠️ Please reply to the message you want to delete and then use /unsend.", { reply_to_message_id: messageId });
    }
    
    await bot.deleteMessage(chatId, messageId).catch(err => console.error("Self-delete error:", err.message));

    await deleteMessage(bot, chatId, targetMessage.message_id, senderId);
};
