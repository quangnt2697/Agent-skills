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
      script: 'n8n',
      args: 'start',
      interpreter: 'none',
      env: {
        ...process.env,
        N8N_PORT: process.env.N8N_PORT || '5678',
        N8N_PROTOCOL: 'http',
        N8N_HOST: 'localhost',
        NODE_ENV: 'production'
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
};
