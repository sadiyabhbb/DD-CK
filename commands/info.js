const os = require('os');

module.exports.config = {
    name: "info",
    aliases: ["botinfo", "status"],
    version: "1.0.0",
    permission: 0,
    prefix: true,
    category: "system",
    credits: "LIKHON AHMED",
    description: "View Bot, Admin, and Server Information.",
    usages: "info",
    cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

  
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

  
    const ramTotal = (os.totalmem() / (1024 ** 3)).toFixed(2);
    const ramFree = (os.freemem() / (1024 ** 3)).toFixed(2);
    const ramUsed = (ramTotal - ramFree).toFixed(2);
    const cpuModel = os.cpus()[0].model;

    
    const botName = global.CONFIG.BOT_SETTINGS.NAME || "Telegram Bot";
    const prefix = global.CONFIG.BOT_SETTINGS.PREFIX || "/";
    const owner = "𝐋𝐈𝐊𝐇𝐎𝐍 𝐀𝐇𝐌𝐄𝐃"; 
    const ownerUser = "@LIKHONAHMED009"; 

    const infoMessage = `
╔═════ 💫 **𝐁𝐎𝐓 𝐈𝐍𝐅𝐎** ═════╗

👤 **𝐎𝐰𝐧𝐞𝐫:** ${owner}
⭐ **𝐔𝐬𝐞𝐫𝐧𝐚𝐦𝐞:** ${ownerUser}
🤖 **𝐁𝐨𝐭 𝐍𝐚𝐦𝐞:** ${botName}
⚙️ **𝐏𝐫𝐞𝐟𝐢𝐱:** ${prefix}
🚀 **𝐔𝐩𝐭𝐢𝐦𝐞:** ${hours}h ${minutes}m ${seconds}s

📊 **𝐒𝐞𝐫𝐯𝐞𝐫 𝐒𝐭𝐚𝐭𝐮𝐬:**
🖥️ **𝐂𝐏𝐔:** ${cpuModel}
📟 **𝐑𝐀𝐌:** ${ramUsed}GB / ${ramTotal}GB
🌐 **𝐏𝐥𝐚𝐭𝐟𝐨𝐫𝐦:** ${os.platform()} (${os.arch()})

🔗 **𝐂𝐨𝐧𝐭𝐚𝐜𝐭:** [Click Here](t.me/LIKHONAHMED009)

╚═══════════════════╝
    `;

    
    try {
        await bot.sendMessage(chatId, infoMessage, { 
            reply_to_message_id: messageId,
            parse_mode: 'Markdown',
            disable_web_page_preview: false 
        });
    } catch (error) {
        console.error("Info Command Error:", error.message);
    }
};
