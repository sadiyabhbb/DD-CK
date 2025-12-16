const fs = require('fs-extra');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'config.js'); 

module.exports.config = {
  name: "prefix",
  version: "1.0.5", 
  credits: "Dipto modified for Telegram Prefix by Gemini",
  permission: 2, 
  prefix: false,
  description: "Shows the current prefix and allows changing it.",
  category: "utility",
  usages: "/prefix [new prefix]",
  cooldowns: 5,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    
    let currentConfig;
    try {
        delete require.cache[require.resolve(configPath)]; 
        currentConfig = require(configPath);
    } catch (e) {
        return bot.sendMessage(
            chatId, 
            `❌ কনফিগারেশন ফাইল লোড করতে ব্যর্থ। নিশ্চিত করুন \`config/config.js\` বিদ্যমান।`, 
            { reply_to_message_id: messageId }
        );
    }
    
    const currentPrefix = currentConfig.BOT_SETTINGS.PREFIX || '/';
    
    const ownerID = currentConfig.OWNER.ID.toString();
    const senderID = msg.from.id.toString();

    if (args.length > 0) {
        
        if (module.exports.config.permission > 0 && senderID !== ownerID) { 
             return bot.sendMessage(
                chatId, 
                "❌ **প্রিফিক্স পরিবর্তন করতে আপনি অনুমোদিত নন।** এই কমান্ডটি শুধুমাত্র মালিকের জন্য।", 
                { reply_to_message_id: messageId }
            );
        }
        
        const newPrefix = args[0].trim();
        if (newPrefix.length > 5) {
             return bot.sendMessage(
                chatId, 
                "❌ প্রিফিক্সটি খুব লম্বা। ৫ অক্ষরের মধ্যে রাখুন।", 
                { reply_to_message_id: messageId }
            );
        }
        
        try {
            // 1. ফাইলে পরিবর্তন সেভ করা
            currentConfig.BOT_SETTINGS.PREFIX = newPrefix;
            const newContent = `module.exports = ${JSON.stringify(currentConfig, null, 2)};\n`;
            fs.writeFileSync(configPath, newContent, 'utf8');
            
            // 2. 💡 রানটাইমে কনফিগারেশন রিলোড করা
            global.reloadConfig();

            await bot.sendMessage(
                chatId, 
                `✅ **প্রিফিক্স সফলভাবে পরিবর্তন করা হয়েছে।**\nনতুন প্রিফিক্স: \`${newPrefix}\`\n\n✨ **পরিবর্তনগুলি কার্যকর করা হয়েছে (রিস্টার্ট ছাড়াই)।**`,
                { reply_to_message_id: messageId, parse_mode: 'Markdown' }
            );

        } catch (error) {
            console.error("❌ Prefix change failed:", error);
            return bot.sendMessage(
                chatId, 
                "❌ প্রিফিক্স পরিবর্তন করতে ব্যর্থ। নিশ্চিত করুন `config/config.js`-এ লেখার অনুমতি আছে।", 
                { reply_to_message_id: messageId }
            );
        }
    } 
    
    else {
        return bot.sendMessage(
            chatId, 
            `✨ **বর্তমান প্রিফিক্স:** \`${currentPrefix}\``, 
            { reply_to_message_id: messageId, parse_mode: 'Markdown' }
        );
    }
};
