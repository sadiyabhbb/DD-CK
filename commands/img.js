const axios = require("axios");
const FormData = require("form-data");

if (!global.imgCommandState) {
    global.imgCommandState = {};
}
if (!global.handleReplyState) {
    global.handleReplyState = {};
}

module.exports.config = {
  name: "img",
  aliases: ["image", "editimg"],
  version: "1.0.1",
  permission: 0,
  credits: "LIKHON AHMED",
  prefix: true,
  description: "AI Image Processing Tools",
  category: "tools",
  usages: "/img (reply an image)",
  cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;
  const senderId = msg.from.id;

  if (!msg.reply_to_message || !msg.reply_to_message.photo || msg.reply_to_message.photo.length === 0) {
    return bot.sendMessage(chatId, "⚠️ Please reply to an image.", { reply_to_message_id: messageId });
  }

  const photo = msg.reply_to_message.photo.pop();
  const fileId = photo.file_id;
  
  const stateId = Math.random().toString(36).substring(2, 8); 
  
  global.imgCommandState[stateId] = {
      fileId: fileId,
      author: senderId,
      replyTo: messageId,
      timeout: Date.now() + 300000 
  };

  const buttons = [
    [{ text: "⬆️ Upscale", callback_data: `img_upscale:${stateId}` }, { text: "✨ Enhance", callback_data: `img_enhance:${stateId}` }],
    [{ text: "✏️ Remove Text", callback_data: `img_rmtext:${stateId}` }, { text: "💧 Watermark Remove", callback_data: `img_rmwtmk:${stateId}` }],
    [{ text: "📄 OCR (Get Text)", callback_data: `img_ocr:${stateId}` }, { text: "✂️ Remove Background", callback_data: `img_rmbg:${stateId}` }],
    [{ text: "🤖 AI Edit", callback_data: `img_ai:${stateId}` }]
  ];

  await bot.sendMessage(chatId, "📸 Select AI Image Tool:", { 
    reply_markup: { inline_keyboard: buttons },
    reply_to_message_id: messageId 
  });
};

module.exports.initCallback = function(bot) {
    bot.on('callback_query', async (callbackQuery) => {
        const data = callbackQuery.data;
        const msg = callbackQuery.message;
        const chatId = msg.chat.id;
        const senderId = callbackQuery.from.id;

        if (!data.startsWith('img_')) return;

        bot.answerCallbackQuery(callbackQuery.id);

        const parts = data.split(':');
        const action = parts[0]; 
        const stateId = parts[1];

        const stateData = global.imgCommandState[stateId];
        
        if (!stateData || senderId !== stateData.author || stateData.timeout < Date.now()) {
             if (global.imgCommandState[stateId]) delete global.imgCommandState[stateId];
             return bot.sendMessage(chatId, "❌ এই প্রক্রিয়ার সময়সীমা শেষ হয়ে গেছে অথবা আপনি এটি শুরু করেননি।", { reply_to_message_id: msg.message_id });
        }
        
        const { fileId, replyTo } = stateData;
        
        delete global.imgCommandState[stateId];

        if (action === "img_ai") {
            const waitMsg = await bot.sendMessage(chatId, "⏳ Processing image for upload...", { reply_to_message_id: replyTo });
            
            try {
                const uploaded = await uploadImageAndGetLink(bot, fileId);
                const encodedUrl = encodeURIComponent(uploaded);
                
                await bot.deleteMessage(chatId, waitMsg.message_id);

                const sent = await bot.sendMessage(chatId, "📝 Send your AI Generation Prompt", { reply_to_message_id: replyTo });
                
                global.handleReplyState[senderId] = {
                    name: "img",
                    messageID: sent.message_id,
                    author: senderId,
                    data: { url: encodedUrl, replyTo: replyTo },
                    type: "ai-edit"
                };

            } catch (err) {
                 await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
                 bot.sendMessage(chatId, "❌ Error uploading image for AI edit.", { reply_to_message_id: replyTo });
            }
            return;
        }

        await processImage(bot, chatId, fileId, action, replyTo);
    });
};

module.exports.handleReply = async ({ bot, msg, handleReply }) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!handleReply || handleReply.name !== "img" || handleReply.type !== "ai-edit" || senderId !== handleReply.author) {
        return; 
    }

    const { url, replyTo } = handleReply.data;
    const prompt = msg.text ? msg.text.trim() : null;
    
    if (!prompt) {
        return bot.sendMessage(chatId, "❌ প্রম্পট খালি হতে পারে না। দয়া করে কিছু লিখে পাঠান।", { reply_to_message_id: msg.message_id });
    }

    if (global.handleReplyState && global.handleReplyState[senderId]) {
        delete global.handleReplyState[senderId];
    }
    
    const waitMsg = await bot.sendMessage(chatId, "⏳ Generating AI Image...", { reply_to_message_id: replyTo });

    try {
        const apis = await axios.get("https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/main/api.json");
        const base = apis.data.api;

        const encodedPrompt = encodeURIComponent(prompt);
        const mainAPI = `${base}/nayan/ai-generate?url=${url}&prompt=${encodedPrompt}`;
        const fallbackAPI = `${base}/nayan/ai-generate2?url=${url}&prompt=${encodedPrompt}`;

        let res = await axios.get(mainAPI);

        if (!res.data || res.data.error || !res.data.generated_image) {
            res = await axios.get(fallbackAPI);
        }

        const out = res.data.generated_image;

        if (!out) {
            await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
            return bot.sendMessage(chatId, "❌ AI edit failed. No image generated.", { reply_to_message_id: replyTo });
        }

        const processed = await axios.get(out, { responseType: "arraybuffer" });
        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
        return bot.sendPhoto(chatId, processed.data, { caption: "✔️ AI Edit Completed", reply_to_message_id: replyTo });

    } catch (err) {
        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {}); 
        return bot.sendMessage(chatId, "❌ Error generating AI image. (API/Server Error)", { reply_to_message_id: replyTo });
    }
};

async function uploadImageAndGetLink(bot, fileId) {
    const apis = await axios.get("https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/main/api.json");
    const uploadUrl = apis.data.gemini + "/nayan/postimage";

    const fileLink = await bot.getFileLink(fileId);
    const img = await axios.get(fileLink, { responseType: "arraybuffer" });
    const form = new FormData();
    form.append("image", Buffer.from(img.data), "photo.jpg");

    const upload = await axios.post(uploadUrl, form, { headers: form.getHeaders() });
    
    if (!upload.data || !upload.data.direct_link) {
        throw new Error("Image upload failed at external API.");
    }
    return upload.data.direct_link;
}

async function processImage(bot, chatId, fileId, action, replyTo) {
    const waitMsg = await bot.sendMessage(chatId, "⏳ Processing image...", { reply_to_message_id: replyTo });
    
    try {
        const uploaded = await uploadImageAndGetLink(bot, fileId);
        const encoded = encodeURIComponent(uploaded);

        const apis = await axios.get("https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/main/api.json");
        const base = apis.data.api;

        const apiMap = {
            "img_upscale": { url: `${base}/nayan/upscale?url=${encoded}`, type: "Upscaled" },
            "img_enhance": { url: `${base}/nayan/enhanced?url=${encoded}`, type: "Enhanced" },
            "img_rmtext": { url: `${base}/nayan/rmtext?url=${encoded}`, type: "Text Removed" },
            "img_rmwtmk": { url: `${base}/nayan/rmwtmk?url=${encoded}`, type: "Watermark Removed" },
            "img_ocr": { url: `${base}/nayan/ocr?url=${encoded}`, type: "OCR" },
            "img_rmbg": { url: `${base}/nayan/rmbg?url=${encoded}`, type: "Background Removed" }
        };

        if (!apiMap[action]) {
            await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
            return bot.sendMessage(chatId, "❌ Invalid option.");
        }

        const res = await axios.get(apiMap[action].url);

        if (action === "img_ocr") {
            await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
            if (!res.data.text) return bot.sendMessage(chatId, "❌ Could not extract text.", { reply_to_message_id: replyTo });
            return bot.sendMessage(chatId, `📄 Extracted Text:\n\n${res.data.text}`, { reply_to_message_id: replyTo });
        }

        const out = res.data.upscaled || res.data.enhanced_image || res.data.removed_text_image || res.data.watermark_removed_image || res.data.removed_background_image;

        if (!out) {
            await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
            return bot.sendMessage(chatId, "❌ Failed to process image. API response error.", { reply_to_message_id: replyTo });
        }

        const processed = await axios.get(out, { responseType: "arraybuffer" });
        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
        return bot.sendPhoto(chatId, processed.data, { caption: `✔️ ${apiMap[action].type}`, reply_to_message_id: replyTo });

    } catch (err) {
        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
        bot.sendMessage(chatId, "❌ Error processing image. Check bot logs.", { reply_to_message_id: replyTo });
    }
}
