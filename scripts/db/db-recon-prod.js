#!/usr/bin/env node
/**
 * TimescaleDB MDDS Reconciliation Runner — PRODUCTION ONLY
 * (`scripts/db/db-recon-prod.js`)
 *
 * ⚠️  Script này LUÔN thực thi trên môi trường PRODUCTION.
 *    Dành riêng cho skill `db-timescale-reconciler` và lệnh `npm run db:recon:prod`.
 *    Tất cả các skill khác (QA test, sandbox...) sử dụng môi trường UAT mặc định.
 *
 * Cách dùng:
 *   node scripts/db/db-recon-prod.js                           # Master Dashboard (ngày hiện tại)
 *   node scripts/db/db-recon-prod.js recon-ticks               # Đối chiếu Ticks V3 vs V2
 *   node scripts/db/db-recon-prod.js --suite=core              # Chạy 4 bài đối chiếu Core
 *   node scripts/db/db-recon-prod.js --date 2026-09-17         # Lọc theo ngày cụ thể
 *   node scripts/db/db-recon-prod.js --symbol FPT              # Lọc theo mã cụ thể
 *   node scripts/db/db-recon-prod.js --list                    # Liệt kê toàn bộ query
 *   npm run db:recon:prod                                      # Lệnh npm tiện ích
 */

// ─── PRODUCTION LOCK — đặt TRƯỚC mọi import ─────────────────────────────────
process.env.METABASE_ENV = 'prod';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../lib/db-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

loadEnv(path.join(projectRoot, '.env'));
process.env.METABASE_ENV = 'prod';

const {
  loadCatalog,
  replaceParams,
  formatMarkdownTable,
  parseCliArgs,
  catalogPath,
  runQuery,
  main: runReconMain
} = await import('./db-recon.js');

async function main() {
  const cliArgs = parseCliArgs();
  if (cliArgs.uat || cliArgs.env === 'uat') {
    console.error('❌ Flag --uat không được hỗ trợ trên db-recon-prod.js.');
    console.log('   Script này luôn khóa cứng trên Production. Dùng `npm run db:recon` để truy vấn UAT.\n');
    process.exit(1);
  }
  process.env.METABASE_ENV = 'prod';
  await runReconMain();
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return process.argv[1] === fileURLToPath(import.meta.url);
  }
}

if (isMain()) {
  main().catch(err => {
    console.error('❌ Lỗi không mong đợi:', err);
    process.exit(1);
  });
}

export { loadCatalog, replaceParams, formatMarkdownTable, parseCliArgs, catalogPath, runQuery, main };
