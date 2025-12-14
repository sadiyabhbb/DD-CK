const fs = require('fs/promises');
const path = require('path');

module.exports.config = {
    name: "file",
    credits: "LIKHON X TISHA",
    aliases: ["getcmd"],
    prefix: false,
    permission: 2, 
    description: "Get the source code file of a command. Owner only.",
    tags: ["system", "owner"]
};

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

        const fileContent = await fs.readFile(filePath, 'utf8');
        const codeBlockContent = '```javascript\n' + fileContent + '\n```';
        
        let fileCaption = `**File: \`${filename}\`**`;
        
        if ((fileCaption + codeBlockContent).length <= MAX_CAPTION_LENGTH) {
            
            fileCaption += '\n' + codeBlockContent;
            await bot.sendDocument(chatId, filePath, { caption: fileCaption, parse_mode: 'Markdown' }, { filename: filename });
            
        } else {
            
            await bot.sendDocument(chatId, filePath, { caption: fileCaption, parse_mode: 'Markdown' }, { filename: filename });

            const largeFileMessage = `📤 **Source Code of \`${filename}\` (Too Large for Caption):**\n${codeBlockContent}`;
            
            try {
                 await bot.sendMessage(chatId, largeFileMessage, { parse_mode: 'Markdown' });
            } catch (e) {
                if (!e.message.includes('message is too long')) {
                    console.error("Large message part error (but not 'too long'):", e);
                }
            }
        }
        
    } catch (e) {
        if (e.code === 'ENOENT') {
            return bot.sendMessage(chatId, `❌ Error: Command **${commandName}** file not found.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        
        return bot.sendMessage(chatId, `❌ An unknown error occurred while processing the file.`, { reply_to_message_id: messageId });
    }
};
