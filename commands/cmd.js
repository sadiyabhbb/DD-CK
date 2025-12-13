const fs = require('fs/promises');
const path = require('path');
const axios = require('axios'); // Install command এর জন্য প্রয়োজন

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
    
    if (msg.reply_to_message) {
        const key = `${chatId}-${msg.reply_to_message.message_id}`;
        if (pendingConfirmation.has(key)) {
            const data = pendingConfirmation.get(key);
            pendingConfirmation.delete(key);

            const userReply = msg.text.trim().toLowerCase();
            
            if (userReply === 'y') {
                return handleInstall(bot, chatId, messageId, data.targetFilename, data.fileUrl, data.isUpdate);
            } else if (userReply === 'n') {
                return bot.sendMessage(chatId, `✅ Installation of \`${data.targetFilename}\` cancelled.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
            } else {
                 return bot.sendMessage(chatId, "⚠️ Invalid response. Reply with 'Y' to confirm or 'N' to cancel.", { reply_to_message_id: messageId });
            }
        }
    }

    if (!subCommand) {
        const usage = `
⚠️ **Command Usage:**
\`${global.PREFIX}cmd install <filename.js>\` (Reply to a file)
\`${global.PREFIX}cmd uninstall <commandName>\`
\`${global.PREFIX}cmd load <commandName>\`
\`${global.PREFIX}cmd loadall\`
\`${global.PREFIX}cmd unload <commandName>\`
        `;
        return bot.sendMessage(chatId, usage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }

    if (subCommand === 'install') {
        if (!target) {
            return bot.sendMessage(chatId, "⚠️ Usage: Reply to the command file and use `/cmd install <filename.js>`", { reply_to_message_id: messageId });
        }
        
        const targetFilename = target.endsWith('.js') ? target : `${target}.js`;
        
        if (!msg.reply_to_message || !msg.reply_to_message.document) {
            return bot.sendMessage(chatId, "❌ Please reply to the `.js` command file you want to install.", { reply_to_message_id: messageId });
        }
        
        const fileDoc = msg.reply_to_message.document;
        const fileUrl = await bot.getFileLink(fileDoc.file_id);
        const filePath = path.join(COMMANDS_DIR, targetFilename);
        const isUpdate = await fileExists(filePath);
        
        if (isUpdate) {
            const confirmationMsg = await bot.sendMessage(chatId, `⚠️ Command file \`${targetFilename}\` already exists. Do you want to **overwrite** it? (Reply to this message with Y/n)`, { parse_mode: 'Markdown' });
            
            pendingConfirmation.set(`${chatId}-${confirmationMsg.message_id}`, {
                targetFilename: targetFilename,
                fileUrl: fileUrl,
                isUpdate: true,
            });
            return;
        }

        return handleInstall(bot, chatId, messageId, targetFilename, fileUrl, false);
    }
    
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

            // আনলোড করা
            if (global.COMMANDS[target]) {
                unloadCommand(target);
            } else if (global.ALIASES[target]) {
                unloadCommand(global.ALIASES[target]);
            }
            
            // ফাইল ডিলিট করা
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


// --- হেল্পার ফাংশন ---

async function handleInstall(bot, chatId, replyToMessageId, targetFilename, fileUrl, isUpdate) {
    const filePath = path.join(COMMANDS_DIR, targetFilename);
    const commandName = targetFilename.replace('.js', '');

    try {
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const fileContent = Buffer.from(response.data);

        await fs.writeFile(filePath, fileContent);
        
        let statusMsg = isUpdate ? `🔄 Command \`${commandName}\` updated successfully.` : `✅ Command \`${commandName}\` installed successfully.`;
        
        try {
            await loadCommand(commandName);
            statusMsg += `\n➡️ Automatically loaded.`;
        } catch (loadError) {
            statusMsg += `\n❌ Failed to load command (Syntax Error). Check the file and use \`${global.PREFIX}cmd load ${commandName}\` later.`;
            console.error(`Command ${commandName} failed to load after install:`, loadError);
        }

        return bot.sendMessage(chatId, statusMsg, { reply_to_message_id: replyToMessageId, parse_mode: 'Markdown' });

    } catch (e) {
        console.error("Install/Download error:", e);
        return bot.sendMessage(chatId, `❌ Failed to install \`${commandName}\`. Error: ${e.message}`, { reply_to_message_id: replyToMessageId, parse_mode: 'Markdown' });
    }
}

async function handleLoad(bot, chatId, messageId, target) {
    const filename = target.endsWith('.js') ? target : `${target}.js`;
    const commandName = target.replace('.js', '');
    const filePath = path.join(COMMANDS_DIR, filename);

    if (!await fileExists(filePath)) {
        return bot.sendMessage(chatId, `❌ Command file \`${filename}\` not found.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }

    try {
        await loadCommand(commandName);
        return bot.sendMessage(chatId, `✅ Command \`${commandName}\` reloaded/loaded successfully.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    } catch (e) {
        console.error(`Error loading command ${commandName}:`, e);
        return bot.sendMessage(chatId, `❌ Error loading command \`${commandName}\`: ${e.message}`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }
}

async function handleUnload(bot, chatId, messageId, target) {
    // লক্ষ্য: এটি কমান্ডের নাম বা অ্যালিয়াস হতে পারে
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
                // পূর্বে আনলোড করার দরকার নেই, loadCommand স্বয়ংক্রিয়ভাবে ক্যাশ রিমুভ করবে
                await loadCommand(commandName);
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


async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}


// --- গ্লোবাল কমান্ড লোড/আনলোড ফাংশন (এই ফাইলের জন্য সংজ্ঞায়িত) ---

/**
 * কমান্ড মডিউল ক্যাশ থেকে মুছে পুনরায় লোড করে।
 * এটি ধরে নেয় global.COMMANDS এবং global.ALIASES সংজ্ঞায়িত আছে।
 */
function loadCommand(commandName) {
    const filename = `${commandName}.js`;
    const filePath = path.join(COMMANDS_DIR, filename);

    // 1. যদি কমান্ডটি আগে লোড হয়ে থাকে, তবে সেটি আনলোড করা
    if (global.COMMANDS[commandName]) {
        unloadCommand(commandName);
    }
    
    // 2. মডিউল ক্যাশ থেকে কমান্ড মুছে ফেলা যাতে এটি সর্বশেষ ভার্সন লোড করতে পারে
    if (require.cache[require.resolve(filePath)]) {
        delete require.cache[require.resolve(filePath)];
    }

    // 3. মডিউল রিকোয়ার করে গ্লোবাল COMMANDS-এ যোগ করা
    const commandModule = require(filePath);
    global.COMMANDS[commandName] = commandModule; // মডিউলটি সম্পূর্ণ সেভ করা 
    
    // 4. অ্যালিয়াস যোগ করা
    if (commandModule.config && commandModule.config.aliases) {
         commandModule.config.aliases.forEach(alias => {
             global.ALIASES[alias] = commandName;
         });
    }
}

/**
 * লোড হওয়া কমান্ডকে গ্লোবাল লিস্ট থেকে মুছে ফেলে।
 */
function unloadCommand(commandName) {
    const commandModule = global.COMMANDS[commandName];
    if (commandModule) {
        // অ্যালিয়াস মুছে ফেলা
        if (commandModule.config && commandModule.config.aliases) {
            commandModule.config.aliases.forEach(alias => {
                delete global.ALIASES[alias];
            });
        }
        delete global.COMMANDS[commandName];
    }
                                   }
