const axios = require('axios');
const path = require('path');

module.exports.config = {
    name: "pp2",
    credits: "LIKHON AHMED",
    aliases: ["fbpp", "fbpfp"],
    prefix: true,
    permission: 0, 
    description: "Fetches the profile picture of a Facebook user using their UID.",
    tags: ["media", "facebook"]
};

const FB_AVATAR_URL = (uid) => `https://graph.facebook.com/${uid}/picture?type=large&redirect=false`;

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    const targetUid = args[0]; 

    if (!targetUid || isNaN(targetUid)) {
        const usageMessage = `
❌ Invalid Input.
Please provide a valid Facebook User ID (UID).
Usage: \`${global.PREFIX}pp2 [Facebook UID]\`
Example: \`${global.PREFIX}pp2 100000000000000\`
        `;
        return bot.sendMessage(chatId, usageMessage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }

    try {
        const response = await axios.get(FB_AVATAR_URL(targetUid));
        
        const imageUrl = response.data.data.url;

        if (!imageUrl) {
            return bot.sendMessage(chatId, `❌ Could not find a profile picture URL for UID: ${targetUid}.`, { reply_to_message_id: messageId });
        }
        
        const caption = `
👤 **Facebook User ID (UID):** \`${targetUid}\`
🖼️ **Status:** Fetched successfully.
        `;
        
        await bot.sendPhoto(chatId, imageUrl, { 
            caption: caption, 
            parse_mode: 'Markdown', 
            reply_to_message_id: messageId 
        });

    } catch (error) {
        console.error(`❌ FB PP fetch error for ${targetUid}:`, error.message);
        
        let errorMessage = `❌ Failed to fetch Facebook profile picture for UID \`${targetUid}\`.`;
        
        if (error.response && error.response.status === 400) {
             errorMessage += `\n*Note: The UID might be incorrect or the profile might be restricted.*`;
        }
        
        bot.sendMessage(chatId, errorMessage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }
};
