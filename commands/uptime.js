const os = require('os');
const moment = require('moment-timezone');
const { exec } = require('child_process');

module.exports.config = {
    name: "uptime",
    credits: "LIKHON X TISHA",
    aliases: ["status"],
    prefix: true,
    permission: 0,
    description: "Display bot and system status.",
    tags: ["info", "system"]
};

module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    const imageUrl = "https://files.catbox.moe/jzc9l3.jpg";
    
    const author = transformText("MOHAMMAD-BADOL");
    const botName = transformText(global.CONFIG?.BOT_SETTINGS?.NAME || "BADOL BOT");
    const prefix = transformText(global.PREFIX);
    const bdTime = transformText(moment().tz("Asia/Dhaka").format("MM/DD/YYYY, h:mm:ss A"));
    const ramUsed = (os.totalmem() - os.freemem()) / (1024 ** 3);
    const ramTotal = os.totalmem() / (1024 ** 3);
    const uptimeMs = Date.now() - global.botStartTime;
    const uptimeFormatted = transformText(formatUptime(uptimeMs));

    const startTime = Date.now();
    
    getCpuLoad(async (cpuLoad) => {
        const endTime = Date.now();
        const ping = transformText((endTime - startTime) + " ms");
        const cpuLoadFormatted = transformText(cpuLoad + " %");
        const ramUsedFormatted = transformText(`${ramUsed.toFixed(2)} GB / ${ramTotal.toFixed(2)} GB`);

        const output = `
${transformText("╭━━━━━━❰ 🌟 BADOL-BOT 🌟 ❱━━━━━━╮")}
${transformText("│")} 👤 ${transformText("Author")}: ${author}
${transformText("│")} 🤖 ${transformText("Bot Name")}: ${botName}
${transformText("│")} ⏹ ${transformText("Prefix")}: ${prefix}
${transformText("╰━━━━━━━━━━━━━━━━━━━━━━❍")}

${transformText("╭━━━━━━❰ 🕒 SYSTEM STATUS ❱━━━━━━╮")}
${transformText("│")} 🕒 ${transformText("BD Time")}: ${bdTime}
${transformText("│")} ⏱ ${transformText("Uptime")}: ${uptimeFormatted}
${transformText("│")} 📡 ${transformText("Ping")}: ${ping}
${transformText("│")} 🧠 ${transformText("CPU Load")}: ${cpuLoadFormatted}
${transformText("│")} 📦 ${transformText("RAM Used")}: ${ramUsedFormatted}
${transformText("│")} 🖥 ${transformText("Server")}: ${transformText("Online")} ✅
${transformText("╰━━━━━━━━━━━━━━━━━━━━━━❍")}
        `.trim();

        try {
            await bot.sendPhoto(
                chatId,
                imageUrl,
                { caption: output, reply_to_message_id: messageId }
            );
        } catch (e) {
            await bot.sendMessage(
                chatId,
                output,
                { reply_to_message_id: messageId }
            );
        }
    });
};

function transformText(text) {
    const map = {
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠',
        'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺',
        'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
    };
    let result = '';
    for (const char of text) {
        result += map[char] || char;
    }
    return result;
}

function formatUptime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function getCpuLoad(callback) {
    const start = os.cpus().map(cpu => cpu.times);
    
    setTimeout(() => {
        const end = os.cpus().map(cpu => cpu.times);
        let totalIdle = 0;
        let totalTick = 0;

        for (let i = 0; i < start.length; i++) {
            const idle = end[i].idle - start[i].idle;
            const total = (end[i].user - start[i].user) + (end[i].nice - start[i].nice) + (end[i].sys - start[i].sys) + idle + (end[i].irq - start[i].irq);
            totalIdle += idle;
            totalTick += total;
        }

        const cpuLoad = 100 * (totalTick - totalIdle) / totalTick;
        callback(cpuLoad.toFixed(2));
    }, 1000); 
  }
