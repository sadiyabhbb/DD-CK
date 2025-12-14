const axios = require("axios");
const FormData = require("form-data");

module.exports.config = {
  name: "img",
  credits: "LIKHON AHMED",
  aliases: ["image", "editimg"],
  prefix: true,
  permission: 0,
  description: "AI Image Processing Tools (reply to an image)",
  tags: ["tools", "ai"],
  cooldowns: 5
};

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  if (!msg.reply_to_message || !msg.reply_to_message.photo) {
    return bot.sendMessage(
      chatId,
      "⚠️ অনুগ্রহ করে একটি ছবির রিপ্লাই দিয়ে কমান্ডটি ব্যবহার করুন।",
      { reply_to_message_id: messageId }
    );
  }

  const photo = msg.reply_to_message.photo.slice(-1)[0];
  const fileId = photo.file_id;

  const buttons = [
    [{ text: "Upscale", callback_data: "img_upscale" }, { text: "Enhance", callback_data: "img_enhance" }],
    [{ text: "Remove Text", callback_data: "img_rmtext" }, { text: "Remove BG", callback_data: "img_rmbg" }],
    [{ text: "OCR", callback_data: "img_ocr" }, { text: "AI Edit", callback_data: "img_ai" }]
  ];

  const sent = await bot.sendMessage(chatId, "📸 AI Image Tool বেছে নিন:", {
    reply_markup: { inline_keyboard: buttons },
    reply_to_message_id: messageId
  });

  global.client.handleButton.push({
    name: "img",
    messageID: sent.message_id,
    author: msg.from.id,
    data: {
      fileId,
      replyTo: msg.reply_to_message.message_id
    }
  });
};

module.exports.handleButton = async (bot, event, handleButton) => {
  const chatId = event.message.chat.id;
  const btn = event.data;
  const { fileId, replyTo } = handleButton.data;

  const waitMsg = await bot.sendMessage(chatId, "⏳ ইমেজ প্রসেস হচ্ছে...", {
    reply_to_message_id: replyTo
  });

  try {
    const apis = await axios.get("https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/main/api.json");
    const base = apis.data.api;
    const uploadUrl = apis.data.gemini + "/nayan/postimage";

    const file = await bot.getFile(fileId);
    const fileLink = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    const img = await axios.get(fileLink, { responseType: "arraybuffer" });

    const form = new FormData();
    form.append("image", Buffer.from(img.data), "photo.jpg");

    const upload = await axios.post(uploadUrl, form, {
      headers: form.getHeaders()
    });

    const uploaded = upload.data.direct_link;
    const encoded = encodeURIComponent(uploaded);

    if (btn === "img_ai") {
      const ask = await bot.sendMessage(chatId, "📝 AI prompt পাঠান:", {
        reply_to_message_id: replyTo
      });

      global.client.handleReply.push({
        name: "img",
        messageID: ask.message_id,
        author: event.from.id,
        data: { url: encoded, replyTo },
        type: "ai"
      });

      return bot.deleteMessage(chatId, waitMsg.message_id);
    }

    const apiMap = {
      img_upscale: `${base}/nayan/upscale?url=${encoded}`,
      img_enhance: `${base}/nayan/enhanced?url=${encoded}`,
      img_rmtext: `${base}/nayan/rmtext?url=${encoded}`,
      img_rmbg: `${base}/nayan/rmbg?url=${encoded}`,
      img_ocr: `${base}/nayan/ocr?url=${encoded}`
    };

    const res = await axios.get(apiMap[btn]);

    if (btn === "img_ocr") {
      await bot.deleteMessage(chatId, waitMsg.message_id);
      return bot.sendMessage(
        chatId,
        `📄 Extracted Text:\n\n${res.data.text || "কিছু পাওয়া যায়নি"}`,
        { reply_to_message_id: replyTo }
      );
    }

    const out =
      res.data.upscaled ||
      res.data.enhanced_image ||
      res.data.removed_text_image ||
      res.data.removed_background_image;

    const finalImg = await axios.get(out, { responseType: "arraybuffer" });

    await bot.deleteMessage(chatId, waitMsg.message_id);
    return bot.sendPhoto(chatId, finalImg.data, {
      caption: "✅ Image Processed",
      reply_to_message_id: replyTo
    });

  } catch (e) {
    console.log(e);
    bot.sendMessage(chatId, "❌ ইমেজ প্রসেস করতে সমস্যা হয়েছে।");
  }
};

module.exports.handleReply = async (bot, msg, handleReply) => {
  if (handleReply.type !== "ai") return;
  if (msg.from.id !== handleReply.author) return;

  const chatId = msg.chat.id;
  const prompt = msg.text;
  const { url, replyTo } = handleReply.data;

  const waitMsg = await bot.sendMessage(chatId, "⏳ AI ইমেজ তৈরি হচ্ছে...", {
    reply_to_message_id: replyTo
  });

  try {
    const apis = await axios.get("https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/main/api.json");
    const base = apis.data.api;

    const res = await axios.get(
      `${base}/nayan/ai-generate?url=${url}&prompt=${encodeURIComponent(prompt)}`
    );

    const out = res.data.generated_image;
    const img = await axios.get(out, { responseType: "arraybuffer" });

    await bot.deleteMessage(chatId, waitMsg.message_id);
    return bot.sendPhoto(chatId, img.data, {
      caption: "🎨 AI Edit Complete",
      reply_to_message_id: replyTo
    });

  } catch (err) {
    console.log(err);
    await bot.deleteMessage(chatId, waitMsg.message_id);
    bot.sendMessage(chatId, "❌ AI ইমেজ তৈরি ব্যর্থ হয়েছে।");
  }
};
