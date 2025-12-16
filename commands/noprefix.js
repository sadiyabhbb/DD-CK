const fs = require('fs-extra');
const path = require('path');

const settingsPath = path.join(__dirname, '..', 'noprefix_settings.json'); 

module.exports.config = {
  name: "noprefix",
  version: "1.0.1", 
  credits: "LIKHON AHMED modified by Gemini",
  permission: 2, 
  prefix: true,
  description: "Turns global noprefix mode ON or OFF.",
  category: "admin",
  usages: "/noprefix [on | off]",
  cooldowns: 5,
};

async function loadSettings() {
    if (fs.existsSync(settingsPath)) {
        return await fs.readJson(settingsPath);
    }
    return { isNoprefixActive: false }; 
}

async function saveSettings(settings) {
    await fs.writeJson(settingsPath, settings, { spaces: 2 });
}

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    const ownerID = global.CONFIG.OWNER.ID.toString();
    const senderID = msg.from.id.toString();

    if (senderID !== ownerID) {
         return bot.sendMessage(
            chatId, 
            "❌ **অনুমতি নেই।** এই কমান্ডটি শুধুমাত্র বটের মালিক ব্যবহার করতে পারবে।", 
            { reply_to_message_id: messageId }
        );
    }
    
    if (args.length === 0) {
        // স্ট্যাটাস সরাসরি গ্লোবাল ভ্যারিয়েবল থেকে দেখানো
        const status = global.isNoprefixActive ? '✅ চালু' : '❌ বন্ধ';
        return bot.sendMessage(
            chatId, 
            `✨ **নন-প্রিফিক্স মোড স্ট্যাটাস:** ${status}\nব্যবহার: \`${global.CONFIG.BOT_SETTINGS.PREFIX || '/'}noprefix [on|off]\``,
            { reply_to_message_id: messageId, parse_mode: 'Markdown' }
        );
    }

    const action = args[0].toLowerCase();
    
    if (action === 'on' || action === 'off') {
        let settings = await loadSettings();
        const newState = action === 'on';

        if (settings.isNoprefixActive === newState) {
            return bot.sendMessage(
                chatId, 
                `⚠️ নন-প্রিফিক্স মোড ইতিমধ্যে ${newState ? 'চালু' : 'বন্ধ'} আছে।`, 
                { reply_to_message_id: messageId }
            );
        }

        // 1. ফাইলে পরিবর্তন সেভ করা
        settings.isNoprefixActive = newState;
        await saveSettings(settings);
        
        // 2. 💡 রানটাইমে নন-প্রিফিক্স সেটিংস রিলোড করা
        await global.reloadNoprefixSettings(); 

        await bot.sendMessage(
            chatId, 
            `✅ **নন-প্রিফিক্স মোড সফলভাবে ${newState ? 'চালু' : 'বন্ধ'} করা হয়েছে।**\n\n✨ **পরিবর্তনগুলি কার্যকর করা হয়েছে (রিস্টার্ট ছাড়াই)।**`,
            { reply_to_message_id: messageId, parse_mode: 'Markdown' }
        );

    } else {
        return bot.sendMessage(
            chatId, 
            "❌ অবৈধ আর্গুমেন্ট। `on` অথবা `off` ব্যবহার করুন।", 
            { reply_to_message_id: messageId }
        );
    }
};
