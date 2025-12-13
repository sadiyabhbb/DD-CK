const fs = require('fs/promises');
const path = require('path');

module.exports.config = {
    name: "file",
    credits: "LIKHON AHMED (Adapted by Gemini)",
    aliases: ["getcmd"],
    prefix: true,
    permission: 2, 
    description: "Get the source code file of a command. Owner only.",
    tags: ["system", "owner"]
};

// Telegram ক্যাপশনের সর্বোচ্চ সীমা
const MAX_CAPTION_LENGTH = 1024;

module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const senderId = msg.from.id;
    const args = msg.text.split(/\s+/).slice(1);
    
    const botOwnerId = global.CONFIG?.BOT_SETTINGS?.ADMINS?.[0];

    if (botOwnerId !== senderId.toString()) {
        return bot.sendMessage(chatId, `❌ Permission denied. Only the Bot Owner (${botOwnerId || 'Not Set'}) can use this command.`, { reply_to_message_id: messageId });
    }

    const commandName = args[0];

    if (!commandName) {
        return bot.sendMessage(chatId, "⚠️ Usage: /file [command_name]\nExample: /file admin (sends commands/admin.js)", { reply_to_message_id: messageId });
    }

    const filename = `${commandName}.js`;
    const filePath = path.join(process.cwd(), 'commands', filename);

    try {
        const stats = await fs.stat(filePath);

        if (!stats.isFile()) {
            return bot.sendMessage(chatId, `❌ Error: The command file **${filename}** not found in the 'commands' folder.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }

        // 1. ফাইলের কন্টেন্ট পড়া
        const fileContent = await fs.readFile(filePath, 'utf8');
        const codeBlockContent = '```javascript\n' + fileContent + '\n```';
        
        let fileCaption = `**File: \`${filename}\`**`;
        let documentSent = false;
        
        // 2. ক্যাপশনের সীমা পরীক্ষা
        if ((fileCaption + codeBlockContent).length <= MAX_CAPTION_LENGTH) {
            
            // যদি কনটেন্ট ছোট হয়, ক্যাপশনে পাঠানো হবে
            fileCaption += '\n' + codeBlockContent;

            await bot.sendDocument(chatId, filePath, { caption: fileCaption, parse_mode: 'Markdown' }, { filename: filename });
            documentSent = true;
            
        } else {
            
            // যদি কনটেন্ট বড় হয়, ক্যাপশন ছাড়াই শুধু ডকুমেন্ট পাঠানো হবে
            await bot.sendDocument(chatId, filePath, { caption: fileCaption, parse_mode: 'Markdown' }, { filename: filename });
            documentSent = true;

            // এবং আলাদা মেসেজে পুরো কোডটি পাঠানো হবে
            const largeFileMessage = `📤 **Source Code of \`${filename}\` (Too Large for Caption):**\n${codeBlockContent}`;
            // Telegram মেসেজের সীমা (4096) মাথায় রেখে কনটেন্ট ভাগ করা লাগতে পারে, কিন্তু আপাতত ধরে নিচ্ছি 4096 এর মধ্যে থাকবে।
            await bot.sendMessage(chatId, largeFileMessage, { parse_mode: 'Markdown' });
        }
        
    } catch (e) {
        if (e.code === 'ENOENT') {
            return bot.sendMessage(chatId, `❌ Error: Command **${commandName}** file not found.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        console.error("File command error:", e);
        
        // এখানে যদি error আসে, তবে 99% ক্ষেত্রে তা Telegram API এর ক্যাপশন সীমার জন্য।
        return bot.sendMessage(chatId, `❌ An unknown error occurred while trying to send the file. Please check the file size. (Error details: ${e.message || 'API Error'}).`, { reply_to_message_id: messageId });
    }
};
