const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
  name: "emailgenerator",
  aliases: ["emailgen", "dotgen"],
  version: "1.3.0",
  permission: 0,
  prefix: true,
  category: "utility",
  credits: "LIKHON AHMED",
  description: "Generate Gmail dot variations with numbering and spacing.",
  usages: "emailgenerator [email]",
  cooldowns: 05,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const inputEmail = args[0];

    if (!inputEmail || !inputEmail.includes("@gmail.com")) {
        return bot.sendMessage(chatId, "⚠️ Please provide a valid Gmail address.\nExample: `/emailgenerator example@gmail.com`", { 
            reply_to_message_id: messageId,
            parse_mode: 'Markdown'
        });
    }

    const [username, domain] = inputEmail.split('@');
    
    if (username.length > 15) {
        return bot.sendMessage(chatId, "❌ Username too long!");
    }

    const waitMsg = await bot.sendMessage(chatId, "⏳ Generating variations...", { reply_to_message_id: messageId });

    function generateDotVariations(str) {
        let results = [];
        let n = str.length;
        for (let i = 0; i < (1 << (n - 1)); i++) {
            let combination = "";
            for (let j = 0; j < n; j++) {
                combination += str[j];
                if ((i >> j) & 1) {
                    combination += ".";
                }
            }
            results.push(combination + "@" + domain);
        }
        return results;
    }

    try {
        const allEmails = generateDotVariations(username);
        const limitedEmails = allEmails.slice(0, 100); 
        
        let responseText = `📧 Email Variations (Top 100):\n\n`;
        
        limitedEmails.forEach((email, index) => {
            
            responseText += `${index + 1}. \`${email}\` \n\n`;
        });

        if (allEmails.length > 100) {
            responseText += `\n🔹 _Total ${allEmails.length} found. Full list is in the file._`;
        }

        
        if (responseText.length > 4000) {
            const shortText = `⚠️ Text is too long for Telegram message due to spaces. Sending full file instead...`;
            await bot.editMessageText(shortText, { chat_id: chatId, message_id: waitMsg.message_id });
        } else {
            await bot.editMessageText(responseText, {
                chat_id: chatId,
                message_id: waitMsg.message_id,
                parse_mode: 'Markdown'
            });
        }

        if (allEmails.length > 100 || responseText.length > 4000) {
            const fileName = `emails_${username}.txt`;
            const cacheDir = path.join(__dirname, "..", "cache");
            const filePath = path.join(cacheDir, fileName);

            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
            
          
            const fileData = allEmails.map((e, i) => `${i + 1}. ${e}`).join("\n\n");
            fs.writeFileSync(filePath, fileData);

            await bot.sendDocument(chatId, filePath, {
                caption: `✅ Full File (${allEmails.length} emails)`,
                reply_to_message_id: messageId
            });

            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

    } catch (error) {
        bot.sendMessage(chatId, "❌ An error occurred.");
    }
};
