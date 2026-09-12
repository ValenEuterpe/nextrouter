import assert from 'node:assert';
import {
  sha256,
  generateApiKey,
  createSessionToken,
} from '../src/crypto.js';
import {
  saveChannel,
  createKey,
  getKeyByHash,
  listKeys,
  getDiscordUser,
  saveDiscordUser,
  updateCheckin,
  isCheckinValid,
  getCheckinRemainingHours,
  recordRequestTelemetry,
  getRecentLogs,
  getModelStats,
  listAllModelStats,
} from '../src/kv.js';
import { verifyDiscordSignature, hexToUint8Array } from '../src/discord/verify.js';
import { handleDiscordInteraction } from '../src/discord/handlers.js';
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

async function runTests() {
  console.log('🧪 Starting Discord Bot & Telemetry Test Suite...\n');

  // 1. Ed25519 Cryptographic Signature Verification
  console.log('1️⃣ Testing Discord Ed25519 Signature Verification...');
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  );

  const rawPublicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyHex = bufferToHex(rawPublicKey);

  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify({ type: 1 });
  const dataToSign = new TextEncoder().encode(timestamp + rawBody);
  const signatureBuffer = await crypto.subtle.sign({ name: 'Ed25519' }, keyPair.privateKey, dataToSign);
  const signatureHex = bufferToHex(signatureBuffer);

  // Valid Signature
  const validReq = new Request('https://worker.test/discord/interactions', {
    method: 'POST',
    headers: {
      'X-Signature-Ed25519': signatureHex,
      'X-Signature-Timestamp': timestamp,
      'Content-Type': 'application/json',
    },
    body: rawBody,
  });
  const isValid = await verifyDiscordSignature(validReq, rawBody, publicKeyHex);
  assert.strictEqual(isValid, true, 'Valid Ed25519 signature must verify');

  // Invalid / Tampered Signature
  const tamperedReq = new Request('https://worker.test/discord/interactions', {
    method: 'POST',
    headers: {
      'X-Signature-Ed25519': '00'.repeat(64),
      'X-Signature-Timestamp': timestamp,
      'Content-Type': 'application/json',
    },
    body: rawBody,
  });
  const isInvalid = await verifyDiscordSignature(tamperedReq, rawBody, publicKeyHex);
  assert.strictEqual(isInvalid, false, 'Tampered signature must be rejected');

  console.log('   ✅ Ed25519 verification working perfectly.\n');

  // 2. Discord Slash Command Handlers
  console.log('2️⃣ Testing Discord Slash Command Handlers...');
  const kv = new MockKV();
  const env = {
    KV: kv,
    DEFAULT_DISCORD_TOKEN_LIMIT: '2000000',
    DISCORD_PUBLIC_KEY: publicKeyHex,
    JWT_SECRET: 'test-jwt-secret-12345',
    OWNER_USER: 'admin',
    OWNER_PASS: 'password123',
  };

  const testUser = {
    id: 'discord-user-123456',
    username: 'cryptovixen',
    global_name: 'Crypto Vixen',
  };

  // Test Type 1: PING
  const pingRes = await handleDiscordInteraction({ type: 1 }, env, 'https://worker.test/discord/interactions');
  const pingJson = await pingRes.json();
  assert.strictEqual(pingJson.type, 1, 'Ping interaction must respond with type 1');

  // Test Command: /getapikey
  const getApiKeyInteraction = {
    type: 2,
    data: { name: 'getapikey' },
    member: { user: testUser },
  };
  const keyRes1 = await handleDiscordInteraction(getApiKeyInteraction, env, 'https://dnextrouter.workers.dev/discord/interactions');
  const keyJson1 = await keyRes1.json();
  assert.strictEqual(keyJson1.type, 4, 'Should respond with message');
  assert.strictEqual(keyJson1.data.flags, 64, 'Must be ephemeral (flags: 64)');
  assert(keyJson1.data.embeds[0].title.includes('Initialized'), 'Should confirm initialization');

  // Verify KV user mapping was saved
  const mapping = await getDiscordUser(kv, testUser.id);
  assert(mapping && mapping.hash, 'Discord user mapping must exist in KV');

  const userKey = await getKeyByHash(kv, mapping.hash);
  assert.strictEqual(userKey.discordUserId, testUser.id);
  assert.strictEqual(userKey.tokenLimit, 2000000);
  assert.strictEqual(userKey.tokensUsed, 0);
  assert.strictEqual(userKey.requireCheckin, true);
  assert(isCheckinValid(userKey), 'Checkin must be valid initially');

  // Test Duplicate /getapikey -> Must return existing key warning and NOT duplicate
  const keyResDuplicate = await handleDiscordInteraction(getApiKeyInteraction, env, 'https://dnextrouter.workers.dev/discord/interactions');
  const keyJsonDup = await keyResDuplicate.json();
  assert(keyJsonDup.data.embeds[0].title.includes('Already Have'), 'Must inform user they already have a key');

  // Test Command: /checkin
  const checkinInteraction = {
    type: 2,
    data: { name: 'checkin' },
    member: { user: testUser },
  };
  const checkinRes = await handleDiscordInteraction(checkinInteraction, env, 'https://dnextrouter.workers.dev/discord/interactions');
  const checkinJson = await checkinRes.json();
  assert(checkinJson.data.embeds[0].title.includes('Successful'), 'Checkin must succeed');

  const updatedKey = await getKeyByHash(kv, mapping.hash);
  assert.strictEqual(updatedKey.checkinCount, 2, 'Checkin count must be incremented');

  // Test Command: /rotatekey
  const rotateInteraction = {
    type: 2,
    data: { name: 'rotatekey' },
    member: { user: testUser },
  };
  const rotateRes = await handleDiscordInteraction(rotateInteraction, env, 'https://dnextrouter.workers.dev/discord/interactions');
  const rotateJson = await rotateRes.json();
  assert(rotateJson.data.embeds[0].title.includes('Rotated Successfully'), 'Key rotation must succeed');

  // Verify old key is revoked and new key exists
  const oldKeyRecord = await getKeyByHash(kv, mapping.hash);
  assert.strictEqual(oldKeyRecord.revoked, true, 'Old key must be revoked');

  const updatedMapping = await getDiscordUser(kv, testUser.id);
  assert.notStrictEqual(updatedMapping.hash, mapping.hash, 'Mapping must point to new hash');
  const newKeyRecord = await getKeyByHash(kv, updatedMapping.hash);
  assert.strictEqual(newKeyRecord.revoked, false, 'New key must be active');
  assert.strictEqual(newKeyRecord.discordUserId, testUser.id);

  console.log('   ✅ /getapikey, /checkin, and /rotatekey passed.\n');

  // 3. Telemetry Recording & Per-Model Stats
  console.log('3️⃣ Testing Telemetry Engine & Model Success Rates...');

  // Configure a channel with models
  await saveChannel(kv, {
    prefix: 'claude',
    openaiUrl: 'https://api.anthropic.com/v1',
    apiKey: 'sk-test',
    models: ['claude-3-5-sonnet', 'claude-3-haiku'],
  });

  // Record 3 successful requests and 1 failed request for claude-3-5-sonnet
  await recordRequestTelemetry(kv, {
    keyHash: updatedMapping.hash,
    model: 'claude-3-5-sonnet',
    channel: 'claude',
    usage: { prompt_tokens: 150, completion_tokens: 350, total_tokens: 500 },
    latencyMs: 320,
    status: 200,
    success: true,
  });

  await recordRequestTelemetry(kv, {
    keyHash: updatedMapping.hash,
    model: 'claude-3-5-sonnet',
    channel: 'claude',
    usage: { prompt_tokens: 200, completion_tokens: 800, total_tokens: 1000 },
    latencyMs: 450,
    status: 200,
    success: true,
  });

  await recordRequestTelemetry(kv, {
    keyHash: updatedMapping.hash,
    model: 'claude-3-5-sonnet',
    channel: 'claude',
    usage: { prompt_tokens: 50, completion_tokens: 150, total_tokens: 200 },
    latencyMs: 180,
    status: 200,
    success: true,
  });

  // Failed request (e.g. 500 upstream error)
  await recordRequestTelemetry(kv, {
    keyHash: updatedMapping.hash,
    model: 'claude-3-5-sonnet',
    channel: 'claude',
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    latencyMs: 1100,
    status: 500,
    success: false,
  });

  // Record 1 request for claude-3-haiku
  await recordRequestTelemetry(kv, {
    keyHash: updatedMapping.hash,
    model: 'claude-3-haiku',
    channel: 'claude',
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
    latencyMs: 95,
    status: 200,
    success: true,
  });

  // Verify Model Stats Calculation (3 success out of 4 total = 75.0%)
  const sonnetStats = await getModelStats(kv, 'claude-3-5-sonnet');
  assert.strictEqual(sonnetStats.calls, 4);
  assert.strictEqual(sonnetStats.successCount, 3);
  assert.strictEqual(sonnetStats.errorCount, 1);
  assert.strictEqual(sonnetStats.successRate, 75.0, 'Success rate must be 75.0%');
  assert.strictEqual(sonnetStats.totalTokens, 1700);

  // Verify Ring Buffer logs_recent
  const recentLogs = await getRecentLogs(kv, 10);
  assert.strictEqual(recentLogs.length, 5, 'Should have 5 logged requests');
  assert.strictEqual(recentLogs[0].model, 'claude-3-haiku', 'Most recent request first');
  assert.strictEqual(recentLogs[1].status, 500, 'Error status captured correctly');

  // Verify Key Record stats
  const keyAfterTelemetry = await getKeyByHash(kv, updatedMapping.hash);
  assert.strictEqual(keyAfterTelemetry.tokensUsed, 2000, 'Tokens used should sum to 2000');
  assert.strictEqual(keyAfterTelemetry.callsCount, 5, 'Calls count should be 5');
  assert.strictEqual(keyAfterTelemetry.modelsUsed['claude-3-5-sonnet'].calls, 4);
  assert.strictEqual(keyAfterTelemetry.modelsUsed['claude-3-haiku'].calls, 1);

  console.log('   ✅ Model statistics & telemetry ring buffer verified.\n');

  // 4. Test /stats and /models Slash Commands
  console.log('4️⃣ Testing /stats and /models commands...');
  const statsInteraction = {
    type: 2,
    data: { name: 'stats' },
    member: { user: testUser },
  };
  const statsRes = await handleDiscordInteraction(statsInteraction, env, 'https://worker.test');
  const statsJson = await statsRes.json();
  const embed = statsJson.data.embeds[0];
  assert(embed.title.includes('DiscordLiteRouter Telemetry'), 'Title should match');
  assert(embed.fields.some((f) => f.name.includes('Favorite Model') && f.value.includes('claude-3-5-sonnet')), 'Favorite model must be sonnet');
  assert(embed.fields.some((f) => f.name.includes('Total API Calls') && f.value.includes('**5** requests')), 'Calls count must match');

  const modelsInteraction = {
    type: 2,
    data: { name: 'models' },
    member: { user: testUser },
  };
  const modelsRes = await handleDiscordInteraction(modelsInteraction, env, 'https://worker.test');
  const modelsJson = await modelsRes.json();
  assert(modelsJson.data.embeds[0].description.includes('`claude-3-5-sonnet`'), 'Models output must include code-block model ID');
  assert(modelsJson.data.embeds[0].description.includes('**75%** success'), 'Must include live success rate percentage');

  console.log('   ✅ /stats and /models returned rich embeds with correct metrics.\n');

  // 5. 24-Hour Check-in Validation Guard
  console.log('5️⃣ Testing 24-Hour Check-in Expiration Guard...');

  // Key with fresh check-in (valid)
  assert.strictEqual(isCheckinValid(keyAfterTelemetry), true, 'Key checked in recently must be valid');
  assert(getCheckinRemainingHours(keyAfterTelemetry) > 23, 'Should have ~24 hours left');

  // Expired check-in key (25 hours ago)
  const expiredKey = {
    ...keyAfterTelemetry,
    lastCheckinAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  };
  assert.strictEqual(isCheckinValid(expiredKey), false, 'Check-in >24 hours ago must be invalid');
  assert.strictEqual(getCheckinRemainingHours(expiredKey), 0, 'Remaining hours must be 0');

  // Test via worker.fetch proxy request
  const expiredHash = await sha256('sk-expired-key-test');
  await kv.put(`apikey:${expiredHash}`, JSON.stringify({
    ...expiredKey,
    id: 'expired-id',
    rawKey: 'sk-expired-key-test',
  }));

  const proxyReq = new Request('https://worker.test/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk-expired-key-test',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet',
      messages: [{ role: 'user', content: 'Hello' }],
    }),
  });

  const proxyRes = await worker.fetch(proxyReq, env, { waitUntil: () => {} });
  assert.strictEqual(proxyRes.status, 403, 'Expired key must receive 403 Forbidden');
  const errJson = await proxyRes.json();
  assert.strictEqual(errJson.error.code, 'discord_checkin_expired', 'Must return discord_checkin_expired code');

  console.log('   ✅ 24-Hour Check-in expiration enforced with 403 response.\n');

  // 6. Admin Telemetry API Endpoints (/admin/api/logs & /admin/api/model-stats)
  console.log('6️⃣ Testing Admin Telemetry Endpoints...');
  const sessionToken = await createSessionToken('admin', env.JWT_SECRET);
  const cookieHeader = `auth_session=${sessionToken}`;

  // GET /admin/api/logs
  const logsReq = new Request('https://worker.test/admin/api/logs?limit=10', {
    headers: { Cookie: cookieHeader },
  });
  const logsRes = await worker.fetch(logsReq, env);
  assert.strictEqual(logsRes.status, 200);
  const logsApiData = await logsRes.json();
  assert.strictEqual(logsApiData.success, true);
  assert.strictEqual(logsApiData.logs.length, 5);

  // GET /admin/api/model-stats
  const statsApiReq = new Request('https://worker.test/admin/api/model-stats', {
    headers: { Cookie: cookieHeader },
  });
  const statsApiRes = await worker.fetch(statsApiReq, env);
  assert.strictEqual(statsApiRes.status, 200);
  const statsApiData = await statsApiRes.json();
  assert.strictEqual(statsApiData.success, true);
  assert(statsApiData.stats.some((s) => s.model === 'claude-3-5-sonnet' && s.successRate === 75));

  console.log('   ✅ /admin/api/logs and /admin/api/model-stats returned proper JSON.\n');

  // 7. Full Discord Interaction via Worker POST /discord/interactions
  console.log('7️⃣ Testing Full Worker HTTP /discord/interactions Gateway...');
  
  // Good request through worker.fetch
  const workerDiscordReq = new Request('https://worker.test/discord/interactions', {
    method: 'POST',
    headers: {
      'X-Signature-Ed25519': signatureHex,
      'X-Signature-Timestamp': timestamp,
      'Content-Type': 'application/json',
    },
    body: rawBody,
  });
  const workerDiscordRes = await worker.fetch(workerDiscordReq, env);
  assert.strictEqual(workerDiscordRes.status, 200);
  const workerDiscordJson = await workerDiscordRes.json();
  assert.strictEqual(workerDiscordJson.type, 1);

  // Unauthorized request through worker.fetch
  const badDiscordReq = new Request('https://worker.test/discord/interactions', {
    method: 'POST',
    headers: {
      'X-Signature-Ed25519': 'bad-signature',
      'X-Signature-Timestamp': timestamp,
    },
    body: rawBody,
  });
  const badDiscordRes = await worker.fetch(badDiscordReq, env);
  assert.strictEqual(badDiscordRes.status, 401, 'Invalid signature must be rejected with 401');

  console.log('   ✅ HTTP /discord/interactions gateway verified.\n');

  console.log('🎉 ALL DISCORD & TELEMETRY TESTS PASSED WITH 100% SUCCESS!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
