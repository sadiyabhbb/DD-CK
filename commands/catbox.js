const axios = require("axios");
const FormData = require("form-data");
const path = require("path");

module.exports.config = {
    name: "catbox",
    credits: "LIKHON X TISHA",
    aliases: ["cb", "cat"],
    prefix: true,
    permission: 0, 
    description: "Upload file/image/video/audio to Catbox.",
    tags: ["utility"]
};

function escapeMarkdown(text) {
    if (!text) return text;
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const args = msg.text.split(/\s+/).slice(1);
    
    let fileUrl, filename, mimeType;
    let loadingMessageId; 

    if (msg.reply_to_message) {
        
        const reply = msg.reply_to_message;
        let attachment = null;

        if (reply.photo) {
            attachment = reply.photo[reply.photo.length - 1]; 
            mimeType = 'image/jpeg';
        } else if (reply.video) {
            attachment = reply.video;
            mimeType = reply.video.mime_type;
        } else if (reply.document) {
            attachment = reply.document;
            mimeType = reply.document.mime_type;
        } else if (reply.audio) {
            attachment = reply.audio;
            mimeType = reply.audio.mime_type;
        } else if (reply.voice) {
            attachment = reply.voice;
            mimeType = reply.voice.mime_type;
        }
        
        if (attachment) {
            const fileId = attachment.file_id;
            fileUrl = await bot.getFileLink(fileId);
            filename = attachment.file_name || (attachment.file_unique_id + (path.extname(fileUrl) || ''));
        }
    } 
    
    else if (args.length && args[0].startsWith("http")) {
        fileUrl = args[0];
        filename = fileUrl.split("/").pop().split("?")[0] || "upload";
    }

    if (!fileUrl) {
        return bot.sendMessage(chatId, "❌ Usage: Reply to an image/video/file or provide a direct URL to upload to Catbox.", { reply_to_message_id: messageId });
    }

    try {
        const escapedFilename = escapeMarkdown(filename);
        
        
        const loadingMsg = await bot.sendMessage(chatId, `⏳ Uploading **${escapedFilename}** to Catbox.moe...`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        loadingMessageId = loadingMsg.message_id; 

        const fileResponse = await axios.get(fileUrl, { responseType: "arraybuffer" });
        const fileData = fileResponse.data;

        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", Buffer.from(fileData), { 
            filename: filename,
            contentType: mimeType || 'application/octet-stream'
        });

        const res = await axios.post("https://catbox.moe/user/api.php", form, { headers: form.getHeaders() });

        const responseText = res.data.trim();

        
        if (loadingMessageId) {
            await bot.deleteMessage(chatId, loadingMessageId).catch(err => console.error("Failed to delete loading message:", err.message));
        }

        if (responseText.startsWith("http")) {
            return bot.sendMessage(chatId, `✅ Upload successful!\n\n🔗 Catbox Link:\n${responseText}`, { reply_to_message_id: messageId });
        } else {
            const escapedResponse = escapeMarkdown(responseText);
            return bot.sendMessage(chatId, `⚠ Upload failed: ${escapedResponse}`, { reply_to_message_id: messageId });
        }

    } catch (err) {
        
        if (loadingMessageId) {
            await bot.deleteMessage(chatId, loadingMessageId).catch(deleteErr => console.error("Failed to delete loading message on error:", deleteErr.message));
        }
        
        console.error("Catbox upload error:", err.message);
        return bot.sendMessage(chatId, `❌ Error during upload: ${err.message}`, { reply_to_message_id: messageId });
    }
};
