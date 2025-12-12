module.exports = (bot, globalConfig, prefix) => {
  const commandConfig = {
    config: {
      name: "check",
      credits: "LIKHON AHMED",
      prefix: true,
      permission: 0,
      aliases: ["ck"],
      description: "Check Bot Status",
      tags: ["Mng"],
    },
  };

  const ADMIN_UID = globalConfig.ADMIN_UID;
  
  // ^${prefix} দিয়ে শুরু হওয়া নিশ্চিত করা হয়েছে, যা অন্য কোনো prefix (যেমন / বা !) ব্লক করবে।
  const checkRegex = new RegExp(`^${prefix}(check|ck)$`);

  const formatUptime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let parts = [];
    if (days > 0) parts.push(`${days} দিন`);
    if (hours > 0) parts.push(`${hours} ঘণ্টা`);
    if (minutes > 0) parts.push(`${minutes} মিনিট`);
    if (seconds > 0) parts.push(`${seconds} সেকেন্ড`);

    return parts.join(', ') || 'কিছু সেকেন্ড';
  };

  bot.onText(checkRegex, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (ADMIN_UID && commandConfig.config.permission !== 0 && userId !== ADMIN_UID) {
      return bot.sendMessage(chatId, "⚠️ এই কমান্ডটি শুধুমাত্র অ্যাডমিনের জন্য সংরক্ষিত।");
    }

    const startTime = global.botStartTime;
    if (!startTime) {
      return bot.sendMessage(chatId, "❌ আপটাইম তথ্য খুঁজে পাওয়া যায়নি।");
    }
    
    const uptimeMs = Date.now() - startTime;
    const uptimeFormatted = formatUptime(uptimeMs);

    const statusMessage = `
🤖 **বট স্ট্যাটাস চেক** (কমান্ড: ${commandConfig.config.name} / ${commandConfig.config.aliases.join(', ')})

- **সময়:** ${new Date().toLocaleTimeString('bn-BD', { timeZone: 'Asia/Dhaka' })}
- **আপটাইম (চলমান):** ${uptimeFormatted}
- **ক্রেডিট:** ${commandConfig.config.credits}
- **প্রিফিক্স:** \`${prefix}\`
- **এডমিন ইউজার আইডি:** \`${ADMIN_UID}\`
`;

    bot.sendMessage(chatId, statusMessage, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  });
  
  return commandConfig; 
};
