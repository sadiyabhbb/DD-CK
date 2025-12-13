const fs = require('fs/promises');
const path = require('path');

module.exports.config = {
    name: "shell",
    credits: "LIKHON X TISHA",
    aliases: ["cat", "readfile"],
    prefix: true,
    permission: 2, 
    description: "Reads and displays the content of a specified file. Owner only.",
    tags: ["system", "owner"]
};

module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const senderId = msg.from.id;
    const args = msg.text.split(/\s+/).slice(1);
    
    
    const botOwnerId = global.CONFIG?.BOT_SETTINGS?.ADMINS?.[0];

    if (botOwnerId !== senderId.toString()) {
        return bot.sendMessage(chatId, `❌ Permission denied. Only the Bot Owner (${botOwnerId || 'Not Set'}) can use this command.`, { reply_to_message_id: messageId });
    }

    let targetPath = args[0];

    if (!targetPath) {
        return bot.sendMessage(chatId, "⚠️ Usage: /shell [file_path]\nExample: /shell index.js or /shell config/config.js", { reply_to_message_id: messageId });
    }

    const safePath = path.normalize(targetPath);
    const filePath = path.join(process.cwd(), safePath);

    try {
        const stats = await fs.stat(filePath);

        if (!stats.isFile()) {
            return bot.sendMessage(chatId, `❌ Error: The path **${targetPath}** is not a file (it might be a directory or does not exist).`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }

        const fileContent = await fs.readFile(filePath, 'utf8');

        let language = path.extname(targetPath).substring(1); 
        if (!language || language === 'js') language = 'javascript'; 
        if (language === 'json') language = 'json';

        const codeBlock = `\`\`\`${language}\n${fileContent}\n\`\`\``;
        const responseMessage = `📁 **File: ${targetPath}**\n\n${codeBlock}`;
        
        
        try {
            await bot.sendMessage(chatId, responseMessage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });

        } catch (e) {
            
            if (e.message.includes('message is too long')) {
                
                await bot.sendDocument(chatId, filePath, { caption: `✅ File **${targetPath}** sent as document (Too large for text message).`, parse_mode: 'Markdown' }, { filename: path.basename(filePath) });
                
            } else {
                
                console.error("Shell command API error:", e);
                return bot.sendMessage(chatId, `❌ An API error occurred while sending the file. (Error: ${e.message})`, { reply_to_message_id: messageId });
            }
        }

    } catch (e) {
        if (e.code === 'ENOENT') {
            return bot.sendMessage(chatId, `❌ Error: File **${targetPath}** not found.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        console.error("Shell command I/O error:", e);
        
        return bot.sendMessage(chatId, `❌ An unknown error occurred while trying to read the file.`, { reply_to_message_id: messageId });
    }
};
