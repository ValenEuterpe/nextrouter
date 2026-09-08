/**
 * Server-rendered Futuristic HTML UI for Next Router
 * Aesthetic: Cyberpunk / Quantum Glassmorphism / Neon Accents
 */

export function renderLoginPage(errorMessage = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Next Router // Neural Gateway Authentication</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #03050a;
      --card-bg: rgba(10, 15, 30, 0.75);
      --border: rgba(56, 189, 248, 0.2);
      --border-focus: #00f2fe;
      --cyan: #00f2fe;
      --violet: #8b5cf6;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --danger: #ff4b72;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }
    /* Futuristic Grid & Ambient Glow Background */
    body::before {
      content: "";
      position: absolute;
      top: -200px;
      left: 50%;
      transform: translateX(-50%);
      width: 700px;
      height: 700px;
      background: radial-gradient(circle, rgba(0, 242, 254, 0.15) 0%, rgba(139, 92, 246, 0.12) 45%, transparent 70%);
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
    }
    body::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
      background-size: 36px 36px;
      pointer-events: none;
      z-index: 0;
    }
    .card {
      position: relative;
      z-index: 10;
      background: var(--card-bg);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border);
      border-radius: 20px;
      width: 100%;
      max-width: 420px;
      padding: 2.5rem;
      box-shadow: 
        0 0 50px -10px rgba(0, 242, 254, 0.15),
        0 25px 40px -15px rgba(0, 0, 0, 0.8),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }
    .header-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(0, 242, 254, 0.08);
      border: 1px solid rgba(0, 242, 254, 0.25);
      border-radius: 20px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      color: var(--cyan);
      letter-spacing: 0.5px;
      margin-bottom: 1.2rem;
      text-transform: uppercase;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      background: var(--cyan);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--cyan);
      animation: pulse-dot 2s infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .brand {
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: -0.8px;
      background: linear-gradient(135deg, #ffffff 20%, #67e8f9 60%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.4rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
      margin-bottom: 2rem;
    }
    .error-box {
      background: rgba(255, 75, 114, 0.12);
      border: 1px solid rgba(255, 75, 114, 0.35);
      color: #ffa1b5;
      padding: 0.85rem 1rem;
      border-radius: 10px;
      font-size: 0.86rem;
      margin-bottom: 1.4rem;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: shake 0.3s ease;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }
    .form-group {
      margin-bottom: 1.3rem;
    }
    label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 0.45rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .input-wrapper {
      position: relative;
    }
    input {
      width: 100%;
      background: rgba(6, 10, 22, 0.8);
      border: 1px solid rgba(56, 189, 248, 0.2);
      color: #fff;
      padding: 0.85rem 1.1rem;
      border-radius: 10px;
      font-size: 0.95rem;
      font-family: inherit;
      outline: none;
      transition: all 0.25s ease;
    }
    input:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 16px rgba(0, 242, 254, 0.25);
      background: rgba(9, 16, 35, 0.95);
    }
    button {
      width: 100%;
      background: linear-gradient(135deg, #00f2fe 0%, #3b82f6 50%, #8b5cf6 100%);
      color: #030712;
      border: none;
      padding: 0.95rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.95rem;
      font-family: inherit;
      letter-spacing: 0.3px;
      cursor: pointer;
      transition: all 0.25s ease;
      margin-top: 0.8rem;
      box-shadow: 0 0 20px rgba(0, 242, 254, 0.3);
    }
    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 30px rgba(0, 242, 254, 0.5);
      color: #000;
    }
    button:active {
      transform: translateY(0);
    }
    .footer-note {
      text-align: center;
      margin-top: 1.8rem;
      font-size: 0.75rem;
      color: #64748b;
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header-tag">
      <span class="status-dot"></span>
      <span>Cloudflare Edge // Online</span>
    </div>
    
    <div class="brand">NEXT ROUTER</div>
    <div class="subtitle">Neural Gateway & High-Speed Multi-Channel Model Orchestrator.</div>

    ${errorMessage ? `<div class="error-box"><span>⚠️</span> <span>${errorMessage}</span></div>` : ''}

    <form method="POST" action="/login">
      <div class="form-group">
        <label for="username">Operator Identity</label>
        <div class="input-wrapper">
          <input type="text" id="username" name="username" placeholder="owner username" required autocomplete="username" autofocus />
        </div>
      </div>
      <div class="form-group">
        <label for="password">Cryptographic Key / Passphrase</label>
        <div class="input-wrapper">
          <input type="password" id="password" name="password" placeholder="••••••••••••" required autocomplete="current-password" />
        </div>
      </div>
      <button type="submit">Initialize Quantum Session ➔</button>
    </form>

    <div class="footer-note">NEXT ROUTER v1.0 • SECURED WITH SHA-256 HMAC</div>
  </div>
</body>
</html>`;
}

export function renderDashboardPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Next Router // Control Terminal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #03050a;
      --card: rgba(11, 17, 34, 0.75);
      --card-solid: #0c1224;
      --card-hover: rgba(17, 26, 52, 0.85);
      --border: rgba(56, 189, 248, 0.18);
      --border-glow: rgba(0, 242, 254, 0.45);
      --cyan: #00f2fe;
      --cyan-subtle: rgba(0, 242, 254, 0.12);
      --blue: #3b82f6;
      --violet: #8b5cf6;
      --violet-subtle: rgba(139, 92, 246, 0.14);
      --emerald: #10b981;
      --emerald-subtle: rgba(16, 185, 129, 0.15);
      --danger: #ff4b72;
      --danger-subtle: rgba(255, 75, 114, 0.15);
      --warning: #f59e0b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    /* Subtle Cyber Ambient Lighting */
    body::before {
      content: "";
      position: fixed;
      top: -150px;
      right: 15%;
      width: 650px;
      height: 500px;
      background: radial-gradient(circle, rgba(0, 242, 254, 0.08) 0%, rgba(139, 92, 246, 0.06) 50%, transparent 70%);
      filter: blur(100px);
      pointer-events: none;
      z-index: 0;
    }
    body::after {
      content: "";
      position: fixed;
      inset: 0;
      background-image: 
        linear-gradient(rgba(56, 189, 248, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(56, 189, 248, 0.02) 1px, transparent 1px);
      background-size: 32px 32px;
      pointer-events: none;
      z-index: 0;
    }
    header {
      background: rgba(6, 10, 22, 0.85);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #00f2fe 0%, #8b5cf6 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.4);
      color: #030712;
      font-weight: 900;
      font-size: 1.1rem;
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 10%, #67e8f9 60%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-badge {
      background: rgba(0, 242, 254, 0.1);
      border: 1px solid rgba(0, 242, 254, 0.3);
      color: var(--cyan);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 1.2rem;
    }
    .nav-tabs {
      display: flex;
      background: rgba(9, 14, 28, 0.9);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 4px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 7px 18px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .tab-btn:hover {
      color: #fff;
    }
    .tab-btn.active {
      background: linear-gradient(135deg, rgba(0, 242, 254, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
      color: #fff;
      border: 1px solid rgba(0, 242, 254, 0.35);
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.15);
    }
    .logout-btn {
      background: rgba(255, 75, 114, 0.08);
      border: 1px solid rgba(255, 75, 114, 0.25);
      color: #ffa1b5;
      padding: 7px 15px;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .logout-btn:hover {
      background: rgba(255, 75, 114, 0.2);
      border-color: var(--danger);
      color: #fff;
      box-shadow: 0 0 15px rgba(255, 75, 114, 0.3);
    }
    main {
      position: relative;
      z-index: 10;
      flex: 1;
      max-width: 1240px;
      width: 100%;
      margin: 0 auto;
      padding: 2.2rem 2rem;
    }
    /* Futuristic Stats Row */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }
    .stat-card {
      background: var(--card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.4rem 1.6rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-glow);
      box-shadow: 0 10px 25px -5px rgba(0, 242, 254, 0.12);
    }
    .stat-card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--cyan), transparent);
      opacity: 0.6;
    }
    .stat-label {
      font-size: 0.76rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.8px;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .stat-value {
      font-size: 2.1rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: -1px;
      background: linear-gradient(135deg, #ffffff 30%, #a5f3fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1.6rem;
    }
    .view-title {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 40%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .view-desc {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }
    .btn {
      background: linear-gradient(135deg, #00f2fe 0%, #3b82f6 50%, #8b5cf6 100%);
      color: #030712;
      border: none;
      padding: 0.75rem 1.4rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      font-family: inherit;
      box-shadow: 0 0 20px rgba(0, 242, 254, 0.25);
    }
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 25px rgba(0, 242, 254, 0.45);
      color: #000;
    }
    .btn-secondary {
      background: rgba(17, 24, 45, 0.85);
      border: 1px solid var(--border);
      color: var(--text);
      box-shadow: none;
    }
    .btn-secondary:hover {
      background: rgba(28, 39, 72, 0.95);
      border-color: var(--cyan);
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.15);
      color: #fff;
    }
    .btn-sm {
      padding: 5px 12px;
      font-size: 0.8rem;
      border-radius: 7px;
    }
    .btn-danger {
      background: var(--danger-subtle);
      color: #ffa1b5;
      border: 1px solid rgba(255, 75, 114, 0.35);
      box-shadow: none;
    }
    .btn-danger:hover {
      background: var(--danger);
      color: #fff;
      box-shadow: 0 0 15px rgba(255, 75, 114, 0.5);
    }
    /* Futuristic Table */
    .table-container {
      background: var(--card);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.5);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: rgba(8, 12, 24, 0.95);
      padding: 1rem 1.4rem;
      font-size: 0.74rem;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      font-family: 'JetBrains Mono', monospace;
    }
    td {
      padding: 1.15rem 1.4rem;
      font-size: 0.92rem;
      border-bottom: 1px solid rgba(56, 189, 248, 0.08);
      vertical-align: middle;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: rgba(0, 242, 254, 0.02);
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }
    .badge-channel {
      background: var(--violet-subtle);
      color: #d8b4fe;
      border: 1px solid rgba(168, 85, 247, 0.35);
    }
    .badge-success {
      background: var(--emerald-subtle);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .badge-revoked {
      background: var(--danger-subtle);
      color: #ffa1b5;
      border: 1px solid rgba(255, 75, 114, 0.35);
    }
    .progress-bar-wrap {
      width: 150px;
      height: 7px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(56, 189, 248, 0.15);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 6px;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #00f2fe, #3b82f6);
      border-radius: 999px;
      transition: width 0.3s;
    }
    .progress-bar-fill.warning { background: linear-gradient(90deg, #f59e0b, #ef4444); }
    .progress-bar-fill.danger { background: linear-gradient(90deg, #ff4b72, #dc2626); }
    .mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.86rem;
    }
    /* Modals with Cyber Theme */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(2, 4, 10, 0.82);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 50;
      padding: 1.5rem;
    }
    .modal-backdrop.open {
      display: flex;
    }
    .modal {
      background: var(--card-solid);
      border: 1px solid var(--border-glow);
      border-radius: 20px;
      width: 100%;
      max-width: 620px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 
        0 0 50px -10px rgba(0, 242, 254, 0.25),
        0 25px 50px -12px rgba(0, 0, 0, 0.85);
      animation: modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalPop {
      0% { transform: scale(0.95); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      padding: 1.4rem 1.8rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(6, 10, 22, 0.5);
    }
    .modal-title {
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: -0.3px;
      color: #fff;
    }
    .modal-close {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 4px 8px;
      transition: color 0.2s;
    }
    .modal-close:hover { color: var(--cyan); }
    .modal-body {
      padding: 1.8rem;
      overflow-y: auto;
      flex: 1;
    }
    .modal-footer {
      padding: 1.2rem 1.8rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 0.9rem;
      background: rgba(6, 10, 22, 0.8);
      border-bottom-left-radius: 20px;
      border-bottom-right-radius: 20px;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-group label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 0.45rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-group input, .form-group select {
      width: 100%;
      background: #060a17;
      border: 1px solid var(--border);
      color: #fff;
      padding: 0.8rem 1rem;
      border-radius: 10px;
      font-size: 0.92rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }
    .form-group input:focus, .form-group select:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 16px rgba(0, 242, 254, 0.2);
    }
    .helper-text {
      font-size: 0.78rem;
      color: var(--text-dim);
      margin-top: 0.4rem;
      line-height: 1.4;
    }
    .chips-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .chip {
      background: rgba(17, 25, 48, 0.8);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .chip:hover {
      border-color: var(--cyan);
      color: var(--cyan);
      box-shadow: 0 0 12px rgba(0, 242, 254, 0.2);
      transform: translateY(-1px);
    }
    .chip.highlight {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }
    .model-search-box {
      margin-bottom: 0.9rem;
    }
    .model-list-box {
      max-height: 280px;
      overflow-y: auto;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: #060914;
      padding: 0.6rem;
    }
    .model-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 7px 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.86rem;
      user-select: none;
      transition: background 0.15s;
    }
    .model-item:hover {
      background: rgba(0, 242, 254, 0.06);
    }
    .model-item input[type="checkbox"] {
      width: 17px;
      height: 17px;
      cursor: pointer;
      accent-color: var(--cyan);
    }
    .empty-state {
      padding: 3.5rem 1rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    .copy-box {
      background: #060914;
      border: 1px dashed var(--cyan);
      border-radius: 12px;
      padding: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 1.2rem 0;
      box-shadow: inset 0 0 20px rgba(0, 242, 254, 0.08);
    }
    .copy-box code {
      word-break: break-all;
      color: var(--cyan);
      font-size: 1.05rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    #toast {
      position: fixed;
      bottom: 28px;
      right: 28px;
      background: rgba(11, 18, 38, 0.95);
      border: 1px solid var(--cyan);
      color: #fff;
      padding: 14px 24px;
      border-radius: 12px;
      font-size: 0.92rem;
      font-weight: 600;
      box-shadow: 0 0 25px rgba(0, 242, 254, 0.35);
      display: none;
      z-index: 100;
      animation: toastIn 0.25s ease;
    }
    @keyframes toastIn {
      0% { transform: translateY(10px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand-group">
      <div class="brand-logo">⚡</div>
      <div>
        <div class="brand-title">NEXT ROUTER</div>
      </div>
      <span class="brand-badge">Owner Terminal</span>
    </div>

    <div class="header-actions">
      <div class="nav-tabs">
        <button class="tab-btn active" id="tabChannelsBtn" onclick="switchTab('channels')">
          🌐 Channels
        </button>
        <button class="tab-btn" id="tabKeysBtn" onclick="switchTab('keys')">
          🔑 API Keys & Quotas
        </button>
      </div>

      <form method="POST" action="/logout">
        <button type="submit" class="logout-btn">Log out</button>
      </form>
    </div>
  </header>

  <main>
    <!-- Stats Overview -->
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-label"><span>🌐</span> Configured Channels</div>
        <div class="stat-value" id="statChannels">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label"><span>🔑</span> Active Client Keys</div>
        <div class="stat-value" id="statKeys">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label"><span>⚡</span> Total Tokens Routed</div>
        <div class="stat-value" id="statTokens">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label"><span>🛰️</span> Quantum Edge Status</div>
        <div class="stat-value" style="color: #6ee7b7; font-size: 1.5rem; display: flex; align-items: center; gap: 8px; margin-top: 6px;">
          <span style="width: 10px; height: 10px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981;"></span>
          100% Operational
        </div>
      </div>
    </div>

    <!-- Channels View -->
    <section id="channelsView">
      <div class="view-header">
        <div>
          <h2 class="view-title">Upstream Channels</h2>
          <p class="view-desc">Configure neural providers (The Forest Proxy, OpenAI, DeepSeek, Groq) and expose select models.</p>
        </div>
        <button class="btn" onclick="openChannelModal()">
          <span>+ Add Channel</span>
        </button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Channel Name / Prefix</th>
              <th>Upstream Base URL</th>
              <th>Exposed Models</th>
              <th>Status</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="channelsTableBody">
            <tr><td colspan="5" class="empty-state">Loading channels...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- API Keys View -->
    <section id="keysView" style="display: none;">
      <div class="view-header">
        <div>
          <h2 class="view-title">Client API Keys & Quotas</h2>
          <p class="view-desc">Issue client API keys with token limits. Standard OpenAI format for Janitor.ai, SillyTavern, LibreChat, and SDKs.</p>
        </div>
        <button class="btn" onclick="openKeyModal()">
          <span>+ Create New Key</span>
        </button>
      </div>

      <!-- Generic Base URL Banner for Janitor.ai & Other Clients -->
      <div style="background: rgba(14, 22, 44, 0.8); border: 1px solid var(--cyan); border-radius: 14px; padding: 1.25rem 1.6rem; margin-bottom: 1.8rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; box-shadow: 0 0 25px rgba(0, 242, 254, 0.1);">
        <div>
          <div style="font-size: 0.78rem; font-weight: 800; color: var(--cyan); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 1rem;">🌐</span> Standard OpenAI Base URL (Janitor.ai, SillyTavern, NextChat)
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            Provide this Base URL and your API Key to any OpenAI-compatible app:
          </div>
          <code class="mono" id="appBaseUrlDisplay" style="color: #67e8f9; background: #060914; padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(0, 242, 254, 0.3); font-size: 0.95rem; font-weight: 700;">https://.../v1</code>
        </div>
        <button class="btn btn-secondary" onclick="copyAppBaseUrl()" style="white-space: nowrap;">
          📋 Copy Base URL
        </button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Owner / Description</th>
              <th>API Key</th>
              <th>Channel Scope</th>
              <th>Token Quota / Usage</th>
              <th>Status</th>
              <th>Created</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="keysTableBody">
            <tr><td colspan="7" class="empty-state">Loading keys...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>

  <!-- Add/Edit Channel Modal -->
  <div class="modal-backdrop" id="channelModal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title" id="channelModalTitle">Add Upstream Channel</div>
        <button class="modal-close" onclick="closeModal('channelModal')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Channel Name / Route Prefix</label>
          <input type="text" id="channelPrefixInput" placeholder="e.g. openai, openrouter, claude, op" />
          <div class="helper-text">Target prefix (e.g. <span class="mono">/:prefix/v1/chat/completions</span>) or route automatically via generic <span class="mono">/v1/chat/completions</span></div>
        </div>

        <div class="form-group">
          <label>Quick Provider Presets</label>
          <div class="chips-group">
            <span class="chip highlight" onclick="applyPreset('openai')">OpenAI</span>
            <span class="chip" onclick="applyPreset('openrouter')">OpenRouter</span>
            <span class="chip" onclick="applyPreset('claude')">Claude (Anthropic)</span>
          </div>
        </div>

        <div class="form-group">
          <label>OpenAI-Compatible Base URL</label>
          <input type="url" id="channelUrlInput" placeholder="https://api.openai.com/v1" />
        </div>

        <div class="form-group">
          <label>Provider API Key</label>
          <input type="password" id="channelKeyInput" placeholder="sk-..." />
          <div class="helper-text">Securely stored in Cloudflare KV. Leave blank when editing to keep existing key.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('channelModal')">Cancel</button>
        <button class="btn" onclick="saveChannelForm()">Save Channel</button>
      </div>
    </div>
  </div>

  <!-- Test Connection & Select Models Modal -->
  <div class="modal-backdrop" id="testModal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">⚡ Test Connection & Expose Models</div>
        <button class="modal-close" onclick="closeModal('testModal')">&times;</button>
      </div>
      <div class="modal-body">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.9rem;">
          <div style="font-size: 0.88rem; color: var(--text-muted);" id="testModalSubtitle">
            Connecting to provider...
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="toggleSelectAllModels(true)">Select All</button>
            <button class="btn btn-secondary btn-sm" onclick="toggleSelectAllModels(false)">Deselect All</button>
          </div>
        </div>

        <div class="model-search-box">
          <input type="text" id="modelSearchInput" placeholder="🔍 Search models (e.g. claude, gpt, glm, qwen)..." oninput="filterModelsList()" />
        </div>

        <div class="model-list-box" id="modelListContainer">
          <div class="empty-state">Connecting to provider...</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('testModal')">Cancel</button>
        <button class="btn" id="saveModelsBtn" onclick="saveSelectedModels()">Save Selected Models</button>
      </div>
    </div>
  </div>

  <!-- Create API Key Modal -->
  <div class="modal-backdrop" id="keyModal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">🔑 Generate Client API Key</div>
        <button class="modal-close" onclick="closeModal('keyModal')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Owner / Client Description</label>
          <input type="text" id="keyOwnerInput" placeholder="e.g. Valentine, Production Bot, Team Beta" />
        </div>

        <div class="form-group">
          <label>Channel Authorization Scope</label>
          <select id="keyChannelSelect">
            <option value="*">All Channels (*)</option>
          </select>
          <div class="helper-text">Restricts this key to a single channel or permits all channels.</div>
        </div>

        <div class="form-group">
          <label>Token Quota Limit</label>
          <input type="number" id="keyLimitInput" placeholder="2000000" value="2000000" />
          <div class="chips-group">
            <span class="chip" onclick="setTokenLimit(500000)">500K</span>
            <span class="chip" onclick="setTokenLimit(1000000)">1M</span>
            <span class="chip highlight" onclick="setTokenLimit(2000000)">2M (Default)</span>
            <span class="chip" onclick="setTokenLimit(5000000)">5M</span>
            <span class="chip" onclick="setTokenLimit(10000000)">10M</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('keyModal')">Cancel</button>
        <button class="btn" onclick="submitCreateKey()">Generate Key ➔</button>
      </div>
    </div>
  </div>

  <!-- Key Created Modal (Raw Key Shown Once) -->
  <div class="modal-backdrop" id="keyResultModal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">⚡ API Key Generated Successfully</div>
      </div>
      <div class="modal-body">
        <div style="color: #ffa1b5; font-weight: 700; font-size: 0.95rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 6px;">
          <span>⚠️</span> Copy this secret key immediately! It will NEVER be displayed again.
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
          Only the SHA-256 cryptographic digest is stored in Cloudflare KV.
        </p>

        <div class="copy-box">
          <code id="rawKeyDisplay">sk-...</code>
          <button class="btn btn-secondary btn-sm" onclick="copyRawKey()">Copy Key</button>
        </div>

        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 1.2rem;">
          <strong>Proxy Endpoint:</strong> <code class="mono" style="color: var(--cyan);" id="proxyUrlDisplay"></code><br/>
          <div style="margin-top: 0.8rem; font-weight: 600; color: #fff;">Test via cURL:</div>
          <pre style="background: #050814; border: 1px solid var(--border); padding: 0.9rem; border-radius: 8px; margin-top: 0.4rem; overflow-x: auto; font-size: 0.78rem; color: #93c5fd; font-family: 'JetBrains Mono', monospace;">curl &lt;BASE_URL&gt;/v1/chat/completions \\
  -H "Authorization: Bearer &lt;KEY&gt;" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "&lt;MODEL&gt;", "messages": [{"role": "user", "content": "Hello!"}]}'</pre>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal('keyResultModal')">I Have Saved This Key ➔</button>
      </div>
    </div>
  </div>

  <!-- Top-up / Increase Quota Modal -->
  <div class="modal-backdrop" id="topupModal">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">⚡ Increase Token Quota</div>
        <button class="modal-close" onclick="closeModal('topupModal')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>New Token Quota Limit</label>
          <input type="number" id="topupLimitInput" />
          <div class="chips-group">
            <span class="chip" onclick="addTopup(500000)">+ 500K</span>
            <span class="chip" onclick="addTopup(1000000)">+ 1M</span>
            <span class="chip highlight" onclick="addTopup(2000000)">+ 2M</span>
            <span class="chip" onclick="addTopup(5000000)">+ 5M</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('topupModal')">Cancel</button>
        <button class="btn" onclick="submitTopup()">Update Quota</button>
      </div>
    </div>
  </div>

  <div id="toast"></div>

  <script>
    let state = {
      channels: [],
      keys: [],
      currentTestPrefix: null,
      fetchedModels: [],
      selectedModelSet: new Set(),
      editingKeyId: null
    };

    function showToast(msg, duration = 3000) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, duration);
    }

    function switchTab(tab) {
      document.getElementById('channelsView').style.display = tab === 'channels' ? 'block' : 'none';
      document.getElementById('keysView').style.display = tab === 'keys' ? 'block' : 'none';
      document.getElementById('tabChannelsBtn').classList.toggle('active', tab === 'channels');
      document.getElementById('tabKeysBtn').classList.toggle('active', tab === 'keys');
      location.hash = tab;
    }

    function closeModal(id) {
      document.getElementById(id).classList.remove('open');
    }

    function openModal(id) {
      document.getElementById(id).classList.add('open');
    }

    async function loadAllData() {
      try {
        const [channelsRes, keysRes] = await Promise.all([
          fetch('/admin/api/channels'),
          fetch('/admin/api/keys')
        ]);
        const channelsData = await channelsRes.json();
        const keysData = await keysRes.json();

        if (channelsData.success) {
          state.channels = channelsData.channels || [];
          renderChannelsTable();
        }
        if (keysData.success) {
          state.keys = keysData.keys || [];
          renderKeysTable();
        }

        updateStats();
        populateChannelDropdowns();
      } catch (err) {
        showToast('Error loading data: ' + err.message);
      }
    }

    function updateStats() {
      document.getElementById('statChannels').textContent = state.channels.length;
      const activeKeys = state.keys.filter(k => !k.revoked);
      document.getElementById('statKeys').textContent = activeKeys.length;

      const totalTokens = state.keys.reduce((acc, k) => acc + (k.tokensUsed || 0), 0);
      document.getElementById('statTokens').textContent = totalTokens.toLocaleString();
    }

    function renderChannelsTable() {
      const tbody = document.getElementById('channelsTableBody');
      if (state.channels.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No channels configured yet. Click "+ Add Channel" to set up your first provider.</td></tr>';
        return;
      }

      tbody.innerHTML = state.channels.map(c => {
        const count = c.modelCount || (Array.isArray(c.models) ? c.models.length : 0);
        return \`
          <tr>
            <td>
              <strong style="color: #67e8f9; font-size: 0.98rem;" class="mono">\${c.prefix}</strong>
            </td>
            <td>
              <span class="mono" style="color: var(--text-muted); font-size: 0.85rem;">\${c.openaiUrl}</span>
            </td>
            <td>
              <span class="badge-pill badge-channel">\${count} models exposed</span>
            </td>
            <td>
              <span class="badge-pill \${count > 0 ? 'badge-success' : 'badge-revoked'}">
                \${count > 0 ? '● Active' : '○ No Models Selected'}
              </span>
            </td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-sm" onclick="testConnection('\${c.prefix}')">
                🔍 Test & Select Models
              </button>
              <button class="btn btn-secondary btn-sm" onclick="editChannel('\${c.prefix}')">
                ✏️ Edit
              </button>
              <button class="btn btn-danger btn-sm" onclick="deleteChannel('\${c.prefix}')">
                🗑️
              </button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function renderKeysTable() {
      const tbody = document.getElementById('keysTableBody');
      if (state.keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No API keys generated yet. Click "+ Create New Key" to issue a client key.</td></tr>';
        return;
      }

      tbody.innerHTML = state.keys.map(k => {
        const used = k.tokensUsed || 0;
        const limit = k.tokenLimit || 0;
        const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        let progressClass = '';
        if (pct > 90) progressClass = 'danger';
        else if (pct > 70) progressClass = 'warning';

        const keyCell = k.rawKey
          ? \`<div style="display: flex; align-items: center; gap: 8px;">
              <code class="mono" style="color: #67e8f9; font-size: 0.82rem; background: rgba(0,242,254,0.06); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(0,242,254,0.2);">
                \${escapeHtml(k.rawKey.slice(0, 7))}...\${escapeHtml(k.rawKey.slice(-4))}
              </code>
              <button class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.74rem;" data-key="\${escapeHtml(k.rawKey)}" onclick="copySpecificKey(this.dataset.key)" title="Copy Key">
                📋 Copy
              </button>
            </div>\`
          : '<span class="mono" style="color: var(--text-dim); font-size: 0.8rem;">Hidden</span>';

        return \`
          <tr style="\${k.revoked ? 'opacity: 0.45;' : ''}">
            <td><strong style="color: #f1f5f9;">\${escapeHtml(k.owner)}</strong></td>
            <td>\${keyCell}</td>
            <td>
              <span class="badge-pill badge-channel">\${k.channelPrefix || '*'}</span>
            </td>
            <td>
              <div class="mono" style="font-size: 0.86rem;">\${used.toLocaleString()} / \${limit.toLocaleString()} (\${pct}%)</div>
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill \${progressClass}" style="width: \${pct}%;"></div>
              </div>
            </td>
            <td>
              <span class="badge-pill \${k.revoked ? 'badge-revoked' : 'badge-success'}">
                \${k.revoked ? 'Revoked' : 'Active'}
              </span>
            </td>
            <td style="color: var(--text-dim); font-size: 0.8rem;" class="mono">
              \${new Date(k.createdAt).toLocaleDateString()}
            </td>
            <td style="text-align: right;">
              \${!k.revoked ? \`
                <button class="btn btn-secondary btn-sm" onclick="openTopup('\${k.id}', \${limit})">
                  + Add Tokens
                </button>
                <button class="btn btn-danger btn-sm" onclick="revokeKey('\${k.id}')">
                  Revoke
                </button>
              \` : '<span style="color: var(--text-dim); font-size: 0.8rem;" class="mono">Revoked</span>'}
            </td>
          </tr>
        \`;
      }).join('');
    }

    function populateChannelDropdowns() {
      const select = document.getElementById('keyChannelSelect');
      select.innerHTML = '<option value="*">All Channels (*)</option>' +
        state.channels.map(c => \`<option value="\${c.prefix}">\${c.prefix} (\${c.openaiUrl})</option>\`).join('');
    }

    function openChannelModal(prefix = '') {
      document.getElementById('channelModalTitle').textContent = prefix ? 'Edit Channel' : 'Add Upstream Channel';
      document.getElementById('channelPrefixInput').value = prefix;
      document.getElementById('channelPrefixInput').disabled = Boolean(prefix);
      
      if (prefix) {
        const c = state.channels.find(ch => ch.prefix === prefix);
        document.getElementById('channelUrlInput').value = c ? c.openaiUrl : '';
        document.getElementById('channelKeyInput').value = '';
      } else {
        document.getElementById('channelUrlInput').value = 'https://api.openai.com/v1';
        document.getElementById('channelPrefixInput').value = '';
        document.getElementById('channelKeyInput').value = '';
      }
      openModal('channelModal');
    }

    function editChannel(prefix) {
      openChannelModal(prefix);
    }

    function applyPreset(provider) {
      const presets = {
        openai: { url: 'https://api.openai.com/v1', prefix: 'openai' },
        openrouter: { url: 'https://openrouter.ai/api/v1', prefix: 'openrouter' },
        claude: { url: 'https://api.anthropic.com/v1', prefix: 'claude' }
      };
      if (presets[provider]) {
        document.getElementById('channelUrlInput').value = presets[provider].url;
        if (!document.getElementById('channelPrefixInput').value) {
          document.getElementById('channelPrefixInput').value = presets[provider].prefix;
        }
      }
    }

    async function saveChannelForm() {
      const prefix = document.getElementById('channelPrefixInput').value.trim();
      const openaiUrl = document.getElementById('channelUrlInput').value.trim();
      const apiKey = document.getElementById('channelKeyInput').value.trim();

      if (!prefix || !openaiUrl) {
        alert('Please provide a channel prefix and URL.');
        return;
      }

      try {
        const res = await fetch('/admin/api/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix, openaiUrl, apiKey })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to save channel');

        closeModal('channelModal');
        showToast('Channel saved successfully!');
        await loadAllData();
      } catch (err) {
        alert(err.message);
      }
    }

    async function deleteChannel(prefix) {
      if (!confirm(\`Are you sure you want to delete channel '\${prefix}'?\`)) return;
      try {
        const res = await fetch(\`/admin/api/channels/\${prefix}\`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to delete');
        showToast('Channel deleted');
        await loadAllData();
      } catch (err) {
        alert(err.message);
      }
    }

    // Test Connection & Select Models
    async function testConnection(prefix) {
      state.currentTestPrefix = prefix;
      const subtitle = document.getElementById('testModalSubtitle');
      const container = document.getElementById('modelListContainer');
      const saveBtn = document.getElementById('saveModelsBtn');

      subtitle.textContent = \`Querying channel '\${prefix}' /models endpoint...\`;
      container.innerHTML = '<div class="empty-state">Connecting to neural provider...</div>';
      saveBtn.disabled = true;
      openModal('testModal');

      try {
        const res = await fetch(\`/admin/api/channels/\${prefix}/test\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Connection test failed');
        }

        state.fetchedModels = data.models || [];
        state.selectedModelSet = new Set(data.currentlySelected || []);

        subtitle.textContent = \`Found \${state.fetchedModels.length} models from upstream provider.\`;
        saveBtn.disabled = false;
        renderModelList();
      } catch (err) {
        subtitle.textContent = 'Connection test failed.';
        container.innerHTML = \`<div class="empty-state" style="color: #ffa1b5;">❌ \${err.message}</div>\`;
      }
    }

    function renderModelList(filter = '') {
      const container = document.getElementById('modelListContainer');
      const query = filter.toLowerCase().trim();
      const filtered = state.fetchedModels.filter(m => !query || m.toLowerCase().includes(query));

      if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No models match your search query.</div>';
        return;
      }

      container.innerHTML = filtered.map(modelId => {
        const checked = state.selectedModelSet.has(modelId) ? 'checked' : '';
        return \`
          <label class="model-item">
            <input type="checkbox" value="\${modelId}" \${checked} onchange="toggleModelSelection('\${modelId}', this.checked)" />
            <span class="mono">\${modelId}</span>
          </label>
        \`;
      }).join('');
    }

    function filterModelsList() {
      const query = document.getElementById('modelSearchInput').value;
      renderModelList(query);
    }

    function toggleModelSelection(modelId, isSelected) {
      if (isSelected) state.selectedModelSet.add(modelId);
      else state.selectedModelSet.delete(modelId);
    }

    function toggleSelectAllModels(select) {
      if (select) {
        state.fetchedModels.forEach(m => state.selectedModelSet.add(m));
      } else {
        state.selectedModelSet.clear();
      }
      filterModelsList();
    }

    async function saveSelectedModels() {
      if (!state.currentTestPrefix) return;
      const selected = Array.from(state.selectedModelSet);
      try {
        const res = await fetch(\`/admin/api/channels/\${state.currentTestPrefix}/test\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedModels: selected })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to save models');

        closeModal('testModal');
        showToast(\`Exposed \${selected.length} models on '\${state.currentTestPrefix}'!\`);
        await loadAllData();
      } catch (err) {
        alert(err.message);
      }
    }

    // Key Management
    function openKeyModal() {
      document.getElementById('keyOwnerInput').value = '';
      document.getElementById('keyLimitInput').value = '2000000';
      openModal('keyModal');
    }

    function setTokenLimit(val) {
      document.getElementById('keyLimitInput').value = val;
    }

    async function submitCreateKey() {
      const owner = document.getElementById('keyOwnerInput').value.trim();
      const channelPrefix = document.getElementById('keyChannelSelect').value;
      const tokenLimit = Number(document.getElementById('keyLimitInput').value);

      if (!tokenLimit || tokenLimit <= 0) {
        alert('Please enter a valid token limit.');
        return;
      }

      try {
        const res = await fetch('/admin/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner, channelPrefix, tokenLimit })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to create key');

        closeModal('keyModal');
        
        // Display raw key modal
        document.getElementById('rawKeyDisplay').textContent = data.rawKey;
        const genericBaseEndpoint = location.origin + '/v1';
        document.getElementById('proxyUrlDisplay').textContent = genericBaseEndpoint;
        openModal('keyResultModal');

        await loadAllData();
      } catch (err) {
        alert(err.message);
      }
    }

    function copyRawKey() {
      const key = document.getElementById('rawKeyDisplay').textContent;
      navigator.clipboard.writeText(key).then(() => {
        showToast('⚡ API Key copied to clipboard!');
      });
    }

    function copySpecificKey(key) {
      if (!key) return;
      navigator.clipboard.writeText(key).then(() => {
        showToast('⚡ API Key copied to clipboard!');
      });
    }

    function copyAppBaseUrl() {
      const url = location.origin + '/v1';
      navigator.clipboard.writeText(url).then(() => {
        showToast('🌐 Generic Base URL copied: ' + url);
      });
    }

    function openTopup(id, currentLimit) {
      state.editingKeyId = id;
      document.getElementById('topupLimitInput').value = currentLimit;
      openModal('topupModal');
    }

    function addTopup(amount) {
      const input = document.getElementById('topupLimitInput');
      input.value = Number(input.value || 0) + amount;
    }

    async function submitTopup() {
      if (!state.editingKeyId) return;
      const newLimit = Number(document.getElementById('topupLimitInput').value);
      try {
        const res = await fetch(\`/admin/api/keys/\${state.editingKeyId}\`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenLimit: newLimit })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to update limit');

        closeModal('topupModal');
        showToast('Token quota updated successfully!');
        await loadAllData();
      } catch (err) {
        alert(err.message);
      }
    }

    async function revokeKey(id) {
      if (!confirm('Are you sure you want to revoke this API key? Access will be immediately blocked.')) return;
      try {
        const res = await fetch(\`/admin/api/keys/\${id}\`, { method: 'DELETE' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to revoke key');
        showToast('API Key revoked');
        await loadAllData();
      } catch (err) {
        alert(err.message);
      }
    }

    function escapeHtml(str) {
      return (str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[m]));
    }

    // Initialize
    window.addEventListener('DOMContentLoaded', () => {
      const baseUrlEl = document.getElementById('appBaseUrlDisplay');
      if (baseUrlEl) baseUrlEl.textContent = location.origin + '/v1';
      const hash = location.hash.replace('#', '');
      if (hash === 'keys') switchTab('keys');
      loadAllData();
    });
  </script>
</body>
</html>`;
}
