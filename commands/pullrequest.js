const { exec } = require('child_process');

module.exports.config = {
  name: "pullrequest",
  version: "1.0.0",
  credits: "LIKHON X TISHA",
  aliases: ["pr"],
  permission: 2, 
  prefix: true,
  description: "Pulls latest changes from GitHub and restarts the bot.",
  category: "admin",
  usages: "/pullrequest",
  cooldowns: 03,
};

module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    const pullingMessage = await bot.sendMessage(
        chatId, 
        `🔄 **GitHub থেকে নতুন পরিবর্তন (Pull) করা হচ্ছে...**\nদয়া করে অপেক্ষা করুন।`,
        { reply_to_message_id: messageId, parse_mode: 'Markdown' }
    );

    exec('git pull', async (error, stdout, stderr) => {
        if (error) {
            console.error(`Git Pull Error: ${error.message}`);
            await bot.deleteMessage(chatId, pullingMessage.message_id).catch(() => {});
            return bot.sendMessage(
                chatId, 
                `❌ **Git Pull ব্যর্থ হয়েছে!**\nত্রুটি: \`${error.message}\n${stderr}\``,
                { reply_to_message_id: messageId, parse_mode: 'Markdown' }
            );
        }

        const pullOutput = stdout.trim();

        if (pullOutput.includes('Already up to date')) {
            await bot.deleteMessage(chatId, pullingMessage.message_id).catch(() => {});
            return bot.sendMessage(
                chatId, 
                `✅ **কোনো নতুন পরিবর্তন নেই।**\nবট ইতোমধ্যে আপডেটেড আছে।`,
                { reply_to_message_id: messageId, parse_mode: 'Markdown' }
            );
        }

        await bot.editMessageText(
            `✅ **পরিবর্তন সফলভাবে পুল করা হয়েছে।**\n\n⚙️ **নির্ভরতা ইনস্টল এবং রিস্টার্ট করা হচ্ছে...**\n\n\`${pullOutput}\``,
            { chat_id: chatId, message_id: pullingMessage.message_id, parse_mode: 'Markdown' }
        ).catch(() => {});

        exec('npm install', async (npmError, npmStdout, npmStderr) => {
             if (npmError) {
                console.error(`NPM Install Error: ${npmError.message}`);
                return bot.sendMessage(
                    chatId, 
                    `⚠️ **NPM ইনস্টল ব্যর্থ হয়েছে!**\n\nআপনাকে ম্যানুয়ালি রিস্টার্ট করতে হবে।\nত্রুটি: \`${npmError.message}\``,
                    { reply_to_message_id: messageId, parse_mode: 'Markdown' }
                );
             }

             await bot.sendMessage(
                chatId,
                "🚀 **সফলভাবে আপডেট সম্পন্ন!**\nবট এখন নতুন করে শুরু হবে (অথবা আপনি ম্যানুয়ালি /restart ব্যবহার করুন)।",
                { reply_to_message_id: messageId, parse_mode: 'Markdown' }
             );

             setTimeout(() => {
                process.exit(1); 
             }, 3000); 
        });
    });
};
