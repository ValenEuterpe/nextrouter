import { generateApiKey, sha256 } from './crypto.js';
import {
  listChannels,
  getChannel,
  saveChannel,
  deleteChannel,
  listKeys,
  createKey,
  updateKeyLimit,
  revokeKey,
  getRecentLogs,
  listAllModelStats,
} from './kv.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function maskApiKey(key) {
  if (!key || key.length < 8) return '••••••••';
  return `${key.slice(0, 3)}••••${key.slice(-4)}`;
}

// ----------------- Channels API -----------------

export async function handleListChannels(env) {
  const channels = await listChannels(env.KV);
  const sanitized = channels.map((c) => ({
    ...c,
    apiKeyMasked: maskApiKey(c.apiKey),
    apiKey: undefined, // Never expose raw upstream key in list
    modelCount: Array.isArray(c.models) ? c.models.length : 0,
  }));
  return jsonResponse({ success: true, channels: sanitized });
}

export async function handleSaveChannel(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { prefix, openaiUrl, apiKey, models } = body;
  if (!prefix || typeof prefix !== 'string') {
    return jsonResponse({ error: 'Channel name/prefix is required' }, 400);
  }

  const cleanPrefix = prefix.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleanPrefix) {
    return jsonResponse({ error: 'Prefix must contain alphanumeric characters or - / _' }, 400);
  }

  if (!openaiUrl || !openaiUrl.startsWith('http')) {
    return jsonResponse({ error: 'Valid OpenAI-compatible URL is required' }, 400);
  }

  // If apiKey is omitted or unchanged, preserve existing one
  let finalApiKey = apiKey;
  const existing = await getChannel(env.KV, cleanPrefix);
  if (!finalApiKey && existing) {
    finalApiKey = existing.apiKey;
  }

  if (!finalApiKey) {
    return jsonResponse({ error: 'Provider API Key is required' }, 400);
  }

  const channelData = {
    prefix: cleanPrefix,
    openaiUrl: openaiUrl.trim().replace(/\/+$/, ''),
    apiKey: finalApiKey.trim(),
    models: Array.isArray(models) ? models : (existing?.models || []),
    updatedAt: new Date().toISOString(),
  };

  await saveChannel(env.KV, channelData);

  return jsonResponse({
    success: true,
    channel: {
      ...channelData,
      apiKeyMasked: maskApiKey(channelData.apiKey),
      apiKey: undefined,
    },
  });
}

export async function handleDeleteChannel(env, prefix) {
  if (!prefix) return jsonResponse({ error: 'Prefix required' }, 400);
  await deleteChannel(env.KV, prefix);
  return jsonResponse({ success: true, message: `Channel '${prefix}' deleted` });
}

export async function handleTestChannel(request, env, prefix) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    // Body optional
  }

  const existing = prefix ? await getChannel(env.KV, prefix) : null;
  const targetUrl = body.openaiUrl || existing?.openaiUrl;
  const targetKey = body.apiKey || existing?.apiKey;

  if (!targetUrl || !targetKey) {
    return jsonResponse({ error: 'Missing upstream URL or API Key to test' }, 400);
  }

  // If request contains selectedModels to save
  if (Array.isArray(body.selectedModels) && prefix && existing) {
    existing.models = body.selectedModels;
    existing.testedAt = new Date().toISOString();
    await saveChannel(env.KV, existing);
    return jsonResponse({
      success: true,
      message: 'Selected models saved successfully',
      models: existing.models,
    });
  }

  // Fetch models from provider
  const base = targetUrl.replace(/\/+$/, '');
  const modelsUrl = `${base}/models`;

  try {
    const upstreamRes = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${targetKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      return jsonResponse(
        {
          error: `Provider rejected test connection (${upstreamRes.status}): ${errText}`,
        },
        upstreamRes.status
      );
    }

    const data = await upstreamRes.json();
    let rawList = [];
    if (Array.isArray(data.data)) {
      rawList = data.data;
    } else if (Array.isArray(data)) {
      rawList = data;
    } else if (Array.isArray(data.models)) {
      rawList = data.models;
    }

    const modelIds = rawList
      .map((item) => (typeof item === 'string' ? item : item?.id || item?.name))
      .filter(Boolean)
      .sort();

    return jsonResponse({
      success: true,
      models: modelIds,
      count: modelIds.length,
      currentlySelected: existing?.models || [],
    });
  } catch (err) {
    return jsonResponse(
      {
        error: `Failed to connect to ${modelsUrl}: ${err.message}`,
      },
      502
    );
  }
}

// ----------------- API Keys API -----------------

export async function handleListKeys(env) {
  const keys = await listKeys(env.KV);
  return jsonResponse({ success: true, keys });
}

export async function handleCreateKey(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { owner, tokenLimit, channelPrefix } = body;
  const parsedLimit = Number(tokenLimit);

  if (isNaN(parsedLimit) || parsedLimit < 0) {
    return jsonResponse({ error: 'Token limit must be a valid positive number' }, 400);
  }

  const rawKey = generateApiKey('sk-');
  const hash = await sha256(rawKey);

  const newKeyRecord = {
    id: crypto.randomUUID(),
    owner: (owner || 'Anonymous User').trim(),
    tokenLimit: parsedLimit,
    tokensUsed: 0,
    channelPrefix: channelPrefix || '*',
    revoked: false,
    rawKey,
    createdAt: new Date().toISOString(),
  };

  await createKey(env.KV, newKeyRecord, hash);

  return jsonResponse({
    success: true,
    key: newKeyRecord,
    rawKey, // Returned ONLY ONCE on creation
  });
}

export async function handleUpdateKey(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { tokenLimit, addTokens } = body;
  const keys = await listKeys(env.KV);
  const target = keys.find((k) => k.id === id);

  if (!target) {
    return jsonResponse({ error: 'Key not found' }, 404);
  }

  let newLimit = target.tokenLimit;
  if (typeof tokenLimit === 'number') {
    newLimit = tokenLimit;
  } else if (typeof addTokens === 'number') {
    newLimit = (target.tokenLimit || 0) + addTokens;
  }

  const updated = await updateKeyLimit(env.KV, id, newLimit);
  return jsonResponse({ success: true, key: updated });
}

export async function handleRevokeKey(env, id) {
  if (!id) return jsonResponse({ error: 'Key ID required' }, 400);
  await revokeKey(env.KV, id);
  return jsonResponse({ success: true, message: 'Key revoked successfully' });
}

// ----------------- Telemetry & Activity Logs API -----------------

export async function handleGetRecentLogs(request, env) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(200, Math.max(1, parseInt(limitParam, 10))) : 50;
  const logs = await getRecentLogs(env.KV, limit);
  return jsonResponse({ success: true, logs });
}

export async function handleGetModelStats(request, env) {
  const stats = await listAllModelStats(env.KV);
  return jsonResponse({ success: true, stats });
}
