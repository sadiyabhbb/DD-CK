const { nanoid } = require('nanoid');

module.exports.config = {
    name: "fileupload",
    credits: "LIKHON X TISHA",
    aliases: ["fup", "upload"],
    prefix: true,
    permission: 2,
    description: "Uploads files/media to a specified group/channel with scheduling and inline buttons.",
    tags: ["system", "media", "tools"]
};

if (!global.fileUploadState) {
    global.fileUploadState = {};
}

function createInlineKeyboard(buttons) {
    const keyboard = [];
    let row = [];
    
    for (let i = 0; i < buttons.length; i++) {
        row.push(buttons[i]);
        if (row.length === 2 || i === buttons.length - 1) {
            keyboard.push(row);
            row = [];
        }
    }
    return { inline_keyboard: keyboard };
}


async function step1_selectChat(bot, chatId, messageId, senderId) {
    const chatList = [];
    
    if (global.CONFIG.REQUIRED_CHATS) {
        global.CONFIG.REQUIRED_CHATS.forEach(chat => {
            chatList.push({ id: chat.id, name: chat.name || chat.username });
        });
    }
    
    const currentChat = await bot.getChat(chatId).catch(() => null);
    if (currentChat && !chatList.some(c => c.id === currentChat.id)) {
        chatList.unshift({ id: currentChat.id, name: currentChat.title || currentChat.type });
    }
    
    if (chatList.length === 0) {
        return bot.sendMessage(chatId, "❌ Bot is not added to any pre-configured groups/channels. Please add the bot to a channel first.", { reply_to_message_id: messageId });
    }

    const inlineKeyboard = chatList.map((chat, index) => {
        return [{ 
            text: `${index + 1}. ${chat.name} (ID: ${chat.id})`, 
            callback_data: `fup_chat:${chat.id}:${senderId}` 
        }];
    });

    global.fileUploadState[senderId] = { step: 1, chats: chatList, timeout: Date.now() + 60000 };

    bot.sendMessage(chatId, "📌 **ধাপ ১: চ্যানেল/গ্রুপ নির্বাচন**\n\nআপনি কোন চ্যানেলে বা গ্রুপে ফাইল আপলোড করতে চান, তা নির্বাচন করুন:", {
        reply_markup: { inline_keyboard: inlineKeyboard }
    });
}

async function step2_receiveFile(bot, chatId, targetChatId, senderId) {
    
    global.fileUploadState[senderId] = {
        ...global.fileUploadState[senderId],
        step: 2,
        targetChatId: targetChatId,
        timeout: Date.now() + 120000 
    };

    const targetChat = global.fileUploadState[senderId].chats.find(c => c.id == targetChatId);

    const msg = `
📂 **ধাপ ২: ফাইল/মিডিয়া আপলোড**

দয়া করে আপনার ফাইল, ভিডিও, ছবি, বা APK/Docs এখন আমাকে পাঠান।
প্রাপ্তি স্থান: **${targetChat ? targetChat.name : targetChatId}**
`;

    bot.sendMessage(chatId, msg, {
        reply_to_message_id: global.fileUploadState[senderId].lastMessageId || null,
        parse_mode: 'Markdown'
    });
}

async function step3_setCaption(bot, chatId, senderId) {
    global.fileUploadState[senderId] = {
        ...global.fileUploadState[senderId],
        step: 3,
        timeout: Date.now() + 60000 
    };

    const inlineKeyboard = [
        [{ text: "✅ Yes, ক্যাপশন সেট করব", callback_data: `fup_caption:yes:${senderId}` }],
        [{ text: "❌ No, ক্যাপশন দরকার নেই", callback_data: `fup_caption:no:${senderId}` }]
    ];
    
    bot.sendMessage(chatId, "🖼️ **ধাপ ৩: ক্যাপশন সেট করা**\n\nআপনি কি এই ফাইল অ্যাটাচমেন্টে ক্যাপশন সেট করতে চান?", {
        reply_markup: { inline_keyboard: inlineKeyboard }
    });
}

async function step4_addButtons(bot, chatId, senderId, caption) {
    global.fileUploadState[senderId] = {
        ...global.fileUploadState[senderId],
        step: 4,
        caption: caption,
        timeout: Date.now() + 120000 
    };

    const msg = `
🔗 **ধাপ ৪: ইনলাইন বাটন যোগ**

আপনি কি এই অ্যাটাচমেন্টে ইনলাইন বাটন যোগ করতে চান?

যদি **হ্যাঁ** হয়, তবে নিচের ফরম্যাটটি অনুসরণ করুন:
\`[Button Name 1] | https://www.youtube.com/watch?v=KsZ6tROaVOQ
[Button Name 2] | https://www.youtube.com/watch?v=zTJNaZ9AgFE\`

**উদাহরণ:**
\`Download File | https://example.com/file.zip
Join Channel | https://t.me/yourchannel\`

যদি **না** হয়, তবে শুধু \`no\` লিখে পাঠান।
`;

    bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
}

async function step5_setSchedule(bot, chatId, senderId, buttons) {
    global.fileUploadState[senderId] = {
        ...global.fileUploadState[senderId],
        step: 5,
        buttons: buttons,
        timeout: Date.now() + 60000 
    };

    const inlineKeyboard = [
        [{ text: "⏰ সময় সেট করব", callback_data: `fup_schedule:yes:${senderId}` }],
        [{ text: "▶️ এখনই পাঠান", callback_data: `fup_schedule:no:${senderId}` }]
    ];

    bot.sendMessage(chatId, "⏱️ **ধাপ ৫: সময়সূচী নির্ধারণ**\n\nআপনি কি এই ফাইল অ্যাটাচমেন্টটি পরে পাঠানোর জন্য কোনো সময় সেট করতে চান?", {
        reply_markup: { inline_keyboard: inlineKeyboard }
    });
}

async function step6_finalPost(bot, chatId, senderId, scheduleTime) {
    const state = global.fileUploadState[senderId];
    if (!state || !state.media || !state.targetChatId) {
        return bot.sendMessage(chatId, "❌ আপলোডের ডেটা খুঁজে পাওয়া যাচ্ছে না। দয়া করে আবার শুরু করুন: `/fileupload`", { reply_to_message_id: state.lastMessageId });
    }

    const { targetChatId, media, caption, buttons } = state;
    const { type, file_id } = media;
    const opts = {
        caption: caption,
        reply_markup: buttons.length > 0 ? createInlineKeyboard(buttons) : undefined,
        parse_mode: 'Markdown'
    };

    try {
        if (scheduleTime) {
            
            const delay = scheduleTime.getTime() - Date.now();
            if (delay <= 0) throw new Error("Scheduling time is in the past.");
            
            bot.sendMessage(chatId, `✅ **সময়সূচী সেট হয়েছে!**\n\nফাইলটি ${scheduleTime.toLocaleString('bn-BD')} সময়ে পাঠানো হবে।`, { parse_mode: 'Markdown' });

        } else {
            let sentMessage;
            
            if (type === 'photo') {
                sentMessage = await bot.sendPhoto(targetChatId, file_id, opts);
            } else if (type === 'video') {
                sentMessage = await bot.sendVideo(targetChatId, file_id, opts);
            } else if (type === 'document') {
                sentMessage = await bot.sendDocument(targetChatId, file_id, opts);
            } else if (type === 'audio') {
                 sentMessage = await bot.sendAudio(targetChatId, file_id, opts);
            } else {
                 return bot.sendMessage(chatId, "❌ Unrecognized file type.", { reply_to_message_id: state.lastMessageId });
            }

            const messageLink = `https://t.me/c/${targetChatId.toString().replace('-100', '')}/${sentMessage.message_id}`;

            bot.sendMessage(chatId, `
🎉 **সফলভাবে পাঠানো হয়েছে!**
আপনার ফাইলটি **${state.chats.find(c => c.id == targetChatId).name}** এ পাঠানো হয়েছে।

🔗 **ফাইল লিংক:** ${messageLink}

বটের ফাইল আইডি: \`${file_id}\`
            `, { parse_mode: 'Markdown' });
        }

    } catch (e) {
        console.error("File posting failed:", e.message);
        bot.sendMessage(chatId, `❌ ফাইল পোস্টিং ব্যর্থ হয়েছে। ত্রুটি: ${e.message}`, { reply_to_message_id: state.lastMessageId });
    } finally {
        delete global.fileUploadState[senderId];
    }
}


module.exports.run = async (bot, msg, args) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const senderId = msg.from.id;
    
    if (global.fileUploadState[senderId]) {
         return bot.sendMessage(chatId, "⚠️ একটি চলমান প্রক্রিয়া খুঁজে পাওয়া গেছে। অনুগ্রহ করে সেটি শেষ করুন বা '/cancel' লিখুন।", { reply_to_message_id: messageId });
    }

    global.fileUploadState[senderId] = {
        step: 0,
        targetChatId: null,
        media: null,
        caption: "",
        buttons: [],
        lastMessageId: messageId,
        timeout: Date.now() + 60000 
    };

    await step1_selectChat(bot, chatId, messageId, senderId);
};


module.exports.handleMessage = async (bot, msg) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;
    const state = global.fileUploadState[senderId];
    
    if (!state) return; 

    if (msg.text && msg.text.toLowerCase() === '/cancel') {
        delete global.fileUploadState[senderId];
        return bot.sendMessage(chatId, "❌ ফাইল আপলোড প্রক্রিয়া বাতিল করা হয়েছে।", { reply_to_message_id: msg.message_id });
    }
    if (state.timeout < Date.now()) {
        delete global.fileUploadState[senderId];
        return bot.sendMessage(chatId, "⏰ সময়সীমা শেষ। ফাইল আপলোড প্রক্রিয়া বাতিল করা হলো।", { reply_to_message_id: msg.message_id });
    }


    if (state.step === 2) {
        let mediaType = null;
        let fileId = null;
        
        if (msg.photo) { 
            mediaType = 'photo';
            fileId = msg.photo[msg.photo.length - 1].file_id; 
        } else if (msg.video) {
            mediaType = 'video';
            fileId = msg.video.file_id;
        } else if (msg.document) {
            mediaType = 'document';
            fileId = msg.document.file_id;
        } else if (msg.audio) {
             mediaType = 'audio';
             fileId = msg.audio.file_id;
        }

        if (fileId) {
            state.media = { type: mediaType, file_id: fileId };
            state.lastMessageId = msg.message_id;

            bot.sendMessage(chatId, "👌 **Okay Fine!** Now set your caption in your file attachment?", {
                reply_to_message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ Yes, ক্যাপশন সেট করব", callback_data: `fup_caption:yes:${senderId}` }],
                        [{ text: "❌ No, ক্যাপশন দরকার নেই", callback_data: `fup_caption:no:${senderId}` }]
                    ]
                }
            });
            global.fileUploadState[senderId].step = 3; 

        } else if (msg.text || msg.sticker || msg.voice) {
             return bot.sendMessage(chatId, "⚠️ দয়া করে একটি ফাইল, ছবি, ভিডিও বা ডকুমেন্ট পাঠান। শুধু টেক্সট বা স্টিকার গ্রহণ করা হবে না।", { reply_to_message_id: msg.message_id });
        }
        return;
    }

    if (state.step === 3.1 && msg.text) { 
        const caption = msg.text.trim();
        state.caption = caption;
        state.lastMessageId = msg.message_id;
        
        await step4_addButtons(bot, chatId, senderId, caption);
        return;
    }


    if (state.step === 4 && msg.text) {
        const input = msg.text.trim();
        state.lastMessageId = msg.message_id;
        
        if (input.toLowerCase() === 'no') {
            state.buttons = [];
            await step5_setSchedule(bot, chatId, senderId, []);
            return;
        }

        const lines = input.split('\n');
        const buttons = [];
        let isValid = true;

        for (const line of lines) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length === 2 && parts[0] && parts[1].startsWith('http')) {
                buttons.push({ text: parts[0], url: parts[1] });
            } else if (line.trim() !== '') {
                isValid = false;
                break;
            }
        }

        if (isValid && buttons.length > 0) {
            state.buttons = buttons;
            await step5_setSchedule(bot, chatId, senderId, buttons);
        } else {
            bot.sendMessage(chatId, `❌ **ভুল বাটন ফরম্যাট!** দয়া করে সঠিক ফরম্যাটে (Button Name | URL) প্রতি লাইনে একটি করে বাটন দিন, অথবা 'no' লিখুন।`, { parse_mode: 'Markdown' });
        }
        return;
    }
    
    if (state.step === 5.1 && msg.text) { 
        const input = msg.text.trim();
        
        try {
            const scheduleTime = new Date(input);
            if (isNaN(scheduleTime.getTime()) || scheduleTime.getTime() < Date.now()) {
                throw new Error("Invalid or past time.");
            }
            
            bot.sendMessage(chatId, `✅ **সময় নিশ্চিত!** আপনার ফাইলটি ${scheduleTime.toLocaleString('bn-BD')} সময়ে পাঠানো হবে।`, { parse_mode: 'Markdown' });
            await step6_finalPost(bot, chatId, senderId, scheduleTime);
            
        } catch (e) {
            bot.sendMessage(chatId, `❌ **ভুল সময় ফরম্যাট!** দয়া করে YYYY-MM-DD HH:MM:SS ফরম্যাটে সময় দিন (যেমন: 2026-01-01 10:00:00).`, { parse_mode: 'Markdown' });
        }
        return;
    }
};


module.exports.initCallback = function(bot) {
    bot.on('callback_query', async (callbackQuery) => {
        const message = callbackQuery.message;
        const data = callbackQuery.data;
        const senderId = callbackQuery.from.id;
        const chatId = message.chat.id;
        
        if (!data.startsWith('fup_')) return;
        
        const parts = data.split(':');
        const action = parts[0]; 
        const state = global.fileUploadState[senderId];

        if (!state || state.timeout < Date.now()) {
            bot.answerCallbackQuery(callbackQuery.id, { text: "সময় শেষ, দয়া করে আবার শুরু করুন।" });
            return delete global.fileUploadState[senderId];
        }

        bot.answerCallbackQuery(callbackQuery.id); 

        if (action === 'fup_chat' && state.step === 1) {
            const targetChatId = parts[1];
            state.lastMessageId = message.message_id;
            await step2_receiveFile(bot, chatId, targetChatId, senderId);
            return;
        }

        if (action === 'fup_caption' && state.step === 3) {
            const decision = parts[1];
            state.lastMessageId = message.message_id;

            if (decision === 'yes') {
                global.fileUploadState[senderId].step = 3.1; 
                bot.sendMessage(chatId, "✍️ এখন আপনার ক্যাপশন লিখে পাঠান।", { reply_to_message_id: message.message_id });
            } else {
                global.fileUploadState[senderId].caption = "";
                await step4_addButtons(bot, chatId, senderId, "");
            }
            return;
        }

        if (action === 'fup_schedule' && state.step === 5) {
            const decision = parts[1];
            state.lastMessageId = message.message_id;

            if (decision === 'yes') {
                global.fileUploadState[senderId].step = 5.1; 
                bot.sendMessage(chatId, `⏰ দয়া করে সময়সূচী সেট করুন (Format: YYYY-MM-DD HH:MM:SS), উদাহরণ: \`2026-01-01 10:00:00\``, { reply_to_message_id: message.message_id, parse_mode: 'Markdown' });
            } else {
                await step6_finalPost(bot, chatId, senderId, null); 
            }
            return;
        }
    });
};
