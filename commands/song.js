module.exports.config = {
  name: "song",
  aliases: ["a", "music"],
  version: "3.5.0",
  permission: 0,
  prefix: true,
  description: "10 Results, 10 Thumbnails, Full List Fix",
  category: "Media",
  credits: "LIKHON AHMED",
  cooldowns: 5,
};

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const nayan = require("nayan-media-downloaders");
const Youtube = require("youtube-search-api");
const ffmpeg = require("fluent-ffmpeg");

async function downloadAndConvertToMp3(url, filePath) {
  return new Promise((resolve, reject) => {
    const tempFile = filePath.replace(".mp3", ".tmp");
    axios({ method: "get", url, responseType: "stream" })
      .then((response) => {
        const writer = fs.createWriteStream(tempFile);
        response.data.pipe(writer);
        writer.on("finish", () => {
          ffmpeg(tempFile)
            .toFormat("mp3")
            .on("end", () => {
              if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
              resolve(filePath);
            })
            .on("error", (err) => {
              if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
              reject(err);
            })
            .save(filePath);
        });
        writer.on("error", reject);
      })
      .catch(reject);
  });
}

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!args.length) {
    return bot.sendMessage(chatId, "⚠️ গানের নাম লিখুন।", { reply_to_message_id: msg.message_id });
  }

  const keyword = args.join(" ");
  const wait = await bot.sendMessage(chatId, "🔍 Searching 10 results...", { reply_to_message_id: msg.message_id });

  try {
    const searchRes = await Youtube.GetListByKeyword(keyword, false, 10);
    const results = searchRes.items;

    if (!results || results.length === 0) {
      return bot.editMessageText("❌ No songs found.", { chat_id: chatId, message_id: wait.message_id });
    }

    const links = results.map((item) => item.id);
    let listText = `🎵 *Search Results for:* ${keyword}\n\n`;
    
    results.forEach((item, index) => {
      const duration = item.length.simpleText || "N/A";
      listText += `${index + 1}. ${item.title} (${duration})\n\n`;
    });

    listText += `🔢 Reply with 1-10 to download`;

    const mediaGroup = results.map((item, index) => ({
      type: 'photo',
      media: `https://img.youtube.com/vi/${item.id}/mqdefault.jpg`,
      caption: index === 0 ? listText : "",
      parse_mode: "Markdown"
    }));

    await bot.deleteMessage(chatId, wait.message_id);
    
    const sentMessages = await bot.sendMediaGroup(chatId, mediaGroup, {
      reply_to_message_id: msg.message_id
    });

    if (!global.handleReply) global.handleReply = {};
    
    sentMessages.forEach(m => {
      global.handleReply[m.message_id] = {
        name: "song",
        author: userId,
        links: links
      };
    });

  } catch (error) {
    bot.sendMessage(chatId, "❌ Search failed.");
  }
};

module.exports.handleMessage = async (bot, msg) => {
  if (!msg.reply_to_message || !global.handleReply || !global.handleReply[msg.reply_to_message.message_id]) return;

  const reply = global.handleReply[msg.reply_to_message.message_id];
  if (reply.name !== "song" || msg.from.id !== reply.author) return;

  const choice = parseInt(msg.text) - 1;
  if (isNaN(choice) || choice < 0 || choice >= reply.links.length) return;

  const chatId = msg.chat.id;
  const selectedLink = `https://www.youtube.com/watch?v=${reply.links[choice]}`;
  const videoThumb = `https://img.youtube.com/vi/${reply.links[choice]}/hqdefault.jpg`;
  
  const wait = await bot.sendMessage(chatId, "🎧 Downloading & Converting...", { reply_to_message_id: msg.message_id });

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
  const filePath = path.join(cacheDir, `song_${Date.now()}.mp3`);

  try {
    const data = await nayan.ytdown(selectedLink);
    const audioUrl = data.data.audio;
    const title = data.data.title;

    await downloadAndConvertToMp3(audioUrl, filePath);

    await bot.deleteMessage(chatId, wait.message_id);
    
    await bot.sendAudio(chatId, filePath, {
      caption: `✅ *Title:* ${title}`,
      title: title,
      performer: "Likhon Ahmed Bot",
      thumb: videoThumb,
      parse_mode: "Markdown",
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "𝐎𝐖𝐍𝐄𝐑", url: "https://t.me/LIKHONAHMED009" }]]
      }
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    delete global.handleReply[msg.reply_to_message.message_id];

  } catch (error) {
    bot.sendMessage(chatId, "❌ Conversion failed.");
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
};
