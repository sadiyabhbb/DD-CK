const fs = require('fs/promises');
const path = require('path');
const axios = require('axios'); 

module.exports.config = {
    name: "cmd",
    credits: "LIKHON AHMED (Adapted by Gemini)",
    aliases: ["command", "c"],
    prefix: true,
    permission: 2, 
    description: "Manage, install, load, and unload commands dynamically.",
    tags: ["system", "owner"]
};

const pendingConfirmation = new Map();
const COMMANDS_DIR = path.join(process.cwd(), 'commands');

// --- Core Utility Functions for Command Management (Re-defined locally for safety) ---
// (These functions must match the structure in index.js)
const loadCommand = global.loadCommand;
const unloadCommand = global.unloadCommand;


module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const senderId = msg.from.id;
    const args = msg.text.split(/\s+/).slice(1);
    
    const botOwnerId = global.CONFIG?.BOT_SETTINGS?.ADMINS?.[0];

    if (botOwnerId !== senderId.toString()) {
        return bot.sendMessage(chatId, `❌ Permission denied. Owner only command.`, { reply_to_message_id: messageId });
    }

    const subCommand = args[0] ? args[0].toLowerCase() : null;
    const target = args[1];
    
    // --- রিপ্লাই ম্যানেজমেন্ট: কনফার্মেশন ---
    if (msg.reply_to_message) {
        const key = `${chatId}-${msg.reply_to_message.message_id}`;
        if (pendingConfirmation.has(key)) {
            const data = pendingConfirmation.get(key);
            pendingConfirmation.delete(key);

            const userReply = msg.text.trim().toLowerCase();
            
            if (userReply === 'y') {
                // Determine source (Code or URL) and call handler
                if (data.fileCode) {
                    return handleInstallCode(bot, chatId, messageId, data.targetFilename, data.fileCode, data.isUpdate);
                } else if (data.fileUrl) {
                    return handleInstallURL(bot, chatId, messageId, data.targetFilename, data.fileUrl, data.isUpdate);
                }
            } else if (userReply === 'n') {
                return bot.sendMessage(chatId, `✅ Installation of \`${data.targetFilename}\` cancelled.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
            } else {
                 return bot.sendMessage(chatId, "⚠️ Invalid response. Reply with 'Y' to confirm or 'N' to cancel.", { reply_to_message_id: messageId });
            }
        }
    }

    // --- মেইন কমান্ড লজিক ---

    if (!subCommand) {
        const usage = `
⚠️ **Command Usage:**
\`${global.PREFIX}cmd install <filename.js> [Code]\` (Direct Code Install)
\`${global.PREFIX}cmd install <filename.js>\` (Reply to a file)
\`${global.PREFIX}cmd uninstall <commandName>\`
\`${global.PREFIX}cmd load <commandName>\`
\`${global.PREFIX}cmd loadall\`
\`${global.PREFIX}cmd unload <commandName>\`
        `;
        return bot.sendMessage(chatId, usage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }

    // --- SUBCOMMAND: INSTALL ---
    if (subCommand === 'install') {
        if (!target) {
            return bot.sendMessage(chatId, `⚠️ Usage: \`${global.PREFIX}cmd install <filename.js> [Code]\` or reply to a file.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        
        const targetFilename = target.endsWith('.js') ? target : `${target}.js`;
        const filePath = path.join(COMMANDS_DIR, targetFilename);
        const isUpdate = await fileExists(filePath);
        
        // 1. DIRECT CODE INSTALL
        if (args.length > 2) {
            const fileCode = args.slice(2).join(' ').trim();
            if (!fileCode) {
                return bot.sendMessage(chatId, "⚠️ Please provide the command code after the filename.", { reply_to_message_id: messageId });
            }
            
            if (isUpdate) {
                const confirmationMsg = await bot.sendMessage(chatId, `⚠️ Command file \`${targetFilename}\` already exists. Do you want to **overwrite** it with the new code? (Reply to this message with Y/n)`, { parse_mode: 'Markdown' });
                
                pendingConfirmation.set(`${chatId}-${confirmationMsg.message_id}`, {
                    targetFilename: targetFilename,
                    fileCode: fileCode,
                    isUpdate: true,
                });
                return;
            }
            
            return handleInstallCode(bot, chatId, messageId, targetFilename, fileCode, false);
        } 
        
        // 2. DOCUMENT REPLY INSTALL (If no code is provided, check for reply)
        else if (msg.reply_to_message && msg.reply_to_message.document) {
            const fileDoc = msg.reply_to_message.document;
            const fileUrl = await bot.getFileLink(fileDoc.file_id);
            
            if (isUpdate) {
                const confirmationMsg = await bot.sendMessage(chatId, `⚠️ Command file \`${targetFilename}\` already exists. Do you want to **overwrite** it with the replied file? (Reply to this message with Y/n)`, { parse_mode: 'Markdown' });
                
                pendingConfirmation.set(`${chatId}-${confirmationMsg.message_id}`, {
                    targetFilename: targetFilename,
                    fileUrl: fileUrl,
                    isUpdate: true,
                });
                return;
            }

            return handleInstallURL(bot, chatId, messageId, targetFilename, fileUrl, false);
        }
        
        // Neither code nor reply was provided
        return bot.sendMessage(chatId, `⚠️ Please provide the command code or reply to a \`.js\` file.`, { reply_to_message_id: messageId });
    }
    
    // --- Other Subcommands (Unchanged) ---
    // (Uninstall, Load, Unload, Loadall logic remains the same)
    
    if (subCommand === 'uninstall') {
        if (!target) {
            return bot.sendMessage(chatId, "⚠️ Usage: `/cmd uninstall <commandName>`", { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        const filename = target.endsWith('.js') ? target : `${target}.js`;
        
        try {
            const filePath = path.join(COMMANDS_DIR, filename);
            if (!await fileExists(filePath)) {
                return bot.sendMessage(chatId, `❌ Command \`${target}\` not found in commands directory.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
            }

            if (global.COMMANDS[target] || global.ALIASES[target]) {
                unloadCommand(global.ALIASES[target] || target);
            }

            await fs.unlink(filePath);

            return bot.sendMessage(chatId, `🗑️ Command \`${target}\` unloaded and file \`${filename}\` deleted successfully.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });

        } catch (e) {
            console.error("Uninstall error:", e);
            return bot.sendMessage(chatId, `❌ Failed to uninstall \`${target}\`. Error: ${e.message}`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
    }
    
    if (subCommand === 'load') {
        if (!target) {
            return bot.sendMessage(chatId, "⚠️ Usage: `/cmd load <commandName>`", { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        return handleLoad(bot, chatId, messageId, target);
    }

    if (subCommand === 'unload') {
        if (!target) {
            return bot.sendMessage(chatId, "⚠️ Usage: `/cmd unload <commandName>`", { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        return handleUnload(bot, chatId, messageId, target);
    }

    if (subCommand === 'loadall') {
        return handleLoadAll(bot, chatId, messageId);
    }

    return bot.sendMessage(chatId, `❌ Unknown sub-command: \`${subCommand}\`.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
};

// --- INSTALLATION HANDLERS ---

/**
 * URL থেকে ফাইল ডাউনলোড করে ইনস্টল এবং লোড করার লজিক
 */
async function handleInstallURL(bot, chatId, replyToMessageId, targetFilename, fileUrl, isUpdate) {
    const filePath = path.join(COMMANDS_DIR, targetFilename);
    const commandName = targetFilename.replace('.js', '');

    try {
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const fileContent = Buffer.from(response.data);

        await fs.writeFile(filePath, fileContent);
        
        let statusMsg = isUpdate ? `🔄 Command \`${commandName}\` updated successfully from replied file.` : `✅ Command \`${commandName}\` installed successfully from replied file.`;
        
        try {
            loadCommand(commandName);
            statusMsg += `\n➡️ Automatically loaded.`;
        } catch (loadError) {
            statusMsg += `\n❌ Failed to load command (Syntax Error). Check the file and use \`${global.PREFIX}cmd load ${commandName}\` later. Error: ${loadError.message}`;
            console.error(`Command ${commandName} failed to load after install:`, loadError);
        }

        return bot.sendMessage(chatId, statusMsg, { reply_to_message_id: replyToMessageId, parse_mode: 'Markdown' });

    } catch (e) {
        console.error("Install/Download error:", e);
        return bot.sendMessage(chatId, `❌ Failed to install \`${commandName}\`. Error: ${e.message}`, { reply_to_message_id: replyToMessageId, parse_mode: 'Markdown' });
    }
}

/**
 * কোড ইনপুট থেকে ফাইল তৈরি করে ইনস্টল এবং লোড করার লজিক
 */
async function handleInstallCode(bot, chatId, replyToMessageId, targetFilename, fileCode, isUpdate) {
    const filePath = path.join(COMMANDS_DIR, targetFilename);
    const commandName = targetFilename.replace('.js', '');

    try {
        await fs.writeFile(filePath, fileCode);
        
        let statusMsg = isUpdate ? `🔄 Command \`${commandName}\` updated successfully with direct code input.` : `✅ Command \`${commandName}\` installed successfully with direct code input.`;
        
        try {
            loadCommand(commandName);
            statusMsg += `\n➡️ Automatically loaded.`;
        } catch (loadError) {
            statusMsg += `\n❌ Failed to load command (Syntax Error). Check the file and use \`${global.PREFIX}cmd load ${commandName}\` later. Error: ${loadError.message}`;
            console.error(`Command ${commandName} failed to load after install:`, loadError);
        }

        return bot.sendMessage(chatId, statusMsg, { reply_to_message_id: replyToMessageId, parse_mode: 'Markdown' });

    } catch (e) {
        console.error("Install/Write error:", e);
        return bot.sendMessage(chatId, `❌ Failed to install \`${commandName}\`. Error: ${e.message}`, { reply_to_message_id: replyToMessageId, parse_mode: 'Markdown' });
    }
}

// --- LOAD/UNLOAD HANDLERS (Unchanged but using global functions) ---

async function handleLoad(bot, chatId, messageId, target) {
    const filename = target.endsWith('.js') ? target : `${target}.js`;
    const commandName = target.replace('.js', '');
    const filePath = path.join(COMMANDS_DIR, filename);

    if (!await fileExists(filePath)) {
        return bot.sendMessage(chatId, `❌ Command file \`${filename}\` not found.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }

    try {
        loadCommand(commandName);
        return bot.sendMessage(chatId, `✅ Command \`${commandName}\` reloaded/loaded successfully.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    } catch (e) {
        console.error(`Error loading command ${commandName}:`, e);
        return bot.sendMessage(chatId, `❌ Error loading command \`${commandName}\`: ${e.message}`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }
}

async function handleUnload(bot, chatId, messageId, target) {
    const commandName = global.COMMANDS[target] ? target : global.ALIASES[target];
    
    if (!commandName) {
         return bot.sendMessage(chatId, `❌ Command \`${target}\` is not currently loaded.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }
    
    try {
        if (global.COMMANDS[commandName]) {
            unloadCommand(commandName);
            return bot.sendMessage(chatId, `✅ Command \`${commandName}\` unloaded successfully.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        
    } catch (e) {
        console.error(`Error unloading command ${commandName}:`, e);
        return bot.sendMessage(chatId, `❌ Error unloading command \`${commandName}\`: ${e.message}`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }
}

async function handleLoadAll(bot, chatId, messageId) {
    const files = await fs.readdir(COMMANDS_DIR);
    let successCount = 0;
    let failCount = 0;
    
    const loadingMsg = await bot.sendMessage(chatId, `🔄 Attempting to reload **all** commands...`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    const loadingMessageId = loadingMsg.message_id;

    for (const file of files) {
        if (file.endsWith('.js')) {
            const commandName = file.slice(0, -3);
            try {
                loadCommand(commandName);
                successCount++;
            } catch (e) {
                console.error(`Failed to reload ${commandName}:`, e.message);
                failCount++;
            }
        }
    }
    
    await bot.deleteMessage(chatId, loadingMessageId).catch(err => console.error("Failed to delete loading message:", err.message));

    const finalMessage = `
✅ **Command Reload Summary:**
Successful reloads: ${successCount}
Failed reloads (Syntax/Missing): ${failCount}
Total command files scanned: ${files.length}
    `;

    return bot.sendMessage(chatId, finalMessage, { parse_mode: 'Markdown' });
}


// --- UTILITIES ---

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}
