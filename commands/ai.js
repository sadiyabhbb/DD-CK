const axios = require("axios");

module.exports.config = {
  name: "ai",
  credits: "LIKHON X TISHA",
  aliases: ["gpt", "gpt4"],
  prefix: true,
  permission: 0,
  description: "Chat with GPT AI using an external API.",
  tags: ["ai", "chat"],
};

module.exports.run = async (bot, msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  let args = msg.text.split(/\s+/).slice(1);
  let text = args.join(" ").trim();

  if (!text) {
    if (msg.reply_to_message && msg.reply_to_message.text) {
      text = msg.reply_to_message.text.trim();
    } else {
      return bot.sendMessage(
        chatId,
        `❌ Please provide a message for the AI.\nUsage: ${global.PREFIX}ai <your question>`,
        { reply_to_message_id: messageId }
      );
    }
  }

  const waitingMessage = await bot.sendMessage(
    chatId,
    "💬 AI is generating a response, please wait...",
    { reply_to_message_id: messageId }
  );
  const waitingMessageId = waitingMessage.message_id;

  try {
    const apiConfigUrl =
      "https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/refs/heads/main/api.json";
    const apiConfigResponse = await axios.get(apiConfigUrl);
    const apis = apiConfigResponse.data;

    let baseUrl;
    let endpoint;

    if (apis.gpt4) {
      baseUrl = apis.gpt4;
      endpoint = "gpt4";
    } else if (apis.api) {
      baseUrl = apis.api;
      endpoint = "nayan/gpt3";
    } else {
      throw new Error("API base URL is missing in the configuration.");
    }

    const fullApiUrl = `${baseUrl}/${endpoint}?text=${encodeURIComponent(
      text
    )}`;
    const response = await axios.get(fullApiUrl);
    const data = response.data;

    if (data.status !== "Success" && data.error) {
      throw new Error(`API Error: ${data.error}`);
    }

    const finalResponseText =
      data.response || data.result || "No response received from AI.";

    const aiResponse = `💬 *AI Response:*\n\n${finalResponseText}\n\n🤖 Powered by AI`;

    await bot.editMessageText(aiResponse, {
      chat_id: chatId,
      message_id: waitingMessageId,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("❌ Error contacting AI API:", err.message);

    await bot.editMessageText(
      `❌ An error occurred while contacting the AI or invalid data was received.\nError: ${err.message}`,
      {
        chat_id: chatId,
        message_id: waitingMessageId,
      }
    );
  }
};
