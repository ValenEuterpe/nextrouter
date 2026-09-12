import { timingSafeEqual, createSessionToken, verifySessionToken } from './crypto.js';
import {
  handleListChannels,
  handleSaveChannel,
  handleDeleteChannel,
  handleTestChannel,
  handleListKeys,
  handleCreateKey,
  handleUpdateKey,
  handleRevokeKey,
  handleGetRecentLogs,
  handleGetModelStats,
  handleGetDiscordSettings,
  handleSaveDiscordSettings,
  handleRegisterDiscordCommands,
} from './adminApi.js';
import { handleCors, handleModelsRequest, handleChatCompletions, corsHeaders } from './proxy.js';
import { renderLoginPage, renderDashboardPage } from './ui.js';
import { verifyDiscordSignature } from './discord/verify.js';
import { handleDiscordInteraction } from './discord/handlers.js';
import { getDiscordSettings } from './discord/commands.js';

function parseCookies(header) {
  const list = {};
  if (!header) return list;
  header.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    if (!name) return;
    const value = parts.slice(1).join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

async function getAuthenticatedUser(request, env) {
  if (!env.JWT_SECRET) return null;
  const cookieHeader = request.headers.get('Cookie');
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies.auth_session;
  if (!sessionToken) return null;
  return await verifySessionToken(sessionToken, env.JWT_SECRET);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // 1. Handle CORS Preflight for any route
    if (method === 'OPTIONS') {
      return handleCors();
    }

    // Discord Slash Commands Interactions Endpoint
    if (pathname === '/discord/interactions' && method === 'POST') {
      const rawBody = await request.text();
      const discordSettings = await getDiscordSettings(env.KV, env);
      const publicKey = discordSettings.publicKey || env.DISCORD_PUBLIC_KEY;

      const isValid = await verifyDiscordSignature(request, rawBody, publicKey);
      if (!isValid) {
        return new Response('Invalid request signature', { status: 401 });
      }
      let interaction;
      try {
        interaction = JSON.parse(rawBody);
      } catch {
        return new Response('Invalid JSON payload', { status: 400 });
      }

      // Merge resolved default token quota for new users
      const interactionEnv = {
        ...env,
        DEFAULT_DISCORD_TOKEN_LIMIT: discordSettings.defaultTokenLimit || env.DEFAULT_DISCORD_TOKEN_LIMIT || 2000000,
      };

      return await handleDiscordInteraction(interaction, interactionEnv, request.url);
    }

    // 2. Root Redirect
    if (pathname === '/') {
      const user = await getAuthenticatedUser(request, env);
      return Response.redirect(new URL(user ? '/admin' : '/login', request.url), 302);
    }

    // 3. Login Page & Authentication
    if (pathname === '/login') {
      // Check if secrets are configured
      if (!env.OWNER_USER || !env.OWNER_PASS || !env.JWT_SECRET) {
        return new Response(
          '<h3>Worker Configuration Required</h3><p>Secrets <code>OWNER_USER</code>, <code>OWNER_PASS</code>, and <code>JWT_SECRET</code> must be set via <code>npx wrangler secret put &lt;NAME&gt;</code>.</p>',
          { status: 500, headers: { 'Content-Type': 'text/html' } }
        );
      }

      if (method === 'GET') {
        const user = await getAuthenticatedUser(request, env);
        if (user) {
          return Response.redirect(new URL('/admin', request.url), 302);
        }
        return new Response(renderLoginPage(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      if (method === 'POST') {
        let username = '';
        let password = '';

        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          username = formData.get('username') || '';
          password = formData.get('password') || '';
        } else if (contentType.includes('application/json')) {
          const json = await request.json();
          username = json.username || '';
          password = json.password || '';
        }

        const userMatch = timingSafeEqual(username, env.OWNER_USER || '');
        const passMatch = timingSafeEqual(password, env.OWNER_PASS || '');

        if (userMatch && passMatch) {
          const token = await createSessionToken(username, env.JWT_SECRET);
          const cookieVal = `auth_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`;
          return new Response(null, {
            status: 302,
            headers: {
              'Location': '/admin',
              'Set-Cookie': cookieVal,
            },
          });
        } else {
          return new Response(renderLoginPage('Invalid owner username or password.'), {
            status: 401,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
      }
    }

    // 4. Logout
    if (pathname === '/logout' && method === 'POST') {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/login',
          'Set-Cookie': 'auth_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
        },
      });
    }

    // 5. Admin Dashboard & Admin API (Protected)
    if (pathname.startsWith('/admin')) {
      const user = await getAuthenticatedUser(request, env);
      if (!user) {
        if (pathname.startsWith('/admin/api')) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return Response.redirect(new URL('/login', request.url), 302);
      }

      // Admin HTML Page
      if (pathname === '/admin' || pathname === '/admin/') {
        return new Response(renderDashboardPage(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      // Admin API Endpoints
      if (pathname === '/admin/api/channels' && method === 'GET') {
        return handleListChannels(env);
      }
      if (pathname === '/admin/api/channels' && method === 'POST') {
        return handleSaveChannel(request, env);
      }
      if (pathname.startsWith('/admin/api/channels/')) {
        const parts = pathname.split('/');
        const prefix = decodeURIComponent(parts[4] || '');
        const action = parts[5];

        if (action === 'test' && method === 'POST') {
          return handleTestChannel(request, env, prefix);
        }
        if (!action && method === 'DELETE') {
          return handleDeleteChannel(env, prefix);
        }
      }

      if (pathname === '/admin/api/keys' && method === 'GET') {
        return handleListKeys(env);
      }
      if (pathname === '/admin/api/keys' && method === 'POST') {
        return handleCreateKey(request, env);
      }
      if (pathname.startsWith('/admin/api/keys/')) {
        const id = pathname.split('/')[4];
        if (method === 'PATCH') {
          return handleUpdateKey(request, env, id);
        }
        if (method === 'DELETE') {
          return handleRevokeKey(env, id);
        }
      }

      if (pathname === '/admin/api/logs' && method === 'GET') {
        return handleGetRecentLogs(request, env);
      }

      if (pathname === '/admin/api/model-stats' && method === 'GET') {
        return handleGetModelStats(request, env);
      }

      if (pathname === '/admin/api/settings/discord' && method === 'GET') {
        return handleGetDiscordSettings(env);
      }
      if (pathname === '/admin/api/settings/discord' && method === 'POST') {
        return handleSaveDiscordSettings(request, env);
      }
      if (pathname === '/admin/api/settings/discord/register' && method === 'POST') {
        return handleRegisterDiscordCommands(request, env);
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Generic OpenAI Proxy Routes: /v1/models and /v1/chat/completions (for Janitor.ai, etc.)
    if ((pathname === '/v1/models' || pathname === '/models') && method === 'GET') {
      return handleModelsRequest(request, env, null);
    }
    if ((pathname === '/v1/chat/completions' || pathname === '/chat/completions') && method === 'POST') {
      return handleChatCompletions(request, env, ctx, null);
    }

    // 7. Channel-prefixed AI Proxy Routes: /:prefix/v1/...
    const modelsMatch = pathname.match(/^\/([a-zA-Z0-9_-]+)(?:\/v1)?\/models\/?$/);
    if (modelsMatch && method === 'GET') {
      const prefix = modelsMatch[1];
      if (prefix !== 'v1') {
        return handleModelsRequest(request, env, prefix);
      }
    }

    const chatMatch = pathname.match(/^\/([a-zA-Z0-9_-]+)(?:\/v1)?\/chat\/completions\/?$/);
    if (chatMatch && method === 'POST') {
      const prefix = chatMatch[1];
      if (prefix !== 'v1') {
        return handleChatCompletions(request, env, ctx, prefix);
      }
    }

    // Fallback 404
    return new Response(
      JSON.stringify({
        error: {
          message: `Endpoint '${pathname}' not found. Standard OpenAI endpoints available at /v1/chat/completions and /v1/models`,
          type: 'invalid_request_error',
        },
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  },
};
