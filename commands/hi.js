module.exports.config = {
  name: "hi",
  credits: "LIKHON AHMED",
  aliases: ["hello", "ohey", "oi"],
  prefix: false,
  permission: 0,
  description: "Replies with a random greeting text.",
  tags: ["fun", "greeting"],
};

const GREETINGS = [
  "Hello! 👋 How are you? Hope everything is going well.",
  "Hi there! 😊 Have a great day.",
  "Hey! 💖 Thanks for chatting.",
  "Greetings! How can I help you today?",
  "What's up? 🚀 Want to know something new?",
  "Hello! 🙏 Nice to see you here.",
  "Hey! 😃 Good to talk to you again!",
];

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  const randomIndex = Math.floor(Math.random() * GREETINGS.length);
  const randomText = GREETINGS[randomIndex];

  await bot.sendMessage(chatId, randomText, {
    reply_to_message_id: messageId,
  });
};
