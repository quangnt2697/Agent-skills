const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

module.exports = {
  apps: [
    {
      name: 'n8n-agent-skills',
      cwd: __dirname,
      script: 'n8n',
      args: 'start',
      interpreter: 'none',
      env: {
        ...process.env,
        AGENT_WORKSPACE_DIR: __dirname,
        N8N_PORT: process.env.N8N_PORT || '5678',
        N8N_PROTOCOL: 'http',
        N8N_HOST: 'localhost',
        NODE_ENV: 'production',
        N8N_BLOCK_ENV_ACCESS_IN_NODE: 'false',
        N8N_RUNNERS_MODE: 'internal',
        N8N_RUNNERS_TASK_REQUEST_TIMEOUT: '60',
        NODE_FUNCTION_ALLOW_BUILTIN: '*',
        NODE_FUNCTION_ALLOW_EXTERNAL: '*'
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '1G'
    }
  ]
};
