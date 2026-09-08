import assert from 'node:assert';
import {
  sha256,
  timingSafeEqual,
  createSessionToken,
  verifySessionToken,
  generateApiKey,
} from '../src/crypto.js';
import {
  listChannels,
  saveChannel,
  getChannel,
  deleteChannel,
  listKeys,
  createKey,
  updateKeyLimit,
  revokeKey,
  incrementTokenUsage,
} from '../src/kv.js';
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

async function runTests() {
  console.log('🧪 Starting AI Proxy Unit & Integration Tests...');

  // 1. Crypto Tests
  console.log('Testing Crypto utilities...');
  const key = generateApiKey('sk-');
  assert(key.startsWith('sk-'), 'Key should start with sk-');
  assert(key.length > 20, 'Key should be sufficiently long');

  const hash1 = await sha256(key);
  const hash2 = await sha256(key);
  assert.strictEqual(hash1, hash2, 'SHA-256 must be deterministic');

  assert(timingSafeEqual('secret_pass', 'secret_pass'), 'Equal strings must match');
  assert(!timingSafeEqual('secret_pass', 'wrong_pass'), 'Different strings must not match');

  const secret = 'super-secret-jwt-key-12345';
  const token = await createSessionToken('admin', secret);
  const verified = await verifySessionToken(token, secret);
  assert(verified && verified.u === 'admin', 'Session token must verify username');

  const tamperedToken = token.slice(0, -5) + 'abcde';
  const invalid = await verifySessionToken(tamperedToken, secret);
  assert.strictEqual(invalid, null, 'Tampered token must be rejected');

  console.log('✅ Crypto tests passed.');

  // 2. KV Storage Tests
  console.log('Testing KV storage layer...');
  const kv = new MockKV();

  // Test Channel Operations
  await saveChannel(kv, {
    prefix: 'op',
    openaiUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-upstream-test',
    models: ['gpt-4o', 'gpt-4o-mini'],
  });

  const channel = await getChannel(kv, 'op');
  assert.strictEqual(channel.prefix, 'op', 'Channel prefix must match');
  assert.deepStrictEqual(channel.models, ['gpt-4o', 'gpt-4o-mini']);

  const channelsList = await listChannels(kv);
  assert.strictEqual(channelsList.length, 1);
  assert.strictEqual(channelsList[0].prefix, 'op');

  // Test Key Operations
  const rawClientKey = generateApiKey('sk-');
  const clientHash = await sha256(rawClientKey);
  const keyId = 'test-uuid-1';

  await createKey(
    kv,
    {
      id: keyId,
      owner: 'Alice',
      tokenLimit: 2000000,
      tokensUsed: 0,
      channelPrefix: 'op',
      revoked: false,
      createdAt: new Date().toISOString(),
    },
    clientHash
  );

  let keys = await listKeys(kv);
  assert.strictEqual(keys.length, 1);
  assert.strictEqual(keys[0].owner, 'Alice');
  assert.strictEqual(keys[0].tokenLimit, 2000000);

  // Increment tokens
  await incrementTokenUsage(kv, clientHash, 50000);
  keys = await listKeys(kv);
  assert.strictEqual(keys[0].tokensUsed, 50000, 'Tokens used should increment to 50,000');

  // Update Limit
  await updateKeyLimit(kv, keyId, 3000000);
  keys = await listKeys(kv);
  assert.strictEqual(keys[0].tokenLimit, 3000000, 'Token limit should be updated');

  // Revoke Key
  await revokeKey(kv, keyId);
  keys = await listKeys(kv);
  assert.strictEqual(keys[0].revoked, true, 'Key should be revoked');

  console.log('✅ KV operations passed.');

  // 3. Worker Route Tests
  console.log('Testing Worker Routing...');
  const env = {
    KV: kv,
    OWNER_USER: 'admin',
    OWNER_PASS: 'password123',
    JWT_SECRET: secret,
  };
  const ctx = {
    waitUntil: (promise) => promise,
  };

  // CORS Preflight
  const corsRes = await worker.fetch(new Request('https://proxy.workers.dev/op/v1/chat/completions', {
    method: 'OPTIONS',
  }), env, ctx);
  assert.strictEqual(corsRes.status, 204, 'CORS OPTIONS should return 204');
  assert.strictEqual(corsRes.headers.get('Access-Control-Allow-Origin'), '*');

  // Login flow
  const loginForm = new URLSearchParams();
  loginForm.set('username', 'admin');
  loginForm.set('password', 'password123');
  const loginRes = await worker.fetch(new Request('https://proxy.workers.dev/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: loginForm.toString(),
  }), env, ctx);
  assert.strictEqual(loginRes.status, 302, 'Successful login should redirect');
  const setCookie = loginRes.headers.get('Set-Cookie');
  assert(setCookie && setCookie.includes('auth_session='), 'Should set auth_session cookie');

  // Extract session cookie
  const sessionCookie = setCookie.split(';')[0];

  // Access /admin with valid cookie
  const adminRes = await worker.fetch(new Request('https://proxy.workers.dev/admin', {
    headers: { 'Cookie': sessionCookie },
  }), env, ctx);
  assert.strictEqual(adminRes.status, 200, 'Admin page should return 200 for valid session');

  // Access /admin without cookie (should redirect)
  const unauthRes = await worker.fetch(new Request('https://proxy.workers.dev/admin'), env, ctx);
  assert.strictEqual(unauthRes.status, 302, 'Unauthenticated admin access should redirect to /login');

  // Models Endpoint with authorized client key
  // Create an active key for test
  const activeRawKey = generateApiKey('sk-');
  const activeHash = await sha256(activeRawKey);
  await createKey(
    kv,
    {
      id: 'active-key',
      owner: 'Test Bob',
      tokenLimit: 2000000,
      tokensUsed: 0,
      channelPrefix: 'op',
      revoked: false,
      createdAt: new Date().toISOString(),
    },
    activeHash
  );

  const modelsRes = await worker.fetch(new Request('https://proxy.workers.dev/op/v1/models', {
    headers: { 'Authorization': `Bearer ${activeRawKey}` },
  }), env, ctx);
  assert.strictEqual(modelsRes.status, 200, 'Models endpoint should return 200');
  const modelsData = await modelsRes.json();
  assert.strictEqual(modelsData.object, 'list');
  assert.strictEqual(modelsData.data.length, 2);
  assert.strictEqual(modelsData.data[0].id, 'gpt-4o');

  // Generic /v1/models (used by Janitor.ai, etc.)
  const genericModelsRes = await worker.fetch(new Request('https://proxy.workers.dev/v1/models', {
    headers: { 'Authorization': `Bearer ${activeRawKey}` },
  }), env, ctx);
  assert.strictEqual(genericModelsRes.status, 200, 'Generic /v1/models should return 200');
  const genericData = await genericModelsRes.json();
  assert.strictEqual(genericData.object, 'list');
  assert.strictEqual(genericData.data.length, 2);

  console.log('✅ All Unit & Integration Tests Passed Successfully!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
