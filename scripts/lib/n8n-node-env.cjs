'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Tìm đường dẫn file chứng chỉ CA doanh nghiệp (ưu tiên $env của n8n, sau đó đến
 * process.env và đường dẫn mount chuẩn trong container/workspace).
 */
function resolveExtraCaCerts({ env = {}, procEnv = process.env, projectRoot = '' } = {}) {
  const candidates = [
    env.NODE_EXTRA_CA_CERTS,
    procEnv.NODE_EXTRA_CA_CERTS,
    '/home/node/.n8n/corporate-ca.pem',
    projectRoot ? path.join(projectRoot, '.n8n-data', 'corporate-ca.pem') : ''
  ].filter(Boolean);

  return candidates.find((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isFile();
    } catch (_) {
      return false;
    }
  }) || '';
}

/**
 * Dựng biến môi trường cho child process `node` sinh ra từ n8n task-runner.
 * n8n v2 JS task-runner chỉ truyền whitelist N8N_RUNNERS_* nên làm rớt
 * NODE_EXTRA_CA_CERTS; hàm này khôi phục lại trước khi spawnSync khởi chạy Node.
 */
function buildNodeChildEnv({ env = {}, procEnv = process.env, projectRoot = '' } = {}) {
  const childEnv = { ...procEnv };
  const caCerts = resolveExtraCaCerts({ env, procEnv, projectRoot });
  if (caCerts) {
    childEnv.NODE_EXTRA_CA_CERTS = caCerts;
  }

  const allowInsecure = String(env.ALLOW_INSECURE_TLS || procEnv.ALLOW_INSECURE_TLS || '').toLowerCase() === 'true';
  const rejectUnauthorized = env.NODE_TLS_REJECT_UNAUTHORIZED ?? procEnv.NODE_TLS_REJECT_UNAUTHORIZED;
  if (allowInsecure || String(rejectUnauthorized) === '0') {
    childEnv.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  return childEnv;
}

module.exports = {
  resolveExtraCaCerts,
  buildNodeChildEnv
};
