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
          rawKey: fullRecord.rawKey || item.rawKey || null,
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
    rawKey: keyData.rawKey || null,
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

// ----------------- Discord User Mapping -----------------

export async function getDiscordUser(kv, userId) {
  if (!userId) return null;
  return await kv.get(`discord_user:${userId}`, { type: 'json' });
}

export async function saveDiscordUser(kv, userId, data) {
  if (!userId) return;
  await kv.put(`discord_user:${userId}`, JSON.stringify(data));
}

export async function rotateDiscordKey(kv, oldHash, newKeyRecord, newHash) {
  // 1. Revoke old key
  const oldKey = await kv.get(`apikey:${oldHash}`, { type: 'json' });
  if (oldKey) {
    oldKey.revoked = true;
    await kv.put(`apikey:${oldHash}`, JSON.stringify(oldKey));
  }

  // 2. Save new key
  await kv.put(`apikey:${newHash}`, JSON.stringify(newKeyRecord));

  // 3. Update keys_index
  const index = (await kv.get('keys_index', { type: 'json' })) || [];
  const existingIdx = index.findIndex((k) => k.hash === oldHash || k.id === newKeyRecord.id);
  const indexEntry = {
    id: newKeyRecord.id,
    hash: newHash,
    owner: newKeyRecord.owner,
    channelPrefix: newKeyRecord.channelPrefix,
    tokenLimit: newKeyRecord.tokenLimit,
    tokensUsed: newKeyRecord.tokensUsed || 0,
    revoked: false,
    rawKey: newKeyRecord.rawKey || null,
    createdAt: newKeyRecord.createdAt,
    discordUserId: newKeyRecord.discordUserId,
    lastCheckinAt: newKeyRecord.lastCheckinAt,
  };

  if (existingIdx >= 0) {
    index[existingIdx] = indexEntry;
  } else {
    index.unshift(indexEntry);
  }
  await kv.put('keys_index', JSON.stringify(index));

  // 4. Update discord_user mapping
  if (newKeyRecord.discordUserId) {
    await saveDiscordUser(kv, newKeyRecord.discordUserId, {
      id: newKeyRecord.id,
      hash: newHash,
      owner: newKeyRecord.owner,
      updatedAt: new Date().toISOString(),
    });
  }
}

// ----------------- 24-Hour Check-in Helpers -----------------

export async function updateCheckin(kv, hash) {
  if (!hash) return null;
  const keyRecord = await kv.get(`apikey:${hash}`, { type: 'json' });
  if (!keyRecord) return null;

  const now = new Date().toISOString();
  keyRecord.lastCheckinAt = now;
  keyRecord.checkinCount = (keyRecord.checkinCount || 0) + 1;
  await kv.put(`apikey:${hash}`, JSON.stringify(keyRecord));

  // Update in index
  const index = (await kv.get('keys_index', { type: 'json' })) || [];
  const item = index.find((k) => k.hash === hash || k.id === keyRecord.id);
  if (item) {
    item.lastCheckinAt = now;
    await kv.put('keys_index', JSON.stringify(index));
  }

  return keyRecord;
}

export function isCheckinValid(keyRecord) {
  if (!keyRecord) return false;
  if (!keyRecord.requireCheckin) return true;
  if (!keyRecord.lastCheckinAt) return false;

  const checkinTime = new Date(keyRecord.lastCheckinAt).getTime();
  if (isNaN(checkinTime)) return false;

  const diffHours = (Date.now() - checkinTime) / (1000 * 60 * 60);
  return diffHours < 24;
}

export function getCheckinRemainingHours(keyRecord) {
  if (!keyRecord || !keyRecord.lastCheckinAt) return 0;
  const checkinTime = new Date(keyRecord.lastCheckinAt).getTime();
  if (isNaN(checkinTime)) return 0;
  const elapsedHours = (Date.now() - checkinTime) / (1000 * 60 * 60);
  return Math.max(0, 24 - elapsedHours);
}

// ----------------- Telemetry & Logging Helpers -----------------

export async function recordRequestTelemetry(kv, data) {
  const {
    keyHash,
    model = 'unknown',
    channel = 'default',
    usage = {},
    latencyMs = 0,
    status = 200,
    success = true,
  } = data;

  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || (promptTokens + completionTokens);
  const now = new Date().toISOString();

  // 1. Update Key Stats & Token Usage
  let keyRecord = null;
  if (keyHash) {
    keyRecord = await kv.get(`apikey:${keyHash}`, { type: 'json' });
    if (keyRecord) {
      if (totalTokens > 0) {
        keyRecord.tokensUsed = (keyRecord.tokensUsed || 0) + totalTokens;
      }
      keyRecord.callsCount = (keyRecord.callsCount || 0) + 1;
      keyRecord.lastUsedAt = now;

      // Model breakdown
      keyRecord.modelsUsed = keyRecord.modelsUsed || {};
      const mStats = keyRecord.modelsUsed[model] || { calls: 0, tokens: 0 };
      mStats.calls += 1;
      mStats.tokens += totalTokens;
      keyRecord.modelsUsed[model] = mStats;

      await kv.put(`apikey:${keyHash}`, JSON.stringify(keyRecord));
    }
  }

  // 2. Append to logs_recent Ring Buffer (max 200 items)
  const logEntry = {
    id: crypto.randomUUID(),
    timestamp: now,
    keyOwner: keyRecord?.owner || 'Anonymous',
    discordUserId: keyRecord?.discordUserId || null,
    model,
    channel,
    promptTokens,
    completionTokens,
    totalTokens,
    latencyMs,
    status,
    success,
  };

  const recentLogs = (await kv.get('logs_recent', { type: 'json' })) || [];
  recentLogs.unshift(logEntry);
  if (recentLogs.length > 200) {
    recentLogs.length = 200;
  }
  await kv.put('logs_recent', JSON.stringify(recentLogs));

  // 3. Update model_stats:<model>
  const modelKey = `model_stats:${model}`;
  const mRecord = (await kv.get(modelKey, { type: 'json' })) || {
    model,
    calls: 0,
    successCount: 0,
    errorCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    lastUsedAt: now,
  };

  mRecord.calls += 1;
  if (success) {
    mRecord.successCount = (mRecord.successCount || 0) + 1;
  } else {
    mRecord.errorCount = (mRecord.errorCount || 0) + 1;
  }
  mRecord.promptTokens += promptTokens;
  mRecord.completionTokens += completionTokens;
  mRecord.totalTokens += totalTokens;
  mRecord.lastUsedAt = now;

  await kv.put(modelKey, JSON.stringify(mRecord));

  // Keep index of models with stats
  const modelsIndex = (await kv.get('models_stats_index', { type: 'json' })) || [];
  if (!modelsIndex.includes(model)) {
    modelsIndex.push(model);
    await kv.put('models_stats_index', JSON.stringify(modelsIndex));
  }
}

export async function getRecentLogs(kv, limit = 50) {
  const logs = (await kv.get('logs_recent', { type: 'json' })) || [];
  return logs.slice(0, limit);
}

export async function getModelStats(kv, modelId) {
  const data = await kv.get(`model_stats:${modelId}`, { type: 'json' });
  if (!data) {
    return {
      model: modelId,
      calls: 0,
      successCount: 0,
      errorCount: 0,
      successRate: 100.0,
      totalTokens: 0,
    };
  }
  const total = (data.successCount || 0) + (data.errorCount || 0);
  const successRate = total > 0 ? ((data.successCount / total) * 100).toFixed(1) : '100.0';
  return {
    ...data,
    successRate: parseFloat(successRate),
  };
}

export async function listAllModelStats(kv) {
  // 1. Get models from channels
  const channels = await listChannels(kv);
  const allModelIds = new Set();
  channels.forEach((c) => {
    if (Array.isArray(c.models)) {
      c.models.forEach((m) => allModelIds.add(m));
    }
  });

  // 2. Also include any models in models_stats_index
  const statsIndex = (await kv.get('models_stats_index', { type: 'json' })) || [];
  statsIndex.forEach((m) => allModelIds.add(m));

  // 3. Gather stats for each
  const stats = await Promise.all(
    Array.from(allModelIds).map(async (modelId) => {
      return await getModelStats(kv, modelId);
    })
  );

  return stats.sort((a, b) => (b.calls || 0) - (a.calls || 0));
}
