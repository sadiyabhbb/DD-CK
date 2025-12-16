const path = require('path');

module.exports.config = {
  name: "help",
  version: "1.0.1",
  credits: "LIKHON AHMED modified by Gemini",
  permission: 0, 
  prefix: false, 
  description: "Shows the command list and usage details.",
  category: "utility",
  usages: "help [commandName]",
  cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    // 🚩 রানটাইমে গ্লোবাল কনফিগ থেকে প্রিফিক্স নেওয়া
    const currentPrefix = global.CONFIG.BOT_SETTINGS.PREFIX || '/';

    // 💡 কমান্ডের তালিকা
    const allCommands = global.loadedCommands.filter(cmd => cmd.name !== 'help');
    const totalCommands = allCommands.length;
    const commandsPerPage = 20; 
    let page = 1;

    if (args.length > 0) {
        // যদি আর্গুমেন্ট থাকে, কমান্ডের বিস্তারিত দেখাও
        const commandName = args[0].toLowerCase();
        const commandModule = global.COMMANDS[commandName] || global.COMMANDS[global.ALIASES[commandName]];

        if (commandModule && commandModule.config) {
            const config = commandModule.config;
            const aliases = (config.aliases && config.aliases.length > 0) ? config.aliases.join(", ") : "None";
            const permissionLevel = config.permission === 0 ? "All Users" : (config.permission === 1 ? "Admins" : "Owner");

            const helpDetail = `
╭─✦『 𝐂𝐨𝐦𝐦𝐚𝐧𝐝 𝐈𝐧𝐟𝐨 』✦
│
│ ✦ 𝐍𝐚𝐦𝐞: ${config.name}
│ ✦ 𝐀𝐥𝐢𝐚𝐬𝐞𝐬: ${aliases}
│ ✦ 𝐃𝐞𝐬𝐜𝐫𝐢𝐩𝐭𝐢𝐨𝐧: ${config.description || "No description provided."}
│ ✦ 𝐔𝐬𝐚𝐠𝐞: ${currentPrefix}${config.usages || config.name}
│ ✦ 𝐂𝐚𝐭𝐞𝐠𝐨𝐫𝐲: ${config.category || "General"}
│ ✦ 𝐏𝐞𝐫𝐦𝐢𝐬𝐬𝐢𝐨𝐧: ${permissionLevel}
╰───────────────────────
`;
            return bot.sendMessage(chatId, helpDetail, { reply_to_message_id: messageId });
        } else {
            return bot.sendMessage(chatId, `❌ কমান্ড "${args[0]}" খুঁজে পাওয়া যায়নি।`, { reply_to_message_id: messageId });
        }
    }

    // আর্গুমেন্ট না থাকলে, কমান্ডের তালিকা দেখাও
    if (args[0] && !isNaN(args[0])) {
        page = parseInt(args[0]);
    }
    
    const maxPages = Math.ceil(totalCommands / commandsPerPage);
    if (page < 1) page = 1;
    if (page > maxPages) page = maxPages;

    const start = (page - 1) * commandsPerPage;
    const end = start + commandsPerPage;
    const commandList = allCommands.slice(start, end);

    let listText = `╭─────────────◊\n`;

    commandList.forEach((cmd, index) => {
        const globalIndex = start + index + 1;
        // 🚩 প্রিফিক্স যুক্ত করে কমান্ড প্রিন্ট করা
        listText += `│ ${globalIndex} ✧ ${currentPrefix}${cmd.name}\n`;
    });
    listText += `╰───────────────◊\n\n`;

    const adminName = global.CONFIG.OWNER.USERNAME || "𝐋𝐈𝐊𝐇𝐎𝐍 𝐀𝐇𝐌𝐄𝐃";
    
    const footerText = `
╭─✦『 LIKHON BOT 』✦────────╮
│                              │
│ ✦ Total commands: ${totalCommands + 1}             │ 
│ ✦ Page: ${page} / ${maxPages}                     │
│ ✦ A Personal Telegram Bot     │
│ ✦ ADMIN: ${adminName}        │
│                              │
│ ✦ Type ${currentPrefix}help [commandName] for details. │
╰──────────────────────╯
`;

    bot.sendMessage(chatId, listText + footerText, { reply_to_message_id: messageId });
};
