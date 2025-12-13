const fs = require('fs/promises');
const path = require('path');

module.exports.config = {
    name: "shell",
    credits: "LIKHON AHMED (Adapted by Gemini)",
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
    
    // নিরাপত্তা চেক: শুধুমাত্র বট মালিকের জন্য
    const botOwnerId = global.CONFIG?.BOT_SETTINGS?.ADMINS?.[0];

    if (botOwnerId !== senderId.toString()) {
        return bot.sendMessage(chatId, `❌ Permission denied. Only the Bot Owner (${botOwnerId || 'Not Set'}) can use this command.`, { reply_to_message_id: messageId });
    }

    let targetPath = args[0];

    if (!targetPath) {
        return bot.sendMessage(chatId, "⚠️ Usage: /shell [file_path]\nExample: /shell index.js or /shell config/config.js", { reply_to_message_id: messageId });
    }

    // ইনজেকশন/নিরাপত্তা এড়াতে পথ (path) সাধারণীকরণ করা
    const safePath = path.normalize(targetPath);
    
    // বটের রুট ডিরেক্টরির সাপেক্ষে সম্পূর্ণ পথ তৈরি
    const filePath = path.join(process.cwd(), safePath);

    try {
        // ফাইল আছে কিনা এবং সেটি একটি ফাইল কিনা চেক
        const stats = await fs.stat(filePath);

        if (!stats.isFile()) {
            return bot.sendMessage(chatId, `❌ Error: The path **${targetPath}** is not a file (it might be a directory or does not exist).`, { reply_to_to_message_id: messageId, parse_mode: 'Markdown' });
        }

        // ফাইলের কন্টেন্ট পড়া
        const fileContent = await fs.readFile(filePath, 'utf8');

        let language = path.extname(targetPath).substring(1); // এক্সটেনশন থেকে ভাষা নেওয়া
        if (!language || language === 'js') language = 'javascript'; 
        if (language === 'json') language = 'json';

        const codeBlock = `\`\`\`${language}\n${fileContent}\n\`\`\``;
        const responseMessage = `📁 **File: ${targetPath}**\n\n${codeBlock}`;
        
        // Telegram মেসেজের সীমা (4096) মাথায় রেখে কনটেন্ট ভাগ করা
        if (responseMessage.length > 4096) {
            
            // যদি খুব বড় ফাইল হয়, পুরো কোড ব্লকটি ভাগ করে পাঠানো
            const parts = [];
            let currentPart = '';

            // শিরোনামটি প্রথম অংশে রাখা
            parts.push(`📁 **File: ${targetPath}**\n\n\`\`\`${language}`);

            // কোড কন্টেন্ট 4000 অক্ষরের ব্লকে ভাগ করা
            const codeBody = fileContent;
            for (let i = 0; i < codeBody.length; i += 4000) {
                parts.push(codeBody.substring(i, i + 4000));
            }
            
            // শেষ অংশ যোগ করা
            parts[parts.length - 1] += `\n\`\`\``;

            for (const part of parts) {
                await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' });
            }

        } else {
            // ছোট ফাইলের জন্য একবারে পাঠানো
            await bot.sendMessage(chatId, responseMessage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }

    } catch (e) {
        if (e.code === 'ENOENT') {
            return bot.sendMessage(chatId, `❌ Error: File **${targetPath}** not found.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        console.error("Shell command error:", e);
        return bot.sendMessage(chatId, `❌ An unknown error occurred while trying to read the file.`, { reply_to_message_id: messageId });
    }
};
