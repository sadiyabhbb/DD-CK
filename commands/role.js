const fs = require('fs').promises;
const path = require('path');

module.exports.config = {
    name: "role",
    credits: "LIKHON AHMED",
    aliases: ["cmdrole", "cperm"],
    prefix: true, 
    permission: 2,
    description: "Sets the required permission level for a specific command file.",
    tags: ["admin", "config"]
};

const COMMANDS_PATH = path.join(__dirname, '..', 'commands');

const PERMISSION_LEVELS = {
    0: "User",
    1: "Admin",
    2: "Sudo/Bot Owner"
};

async function isSenderSudo(senderId) {
    if (global.CONFIG.BOT_SETTINGS.ADMIN_IDS && global.CONFIG.BOT_SETTINGS.ADMIN_IDS.includes(senderId.toString())) {
        return true; 
    }
    return false; 
}

async function updateCommandPermission(commandName, newLevel) {
    const filename = `${commandName}.js`;
    const filePath = path.join(COMMANDS_PATH, filename);

    const levelStr = String(newLevel);
    
    let content = await fs.readFile(filePath, 'utf-8');

    const permissionRegex = /(module\.exports\.config\s*=\s*{[^}]*?permission\s*:\s*)\d+(\s*,\s*[^}]*?})/s;
    
    if (!permissionRegex.test(content)) {
        throw new Error("Could not find 'permission' property in command config.");
    }

    const newContent = content.replace(permissionRegex, (match, prefix, suffix) => {
        return prefix + levelStr + suffix;
    });

    await fs.writeFile(filePath, newContent, 'utf-8');
    
    if (global.unloadCommand && global.loadCommand) {
        global.unloadCommand(commandName);
        global.loadCommand(commandName);
    }
}


module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const senderId = msg.from.id;

    if (!(await isSenderSudo(senderId))) {
        return bot.sendMessage(chatId, "🚫 **Permission Denied!** You must be a Sudo/Bot Owner to use this command.", { reply_to_message_id: messageId });
    }

    if (args.length !== 2) {
        const usageMessage = `
❌ **Invalid Usage!**
Usage: \`${global.PREFIX}role <command_name> <new_level>\`
Example: \`${global.PREFIX}role hi 1\`

Levels:
\`0\`: ${PERMISSION_LEVELS[0]} (User)
\`1\`: ${PERMISSION_LEVELS[1]} (Admin)
\`2\`: ${PERMISSION_LEVELS[2]} (Sudo/Owner)
        `;
        return bot.sendMessage(chatId, usageMessage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }

    const commandName = args[0].toLowerCase();
    const newLevel = parseInt(args[1]);

    if (isNaN(newLevel) || newLevel < 0 || newLevel > 2) {
        return bot.sendMessage(chatId, "❌ **Invalid Permission Level!** Level must be 0, 1, or 2.", { reply_to_message_id: messageId });
    }
    if (commandName === "role" || commandName === module.exports.config.name) {
        return bot.sendMessage(chatId, "⚠️ Cannot change the role of the 'role' command itself to prevent lockouts.", { reply_to_message_id: messageId });
    }
    if (!global.COMMANDS[commandName]) {
        return bot.sendMessage(chatId, `❌ **Command Not Found!** No command named \`${commandName}\` is currently loaded.`, { reply_to_message_id: messageId });
    }
    
    try {
        await updateCommandPermission(commandName, newLevel);

        const successMessage = `
✅ **Command Role Updated!**
🤖 **Command:** \`${commandName}\`
📊 **New Required Role:** ${PERMISSION_LEVELS[newLevel]} (Level ${newLevel})
        `;
        await bot.sendMessage(chatId, successMessage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });

    } catch (error) {
        console.error(`❌ Error updating role for ${commandName}:`, error.message);
        bot.sendMessage(chatId, `❌ Failed to update role for \`${commandName}\`. Reason: ${error.message.substring(0, 100)}`, { reply_to_message_id: messageId });
    }
};
