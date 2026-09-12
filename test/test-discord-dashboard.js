import assert from 'node:assert';
import {
  createSessionToken,
} from '../src/crypto.js';
import {
  DISCORD_SLASH_COMMANDS,
  getDiscordSettings,
  saveDiscordSettings,
  registerDiscordCommands,
} from '../src/discord/commands.js';
import worker from '../src/index.js';

// In-Memory Mock KV store
class MockKV {
  constructor() {
    this.store = new Map();
  }
  async get(key, options = {}) {
    const val = this.store.get(key);
    if (val === undefined) return null;
    if (options.type === 'json') {
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    }
    return val;
  }
  async put(key, value) {
    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  async delete(key) {
    this.store.delete(key);
  }
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function runDashboardDiscordTests() {
  console.log('🧪 Starting Discord Dashboard & In-Worker Registration Tests...\n');

  const kv = new MockKV();
  const env = {
    KV: kv,
    JWT_SECRET: 'test-dashboard-secret-12345',
    OWNER_USER: 'owner',
    OWNER_PASS: 'password',
  };

  // 1. Initial State
  console.log('1️⃣ Testing Initial Discord Settings...');
  const initial = await getDiscordSettings(kv, env);
  assert.strictEqual(initial.isConfigured, false);
  assert.strictEqual(initial.defaultTokenLimit, 2000000);
  assert.strictEqual(initial.applicationId, '');
  assert.strictEqual(initial.botToken, '');
  console.log('   ✅ Initial empty state confirmed.');

  // 2. Save Settings via saveDiscordSettings
  console.log('2️⃣ Testing Discord Settings Persistence in KV...');
  await saveDiscordSettings(kv, {
    applicationId: '123456789012345678',
    publicKey: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    botToken: 'BotTokenSecret123456',
    defaultTokenLimit: 3000000,
  });

  const updated = await getDiscordSettings(kv, env);
  assert.strictEqual(updated.isConfigured, true);
  assert.strictEqual(updated.applicationId, '123456789012345678');
  assert.strictEqual(updated.defaultTokenLimit, 3000000);
  assert.strictEqual(updated.source.applicationId, 'kv');
  console.log('   ✅ Settings saved and retrieved from KV.');

  // 3. Admin API Endpoints via worker.fetch
  console.log('3️⃣ Testing Admin API Endpoints for Discord Settings...');
  const sessionToken = await createSessionToken('owner', env.JWT_SECRET);
  const authCookie = `auth_session=${sessionToken}`;

  // GET /admin/api/settings/discord
  const getReq = new Request('https://worker.test/admin/api/settings/discord', {
    headers: { Cookie: authCookie },
  });
  const getRes = await worker.fetch(getReq, env);
  assert.strictEqual(getRes.status, 200);
  const getData = await getRes.json();
  assert.strictEqual(getData.success, true);
  assert.strictEqual(getData.settings.applicationId, '123456789012345678');
  assert.strictEqual(getData.settings.hasBotToken, true);
  assert(getData.settings.botTokenMasked.includes('••••'), 'Bot token must be masked in API output');
  assert(!getData.settings.botToken, 'Raw bot token must never be sent in GET response');

  // POST /admin/api/settings/discord with token preservation
  const postReq = new Request('https://worker.test/admin/api/settings/discord', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie,
    },
    body: JSON.stringify({
      applicationId: '987654321098765432',
      defaultTokenLimit: 5000000,
      botToken: '', // Blank -> keep existing token
    }),
  });
  const postRes = await worker.fetch(postReq, env);
  assert.strictEqual(postRes.status, 200);
  const postData = await postRes.json();
  assert.strictEqual(postData.settings.applicationId, '987654321098765432');
  assert.strictEqual(postData.settings.defaultTokenLimit, 5000000);
  assert.strictEqual(postData.settings.hasBotToken, true, 'Existing bot token preserved');

  // Verify KV still has the original botToken
  const verifiedKv = await getDiscordSettings(kv, env);
  assert.strictEqual(verifiedKv.botToken, 'BotTokenSecret123456');
  console.log('   ✅ Admin API GET and POST with token preservation passed.');

  // 4. Test 1-Click Slash Command Registration (Mocked Discord API)
  console.log('4️⃣ Testing 1-Click Command Registration Engine...');
  const originalFetch = globalThis.fetch;
  let interceptedUrl = null;
  let interceptedAuth = null;
  let interceptedBody = null;

  globalThis.fetch = async (url, options) => {
    if (String(url).includes('discord.com/api/v10/applications')) {
      interceptedUrl = String(url);
      interceptedAuth = options.headers['Authorization'];
      interceptedBody = JSON.parse(options.body);

      return new Response(
        JSON.stringify(
          DISCORD_SLASH_COMMANDS.map((cmd, idx) => ({
            id: `cmd-${idx + 1}`,
            application_id: '987654321098765432',
            name: cmd.name,
            description: cmd.description,
          }))
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return originalFetch(url, options);
  };

  const regReq = new Request('https://worker.test/admin/api/settings/discord/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie,
    },
  });
  const regRes = await worker.fetch(regReq, env);
  assert.strictEqual(regRes.status, 200);
  const regData = await regRes.json();

  assert.strictEqual(regData.success, true);
  assert.strictEqual(regData.count, 5);
  assert.strictEqual(interceptedUrl, 'https://discord.com/api/v10/applications/987654321098765432/commands');
  assert.strictEqual(interceptedAuth, 'Bot BotTokenSecret123456');
  assert.strictEqual(interceptedBody.length, 5);
  assert(interceptedBody.some((c) => c.name === 'getapikey'));
  assert(interceptedBody.some((c) => c.name === 'rotatekey'));
  assert(interceptedBody.some((c) => c.name === 'stats'));
  assert(interceptedBody.some((c) => c.name === 'models'));
  assert(interceptedBody.some((c) => c.name === 'checkin'));

  // Verify KV saved lastRegisteredAt
  const settingsAfterSync = await getDiscordSettings(kv, env);
  assert(settingsAfterSync.lastRegisteredAt, 'lastRegisteredAt must be saved');
  assert.strictEqual(settingsAfterSync.lastCommands.length, 5);
  console.log('   ✅ 1-Click Slash Command Registration succeeded.');

  // Restore fetch
  globalThis.fetch = originalFetch;

  // 5. Dynamic Public Key Verification on /discord/interactions
  console.log('5️⃣ Testing Dynamic Public Key Verification from KV...');
  const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const rawPub = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const pubHex = bufferToHex(rawPub);

  // Save this public key into KV (and notice env has NO DISCORD_PUBLIC_KEY!)
  await saveDiscordSettings(kv, { publicKey: pubHex });

  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify({ type: 1 });
  const dataToSign = new TextEncoder().encode(timestamp + rawBody);
  const sigBuffer = await crypto.subtle.sign({ name: 'Ed25519' }, keyPair.privateKey, dataToSign);
  const sigHex = bufferToHex(sigBuffer);

  const interReq = new Request('https://worker.test/discord/interactions', {
    method: 'POST',
    headers: {
      'X-Signature-Ed25519': sigHex,
      'X-Signature-Timestamp': timestamp,
      'Content-Type': 'application/json',
    },
    body: rawBody,
  });

  const interRes = await worker.fetch(interReq, env);
  assert.strictEqual(interRes.status, 200);
  const interData = await interRes.json();
  assert.strictEqual(interData.type, 1, 'Ping interaction verified using KV public key');

  console.log('   ✅ Dynamic Public Key from KV verified successfully.');

  console.log('\n🎉 ALL DISCORD DASHBOARD & REGISTRATION TESTS PASSED!');
}

runDashboardDiscordTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
