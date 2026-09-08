/**
 * KV Storage layer for Channels and API Keys
 * 
 * Note on KV Concurrency & Consistency:
 * Cloudflare KV is eventually consistent with read-check-increment semantics.
 * For v1, this is lightweight and performant. For airtight atomic enforcement
 * under high concurrent load, a Cloudflare Durable Object per API key would
 * be recommended.
 */

// Channels
export async function listChannels(kv) {
  const index = await kv.get('channels_index', { type: 'json' });
  if (!Array.isArray(index) || index.length === 0) {
    return [];
  }

  const channels = await Promise.all(
    index.map(async (prefix) => {
      const data = await kv.get(`channel:${prefix}`, { type: 'json' });
      return data || { prefix, models: [], openaiUrl: '', apiKey: '' };
    })
  );

  return channels.filter(Boolean);
}

export async function getChannel(kv, prefix) {
  if (!prefix) return null;
  return await kv.get(`channel:${prefix}`, { type: 'json' });
}

export async function saveChannel(kv, channelData) {
  const { prefix } = channelData;
  if (!prefix) throw new Error('Channel prefix is required');

  // 1. Save the channel record
  await kv.put(`channel:${prefix}`, JSON.stringify(channelData));

  // 2. Update channels_index
  const index = (await kv.get('channels_index', { type: 'json' })) || [];
  if (!index.includes(prefix)) {
    index.push(prefix);
    await kv.put('channels_index', JSON.stringify(index));
  }
}

export async function deleteChannel(kv, prefix) {
  if (!prefix) return;

  // 1. Delete channel data
  await kv.delete(`channel:${prefix}`);

  // 2. Remove from index
  const index = (await kv.get('channels_index', { type: 'json' })) || [];
  const updatedIndex = index.filter((p) => p !== prefix);
  await kv.put('channels_index', JSON.stringify(updatedIndex));
}

// API Keys
export async function listKeys(kv) {
  const index = (await kv.get('keys_index', { type: 'json' })) || [];
  if (!Array.isArray(index) || index.length === 0) {
    return [];
  }

  // Fetch up-to-date tokensUsed & revoked status from individual records
  const keys = await Promise.all(
    index.map(async (item) => {
      const fullRecord = await kv.get(`apikey:${item.hash}`, { type: 'json' });
      if (fullRecord) {
        return {
          id: fullRecord.id,
          hash: item.hash,
          owner: fullRecord.owner,
          channelPrefix: fullRecord.channelPrefix,
          tokenLimit: fullRecord.tokenLimit,
          tokensUsed: fullRecord.tokensUsed || 0,
          revoked: fullRecord.revoked || false,
          createdAt: fullRecord.createdAt,
        };
      }
      return item;
    })
  );

  return keys;
}

export async function getKeyByHash(kv, hash) {
  if (!hash) return null;
  return await kv.get(`apikey:${hash}`, { type: 'json' });
}

export async function createKey(kv, keyData, hash) {
  // 1. Save apikey:<hash>
  await kv.put(`apikey:${hash}`, JSON.stringify(keyData));

  // 2. Append to keys_index
  const index = (await kv.get('keys_index', { type: 'json' })) || [];
  index.unshift({
    id: keyData.id,
    hash,
    owner: keyData.owner,
    channelPrefix: keyData.channelPrefix,
    tokenLimit: keyData.tokenLimit,
    tokensUsed: 0,
    revoked: false,
    createdAt: keyData.createdAt,
  });

  await kv.put('keys_index', JSON.stringify(index));
}

export async function updateKeyLimit(kv, id, newLimit) {
  const index = (await kv.get('keys_index', { type: 'json' })) || [];
  const item = index.find((k) => k.id === id);
  if (!item) throw new Error('API key not found');

  const fullRecord = await kv.get(`apikey:${item.hash}`, { type: 'json' });
  if (!fullRecord) throw new Error('API key record not found');

  fullRecord.tokenLimit = Number(newLimit);
  await kv.put(`apikey:${item.hash}`, JSON.stringify(fullRecord));

  // Update in index for quick display
  item.tokenLimit = Number(newLimit);
  await kv.put('keys_index', JSON.stringify(index));
  return fullRecord;
}

export async function revokeKey(kv, id) {
  const index = (await kv.get('keys_index', { type: 'json' })) || [];
  const item = index.find((k) => k.id === id);
  if (!item) throw new Error('API key not found');

  const fullRecord = await kv.get(`apikey:${item.hash}`, { type: 'json' });
  if (fullRecord) {
    fullRecord.revoked = true;
    await kv.put(`apikey:${item.hash}`, JSON.stringify(fullRecord));
  }

  item.revoked = true;
  await kv.put('keys_index', JSON.stringify(index));
}

export async function incrementTokenUsage(kv, hash, tokensToAdd) {
  if (!tokensToAdd || tokensToAdd <= 0) return;

  const fullRecord = await kv.get(`apikey:${hash}`, { type: 'json' });
  if (!fullRecord) return;

  fullRecord.tokensUsed = (fullRecord.tokensUsed || 0) + tokensToAdd;
  await kv.put(`apikey:${hash}`, JSON.stringify(fullRecord));
}
