#!/usr/bin/env node

/**
 * Script Tự Động Thiết Lập n8n cho Client Mới (`scripts/setup/setup-n8n.js`)
 *
 * Ưu tiên kiến trúc Colima + Docker CLI + Docker Compose (Zero-Permission, không cần sudo hay npm -g):
 * 1. Kiểm tra Colima + Docker CLI + Docker Compose (hoặc fallback sang n8n CLI local nếu không dùng Docker)
 * 2. Tự động đồng bộ chứng chỉ CA doanh nghiệp (macOS Keychain -> Colima VM) để tránh lỗi TLS x509 khi pull image
 * 3. Khởi động container `agent-skills-n8n` và nạp + kích hoạt (active = 1) toàn bộ 18 workflows
 *
 * Cách dùng:
 *   npm run n8n:setup
 *   node scripts/setup/setup-n8n.js
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

console.log('='.repeat(65));
console.log('  THIẾT LẬP N8N FAST-PATH TỰ ĐỘNG CHO AGENT-SKILLS (0 ĐỒNG)');
console.log('='.repeat(65));

function hasCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const hasColima = hasCommand('colima');
const hasDocker = hasCommand('docker');
const hasDockerCompose = hasCommand('docker-compose') || (() => {
  try {
    execSync('docker compose version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

if (hasDocker && hasDockerCompose) {
  console.log('🐳 Phát hiện Docker CLI + Docker Compose. Sử dụng kiến trúc Container chuẩn hóa!');

  // 1. Đảm bảo Colima đang chạy (nếu dùng Colima trên macOS)
  if (hasColima) {
    let colimaRunning = false;
    try {
      const statusOut = execSync('colima status 2>&1', { encoding: 'utf8' });
      colimaRunning = /colima is running/i.test(statusOut);
    } catch {
      colimaRunning = false;
    }

    if (!colimaRunning) {
      console.log('🚀 Đang khởi động Colima VM (2 CPU, 2GB RAM, 20GB Disk)...');
      execSync('colima start --cpu 2 --memory 2 --disk 20', { stdio: 'inherit' });
    } else {
      console.log('✅ Colima VM đang hoạt động.');
    }

    // 2. Tự động nạp chứng chỉ CA từ macOS Keychain vào Colima VM (phòng chống lỗi x509 TLS tại mạng doanh nghiệp)
    if (process.platform === 'darwin') {
      try {
        console.log('🔐 Đang đồng bộ chứng chỉ Root CA từ macOS Keychain vào Colima VM...');
        const tmpCert = path.join(os.tmpdir(), 'colima-mac-ca-bundle.pem');
        execSync(`security find-certificate -a -p /Library/Keychains/System.keychain > "${tmpCert}" 2>/dev/null || true`);
        const loginKeychain = path.join(os.homedir(), 'Library/Keychains/login.keychain-db');
        if (fs.existsSync(loginKeychain)) {
          execSync(`security find-certificate -a -p "${loginKeychain}" >> "${tmpCert}" 2>/dev/null || true`);
        }
        if (fs.existsSync(tmpCert) && fs.statSync(tmpCert).size > 0) {
          execSync(`colima ssh -- bash -c "sudo cp /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt.bak 2>/dev/null || true"`, { stdio: 'ignore' });
          execSync(`cat "${tmpCert}" | colima ssh -- sudo tee /usr/local/share/ca-certificates/corporate-ca.crt >/dev/null`, { stdio: 'ignore' });
          execSync(`colima ssh -- bash -c "sudo update-ca-certificates >/dev/null 2>&1 && sudo systemctl restart docker"`, { stdio: 'ignore' });
          fs.rmSync(tmpCert, { force: true });
          console.log('✅ Đã đồng bộ chứng chỉ CA doanh nghiệp vào Colima Docker daemon.');
        }
      } catch (_) {
        // Bỏ qua nếu không cần thiết
      }
    }
  }

  // 3. Khởi động container n8n và nạp + kích hoạt toàn bộ workflows
  console.log('\n📦 Đang khởi động container agent-skills-n8n và kích hoạt 18 workflows...');
  const composeCmd = hasCommand('docker-compose') ? 'docker-compose up -d' : 'docker compose up -d';
  execSync(composeCmd, { cwd: projectRoot, stdio: 'inherit' });
  execSync('node scripts/n8n/import-and-activate.js', { cwd: projectRoot, stdio: 'inherit' });

  console.log('\n' + '='.repeat(65));
  console.log('🎉 THIẾT LẬP N8N CONTAINER HOÀN TẤT!');
  console.log('='.repeat(65));
  console.log('Bây giờ bạn có thể quản lý Colima + n8n hoàn toàn qua npm:');
  console.log('  • npm run colima:start --> Khởi động máy ảo Colima');
  console.log('  • npm run n8n:up       --> Khởi động n8n Container & kích hoạt 18 workflows');
  console.log('  • npm run n8n:logs     --> Xem log hoạt động của n8n Container');
  console.log('  • npm run n8n:down     --> Dừng n8n Container');
  console.log('  • Web UI               --> http://localhost:5678');
  console.log('='.repeat(65));
  process.exit(0);
}

// Fallback: Cài đặt qua n8n CLI trên host nếu máy chưa cài Docker/Colima
let hasN8n = hasCommand('n8n');
if (!hasN8n) {
  console.log('⚠️  Chưa tìm thấy Docker/Colima hoặc n8n trên máy.');
  console.log('💡 Khuyến nghị cài đặt Colima + Docker CLI: brew install colima docker docker-compose');
  console.log('Đang thử cài đặt n8n toàn cục (npm install -g n8n)...');
  try {
    execSync('npm install -g n8n', { stdio: 'inherit' });
    console.log('✅ Cài đặt n8n thành công!');
    hasN8n = true;
  } catch (err) {
    console.error('❌ Không thể cài đặt n8n toàn cục (thiếu quyền ghi thư mục hệ thống).');
    console.error('👉 Giải pháp chuẩn (không cần sudo):');
    console.error('   brew install colima docker docker-compose');
    console.error('   npm run colima:start && npm run n8n:up');
    process.exit(1);
  }
}

// Tự động Import Workflows từ thư mục n8n-workflows/
const workflowsDir = path.join(projectRoot, 'n8n-workflows');
if (fs.existsSync(workflowsDir)) {
  console.log('\n📥 Đang tự động nạp các Workflow mẫu từ n8n-workflows/...');
  try {
    execSync('node scripts/n8n/import-and-activate.js', { cwd: projectRoot, stdio: 'inherit' });
    console.log('✅ Đã nạp thành công toàn bộ workflows mẫu vào n8n!');
  } catch (err) {
    console.log('⚠️  Không thể nạp workflow tự động (có thể do n8n chưa tạo DB). Hãy chạy npm run n8n:up.');
  }
}
