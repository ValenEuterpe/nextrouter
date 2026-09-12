import assert from 'node:assert';
import {
  saveChannel,
  getChannel,
  createKey,
  listKeys,
} from '../src/kv.js';
import { generateApiKey, sha256, createSessionToken } from '../src/crypto.js';
import worker from '../src/index.js';

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

async function runForestTest() {
  console.log('🌲 Testing DiscordLiteRouter against The Forest Proxy...');

  const kv = new MockKV();
  const secret = 'quantum-secret-key-9999';
  const env = {
    KV: kv,
    OWNER_USER: 'owner',
    OWNER_PASS: 'password',
    JWT_SECRET: secret,
  };
  const ctx = {
    waitUntil: async (promise) => await promise,
  };

  // 1. Configure the channel 'forest'
  console.log('1. Setting up channel: forest...');
  await saveChannel(kv, {
    prefix: 'forest',
    openaiUrl: 'https://theforestproxy.pages.dev/v1',
    apiKey: 'sk-2lsL8QYNIhWtX5ItuRYITleyGcSkxhDn',
    models: [],
  });

  const sessionToken = await createSessionToken('owner', secret);
  const authHeaders = {
    'Cookie': `auth_session=${sessionToken}`,
    'Content-Type': 'application/json',
  };

  // 2. Test Connection & Fetch Models via Worker Admin API
  console.log('2. Running Test Connection via /admin/api/channels/forest/test...');
  const testRes = await worker.fetch(
    new Request('https://nextrouter.workers.dev/admin/api/channels/forest/test', {
      method: 'POST',
      headers: authHeaders,
    }),
    env,
    ctx
  );
  assert.strictEqual(testRes.status, 200, 'Test connection endpoint should succeed');
  const testData = await testRes.json();
  console.log(`   Found ${testData.count} models from The Forest Proxy!`);
  assert(testData.count > 10, 'Should find many models');

  // 3. Expose selected models (e.g. claude-sonnet-4-6)
  const selectedModels = [
    'my/valentinedemo/claude-sonnet-4-6',
    'forestproxy/valentinecascade',
  ];
  console.log('3. Saving selected models for channel...');
  const saveModelsRes = await worker.fetch(
    new Request('https://nextrouter.workers.dev/admin/api/channels/forest/test', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ selectedModels }),
    }),
    env,
    ctx
  );
  assert.strictEqual(saveModelsRes.status, 200);

  const updatedChannel = await getChannel(kv, 'forest');
  assert.deepStrictEqual(updatedChannel.models, selectedModels);
  console.log('   Models saved to channel:', updatedChannel.models);

  // 4. Generate Client API Key with 2,000,000 token limit
  console.log('4. Generating client API key with 2M token limit...');
  const createKeyRes = await worker.fetch(
    new Request('https://nextrouter.workers.dev/admin/api/keys', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        owner: 'Valentine Test Client',
        channelPrefix: 'forest',
        tokenLimit: 2000000,
      }),
    }),
    env,
    ctx
  );
  const keyData = await createKeyRes.json();
  assert(keyData.success);
  const clientRawKey = keyData.rawKey;
  console.log('   Generated client key:', clientRawKey.slice(0, 10) + '••••••••');
  console.log('   Token limit:', keyData.key.tokenLimit);

  // 5. Query /forest/v1/models using the client API key
  console.log('5. Querying /forest/v1/models as client...');
  const modelsRes = await worker.fetch(
    new Request('https://nextrouter.workers.dev/forest/v1/models', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${clientRawKey}` },
    }),
    env,
    ctx
  );
  assert.strictEqual(modelsRes.status, 200);
  const exposedModelsJson = await modelsRes.json();
  console.log('   Exposed models list:', exposedModelsJson.data.map(m => m.id));
  assert.strictEqual(exposedModelsJson.data.length, 2);

  // 6. Execute Chat Completion through DiscordLiteRouter Proxy
  console.log('6. Forwarding chat completion through DiscordLiteRouter to The Forest Proxy...');
  const chatRes = await worker.fetch(
    new Request('https://nextrouter.workers.dev/forest/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientRawKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'my/valentinedemo/claude-sonnet-4-6',
        messages: [{ role: 'user', content: 'Say "DiscordLiteRouter online" in 3 words' }],
        max_tokens: 15,
        stream: false,
      }),
    }),
    env,
    ctx
  );

  assert.strictEqual(chatRes.status, 200, 'Chat completion should succeed');
  const chatData = await chatRes.json();
  console.log('   Response from upstream model:');
  console.log('   >', chatData.choices[0].message.content.trim());
  console.log('   Token usage reported:', chatData.usage);

  // 7. Verify Tokens Were Accounted in KV
  console.log('7. Verifying token quota consumption in KV...');
  const keysAfterChat = await listKeys(kv);
  const clientKeyRecord = keysAfterChat.find(k => k.id === keyData.key.id);
  console.log(`   Tokens used: ${clientKeyRecord.tokensUsed} / ${clientKeyRecord.tokenLimit}`);
  assert(clientKeyRecord.tokensUsed > 0, 'Tokens used must be incremented after chat completion');

  console.log('🎉 Live Forest Proxy Integration Test Succeeded Perfectly!');
}

runForestTest().catch((err) => {
  console.error('❌ Forest Test failed:', err);
  process.exit(1);
});
