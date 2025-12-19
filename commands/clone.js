const TelegramBot = require("node-telegram-bot-api");
const path = require("path");

const setupBotListeners = global.setupBotListeners;

function escapeMarkdown(text) {
  if (!text) return "";
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

module.exports.config = {
  name: "clone",
  credits: "LIKHON AHMED",
  aliases: ["newbot"],
  version: "1.1.1",
  permission: 2,
  prefix: true,
  description: "Clones bot functionality, lists active clone bots, and removes them.",
  category: "system",
  usages: "/clone [New Token] | /clone botlist | /clone remove [Number]",
  cooldowns: 10,
};

async function handleBotList(bot, chatId, messageId) {
  const mainBotTokenPart = global.CONFIG.BOT_TOKEN.split(":")[0];
  const clonedBots = global.BOT_INSTANCES.filter(
    (instance) => !instance.token.startsWith(mainBotTokenPart)
  );

  if (clonedBots.length === 0) {
    return bot.sendMessage(
      chatId,
      "⚠️ No additional cloned bots are currently active.",
      { reply_to_message_id: messageId }
    );
  }

  let list = "🤖 **Active Cloned Bots:**\n\n";
  clonedBots.forEach((instance, index) => {
    const botName = escapeMarkdown(instance.options.name || `Clone #${index + 1}`);
    const botUsername = escapeMarkdown(instance.options.username || "N/A");
    const tokenSuffix = instance.token.slice(-4);

    list += `${index + 1}. **${botName}**\n` +
      `   › Username: @${botUsername}\n` +
      `   › Token (last 4): **...${tokenSuffix}**\n\n`;
  });

  list += "\nUse `/clone remove [Number]` or `/clone remove [Last4Token]` to stop a bot.";

  return bot.sendMessage(chatId, list, {
    reply_to_message_id: messageId,
    parse_mode: "Markdown",
  });
}

async function handleBotRemove(bot, chatId, messageId, identifier) {
  if (!identifier) {
    return bot.sendMessage(
      chatId,
      "⚠️ Usage: `/clone remove [Number/Token Suffix]`",
      { reply_to_message_id: messageId }
    );
  }

  const mainBotTokenPart = global.CONFIG.BOT_TOKEN.split(":")[0];
  let targetBotInstance = null;
  let targetIndex = -1;

  const index = parseInt(identifier) - 1;
  if (!isNaN(index) && index >= 0) {
    const clonedBots = global.BOT_INSTANCES.filter(
      (instance) => !instance.token.startsWith(mainBotTokenPart)
    );
    if (index < clonedBots.length) {
      targetBotInstance = clonedBots[index];
      targetIndex = global.BOT_INSTANCES.findIndex(
        (inst) => inst === targetBotInstance
      );
    }
  }

  if (!targetBotInstance) {
    const tokenPart = identifier.slice(-4);
    targetIndex = global.BOT_INSTANCES.findIndex((instance) => {
      const isMain = instance.token.startsWith(mainBotTokenPart);
      return !isMain && instance.token.slice(-4) === tokenPart;
    });
    if (targetIndex !== -1) {
      targetBotInstance = global.BOT_INSTANCES[targetIndex];
    }
  }

  if (!targetBotInstance) {
    return bot.sendMessage(
      chatId,
      "❌ No active cloned bot found with this number or token.",
      { reply_to_message_id: messageId }
    );
  }

  try {
    const me = await targetBotInstance.getMe();
    const botName = escapeMarkdown(me.first_name || me.username || "Unknown Bot");
    const username = escapeMarkdown(me.username);

    await targetBotInstance
      .sendMessage(
        chatId,
        `👋 **Goodbye!**\nI am **${botName}** (@${username}) and I am going offline now.`,
        { parse_mode: "Markdown" }
      )
      .catch(() => {});

    await targetBotInstance.stopPolling().catch(() => {});

    if (targetIndex !== -1) {
      global.BOT_INSTANCES.splice(targetIndex, 1);
    }

    return bot.sendMessage(
      chatId,
      `✅ **Bot removed successfully!**\nBot: **${botName}** (@${username})\nActive bots: ${global.BOT_INSTANCES.length}`,
      { reply_to_message_id: messageId, parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Error removing cloned bot:", err.message);
    return bot.sendMessage(
      chatId,
      "❌ An error occurred while removing the cloned bot.",
      { reply_to_message_id: messageId }
    );
  }
}

function setupCloneBotListeners(botInstance, botConfig) {
  botInstance.on("polling_error", (error) => {
    console.error(
      `❌ [${botConfig.name}] Polling error:`,
      error.response?.data || error.message || error
    );
  });

  botInstance.on("message", async (msg) => {
    const text = msg.text;
    let isCommandExecuted = false;

    if (text && text.startsWith(global.PREFIX)) {
      const args = text.slice(global.PREFIX.length).trim().split(/\s+/);
      const commandNameOrAlias = args.shift().toLowerCase();
      const actualCommandName =
        global.ALIASES[commandNameOrAlias] || commandNameOrAlias;
      const commandModule = global.COMMANDS[actualCommandName];

      if (commandModule && commandModule.run) {
        try {
          await commandModule.run(botInstance, msg, args);
          isCommandExecuted = true;
        } catch (err) {
          console.error(
            `Command error (${actualCommandName}, Bot: ${botConfig.name}):`,
            err.message
          );
        }
      }
    }

    if (!isCommandExecuted && text) {
      const lowerText = text.toLowerCase();
      for (const commandName in global.COMMANDS) {
        const module = global.COMMANDS[commandName];
        if (module.config && module.config.prefix === false && module.run) {
          const triggers = [module.config.name, ...(module.config.aliases || [])]
            .map((t) => t.toLowerCase());
          const found = triggers.find(
            (t) => lowerText === t || lowerText.startsWith(t + " ")
          );
          if (found) {
            const args = lowerText
              .slice(found.length)
              .trim()
              .split(/\s+/)
              .filter(Boolean);
            try {
              await module.run(botInstance, msg, args);
              break;
            } catch (err) {
              console.error(
                `Non-prefix command error (${commandName}):`,
                err.message
              );
            }
          }
        }
      }
    }
  });
}

async function initializeNewBot(botInstance, botConfig, chatId) {
  try {
    const me = await botInstance.getMe();
    botConfig.id = me.id;
    botConfig.username = me.username || "N/A";
    botConfig.name = botConfig.name || me.first_name || `Clone ${me.id}`;

    botInstance.options.name = botConfig.name;
    botInstance.options.username = botConfig.username;

    global.BOT_INSTANCES = global.BOT_INSTANCES || [];
    global.BOT_INSTANCES.push(botInstance);

    setupCloneBotListeners(botInstance, botConfig);

    botInstance.sendMessage(
      chatId,
      `👋 **Hello!** I am now active.\nBot: **${escapeMarkdown(
        botConfig.name
      )}** (@${escapeMarkdown(me.username)})`,
      { parse_mode: "Markdown" }
    );

    console.log(`Clone bot activated: ${botConfig.name}`);
    return true;
  } catch (err) {
    console.error("Failed to initialize new bot:", err.message);
    return false;
  }
}

module.exports.run = async (bot, msg, args) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  if (!global.CONFIG.BOT_SETTINGS.ADMINS.includes(msg.from.id.toString())) {
    return bot.sendMessage(
      chatId,
      "❌ Only admins or the bot owner can use this command.",
      { reply_to_message_id: messageId }
    );
  }

  if (args.length < 1) {
    return bot.sendMessage(
      chatId,
      "⚠️ Usage: `/clone [New Token]`, `/clone botlist`, or `/clone remove [Number]`",
      { reply_to_message_id: messageId }
    );
  }

  const subcommand = args[0].toLowerCase();

  if (subcommand === "botlist") {
    return handleBotList(bot, chatId, messageId);
  }

  if (subcommand === "remove") {
    return handleBotRemove(bot, chatId, messageId, args[1] || "");
  }

  const token = args[0];
  const inputName = args.slice(1).join(" ");

  if (!token.includes(":")) {
    return bot.sendMessage(
      chatId,
      "❌ Invalid token format. Please provide a valid Telegram bot token.",
      { reply_to_message_id: messageId }
    );
  }

  const tokenPart = token.split(":")[0];
  const activeInstances = global.BOT_INSTANCES || [];

  if (tokenPart === global.CONFIG.BOT_TOKEN.split(":")[0]) {
    return bot.sendMessage(
      chatId,
      "⚠️ This is the main bot token and cannot be cloned.",
      { reply_to_message_id: messageId }
    );
  }

  if (activeInstances.some((i) => i.token.startsWith(tokenPart))) {
    return bot.sendMessage(
      chatId,
      "⚠️ A bot with this token is already active.",
      { reply_to_message_id: messageId }
    );
  }

  const waitMsg = await bot.sendMessage(chatId, "⏳ Initializing new bot...");

  try {
    const newBot = new TelegramBot(token, { polling: true });
    const me = await newBot.getMe();

    const botConfig = {
      token,
      name: inputName,
      id: me.id,
      username: me.username,
      isMain: false,
    };

    const success = await initializeNewBot(newBot, botConfig, chatId);
    await bot.deleteMessage(chatId, waitMsg.message_id);

    if (success) {
      return bot.sendMessage(
        chatId,
        `✅ **Clone successful!** Bot @${me.username} is now running.`,
        { reply_to_message_id: messageId, parse_mode: "Markdown" }
      );
    }

    return bot.sendMessage(
      chatId,
      "❌ Failed to initialize the bot. Check logs.",
      { reply_to_message_id: messageId }
    );
  } catch (err) {
    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
    return bot.sendMessage(
      chatId,
      "❌ Invalid bot token or unable to connect to Telegram API.",
      { reply_to_message_id: messageId }
    );
  }
};
