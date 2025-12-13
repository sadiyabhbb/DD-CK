const fs = require('fs/promises');
const path = require('path');

module.exports.config = {
    name: "admin",
    credits: "LIKHON X TISHA",
    aliases: ["ad", "adlist"],
    prefix: true,
    permission: 2,
    description: "Manage bot admin list (Add, Remove, List).",
    tags: ["system", "admin"]
};

const CONFIG_FILE_PATH = path.resolve(process.cwd(), 'config.json'); 

async function getUserInfo(bot, chatId, userId) {
    try {
        const member = await bot.getChatMember(chatId, userId);
        let name = member.user.first_name || 'N/A';
        if (member.user.last_name) {
            name += ' ' + member.user.last_name;
        }
        if (member.user.username) {
            name += ` (@${member.user.username})`;
        }
        return name;
    } catch (error) {
        return 'Unknown User (Error fetching name)';
    }
}

async function addAdmin(userId) {
    if (!global.CONFIG || !global.CONFIG.BOT_SETTINGS || !global.CONFIG.BOT_SETTINGS.ADMINS) {
        return false; 
    }
    
    const adminList = global.CONFIG.BOT_SETTINGS.ADMINS;
    const userIdStr = userId.toString();

    if (adminList.includes(userIdStr)) {
        return "already_admin";
    }

    adminList.push(userIdStr);
    
    try {
        const configData = JSON.stringify(global.CONFIG, null, 2);
        await fs.writeFile(CONFIG_FILE_PATH, configData, 'utf8');
        return "added";
    } catch (e) {
        return "error_saving";
    }
}

async function removeAdmin(userId) {
    if (!global.CONFIG || !global.CONFIG.BOT_SETTINGS || !global.CONFIG.BOT_SETTINGS.ADMINS) {
        return false; 
    }
    
    const adminList = global.CONFIG.BOT_SETTINGS.ADMINS;
    const userIdStr = userId.toString();

    const index = adminList.indexOf(userIdStr);
    
    if (index === -1) {
        return "not_admin";
    }

    adminList.splice(index, 1); 
    
    try {
        const configData = JSON.stringify(global.CONFIG, null, 2);
        await fs.writeFile(CONFIG_FILE_PATH, configData, 'utf8');
        return "removed";
    } catch (e) {
        return "error_saving";
    }
}

module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const senderId = msg.from.id;
    const args = msg.text.split(/\s+/).slice(1);
    const prefix = global.PREFIX;
    
    const botOwnerId = global.CONFIG?.BOT_SETTINGS?.ADMINS?.[0];
    if (botOwnerId !== senderId.toString()) {
         return bot.sendMessage(chatId, `❌ Permission denied. Only the Bot Owner (${botOwnerId || 'Not Set'}) can use this command.`, { reply_to_message_id: messageId });
    }

    const action = args[0]?.toLowerCase();
    let targetId;

    if (action === "add" || action === "remove") {
        
        if (msg.reply_to_message) {
            targetId = msg.reply_to_message.from.id;
        } else if (args[1] && !isNaN(args[1])) {
            targetId = args[1];
        } else {
            return bot.sendMessage(chatId, `⚠️ Usage: ${prefix}admin ${action} [user_id] or reply to a message.`, { reply_to_message_id: messageId });
        }
    }
    
    if (action === "add") {
        const result = await addAdmin(targetId);
        const name = await getUserInfo(bot, chatId, targetId); 
        
        if (result === "added") {
            return bot.sendMessage(chatId, `✅ Successfully added **${name}** (ID: ${targetId}) as a Bot Admin.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        } else if (result === "already_admin") {
            return bot.sendMessage(chatId, `⚠️ **${name}** (ID: ${targetId}) is already a Bot Admin.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        } else {
            return bot.sendMessage(chatId, `❌ Failed to add admin.`, { reply_to_message_id: messageId });
        }
        
    } else if (action === "remove") {
        
        if (targetId.toString() === senderId.toString()) {
            return bot.sendMessage(chatId, `❌ You cannot remove yourself from the admin list.`, { reply_to_message_id: messageId });
        }
        
        const result = await removeAdmin(targetId);
        const name = await getUserInfo(bot, chatId, targetId);
        
        if (result === "removed") {
            return bot.sendMessage(chatId, `✅ Successfully removed **${name}** (ID: ${targetId}) from the Bot Admin list.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        } else if (result === "not_admin") {
            return bot.sendMessage(chatId, `⚠️ **${name}** (ID: ${targetId}) is not a Bot Admin.`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
        } else {
            return bot.sendMessage(chatId, `❌ Failed to remove admin.`, { reply_to_message_id: messageId });
        }

    } else if (action === "list" || !action) {
        
        const admins = global.CONFIG?.BOT_SETTINGS?.ADMINS || [];
        
        if (admins.length === 0) {
            return bot.sendMessage(chatId, `ℹ️ The Bot Admin list is currently empty.`, { reply_to_message_id: messageId });
        }

        let adminListMsg = "╭━━━━━━❰ 👑 BOT ADMINS ❱━━━━━━╮\n";
        
        for (let i = 0; i < admins.length; i++) {
            const id = admins[i];
            const name = await getUserInfo(bot, chatId, id); 
            adminListMsg += `│ ${i + 1}. ${name} (ID: ${id})\n`;
        }

        adminListMsg += "╰━━━━━━━━━━━━━━━━━━━━━━❍";

        return bot.sendMessage(chatId, adminListMsg, { reply_to_message_id: messageId });

    } else {
        return bot.sendMessage(chatId, 
            `⚠️ Invalid action. Usage:\n` +
            `» ${prefix}admin add [user_id]\n` +
            `» ${prefix}admin remove [user_id]\n` +
            `» ${prefix}admin list`, 
            { reply_to_message_id: messageId }
        );
    }
};
