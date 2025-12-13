const axios = require("axios");

module.exports.config = {
  name: "ai",
  credits: "LIKHON X TISHA",
  aliases: ["gpt", "gpt4"],
  prefix: true,
  permission: 0,
  description: "Chat with GPT AI using an external API.",
  tags: ["ai", "chat"]
};

module.exports.run = async (bot, msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  
  let args = msg.text.split(/\s+/).slice(1);
  let text = args.join(" ").trim();

  // 1. টেক্সট বা রিপ্লাই চেক করা
  if (!text) {
    if (msg.reply_to_message && msg.reply_to_message.text) {
        text = msg.reply_to_message.text.trim();
    } else {
        return bot.sendMessage(
            chatId,
            `❌ অনুগ্রহ করে AI এর জন্য একটি মেসেজ প্রদান করুন।\nব্যবহার: ${global.PREFIX}ai <আপনার প্রশ্ন>`,
            { reply_to_message_id: messageId }
        );
    }
  }

  const waitingMessage = await bot.sendMessage(
    chatId,
    "💬 AI উত্তর প্রস্তুত করছে, অপেক্ষা করুন...",
    { reply_to_message_id: messageId }
  );
  const waitingMessageId = waitingMessage.message_id;

  try {
    // 2. API কনফিগারেশন লোড করা
    const apiConfigUrl = `https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/refs/heads/main/api.json`;
    const apiConfigResponse = await axios.get(apiConfigUrl);
    const apis = apiConfigResponse.data;

    let baseUrl;
    let endpoint;
    
    // gpt4 ইউআরএল অগ্রাধিকার দেওয়া হচ্ছে
    if (apis.gpt4) {
        baseUrl = apis.gpt4;
        endpoint = "gpt4"; // gpt4 সার্ভারের জন্য এন্ডপয়েন্ট
    } else if (apis.api) {
        baseUrl = apis.api;
        endpoint = "nayan/gpt3"; // gpt3 সার্ভারের জন্য এন্ডপয়েন্ট
    } else {
         throw new Error("API base URL is missing in the configuration.");
    }

    // 3. ফাইনাল API কল
    const fullApiUrl = `${baseUrl}/${endpoint}?text=${encodeURIComponent(text)}`;
    const response = await axios.get(fullApiUrl);
    const data = response.data;
    
    // 4. সফলতার হ্যান্ডলিং
    if (data.status !== "Success" && data.error) {
        // যদি gpt4 বা gpt3 সার্ভার থেকে স্পষ্টভাবে error আসে
        throw new Error(`API Error: ${data.error}`);
    }
    
    // নিশ্চিত করুন যে response ডেটা আছে (যদিও সার্ভার Success না পাঠালেও উত্তর আসতে পারে)
    const finalResponseText = data.response || data.result || "No response text received from AI.";
    
    const aiResponse = `💬 *AI Response:*\n\n${finalResponseText}\n\n🤖 Powered by AI`;

    // 5. মেসেজ এডিট করে উত্তর দেখানো
    await bot.editMessageText(
      aiResponse,
      {
        chat_id: chatId,
        message_id: waitingMessageId,
        parse_mode: "Markdown"
      }
    );

  } catch (err) {
    console.error("❌ Error contacting AI API:", err.message);

    // 6. ত্রুটি দেখালে মেসেজ এডিট করে ত্রুটি জানানো
    await bot.editMessageText(
      `❌ AI এর সাথে যোগাযোগ করার সময় একটি ত্রুটি হয়েছে বা সার্ভার থেকে ভুল ডেটা এসেছে।\nত্রুটি: ${err.message}`,
      {
        chat_id: chatId,
        message_id: waitingMessageId
      }
    );
  }
};
