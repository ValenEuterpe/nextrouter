/**
 * Discord Slash Commands Definitions & Registration Engine
 */

export const DISCORD_SLASH_COMMANDS = [
  {
    name: 'getapikey',
    description: 'Initialize your account and receive your DiscordLiteRouter API key (1 per user)',
  },
  {
    name: 'rotatekey',
    description: 'Rotate and generate a fresh API key while keeping your historical quota and stats',
  },
  {
    name: 'stats',
    description: 'View all-time DiscordLiteRouter usage, favorite models, and check-in status',
    options: [
      {
        name: 'user',
        description: 'Optional: Select a user to inspect their telemetry',
        type: 6, // USER type
        required: false,
      },
    ],
  },
  {
    name: 'models',
    description: 'List all available AI models with success percentages and 1-click copy IDs',
  },
  {
    name: 'checkin',
    description: 'Complete your 24-hour daily check-in to keep your API key active',
  },
];

/**
 * Register slash commands globally with Discord REST API
 */
export async function registerDiscordCommands(applicationId, botToken) {
  if (!applicationId || !botToken) {
    throw new Error('Both Discord Application ID and Bot Token are required.');
  }

  const cleanAppId = String(applicationId).trim();
  const cleanToken = String(botToken).trim().replace(/^Bot\s+/i, '');

  const url = `https://discord.com/api/v10/applications/${cleanAppId}/commands`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${cleanToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(DISCORD_SLASH_COMMANDS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Discord API error (${response.status}): ${errorText}`;
    try {
      const errJson = JSON.parse(errorText);
      if (errJson.message) {
        errorMessage = `Discord API (${response.status}): ${errJson.message}`;
      }
    } catch {
      // Use fallback error message
    }
    throw new Error(errorMessage);
  }

  const registered = await response.json();
  return {
    success: true,
    count: Array.isArray(registered) ? registered.length : 0,
    commands: Array.isArray(registered) ? registered : [],
    registeredAt: new Date().toISOString(),
  };
}

/**
 * Helper to resolve Discord settings with KV precedence and env fallback
 */
export async function getDiscordSettings(kv, env = {}) {
  let kvSettings = null;
  if (kv) {
    kvSettings = await kv.get('settings:discord', { type: 'json' });
  }

  const applicationId = kvSettings?.applicationId || env.DISCORD_APPLICATION_ID || '';
  const publicKey = kvSettings?.publicKey || env.DISCORD_PUBLIC_KEY || '';
  const botToken = kvSettings?.botToken || env.DISCORD_BOT_TOKEN || '';
  const defaultTokenLimit = Number(kvSettings?.defaultTokenLimit || env.DEFAULT_DISCORD_TOKEN_LIMIT || 2000000);
  const lastRegisteredAt = kvSettings?.lastRegisteredAt || null;
  const lastCommands = kvSettings?.lastCommands || [];

  const isConfigured = Boolean(applicationId && publicKey && botToken);

  return {
    applicationId,
    publicKey,
    botToken,
    defaultTokenLimit,
    lastRegisteredAt,
    lastCommands,
    isConfigured,
    source: {
      applicationId: kvSettings?.applicationId ? 'kv' : (env.DISCORD_APPLICATION_ID ? 'env' : 'none'),
      publicKey: kvSettings?.publicKey ? 'kv' : (env.DISCORD_PUBLIC_KEY ? 'env' : 'none'),
      botToken: kvSettings?.botToken ? 'kv' : (env.DISCORD_BOT_TOKEN ? 'env' : 'none'),
      defaultTokenLimit: kvSettings?.defaultTokenLimit ? 'kv' : (env.DEFAULT_DISCORD_TOKEN_LIMIT ? 'env' : 'default'),
    },
  };
}

/**
 * Save Discord settings to KV
 */
export async function saveDiscordSettings(kv, newSettings) {
  if (!kv) throw new Error('KV storage binding is required.');
  
  const existing = (await kv.get('settings:discord', { type: 'json' })) || {};
  
  const updated = {
    ...existing,
    ...newSettings,
    updatedAt: new Date().toISOString(),
  };

  await kv.put('settings:discord', JSON.stringify(updated));
  return updated;
}
