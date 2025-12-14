const axios = require('axios');

module.exports.config = {
    name: "translate",
    credits: "LIKHON AHMED",
    aliases: ["tr", "tl"],
    prefix: true,
    permission: 0,
    description: "অনুবাদের জন্য ব্যবহৃত হয়। মেসেজ রিপ্লাই করে বা কোড এবং টেক্সট দিয়ে ব্যবহার করুন।",
    tags: ["utility", "tools"]
};

const DEFAULT_TARGET_LANG = "bn"; 

const SUPPORTED_LANGS = {
    "en": "English",
    "bn": "Bengali (Bangla)",
    "hi": "Hindi",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "auto": "Automatic Detection"
};


module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    let targetLang = DEFAULT_TARGET_LANG;
    let textToTranslate = '';
    
    const usage = `
❌ **Invalid Usage!**
Usage:
1. **Reply to a message:** \`${global.PREFIX}tr [target_lang_code]\`
   Example: Reply to English text with \`${global.PREFIX}tr bn\`
2. **With text:** \`${global.PREFIX}tr [target_lang_code] [text]\`
   Example: \`${global.PREFIX}tr en আমি ভালো আছি\`

Supported Codes (Examples): \`en, bn, hi, fr, es, de\`
(Default target is \`${DEFAULT_TARGET_LANG}\`)
    `;


    if (msg.reply_to_message) {
        textToTranslate = msg.reply_to_message.text || msg.reply_to_message.caption;
        
        if (args[0]) {
            targetLang = args[0].toLowerCase();
        }
        
    } else if (args.length >= 2) {
        
        let possibleLang = args[0].toLowerCase();
        
        if (possibleLang.length <= 5 && possibleLang.match(/^[a-z\-]+$/)) { 
            targetLang = possibleLang;
            textToTranslate = args.slice(1).join(" ");
        } else {
            targetLang = DEFAULT_TARGET_LANG;
            textToTranslate = args.join(" ");
        }
    } else if (args.length === 1 && !msg.reply_to_message) {
        textToTranslate = args[0];
        targetLang = DEFAULT_TARGET_LANG;
    }


    if (!textToTranslate || textToTranslate.trim() === '') {
        return bot.sendMessage(chatId, usage, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }

    if (targetLang.length > 5) {
         return bot.sendMessage(chatId, `❌ Invalid language code: **${targetLang}**. Please use a standard code (e.g., \`en\`, \`bn\`).`, { reply_to_message_id: messageId, parse_mode: 'Markdown' });
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;

        const response = await axios.get(url, {
             headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        let translatedText = '';
        if (response.data && response.data[0]) {
            response.data[0].forEach(item => {
                translatedText += item[0];
            });
        }
        
        const detectedLangCode = response.data[2] || 'auto';
        const detectedLangName = SUPPORTED_LANGS[detectedLangCode] || detectedLangCode;
        const targetLangName = SUPPORTED_LANGS[targetLang] || targetLang;


        if (!translatedText) {
            return bot.sendMessage(chatId, `❌ Translation failed. The API did not return a valid translation.`, { reply_to_message_id: messageId });
        }


        const resultMessage = `
🌐 **Translation Result**
━━━━━━━━━━━━━━━
**Original (${detectedLangName}):**
${textToTranslate.substring(0, 1000)}

**Translated (${targetLangName}):**
${translatedText.substring(0, 1000)}
        `;

        await bot.sendMessage(chatId, resultMessage.trim(), { reply_to_message_id: messageId, parse_mode: 'Markdown' });

    } catch (error) {
        console.error("❌ Translation API Error:", error.message);
        bot.sendMessage(chatId, "❌ An error occurred during translation. The API may be temporarily unavailable.", { reply_to_message_id: messageId });
    }
};
