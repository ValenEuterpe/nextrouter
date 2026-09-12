/**
 * Discord Slash Command Interaction Handlers
 */

import { generateApiKey, sha256 } from '../crypto.js';
import {
  getDiscordUser,
  saveDiscordUser,
  rotateDiscordKey,
  updateCheckin,
  isCheckinValid,
  getCheckinRemainingHours,
  createKey,
  getKeyByHash,
  listAllModelStats,
} from '../kv.js';

const DISCORD_EMBED_COLOR = 0x00f2fe; // Neon Cyan
const DISCORD_EMBED_SUCCESS = 0x10b981; // Emerald Green
const DISCORD_EMBED_WARNING = 0xf59e0b; // Amber Warning
const DISCORD_EMBED_DANGER = 0xff4b72; // Neon Pink / Red

export function interactionResponse(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function ephemeralEmbed(title, description, color = DISCORD_EMBED_COLOR, fields = []) {
  return interactionResponse({
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      flags: 64, // EPHEMERAL (only visible to caller)
      embeds: [
        {
          title,
          description,
          color,
          fields,
          footer: { text: 'DiscordLiteRouter • Ultra-Fast Neural Gateway' },
          timestamp: new Date().toISOString(),
        },
      ],
    },
  });
}

export function publicEmbed(title, description, color = DISCORD_EMBED_COLOR, fields = []) {
  return interactionResponse({
    type: 4,
    data: {
      embeds: [
        {
          title,
          description,
          color,
          fields,
          footer: { text: 'DiscordLiteRouter • Ultra-Fast Neural Gateway' },
          timestamp: new Date().toISOString(),
        },
      ],
    },
  });
}

/**
 * Main Interaction Dispatcher
 */
export async function handleDiscordInteraction(interaction, env, requestUrl) {
  // 1. Handle Ping (Discord requires this for endpoint verification)
  if (interaction.type === 1) {
    return interactionResponse({ type: 1 });
  }

  // 2. Handle Application Commands (type: 2)
  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const user = interaction.member?.user || interaction.user;

    const urlObj = new URL(requestUrl);
    const baseUrl = `${urlObj.origin}/v1`;

    switch (name) {
      case 'getapikey':
        return await handleGetApiKey(user, env, baseUrl);
      case 'rotatekey':
        return await handleRotateKey(user, env, baseUrl);
      case 'stats':
        return await handleStats(user, options, env);
      case 'models':
        return await handleModels(env);
      case 'checkin':
        return await handleCheckin(user, env);
      default:
        return ephemeralEmbed('Unknown Command', `Command \`/${name}\` is not recognized.`, DISCORD_EMBED_DANGER);
    }
  }

  return interactionResponse({ type: 4, data: { content: 'Unsupported interaction type', flags: 64 } });
}

// ----------------- Command 1: /getapikey -----------------

async function handleGetApiKey(user, env, baseUrl) {
  const existingUser = await getDiscordUser(env.KV, user.id);
  if (existingUser) {
    const existingKey = await getKeyByHash(env.KV, existingUser.hash);
    if (existingKey && !existingKey.revoked) {
      const remainingHours = getCheckinRemainingHours(existingKey);
      const checkinActive = isCheckinValid(existingKey);
      return ephemeralEmbed(
        '⚠️ You Already Have an Active API Key',
        `Hello **${user.global_name || user.username}**, you already have an initialized DiscordLiteRouter API key.\n\n` +
        `🔑 **Key Preview:** \`${existingKey.rawKey ? existingKey.rawKey.slice(0, 8) + '••••••••' : 'sk-••••••••'}\`\n` +
        `🌐 **Base URL:** \`${baseUrl}\`\n` +
        `📊 **Quota:** ${(existingKey.tokensUsed || 0).toLocaleString()} / ${(existingKey.tokenLimit || 0).toLocaleString()} tokens\n` +
        `⏰ **24h Check-in:** ${checkinActive ? `Active (${remainingHours.toFixed(1)}h left)` : '⚠️ Expired (run `/checkin`)'}\n\n` +
        `*Need a fresh key? Run **\`/rotatekey\`** to invalidate this key and generate a new one.*`,
        DISCORD_EMBED_WARNING
      );
    }
  }

  // Generate fresh key
  const rawKey = generateApiKey('sk-');
  const hash = await sha256(rawKey);
  const tokenLimit = Number(env.DEFAULT_DISCORD_TOKEN_LIMIT) || 2000000;
  const now = new Date().toISOString();

  const newKeyRecord = {
    id: crypto.randomUUID(),
    owner: user.global_name || user.username || `Discord User ${user.id}`,
    discordUserId: user.id,
    discordUsername: user.username,
    tokenLimit,
    tokensUsed: 0,
    channelPrefix: '*',
    revoked: false,
    rawKey,
    requireCheckin: true,
    lastCheckinAt: now,
    checkinCount: 1,
    callsCount: 0,
    modelsUsed: {},
    createdAt: now,
  };

  await createKey(env.KV, newKeyRecord, hash);
  await saveDiscordUser(env.KV, user.id, {
    id: newKeyRecord.id,
    hash,
    username: user.username,
    createdAt: now,
  });

  return ephemeralEmbed(
    '⚡ DiscordLiteRouter API Key Initialized',
    `Welcome, **${user.global_name || user.username}**! Your high-speed OpenAI-compatible key is ready.\n\n` +
    `🔑 **Your Secret API Key:**\n\`\`\`\n${rawKey}\n\`\`\`\n` +
    `🌐 **Generic Base URL (Janitor.ai / SillyTavern / LibreChat):**\n\`\`\`\n${baseUrl}\n\`\`\`\n` +
    `📊 **Token Quota:** ${tokenLimit.toLocaleString()} tokens\n` +
    `⏰ **24-Hour Check-in:** Active for the next 24 hours (run \`/checkin\` daily to keep it active)\n\n` +
    `⚠️ *Save this key now! It will never be displayed in plain text again.*`,
    DISCORD_EMBED_SUCCESS
  );
}

// ----------------- Command 2: /rotatekey -----------------

async function handleRotateKey(user, env, baseUrl) {
  const userMapping = await getDiscordUser(env.KV, user.id);
  if (!userMapping) {
    return ephemeralEmbed(
      'No API Key Found',
      `You don't have an active key yet. Run **\`/getapikey\`** to initialize your account!`,
      DISCORD_EMBED_DANGER
    );
  }

  const oldKey = await getKeyByHash(env.KV, userMapping.hash);
  if (!oldKey) {
    return ephemeralEmbed(
      'Key Not Found',
      `Your previous key record could not be found. Run **\`/getapikey\`** to generate a new key.`,
      DISCORD_EMBED_DANGER
    );
  }

  // Generate new key
  const newRawKey = generateApiKey('sk-');
  const newHash = await sha256(newRawKey);
  const now = new Date().toISOString();

  const newKeyRecord = {
    ...oldKey,
    rawKey: newRawKey,
    revoked: false,
    rotatedAt: now,
  };

  await rotateDiscordKey(env.KV, userMapping.hash, newKeyRecord, newHash);

  return ephemeralEmbed(
    '🔄 API Key Rotated Successfully',
    `Your previous key has been immediately invalidated.\n\n` +
    `🔑 **Your New API Key:**\n\`\`\`\n${newRawKey}\n\`\`\`\n` +
    `🌐 **Base URL:** \`${baseUrl}\`\n\n` +
    `✅ *All your historical token usage (${(oldKey.tokensUsed || 0).toLocaleString()} tokens) and call stats have been preserved.*`,
    DISCORD_EMBED_SUCCESS
  );
}

// ----------------- Command 3: /stats -----------------

async function handleStats(caller, options, env) {
  // Check if an optional target user was specified
  let targetUserId = caller.id;
  let targetDisplayName = caller.global_name || caller.username;

  if (Array.isArray(options)) {
    const userOption = options.find((o) => o.name === 'user');
    if (userOption && userOption.value) {
      targetUserId = userOption.value;
      targetDisplayName = `<@${targetUserId}>`;
    }
  }

  const userMapping = await getDiscordUser(env.KV, targetUserId);
  if (!userMapping) {
    return ephemeralEmbed(
      'No Telemetry Found',
      `No DiscordLiteRouter account found for ${targetDisplayName}. Run **\`/getapikey\`** to get started.`,
      DISCORD_EMBED_WARNING
    );
  }

  const keyRecord = await getKeyByHash(env.KV, userMapping.hash);
  if (!keyRecord) {
    return ephemeralEmbed(
      'Account Error',
      `API key record not found for ${targetDisplayName}.`,
      DISCORD_EMBED_DANGER
    );
  }

  const used = keyRecord.tokensUsed || 0;
  const limit = keyRecord.tokenLimit || 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const totalCalls = keyRecord.callsCount || 0;

  // Calculate favorite model & top models breakdown
  const modelsUsed = keyRecord.modelsUsed || {};
  const modelEntries = Object.entries(modelsUsed);
  modelEntries.sort((a, b) => (b[1]?.calls || 0) - (a[1]?.calls || 0));

  let favoriteModelStr = 'None yet (no calls recorded)';
  if (modelEntries.length > 0) {
    const [topModel, stats] = modelEntries[0];
    favoriteModelStr = `\`${topModel}\` (${stats.calls} calls, ${(stats.tokens || 0).toLocaleString()} tokens)`;
  }

  let modelBreakdownStr = 'No requests made yet.';
  if (modelEntries.length > 0) {
    modelBreakdownStr = modelEntries
      .slice(0, 5)
      .map(([m, s], idx) => `${idx + 1}. \`${m}\` — **${s.calls}** calls (${(s.tokens || 0).toLocaleString()} tokens)`)
      .join('\n');
  }

  const checkinActive = isCheckinValid(keyRecord);
  const remainingHours = getCheckinRemainingHours(keyRecord);
  const checkinStatusStr = checkinActive
    ? `🟢 Active (${remainingHours.toFixed(1)} hours remaining)`
    : `🔴 Expired (Run \`/checkin\` to activate)`;

  const fields = [
    {
      name: '⚡ All-Time Token Quota',
      value: `**${used.toLocaleString()}** / ${limit.toLocaleString()} tokens (${pct}% used)`,
      inline: false,
    },
    {
      name: '📞 Total API Calls',
      value: `**${totalCalls.toLocaleString()}** requests`,
      inline: true,
    },
    {
      name: '⏰ 24h Check-in Status',
      value: checkinStatusStr,
      inline: true,
    },
    {
      name: '⭐ Favorite Model',
      value: favoriteModelStr,
      inline: false,
    },
    {
      name: '📊 Top Models Breakdown',
      value: modelBreakdownStr,
      inline: false,
    },
  ];

  return publicEmbed(
    `📊 DiscordLiteRouter Telemetry // ${keyRecord.owner || targetDisplayName}`,
    `Account overview and all-time usage statistics:`,
    DISCORD_EMBED_COLOR,
    fields
  );
}

// ----------------- Command 4: /models -----------------

async function handleModels(env) {
  const modelStatsList = await listAllModelStats(env.KV);

  if (modelStatsList.length === 0) {
    return ephemeralEmbed(
      'No Models Configured',
      'There are currently no exposed models configured on DiscordLiteRouter. Please add an upstream channel in the dashboard.',
      DISCORD_EMBED_WARNING
    );
  }

  // Format models with click-to-copy code blocks and reliability status
  const modelLines = modelStatsList.map((m) => {
    let indicator = '🟢';
    if (m.successRate < 80) indicator = '🔴';
    else if (m.successRate < 95) indicator = '🟡';

    const callInfo = m.calls > 0 ? `(${m.calls} calls)` : '(New)';
    return `${indicator} \`${m.model}\` • **${m.successRate}%** success ${callInfo}`;
  });

  // Discord embeds have a 4096 character limit for description, chunk if needed
  const descriptionText =
    `Here are all available models on DiscordLiteRouter. Click any model ID to copy it for your client app:\n\n` +
    modelLines.slice(0, 25).join('\n') +
    (modelLines.length > 25 ? `\n\n*...and ${modelLines.length - 25} more models.*` : '');

  return publicEmbed(
    `🤖 Available DiscordLiteRouter Models (${modelStatsList.length})`,
    descriptionText,
    DISCORD_EMBED_COLOR,
    [
      {
        name: '💡 How to use',
        value: 'Pass any of the model IDs above into Janitor.ai, SillyTavern, or your OpenAI client with your API key.',
      },
    ]
  );
}

// ----------------- Command 5: /checkin -----------------

async function handleCheckin(user, env) {
  const userMapping = await getDiscordUser(env.KV, user.id);
  if (!userMapping) {
    return ephemeralEmbed(
      'No API Key Found',
      `You don't have an active key yet. Run **\`/getapikey\`** to generate your key first!`,
      DISCORD_EMBED_DANGER
    );
  }

  const updatedKey = await updateCheckin(env.KV, userMapping.hash);
  if (!updatedKey) {
    return ephemeralEmbed('Error', 'Could not locate your key to check in.', DISCORD_EMBED_DANGER);
  }

  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiryStr = `<t:${Math.floor(expiryTime.getTime() / 1000)}:R>`;

  return ephemeralEmbed(
    '✅ Daily Check-in Successful!',
    `Awesome, **${user.global_name || user.username}**! Your DiscordLiteRouter API key has been renewed.\n\n` +
    `⏰ **Active Window:** Valid for the next **24 hours** (expires ${expiryStr})\n` +
    `📈 **Lifetime Check-ins:** **${updatedKey.checkinCount || 1}** check-in(s) completed\n` +
    `⚡ **Remaining Quota:** ${(updatedKey.tokensUsed || 0).toLocaleString()} / ${(updatedKey.tokenLimit || 0).toLocaleString()} tokens\n\n` +
    `*Run \`/checkin\` again tomorrow to keep your key uninterrupted!*`,
    DISCORD_EMBED_SUCCESS
  );
}
