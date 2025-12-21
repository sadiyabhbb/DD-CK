const axios = require('axios');

module.exports.config = {
    name: "pfp",
    credits: "LIKHON AHMED",
    aliases: ["fbpp", "fbpfp"],
    prefix: true,
    version: "1.1.0",
    permission: 0, 
    description: "Fetches the high-quality profile picture of a Facebook user using UID.",
    category: "media",
    usages: "/pfp [Facebook UID]",
    cooldowns: 5
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const targetUid = args[0]; 

    // Input Validation
    if (!targetUid || isNaN(targetUid)) {
        const usageMessage = "❌ **Invalid Input**\nPlease provide a valid Facebook UID.\nExample: `/pp2 100082724458368`";
        return bot.sendMessage(chatId, usageMessage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }

    try {
        // High Quality Profile Picture Link Generation
        // redirect=1 use korle direct image file pawa jay
        const imageUrl = `https://graph.facebook.com/${targetUid}/picture?width=1000&height=1000&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

        const caption = `👤 **Facebook Profile Picture**\n🆔 **UID:** \`${targetUid}\`\n✅ **Status:** Fetched successfully.`;

        // Bot will send the photo directly from the URL
        await bot.sendPhoto(chatId, imageUrl, { 
            caption: caption, 
            parse_mode: 'Markdown', 
            reply_to_message_id: messageId 
        });

    } catch (error) {
        console.error(`❌ FB PP fetch error for ${targetUid}:`, error.message);
        
        const errorMessage = `❌ **Error:** Failed to fetch profile picture.\n\n*Possible Reasons:*\n1. Incorrect UID.\n2. Profile is locked or restricted.\n3. Facebook server blocked the request.`;
        
        bot.sendMessage(chatId, errorMessage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }
};
