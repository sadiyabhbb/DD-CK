const path = require('path');

module.exports.config = {
    name: "pp",
    credits: "LIKHON AHMED",
    aliases: ["pfp", "profilepic"],
    prefix: true,
    permission: 0, 
    description: "Fetches the profile picture of the user, tagged user, or user ID.",
    tags: ["utility", "info"]
};

async function getUserIdFromMentionOrText(bot, msg, args) {
    const chatId = msg.chat.id;
    
    if (msg.reply_to_message) {
        return { userId: msg.reply_to_message.from.id, userName: msg.reply_to_message.from.first_name };
    }

    if (msg.entities && msg.entities.length > 0) {
        for (const entity of msg.entities) {
            if (entity.type === 'mention' && msg.text && msg.text.startsWith(global.PREFIX + 'pp')) {
            }
        }
    }
    
    if (args && args.length > 0) {
        const potentialId = parseInt(args[0]);
        if (!isNaN(potentialId)) {
            return { userId: potentialId, userName: potentialId };
        }
    }

    return { userId: msg.from.id, userName: msg.from.first_name };
}


module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    const { userId, userName } = await getUserIdFromMentionOrText(bot, msg, args);

    if (!userId) {
        return bot.sendMessage(chatId, "⚠️ I couldn't find a target user. Please provide a UID, @username, or reply to a message.", { reply_to_message_id: messageId });
    }

    try {
        const photos = await bot.getUserProfilePhotos(userId, { limit: 1 });
        
        if (photos.total_count === 0 || photos.photos.length === 0) {
            return bot.sendMessage(chatId, `❌ No profile picture found for user ${userName || userId}.`, { reply_to_message_id: messageId });
        }

        const largestPhoto = photos.photos[0].pop(); 
        const fileId = largestPhoto.file_id;

        const caption = `
👤 **User:** \`${userName || userId}\`
🖼️ **Status:** Current Profile Picture
        `;
        
        await bot.sendPhoto(chatId, fileId, { caption: caption, parse_mode: 'Markdown', reply_to_message_id: messageId });

    } catch (error) {
        console.error(`❌ PP fetch error for ${userId}:`, error.message);
        
        let errorMessage = `❌ Failed to fetch profile picture.`;
        
        if (error.message.includes('user not found')) {
             errorMessage = `❌ User ID ${userId} not found. Please ensure the ID is correct.`;
        }
        
        bot.sendMessage(chatId, errorMessage, { reply_to_message_id: messageId });
    }
};
