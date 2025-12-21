const axios = require("axios");

module.exports.config = {
  name: "api",
  aliases: ["testapi", "apitest"],
  version: "1.0.0",
  permission: 2,
  prefix: true,
  category: "utility",
  credits: "LIKHON AHMED",
  description: "Test API endpoints with GET method",
  usages: "api [API_URL]",
  cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const apiUrl = args[0];

    if (!apiUrl) {
        return bot.sendMessage(chatId, "⚠️ Please provide an API URL.", { reply_to_message_id: messageId });
    }

    if (!apiUrl.startsWith("http")) {
        return bot.sendMessage(chatId, "❌ Invalid URL. Please provide a full URL (http/https).", { reply_to_message_id: messageId });
    }

    const waitMsg = await bot.sendMessage(chatId, " Testing API...", { reply_to_message_id: messageId });

    try {
        const response = await axios.get(apiUrl, { 
            responseType: 'arraybuffer',
            headers: {
                'Accept': '*/*'
            }
        });

        const contentType = response.headers['content-type'];

        if (contentType && (contentType.includes('application/json') || contentType.includes('text/plain'))) {
            const dataString = Buffer.from(response.data).toString('utf-8');
            try {
                const jsonData = JSON.parse(dataString);
                const formattedJson = JSON.stringify(jsonData, null, 2);
                
                if (formattedJson.length > 4000) {
                    return bot.sendMessage(chatId, "📝 Result is too long, sending as a file...");
                }

                await bot.editMessageText(`\n\`\`\`json\n${formattedJson}\n\`\`\``, {
                    chat_id: chatId,
                    message_id: waitMsg.message_id,
                    parse_mode: 'Markdown'
                });
            } catch (e) {
                await bot.editMessageText(`\n${dataString}`, {
                    chat_id: chatId,
                    message_id: waitMsg.message_id
                });
            }
        } 
        else if (contentType && contentType.includes('image')) {
            await bot.sendPhoto(chatId, Buffer.from(response.data), {
                caption: `✅ Image received from API`,
                reply_to_message_id: messageId
            });
            await bot.deleteMessage(chatId, waitMsg.message_id);
        }
        else {
            await bot.sendDocument(chatId, Buffer.from(response.data), {
                caption: `✅ File received from API`,
                reply_to_message_id: messageId
            }, { filename: 'api_result' });
            await bot.deleteMessage(chatId, waitMsg.message_id);
        }

    } catch (error) {
        bot.editMessageText(`❌ **Error:** ${error.message}`, {
            chat_id: chatId,
            message_id: waitMsg.message_id
        });
    }
};
