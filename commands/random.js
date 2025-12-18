const axios = require("axios");

module.exports.config = {
  name: "random",
  aliases: ["rndm"],
  version: "1.0.5",
  permission: 0,
  prefix: true,
  category: "video",
  credits: "LIKHON AHMED",
  description: "Fetches a random video or a video based on a query.",
  usages: "random or random <query>",
  cooldowns: 2,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const query = args.join(" ");

    try {
        const githubRes = await axios.get("https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/main/api.json");
        const apiBaseURL = githubRes.data.api;

        const waitMsg = await bot.sendMessage(chatId, "⏳ Processing your video...", { reply_to_message_id: messageId });

        let videoData;
        let totalVideos = "1";

        if (!query) {
            const res = await axios.get(`${apiBaseURL}/video/mixvideo`);
            videoData = res.data.url; 
            totalVideos = "Mix API";
        } else {
            const res = await axios.get(`${apiBaseURL}/random?name=${encodeURIComponent(query)}`);
            videoData = res.data.data;
        }

        if (videoData && videoData.url) {
            await bot.sendVideo(chatId, videoData.url, {
                caption: `${videoData.cp || ""}\n\n𝐓𝐨𝐭𝐚𝐥 𝐕𝐢𝐝𝐞𝐨𝐬: [${totalVideos}]\n𝐀𝐝𝐝𝐞𝐝 𝐁𝐲: [${videoData.name || "N/A"}]`,
                reply_to_message_id: messageId
            });
            await bot.deleteMessage(chatId, waitMsg.message_id);
        } else {
            await bot.editMessageText("❌ No video found for this query.", {
                chat_id: chatId,
                message_id: waitMsg.message_id
            });
        }

    } catch (error) {
        console.error("Error in random command:", error.message);
        bot.sendMessage(chatId, "❌ Failed to fetch video. The API might be down or the query is invalid.");
    }
};
