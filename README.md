# NEXT ROUTER ⚡

**Next Router** is an ultra-high-performance, futuristic OpenAI-compatible AI gateway deployed directly onto **Cloudflare Workers** with **Cloudflare KV**.

Features:
- **Futuristic Operator Terminal**: Cyberpunk dark glassmorphism dashboard served directly by the Worker (zero external dependencies).
- **Multi-Channel Routing**: Configure unlimited upstream AI providers (The Forest Proxy, OpenAI, OpenRouter, DeepSeek, Groq, custom vLLM/Ollama).
- **Interactive Model Discovery**: "Test Connection" button queries upstream provider `/models` and gives you a searchable multi-select dropdown to choose which models to expose.
- **Client API Keys with Token Quotas**: Issue scoped keys with strict token limits (e.g. `2,000,000` tokens / 2M) and live usage tracking.
- **Full Streaming Support**: SSE streaming passthrough with background token accounting via `ctx.waitUntil` (zero latency penalty).
- **Full CORS Support**: Connect directly from browser-based AI frontends (LibreChat, NextChat, Open WebUI, Chatbox, etc.).

---

## 🚀 Quick Deployment Guide

### Prerequisites
- Node.js 18+ installed
- A [Cloudflare](https://dash.cloudflare.com) account

### Step 1: Install Dependencies & Login
Open your terminal in this directory:
```bash
npm install
npx wrangler login
```
*A browser window will open asking you to authorize Wrangler with your Cloudflare account.*

---

### Step 2: Create Cloudflare KV Namespaces
Create a production KV namespace and a preview KV namespace:

```bash
# Create production KV namespace
npx wrangler kv namespace create KV

# Create preview KV namespace (for local development)
npx wrangler kv namespace create KV --preview
```

Copy the output `id` and `preview_id` into your `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_PRODUCTION_KV_ID"
preview_id = "YOUR_PREVIEW_KV_ID"
```

---

### Step 3: Set Owner Secrets
Set the credentials for the owner login:

```bash
# Set owner username
npx wrangler secret put OWNER_USER

# Set owner password
npx wrangler secret put OWNER_PASS

# Set random secret for HMAC session signing (e.g. any long random string)
npx wrangler secret put JWT_SECRET
```

> **Local Development Note:**
> For testing locally with `npm run dev`, create a `.dev.vars` file in the project root:
> ```env
> OWNER_USER=admin
> OWNER_PASS=your_secure_password
> JWT_SECRET=any_long_random_secret_string_12345
> ```

---

### Step 4: Deploy to Cloudflare
Deploy your worker to Cloudflare's global edge network:

```bash
npm run deploy
```

Once finished, Wrangler will display your live Worker URL:
```
Published nextrouter (1.23 sec)
  https://nextrouter.<your-subdomain>.workers.dev
```

---

## 🖥️ Using the Next Router Dashboard

1. Navigate to your Worker URL: `https://nextrouter.<your-subdomain>.workers.dev/admin` (or `/login`).
2. Log in using your `OWNER_USER` and `OWNER_PASS`.

### Adding a Channel (e.g., "forest" or "op")
1. Click **+ Add Channel**.
2. Click the quick preset chip **🌲 The Forest Proxy** (or enter a custom URL like `https://theforestproxy.pages.dev/v1`).
3. Set the **Channel Name / Route Prefix** (e.g., `forest` or `op`).
4. Enter the upstream **API Key** (`sk-...`).
5. Click **Save Channel**.
6. On the channel row, click **🔍 Test & Select Models**:
   - Next Router contacts the provider and populates a searchable dropdown with all available models.
   - Check the models you want to expose for this channel.
   - Click **Save Selected Models**.

### Issuing Client API Keys
1. Switch to the **🔑 API Keys & Quotas** tab.
2. Click **+ Create New Key**.
3. Set the client name/owner (e.g., `Valentine` or `Dev Team`).
4. Select the **Channel Scope** (e.g. `forest`, `op`, or `* (All Channels)`).
5. Set the **Token Limit** (e.g. select `2M` for 2,000,000 tokens).
6. Click **Generate API Key**.
7. **Copy the generated key immediately** (`sk-...`). The raw key is shown only once and cannot be retrieved later (only the SHA-256 hash is stored in KV).

---

## 🔌 Connecting Clients & Apps

Your proxy follows standard OpenAI API conventions:

### Base URL Format
```
https://<worker-name>.<subdomain>.workers.dev/<channel-prefix>/v1
```
For example, with channel `forest`:
```
https://nextrouter.<subdomain>.workers.dev/forest/v1
```

### 1. Curl Test
```bash
# List exposed models
curl https://nextrouter.<subdomain>.workers.dev/forest/v1/models \
  -H "Authorization: Bearer sk-your-client-key"

# Chat Completion
curl https://nextrouter.<subdomain>.workers.dev/forest/v1/chat/completions \
  -H "Authorization: Bearer sk-your-client-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "my/valentinedemo/claude-sonnet-4-6",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

### 2. Python OpenAI SDK
```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-your-client-key",
    base_url="https://nextrouter.<subdomain>.workers.dev/forest/v1"
)

response = client.chat.completions.create(
    model="my/valentinedemo/claude-sonnet-4-6",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")
```
