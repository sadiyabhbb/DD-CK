const axios = require("axios");

module.exports.config = {
  name: "xnx",
  aliases: ["sex", "v"],
  version: "7.5.0",
  permission: 0,
  prefix: true,
  category: "media",
  credits: "LIKHON AHMED",
  description: "10 Results, MB Size, Preview Fix & Owner Button",
  usages: "xnx <keyword>",
  cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const keyword = args.join(" ");

  if (!keyword) {
    return bot.sendMessage(chatId, "⚠️ Video name daw", { reply_to_message_id: msg.message_id });
  }

  const wait = await bot.sendMessage(chatId, "🔍 Searching... please wait", { reply_to_message_id: msg.message_id });

  try {
    const res = await axios.get(
      `http://65.109.80.126:20409/aryan/xnx?q=${encodeURIComponent(keyword)}`
    );

    const results = res.data?.result || [];
    if (!results.length) {
      return bot.editMessageText("❌ No result found.", { chat_id: chatId, message_id: wait.message_id });
    }

    const list = results.slice(0, 10);
    let listText = `🎬 *Search Results for:* ${keyword}\n\n`;

    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      const durationMatch = v.views.match(/\d+min|\d+sec/g);
      const duration = durationMatch ? durationMatch.join(" ") : "N/A";
      
      let sizeInfo = "N/A";
      try {
        const dlRes = await axios.get(`http://65.109.80.126:20409/aryan/xnxdl?url=${encodeURIComponent(v.link)}`);
        const videoUrl = dlRes.data?.result?.files?.high || dlRes.data?.result?.files?.low;
        
        if (videoUrl) {
          const head = await axios.head(videoUrl, { timeout: 3000 });
          const sizeInBytes = head.headers['content-length'];
          if (sizeInBytes) {
            sizeInfo = (sizeInBytes / (1024 * 1024)).toFixed(2) + " MB";
          }
        }
      } catch (err) {
        sizeInfo = "Checking...";
      }

      listText += `${i + 1}. ${v.title}\n🕒 Duration: ${duration}\n⚖️ Size: ${sizeInfo}\n\n`;
    }

    listText += `🔢 Reply with 1-10 to download`;

    const mediaGroup = list.map((v, i) => ({
      type: 'photo',
      media: v.thumbnail,
      caption: i === 0 ? listText : "",
      parse_mode: "Markdown"
    }));

    await bot.deleteMessage(chatId, wait.message_id);
    
    const sentMessages = await bot.sendMediaGroup(chatId, mediaGroup, {
      reply_to_message_id: msg.message_id
    });

    if (!global.handleReply) global.handleReply = {};
    sentMessages.forEach(m => {
      global.handleReply[m.message_id] = {
        name: "vd",
        author: msg.from.id,
        data: list
      };
    });

  } catch (e) {
    bot.sendMessage(chatId, "❌ Search failed or API timed out.");
  }
};

module.exports.handleMessage = async (bot, msg) => {
  if (!msg.reply_to_message || !global.handleReply || !global.handleReply[msg.reply_to_message.message_id]) return;

  const reply = global.handleReply[msg.reply_to_message.message_id];
  if (reply.name !== "vd" || msg.from.id !== reply.author) return;

  const choice = parseInt(msg.text);
  if (isNaN(choice) || choice < 1 || choice > reply.data.length) return;

  const video = reply.data[choice - 1];
  const chatId = msg.chat.id;

  const wait = await bot.sendMessage(chatId, "📥 Preparing your video... please wait", { reply_to_message_id: msg.message_id });

  try {
    const dl = await axios.get(
      `http://65.109.80.126:20409/aryan/xnxdl?url=${encodeURIComponent(video.link)}`
    );

    const videoUrl = dl.data?.result?.files?.high || dl.data?.result?.files?.low;
    if (!videoUrl) throw new Error("NO_URL");

    const videoStream = await axios({
      method: 'get',
      url: videoUrl,
      responseType: 'stream'
    });

    await bot.sendVideo(chatId, videoStream.data, {
      caption: `✅ *Downloaded Complete*\n🎥 ${video.title}`,
      parse_mode: "Markdown",
      reply_to_message_id: msg.message_id,
      supports_streaming: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "𝐎𝐖𝐍𝐄𝐑",
              url: "https://t.me/LIKHONAHMED009"
            }
          ]
        ]
      }
    });

    await bot.deleteMessage(chatId, wait.message_id);
    delete global.handleReply[msg.reply_to_message.message_id];

  } catch (e) {
    await bot.editMessageText("❌ Error: Video could not be sent. File might be too large.", {
      chat_id: chatId,
      message_id: wait.message_id
    });
  }
};
