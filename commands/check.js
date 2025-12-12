module.exports = {
  config: {
    name: "check",
    aliases: ["ck"],
    description: "Check bot status",
    credits: "LIKHON AHMED",
    prefix: true,
    permission: 0,
    tags: ["Mng"]
  },

  run: (bot, msg) => {
    const chatId = msg.chat.id;

    const uptimeMs = Date.now() - global.botStartTime;
    const uptime = formatUptime(uptimeMs);

    const reply = `
🤖 **Bot Status**
———————————————
📌 **Uptime:** ${uptime}
🔑 **Prefix:** \`${global.PREFIX}\`
👑 **Admin UID:** \`${global.CONFIG.ADMIN_UID}\`
🧠 **Bot Started:** ${new Date(global.botStartTime).toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' })}

© ${global.CONFIG.ADMIN_USERNAME}
`;

    bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  }
};

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));

  return `${day}d ${hr}h ${min}m ${sec}s`;
}
