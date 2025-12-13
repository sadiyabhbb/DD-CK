module.exports.config = {
  name: "gc",
  credits: "LIKHON X TISHA",
  aliases: ["grp"],
  description: "Manage Your Group Chat Lock/Unlock Feature (Telegram Permissions)",
  prefix: true,
  tags: ["groupM"],
  permission: 2 
};

module.exports.run = async (bot, msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const args = msg.text.split(/\s+/).slice(1);

    if (!args[0]) {
      return bot.sendMessage(chatId, "Usage: /gc lock | /gc unlock", { reply_to_message_id: messageId });
    }

    const sub = args[0].toLowerCase();

  
    const lockPerms = {
      can_send_messages: false,
      can_send_media_messages: false,
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false
    };

    const unlockPerms = {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true
    };

    try {
      if (sub === "lock") {
        
        await bot.setChatPermissions(chatId, lockPerms);
        return bot.sendMessage(chatId, "🚫 Group is locked! Members cannot send messages.", { reply_to_message_id: messageId });
      } else if (sub === "unlock") {
        await bot.setChatPermissions(chatId, unlockPerms);
        return bot.sendMessage(chatId, "✅ Group is unlocked! Members can now send messages.", { reply_to_message_id: messageId });
      } else {
        return bot.sendMessage(chatId, "Unknown subcommand. Use lock or unlock.", { reply_to_message_id: messageId });
      }
    } catch(err) {
      console.error("Group Lock/Unlock Error:", err.message);
      return bot.sendMessage(chatId, "❌ Failed to change permissions — make sure bot is admin with 'Restrict members' rights.", { reply_to_message_id: messageId });
    }
};
