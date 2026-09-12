/**
 * Script to register Next Router Discord Slash Commands
 * Usage:
 *   DISCORD_APPLICATION_ID="your_id" DISCORD_BOT_TOKEN="your_token" node scripts/register-discord-commands.js
 */

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APPLICATION_ID || !BOT_TOKEN) {
  console.error('❌ Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN.');
  console.error('Usage:');
  console.error('  npx cross-env DISCORD_APPLICATION_ID="..." DISCORD_BOT_TOKEN="..." node scripts/register-discord-commands.js');
  console.error('Or set them in your environment variables.');
  process.exit(1);
}

const commands = [
  {
    name: 'getapikey',
    description: 'Initialize your account and receive your Next Router API key (1 per user)',
  },
  {
    name: 'rotatekey',
    description: 'Rotate and generate a fresh API key while keeping your historical quota and stats',
  },
  {
    name: 'stats',
    description: 'View all-time Next Router usage, favorite models, and check-in status',
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

async function registerCommands() {
  console.log(`📡 Registering ${commands.length} global slash commands for Discord App ${APPLICATION_ID}...`);

  const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Discord API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Successfully registered global slash commands:');
  data.forEach((cmd) => {
    console.log(`   - /${cmd.name}: ${cmd.description}`);
  });
  console.log('\n🎉 Discord slash commands are now active globally across all servers!');
}

registerCommands().catch((err) => {
  console.error('❌ Failed to register commands:', err.message);
  process.exit(1);
});
