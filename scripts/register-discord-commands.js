import { registerDiscordCommands } from '../src/discord/commands.js';

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APPLICATION_ID || !BOT_TOKEN) {
  console.error('❌ Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN.');
  console.error('Usage:');
  console.error('  npx cross-env DISCORD_APPLICATION_ID="..." DISCORD_BOT_TOKEN="..." node scripts/register-discord-commands.js');
  console.error('Or configure directly in the Next Router Owner Dashboard!');
  process.exit(1);
}

async function main() {
  console.log(`📡 Registering global slash commands for Discord App ${APPLICATION_ID}...`);
  const result = await registerDiscordCommands(APPLICATION_ID, BOT_TOKEN);
  console.log(`✅ Successfully registered ${result.count} global slash commands:`);
  result.commands.forEach((cmd) => {
    console.log(`   - /${cmd.name}: ${cmd.description}`);
  });
  console.log('\n🎉 Discord slash commands are now active globally across all servers!');
}

main().catch((err) => {
  console.error('❌ Failed to register commands:', err.message);
  process.exit(1);
});

