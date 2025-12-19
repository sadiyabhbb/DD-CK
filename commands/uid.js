function escapeMarkdown(text) {
  if (!text) return 'N/A';
  return text.replace(/([_*`[\]()~>#+=|{}.!-])/g, '\\$1');
}

module.exports.config = {
  name: "uid",
  credits: "LIKHON X TISHA",
  aliases: ["id", "userid", "whois"],
  prefix: true,
  permission: 0,
  description: "Displays user details along with profile picture.",
  tags: ["utility", "info"]
};

module.exports.run = async (bot, msg) => {
  const chatId = msg.chat.id;
  const replyId = msg.message_id;

  const targetUser = msg.reply_to_message
    ? msg.reply_to_message.from
    : msg.from;

  if (!targetUser) {
    return bot.sendMessage(chatId, "❌ User not found.", {
      reply_to_message_id: replyId
    });
  }

  const userId = targetUser.id;
  const name = escapeMarkdown(targetUser.first_name || "N/A");
  const username = targetUser.username
    ? `@${escapeMarkdown(targetUser.username)}`
    : "N/A";

  const caption =
    `👤 *User Info:*\n` +
    ` 🪪 Name: *${name}*\n` +
    ` 🔗 Username: *${username}*\n` +
    ` 🆔 UID: \`${userId}\``;

  try {
    const photos = await bot.getUserProfilePhotos(userId, { limit: 1 });

    if (photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;

      return bot.sendPhoto(chatId, fileId, {
        caption,
        parse_mode: "MarkdownV2",
        reply_to_message_id: replyId
      });
    }

    return bot.sendMessage(
      chatId,
      caption + `\n\n\\(⚠️ No profile picture\\)`,
      {
        parse_mode: "MarkdownV2",
        reply_to_message_id: replyId
      }
    );

  } catch (err) {
    console.error("UID Error:", err.message);
    return bot.sendMessage(
      chatId,
      caption + `\n\n\\(❌ Failed to fetch user info\\)`,
      {
        parse_mode: "MarkdownV2",
        reply_to_message_id: replyId
      }
    );
  }
};
