import { sha256 } from './crypto.js';
import {
  getChannel,
  getKeyByHash,
  incrementTokenUsage,
  listChannels,
  isCheckinValid,
  recordRequestTelemetry,
} from './kv.js';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

/**
 * Handle CORS preflight requests
 */
export function handleCors() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Authenticate client request via Bearer token and check quotas
 */
async function authenticateClient(request, kv, channelPrefix) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return {
      error: jsonResponse(
        {
          error: {
            message: 'Missing or invalid Authorization header. Expected: Bearer <key>',
            type: 'invalid_request_error',
            code: 'invalid_api_key',
          },
        },
        401
      ),
    };
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return {
      error: jsonResponse(
        {
          error: {
            message: 'Empty API key provided',
            type: 'invalid_request_error',
            code: 'invalid_api_key',
          },
        },
        401
      ),
    };
  }

  const hash = await sha256(rawKey);
  const keyRecord = await getKeyByHash(kv, hash);

  if (!keyRecord || keyRecord.revoked) {
    return {
      error: jsonResponse(
        {
          error: {
            message: 'Incorrect or revoked API key provided',
            type: 'invalid_request_error',
            code: 'invalid_api_key',
          },
        },
        401
      ),
    };
  }

  // Check channel scope (only when explicit channelPrefix was targeted)
  if (
    channelPrefix &&
    keyRecord.channelPrefix &&
    keyRecord.channelPrefix !== '*' &&
    keyRecord.channelPrefix !== channelPrefix
  ) {
    return {
      error: jsonResponse(
        {
          error: {
            message: `This API key is scoped to channel '${keyRecord.channelPrefix}', but request was sent to '${channelPrefix}'.`,
            type: 'permission_error',
            code: 'channel_access_denied',
          },
        },
        403
      ),
    };
  }

  // Check token limit
  const used = keyRecord.tokensUsed || 0;
  const limit = keyRecord.tokenLimit || 0;
  if (limit > 0 && used >= limit) {
    return {
      error: jsonResponse(
        {
          error: {
            message: `Token quota exceeded. Used: ${used.toLocaleString()} / Limit: ${limit.toLocaleString()} tokens. Contact administrator for more quota.`,
            type: 'insufficient_quota',
            code: 'quota_exceeded',
          },
        },
        429
      ),
    };
  }

  // Check 24-hour Discord check-in
  if (keyRecord.requireCheckin && !isCheckinValid(keyRecord)) {
    return {
      error: jsonResponse(
        {
          error: {
            message: 'Check-in expired. Please run /checkin in Discord to activate your key for the next 24 hours.',
            type: 'checkin_required',
            code: 'discord_checkin_expired',
          },
        },
        403
      ),
    };
  }

  return { keyRecord, hash };
}

/**
 * Handle GET /v1/models or GET /:prefix/v1/models
 */
export async function handleModelsRequest(request, env, prefix = null) {
  const auth = await authenticateClient(request, env.KV, prefix);
  if (auth.error) return auth.error;

  const { keyRecord } = auth;
  let exposedModels = [];

  if (prefix) {
    const channel = await getChannel(env.KV, prefix);
    if (!channel) {
      return jsonResponse(
        {
          error: {
            message: `Channel '${prefix}' does not exist`,
            type: 'invalid_request_error',
          },
        },
        404
      );
    }
    exposedModels = Array.isArray(channel.models) ? channel.models : [];
  } else if (keyRecord.channelPrefix && keyRecord.channelPrefix !== '*') {
    // Scoped key on generic /v1/models
    const channel = await getChannel(env.KV, keyRecord.channelPrefix);
    exposedModels = (channel && Array.isArray(channel.models)) ? channel.models : [];
  } else {
    // Global key on generic /v1/models - aggregate all exposed models across all channels
    const channels = await listChannels(env.KV);
    const modelSet = new Set();
    for (const c of channels) {
      if (Array.isArray(c.models)) {
        c.models.forEach((m) => modelSet.add(m));
      }
    }
    exposedModels = Array.from(modelSet);
  }

  const modelList = exposedModels.map((modelId) => ({
    id: modelId,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: prefix || 'DiscordLiteRouter',
    permission: [],
    root: modelId,
    parent: null,
  }));

  return jsonResponse({
    object: 'list',
    data: modelList,
  });
}

/**
 * Handle POST /v1/chat/completions or POST /:prefix/v1/chat/completions
 */
export async function handleChatCompletions(request, env, ctx, prefix = null) {
  const auth = await authenticateClient(request, env.KV, prefix);
  if (auth.error) return auth.error;

  const { hash, keyRecord } = auth;

  // Parse request body first
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse(
      {
        error: {
          message: 'Invalid JSON request body',
          type: 'invalid_request_error',
        },
      },
      400
    );
  }

  // Resolve target channel
  let targetPrefix = prefix;
  if (!targetPrefix) {
    if (keyRecord.channelPrefix && keyRecord.channelPrefix !== '*') {
      targetPrefix = keyRecord.channelPrefix;
    } else {
      // Key can use any channel. Match channel by requested model
      const channels = await listChannels(env.KV);
      const matched = channels.find(
        (c) => Array.isArray(c.models) && c.models.includes(body.model)
      );
      if (matched) {
        targetPrefix = matched.prefix;
      } else if (channels.length > 0) {
        targetPrefix = channels[0].prefix;
      }
    }
  }

  if (!targetPrefix) {
    return jsonResponse(
      {
        error: {
          message: 'No active channel available. Please configure an upstream channel in DiscordLiteRouter.',
          type: 'invalid_request_error',
        },
      },
      404
    );
  }

  const channel = await getChannel(env.KV, targetPrefix);
  if (!channel) {
    return jsonResponse(
      {
        error: {
          message: `Channel '${targetPrefix}' not found`,
          type: 'invalid_request_error',
        },
      },
      404
    );
  }

  if (!channel.openaiUrl || !channel.apiKey) {
    return jsonResponse(
      {
        error: {
          message: `Channel '${targetPrefix}' is not properly configured with upstream URL and API Key`,
          type: 'server_error',
        },
      },
      500
    );
  }

  const isStreaming = Boolean(body.stream);

  // If streaming, enable stream_options to include usage where supported
  if (isStreaming && !body.stream_options) {
    body.stream_options = { include_usage: true };
  }

  const upstreamBase = channel.openaiUrl.replace(/\/+$/, '');
  const upstreamUrl = `${upstreamBase}/chat/completions`;

  const upstreamHeaders = new Headers({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${channel.apiKey}`,
  });

  // Preserve OpenAI organization or project headers if present
  if (request.headers.get('openai-organization')) {
    upstreamHeaders.set('openai-organization', request.headers.get('openai-organization'));
  }
  if (request.headers.get('openai-project')) {
    upstreamHeaders.set('openai-project', request.headers.get('openai-project'));
  }

  let upstreamResponse;
  const startTime = Date.now();
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(body),
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const recordPromise = recordRequestTelemetry(env.KV, {
      keyHash: hash,
      model: body?.model || 'unknown',
      channel: targetPrefix,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      latencyMs,
      status: 502,
      success: false,
    });
    if (ctx?.waitUntil) {
      ctx.waitUntil(recordPromise);
    }

    return jsonResponse(
      {
        error: {
          message: `Failed to connect to upstream provider: ${err.message}`,
          type: 'upstream_error',
        },
      },
      502
    );
  }

  // If upstream responded with error, return directly without charging quota
  if (!upstreamResponse.ok) {
    const latencyMs = Date.now() - startTime;
    const recordPromise = recordRequestTelemetry(env.KV, {
      keyHash: hash,
      model: body?.model || 'unknown',
      channel: targetPrefix,
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      latencyMs,
      status: upstreamResponse.status,
      success: false,
    });
    if (ctx?.waitUntil) {
      ctx.waitUntil(recordPromise);
    }

    const errorText = await upstreamResponse.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { error: { message: errorText, status: upstreamResponse.status } };
    }
    return jsonResponse(errorJson, upstreamResponse.status);
  }

  // Handle Non-Streaming Response
  if (!isStreaming) {
    const responseData = await upstreamResponse.json();
    const latencyMs = Date.now() - startTime;
    const usage = responseData.usage || {};

    const recordPromise = recordRequestTelemetry(env.KV, {
      keyHash: hash,
      model: body?.model || responseData.model || 'unknown',
      channel: targetPrefix,
      usage,
      latencyMs,
      status: 200,
      success: true,
    });

    if (ctx?.waitUntil) {
      ctx.waitUntil(recordPromise);
    } else {
      await recordPromise;
    }

    return jsonResponse(responseData, 200);
  }

  // Handle Streaming Response (SSE)
  // We stream chunks through immediately while extracting total tokens from the final usage chunk
  let streamTotalTokens = 0;
  let estimatedTokens = 0;
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      // Forward chunk immediately to client (zero latency)
      controller.enqueue(chunk);

      // Parse SSE chunk in background
      try {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.usage && typeof parsed.usage.total_tokens === 'number') {
                streamTotalTokens = parsed.usage.total_tokens;
              } else if (parsed.choices?.[0]?.delta?.content) {
                // Approximate fallback: ~4 chars per token
                estimatedTokens += Math.max(1, Math.ceil(parsed.choices[0].delta.content.length / 4));
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      } catch {
        // Continue streaming without failing
      }
    },
    flush() {
      // Finalize token usage and record telemetry
      const finalTokens = streamTotalTokens > 0 ? streamTotalTokens : estimatedTokens;
      const latencyMs = Date.now() - startTime;

      const recordPromise = recordRequestTelemetry(env.KV, {
        keyHash: hash,
        model: body?.model || 'unknown',
        channel: targetPrefix,
        usage: {
          prompt_tokens: 0,
          completion_tokens: finalTokens,
          total_tokens: finalTokens,
        },
        latencyMs,
        status: 200,
        success: true,
      });

      if (ctx?.waitUntil) {
        ctx.waitUntil(recordPromise);
      }
    },
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const [k, v] of Object.entries(corsHeaders)) {
    responseHeaders.set(k, v);
  }
  responseHeaders.set('Content-Type', 'text/event-stream');
  responseHeaders.set('Cache-Control', 'no-cache');
  responseHeaders.set('Connection', 'keep-alive');

  const transformedBody = upstreamResponse.body.pipeThrough(transformStream);
  return new Response(transformedBody, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
