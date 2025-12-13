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

        // ফাইলের কন্টেন্ট পড়া
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        // ক্যাপশন তৈরি: কোড ব্লক ফর্মে ফাইলের নাম এবং কন্টেন্ট
        const caption = 
            `**File: \`${filename}\`**\n` +
            '```javascript\n' +
            fileContent +
            '\n```';

        // ফাইল ডকুমেন্ট হিসেবে পাঠানো
        await bot.sendDocument(chatId, filePath, { caption: caption, parse_mode: 'Markdown' }, { filename: filename });

        // সফল হলে অতিরিক্ত কনফার্মেশন মেসেজটি আর পাঠানো হবে না।

    } catch (e) {
        if (e.code === 'ENOENT') {
            return bot.sendMessage(chatId, `❌ Error: Command **${commandName}** file not found.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        console.error("File command error:", e);
        return bot.sendMessage(chatId, `❌ An unknown error occurred while trying to send the file.`, { reply_to_message_id: messageId });
    }
};
