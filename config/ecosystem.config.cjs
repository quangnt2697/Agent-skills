const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const apps = [
  {
    name: 'n8n-agent-skills',
    cwd: projectRoot,
    script: 'n8n',
    args: 'start',
    interpreter: 'none',
    env: {
      ...process.env,
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
      AGENT_WORKSPACE_DIR: projectRoot,
      N8N_PORT: process.env.N8N_PORT || '5678',
      N8N_PROTOCOL: 'http',
      N8N_HOST: 'localhost',
      NODE_ENV: 'production',
      N8N_BLOCK_ENV_ACCESS_IN_NODE: 'false',
      N8N_RUNNERS_MODE: 'internal',
      N8N_RUNNERS_TASK_REQUEST_TIMEOUT: '60',
      NODE_FUNCTION_ALLOW_BUILTIN: '*',
      NODE_FUNCTION_ALLOW_EXTERNAL: '*',
      // ── Múi Giờ Việt Nam ──────────────────────────────────────────────────
      // GENERIC_TIMEZONE: n8n dùng để tính lịch cron (Schedule Trigger)
      // TZ: Node.js process dùng để hiển thị time trong log và new Date()
      GENERIC_TIMEZONE: process.env.GENERIC_TIMEZONE || 'Asia/Ho_Chi_Minh',
      TZ: process.env.TZ || 'Asia/Ho_Chi_Minh'
    },
    watch: false,
    autorestart: true,
    max_memory_restart: '1G'
  }
];

const ngrokDomain = process.env.NGROK_DOMAIN;
const n8nPort = process.env.N8N_PORT || '5678';
if (ngrokDomain) {
  apps.push({
    name: 'ngrok-tunnel',
    cwd: projectRoot,
    script: 'ngrok',
    args: `http --domain=${ngrokDomain} ${n8nPort}`,
    interpreter: 'none',
    watch: false,
    autorestart: true
  });
}

module.exports = { apps };
