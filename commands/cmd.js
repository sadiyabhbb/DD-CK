const fs = require('fs/promises');
const path = require('path');

module.exports.config = {
    name: "cmd",
    credits: "LIKHON AHMED (Adapted by Gemini)",
    aliases: ["command", "c"],
    prefix: true,
    permission: 2, 
    description: "Manage, install, load, and unload commands dynamically.",
    tags: ["system", "owner"]
};

// এই ম্যাপটি রিপ্লাই ডেটা অস্থায়ীভাবে সংরক্ষণ করবে
const pendingConfirmation = new Map();
const COMMANDS_DIR = path.join(process.cwd(), 'commands');

module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const senderId = msg.from.id;
    const args = msg.text.split(/\s+/).slice(1);
    
    const botOwnerId = global.CONFIG?.BOT_SETTINGS?.ADMINS?.[0];

    // নিরাপত্তা চেক: শুধুমাত্র বট মালিকের জন্য
    if (botOwnerId !== senderId.toString()) {
        return bot.sendMessage(chatId, `❌ Permission denied. Owner only command.`, { reply_to_message_id: messageId });
    }

    const subCommand = args[0] ? args[0].toLowerCase() : null;
    const target = args[1];
    
    // --- রিপ্লাই ম্যানেজমেন্ট: ইউজার কনফার্মেশন দিচ্ছে কিনা চেক করা ---
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

    // --- মেইন কমান্ড লজিক ---

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

    // --- SUBCOMMAND: INSTALL (Only by reply) ---
    if (subCommand === 'install') {
        if (!target) {
            return bot.sendMessage(chatId, "⚠️ Usage: Reply to the command file and use `/cmd install <filename.js>`", { reply_to_message_id: messageId });
        }
        
        const targetFilename = target.endsWith('.js') ? target : `${target}.js`;
        
        // রিপ্লাইতে ফাইল অ্যাটাচমেন্ট চেক করা
        if (!msg.reply_to_message || !msg.reply_to_message.document) {
            return bot.sendMessage(chatId, "❌ Please reply to the `.js` command file you want to install.", { reply_to_message_id: messageId });
        }
        
        const fileDoc = msg.reply_to_message.document;
        const fileUrl = await bot.getFileLink(fileDoc.file_id);
        const filePath = path.join(COMMANDS_DIR, targetFilename);
        const isUpdate = await fileExists(filePath);
        
        // যদি ফাইলটি আগে থেকেই থাকে, কনফার্মেশন চাওয়া
        if (isUpdate) {
            const confirmationMsg = await bot.sendMessage(chatId, `⚠️ Command file \`${targetFilename}\` already exists. Do you want to **overwrite** it? (Reply to this message with Y/n)`, { parse_mode: 'Markdown' });
            
            // কনফার্মেশন ডেটা ম্যাপে সেভ করা
            pendingConfirmation.set(`${chatId}-${confirmationMsg.message_id}`, {
                targetFilename: targetFilename,
                fileUrl: fileUrl,
                isUpdate: true,
            });
            return;
        }

        // ফাইল না থাকলে সরাসরি ইনস্টল
        return handleInstall(bot, chatId, messageId, targetFilename, fileUrl, false);
    }
    
    // --- SUBCOMMAND: UNINSTALL ---
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
                delete global.COMMANDS[target];
            } else if (global.ALIASES[target]) {
                const name = global.ALIASES[target];
                delete global.COMMANDS[name];
            }

            // ফাইল ডিলিট করা
            await fs.unlink(filePath);

            return bot.sendMessage(chatId, `🗑️ Command \`${target}\` unloaded and file \`${filename}\` deleted successfully.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });

        } catch (e) {
            console.error("Uninstall error:", e);
            return bot.sendMessage(chatId, `❌ Failed to uninstall \`${target}\`. Error: ${e.message}`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
    }
    
    // --- SUBCOMMAND: LOAD ---
    if (subCommand === 'load') {
        if (!target) {
            return bot.sendMessage(chatId, "⚠️ Usage: `/cmd load <commandName>`", { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        return handleLoad(bot, chatId, messageId, target);
    }

    // --- SUBCOMMAND: UNLOAD ---
    if (subCommand === 'unload') {
        if (!target) {
            return bot.sendMessage(chatId, "⚠️ Usage: `/cmd unload <commandName>`", { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        }
        return handleUnload(bot, chatId, messageId, target);
    }

    // --- SUBCOMMAND: LOADALL ---
    if (subCommand === 'loadall') {
        return handleLoadAll(bot, chatId, messageId);
    }

    return bot.sendMessage(chatId, `❌ Unknown sub-command: \`${subCommand}\`.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
};

// --- হেল্পার ফাংশন ---

/**
 * ফাইল ইনস্টল এবং লোড করার লজিক
 * @param {object} bot - The Telegram bot instance.
 * @param {number} chatId - The chat ID.
 * @param {number} replyToMessageId - The message ID to reply to.
 * @param {string} targetFilename - The name of the file to save (e.g., test.js).
 * @param {string} fileUrl - The direct URL to download the file.
 * @param {boolean} isUpdate - True if overwriting an existing file.
 */
async function handleInstall(bot, chatId, replyToMessageId, targetFilename, fileUrl, isUpdate) {
    const filePath = path.join(COMMANDS_DIR, targetFilename);
    const commandName = targetFilename.replace('.js', '');

    try {
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const fileContent = Buffer.from(response.data);

        await fs.writeFile(filePath, fileContent);
        
        let statusMsg = isUpdate ? `🔄 Command \`${commandName}\` updated successfully.` : `✅ Command \`${commandName}\` installed successfully.`;
        
        // ইনস্টল করার পর লোড করার চেষ্টা
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

/**
 * নির্দিষ্ট কমান্ড লোড করার লজিক
 */
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

/**
 * নির্দিষ্ট কমান্ড আনলোড করার লজিক
 */
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

/**
 * সকল কমান্ড পুনরায় লোড করার লজিক
 */
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
                await loadCommand(commandName);
                successCount++;
            } catch (e) {
                console.error(`Failed to reload ${commandName}:`, e.message);
                failCount++;
            }
        }
    }
    
    // লোডিং মেসেজটি মুছে ফেলা
    await bot.deleteMessage(chatId, loadingMessageId).catch(err => console.error("Failed to delete loading message:", err.message));

    const finalMessage = `
✅ **Command Reload Summary:**
Successful reloads: ${successCount}
Failed reloads (Syntax/Missing): ${failCount}
Total command files scanned: ${files.length}
    `;

    return bot.sendMessage(chatId, finalMessage, { parse_mode: 'Markdown' });
}


/**
 * চেক করে যে নির্দিষ্ট ফাইলে কোনো ডেটা আছে কিনা
 */
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// --- গ্লোবাল ফাংশন ডিফাইনিং (যদি আপনার মেইন ফাইলে না থাকে) ---
// যদি আপনার মেইন `index.js` ফাইলে এই ফাংশনগুলি গ্লোবালি না থাকে, তবে এগুলি কাজ করবে না। 
// ধরে নিচ্ছি আপনার বট ফ্রেমওয়ার্কে এই ফাংশনগুলি (loadCommand, unloadCommand) আছে।

/*
// যদি আপনার ফ্রেমওয়ার্কে এই ফাংশনগুলি না থাকে:
function loadCommand(commandName) {
    // 1. মডিউল ক্যাশ থেকে কমান্ড মুছে ফেলা
    const filename = `${commandName}.js`;
    const filePath = path.join(COMMANDS_DIR, filename);
    delete require.cache[require.resolve(filePath)];

    // 2. মডিউল রিকোয়ার করে গ্লোবাল COMMANDS-এ যোগ করা
    const commandModule = require(filePath);
    global.COMMANDS[commandName] = commandModule.config;
    // এখানে ALIASES যুক্ত করার লজিক দরকার হবে
    if (commandModule.config.aliases) {
         commandModule.config.aliases.forEach(alias => {
             global.ALIASES[alias] = commandName;
         });
    }
}

function unloadCommand(commandName) {
    // কমান্ড গ্লোবাল লিস্ট থেকে মুছে ফেলা
    const commandModule = global.COMMANDS[commandName];
    if (commandModule) {
        // অ্যালিয়াস মুছে ফেলা
        if (commandModule.aliases) {
            commandModule.aliases.forEach(alias => {
                delete global.ALIASES[alias];
            });
        }
        delete global.COMMANDS[commandName];
    }
    // মডিউল ক্যাশ থেকে মুছে ফেলা দরকার নেই, কারণ নতুন করে লোড হচ্ছে না
}
*/
