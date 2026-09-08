import { sha256 } from './crypto.js';
import { getChannel, getKeyByHash, incrementTokenUsage } from './kv.js';

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

  // Check channel scope (allow specific channel or '*' for all channels)
  if (
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

  return { keyRecord, hash };
}

/**
 * Handle GET /:prefix/v1/models
 */
export async function handleModelsRequest(request, env, prefix) {
  const auth = await authenticateClient(request, env.KV, prefix);
  if (auth.error) return auth.error;

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

  const exposedModels = Array.isArray(channel.models) ? channel.models : [];
  const modelList = exposedModels.map((modelId) => ({
    id: modelId,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: prefix,
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
 * Handle POST /:prefix/v1/chat/completions
 */
export async function handleChatCompletions(request, env, ctx, prefix) {
  const auth = await authenticateClient(request, env.KV, prefix);
  if (auth.error) return auth.error;

  const { hash } = auth;
  const channel = await getChannel(env.KV, prefix);

  if (!channel) {
    return jsonResponse(
      {
        error: {
          message: `Channel '${prefix}' not found`,
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
          message: `Channel '${prefix}' is not properly configured with upstream URL and API Key`,
          type: 'server_error',
        },
      },
      500
    );
  }

  // Parse request body
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
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(body),
    });
  } catch (err) {
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

    // Deduct / record tokens used
    if (responseData.usage && typeof responseData.usage.total_tokens === 'number') {
      const tokens = responseData.usage.total_tokens;
      ctx.waitUntil(incrementTokenUsage(env.KV, hash, tokens));
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
      // Finalize token usage
      const finalTokens = streamTotalTokens > 0 ? streamTotalTokens : estimatedTokens;
      if (finalTokens > 0) {
        ctx.waitUntil(incrementTokenUsage(env.KV, hash, finalTokens));
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
