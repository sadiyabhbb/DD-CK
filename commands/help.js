const path = require('path');

module.exports.config = {
    name: "help",
    credits: "MODIFIED LIKHON AHMED (Adapted by Gemini)",
    aliases: ["menu"],
    prefix: true,
    permission: 0,
    description: "Show all bot commands in styled format",
    tags: ["info", "core"]
};

if (!global.loadedCommands) {
    global.loadedCommands = []; 
}

module.exports.run = async (bot, m) => {
    const chatId = m.chat.id;
    const messageId = m.message_id;
    
    const args = m.text.split(/\s+/).slice(1);
    const prefix = global.PREFIX;
    
    const allCommands = global.loadedCommands.sort((a, b) => a.name.localeCompare(b.name));

    if (args.length > 0 && isNaN(args[0])) {
        const name = args[0].toLowerCase();
        
        const cmdConfig = allCommands.find(c => 
            c.name.toLowerCase() === name || 
            c.aliases?.includes(name)
        );

        if (!cmdConfig) {
            return bot.sendMessage(
                chatId,
                `❌ Command not found: ${name}`,
                { reply_to_message_id: messageId }
            );
        }

        const info = `
╔══ 『 COMMAND: ${cmdConfig.name.toUpperCase()} 』 ═╗
║ 📜 Name      : ${cmdConfig.name}
║ 🪶 Aliases   : ${cmdConfig.aliases?.join(", ") || "None"}
║ 👤 Credits   : ${cmdConfig.credits || "Unknown"}
║ 🔑 Permission: ${cmdConfig.permission == 0 ? "Everyone" : (cmdConfig.permission == 1 ? "Admin Only" : "Bot Owner Only")}
╠═════════════════╣
║ ℹ INFORMATION
║ ─────────────────
║ Cost        : Free
║ Description :
║   ${cmdConfig.description || "No description provided."}
║ Guide       : ${cmdConfig.guide?.en || `${prefix}${cmdConfig.name}`}
╠════════════════╣
║ ⚙ SETTINGS
║ ────────────────
║ 🚩 Prefix Required : ✓ Required
║ ⚜ Premium         : ✗ Free to Use
╚════════════════╝
`;
        return bot.sendMessage(
            chatId,
            info,
            { reply_to_message_id: messageId, parse_mode: "Markdown" }
        );
    }

    const perPage = 20;
    const totalCommands = allCommands.length;
    const totalPages = Math.ceil(totalCommands / perPage);
    const page = parseInt(args[0]) || 1;

    if (page < 1 || page > totalPages) {
        return bot.sendMessage(
            chatId,
            `❌ Page ${page} does not exist. Total pages: ${totalPages}`,
            { reply_to_message_id: messageId }
        );
    }

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const cmdsToShow = allCommands.slice(start, end);

    let msg = `╭─────────────◊\n`;
    cmdsToShow.forEach((cmd, index) => {
        const number = start + index + 1;
        msg += `│ ${number} ✧ ${prefix}${cmd.name}\n`;
    });
    msg += `╰───────────────◊\n\n`;

    msg += `╭─✦『 LIKHON BOT 』✦────────╮\n`;
    msg += `│                              │\n`;
    msg += `│ ✦ Total commands: ${totalCommands.toString().padEnd(15, " ")}│\n`;
    msg += `│ ✦ Page: ${page.toString().padEnd(22, " ")}│\n`;
    msg += `│ ✦ A Personal Telegram Bot     │\n`;
    msg += `│ ✦ ADMIN: 𝐋𝐈𝐊𝐇𝐎𝐍 𝐀𝐇𝐌𝐄𝐃        │\n`;
    msg += `│                              │\n`;
    msg += `│ ✦ Type ${prefix}help [commandName] for details. │\n`;
    msg += `╰──────────────────────╯`;

    return bot.sendMessage(
        chatId,
        msg,
        { reply_to_message_id: messageId }
    );
};
