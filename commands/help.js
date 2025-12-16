const path = require('path');

module.exports.config = {
  name: "help",
  version: "1.0.3",
  credits: "LIKHON AHMED modified by Gemini",
  permission: 0, 
  prefix: true, 
  description: "Shows the command list and usage details.",
  category: "utility",
  usages: "help [pageNumber | commandName]",
  cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    const currentPrefix = global.CONFIG.BOT_SETTINGS.PREFIX || '/';

    const allCommands = global.loadedCommands; 
    const totalCommands = allCommands.length;
    const commandsPerPage = 20; 
    let page = 1;

    let isCommandDetail = false;

    if (args.length > 0) {
        if (!isNaN(args[0]) && parseInt(args[0]) > 0) {
            page = parseInt(args[0]);
        } else {
            const commandName = args[0].toLowerCase();
            const commandModule = global.COMMANDS[commandName] || global.COMMANDS[global.ALIASES[commandName]];

            if (commandModule && commandModule.config) {
                isCommandDetail = true;
                const config = commandModule.config;
                
                const aliases = (config.aliases && config.aliases.length > 0) ? config.aliases.join(", ") : "None";
                const credits = config.credits || "N/A";
                const permissionLevel = config.permission === 0 ? "Everyone" : (config.permission === 1 ? "Admins" : "Owner");
                const prefixRequired = config.prefix === false ? '✗ Not Required' : '✓ Required';
                const premiumStatus = '✗ Free to Use'; 
                
                const helpDetail = `
╔══ 『 COMMAND: ${config.name.toUpperCase()} 』 ═╗
║ 📜 Name      : ${config.name}
║ 🪶 Aliases   : ${aliases}
║ 👤 Credits   : ${credits}
║ 🔑 Permission: ${permissionLevel}
╠═════════════════╣
║ ℹ INFORMATION
║ ─────────────────
║ Cost        : Free
║ Description :
║   ${config.description || "No description provided."}
║ Guide       : ${currentPrefix}${config.usages || config.name}
╠════════════════╣
║ ⚙ SETTINGS
║ ────────────────
║ 🚩 Prefix Required : ${prefixRequired}
║ ⚜ Premium         : ${premiumStatus}
╚════════════════╝
`;
                return bot.sendMessage(chatId, helpDetail, { reply_to_message_id: messageId });
            } else {
                return bot.sendMessage(chatId, `❌ কমান্ড "${args[0]}" খুঁজে পাওয়া যায়নি।`, { reply_to_message_id: messageId });
            }
        }
    }
    
    if (!isCommandDetail) {
        
        const maxPages = Math.ceil(totalCommands / commandsPerPage);
        if (page < 1) page = 1;
        if (page > maxPages) page = maxPages;

        const start = (page - 1) * commandsPerPage;
        const end = start + commandsPerPage;
        const commandList = allCommands.slice(start, end);

        let listText = `╭─────────────◊\n`;

        commandList.forEach((cmd, index) => {
            const globalIndex = start + index + 1;
            listText += `│ ${globalIndex} ✧ ${currentPrefix}${cmd.name}\n`;
        });
        listText += `╰───────────────◊\n\n`;

        const adminName = global.CONFIG.OWNER.USERNAME || "𝐋𝐈𝐊𝐇𝐎𝐍 𝐀𝐇𝐌𝐄𝐃";
        
        const footerText = `
╭─✦『 LIKHON BOT 』✦────────╮
│                              │
│ ✦ Total commands: ${totalCommands}             │ 
│ ✦ Page: ${page} / ${maxPages}                     │
│ ✦ A Personal Telegram Bot     │
│ ✦ ADMIN: ${adminName}        │
│                              │
│ ✦ Type ${currentPrefix}help [commandName] for details. │
╰──────────────────────╯
`;

        bot.sendMessage(chatId, listText + footerText, { reply_to_message_id: messageId });
    }
};
