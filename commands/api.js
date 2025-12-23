const axios = require("axios");

module.exports.config = {
    name: "api",
    credits: "LIKHON AHMED",
    aliases: ["apitest", "fetch"],
    prefix: true,
    permission: 0,
    description: "যেকোনো GET API টেস্ট করার জন্য এই কমান্ড ব্যবহার করুন",
    tags: ["utility", "api", "dev"]
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const senderName = msg.from.first_name || "ইউজার";

    // ১. আর্গুমেন্ট চেক
    if (args.length === 0) {
        const usage = `👋 হ্যালো ${senderName}!

❌ আপনি কোনো API URL দেননি।

📌 ব্যবহার:
/api <your-api-url>`;

        return bot.sendMessage(chatId, usage, {
            reply_to_message_id: messageId
        });
    }

    const apiUrl = args[0];

    try {
        // ২. API কল
        const response = await axios.get(apiUrl);

        // ৩. JSON ফরম্যাটিং (indentation ২ স্পেস দেওয়া হয়েছে)
        let data = JSON.stringify(response.data, null, 2);

        // ৪. মেসেজ লেন্থ চেক (টেলিগ্রাম লিমিট ৪০০০ ক্যারেক্টার)
        if (data.length > 3000) {
            data = data.slice(0, 3000) + "\n\n... (Output too long, trimmed)";
        }

        const replyText = `✅ **API Test Successful!**\n\n🔗 **URL:** \`${apiUrl}\`\n\n📥 **Response:**\n\`\`\`json\n${data}\n\`\`\``;

        await bot.sendMessage(chatId, replyText, {
            reply_to_message_id: messageId,
            parse_mode: "Markdown"
        });

    } catch (error) {
        // এরর হ্যান্ডলিং
        let errorData = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
        
        const errMsg = `❌ **API Test Failed!**\n\n🔗 **URL:** \`${apiUrl}\`\n\n⚠️ **Error:**\n\`\`\`json\n${errorData}\n\`\`\``;

        await bot.sendMessage(chatId, errMsg, {
            reply_to_message_id: messageId,
            parse_mode: "Markdown"
        });
    }
};
