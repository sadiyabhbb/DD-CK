const fs = require('fs-extra');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'config.js'); 

module.exports.config = {
  name: "prefix",
  version: "1.0.2",
  credits: "Dipto modified for Telegram Prefix by Gemini",
  permission: 2, 
  prefix: true,
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

    if (args.length > 0) {
        if (module.exports.config.permission > 0 && !msg.isOwner) { 
             return bot.sendMessage(
                chatId, 
                "❌ **প্রিফিক্স পরিবর্তন করতে আপনি অনুমোদিত নন।** এই কমান্ডটি শুধুমাত্র অ্যাডমিন/মালিকের জন্য।", 
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
            currentConfig.BOT_SETTINGS.PREFIX = newPrefix;
            
            if (global.config && global.config.BOT_SETTINGS) {
                 global.config.BOT_SETTINGS.PREFIX = newPrefix;
            }

            const newContent = `module.exports = ${JSON.stringify(currentConfig, null, 2)};\n`;

            fs.writeFileSync(configPath, newContent, 'utf8');

            return bot.sendMessage(
                chatId, 
                `✅ **প্রিফিক্স সফলভাবে পরিবর্তন করা হয়েছে।**\nনতুন প্রিফিক্স: \`${newPrefix}\`\n\n⚠️ **বটটি রিস্টার্ট করার প্রয়োজন হতে পারে।**`,
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
