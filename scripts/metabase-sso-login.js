#!/usr/bin/env node
/**
 * Metabase SSO Login Helper (`scripts/metabase-sso-login.js`)
 *
 * Mở trình duyệt Chromium để người dùng đăng nhập SSO (Google / SAML) vào Metabase Production (https://mb.dnse.com.vn),
 * tự động bắt Cookie `metabase.SESSION`, xác thực với API, dò tìm danh sách Database IDs và lưu trực tiếp vào file `.env`.
 *
 * Cách dùng:
 *   npm run metabase:login
 *   node scripts/metabase-sso-login.js
 *   node scripts/metabase-sso-login.js --check       # Chỉ kiểm tra tính hợp lệ của token hiện tại
 *   node scripts/metabase-sso-login.js --force       # Ép mở trình duyệt đăng nhập lại
 *   node scripts/metabase-sso-login.js --set-active  # Chuyển thẳng Production làm môi trường active trong .env
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');


// ─── 1. Tiện Ích Đọc / Ghi File .env ───────────────────────────────────────────

function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let val = (match[2] || '').replace(/(^['"]|['"]$)/g, '').trim();
            env[match[1]] = val;
        }
    });
    return env;
}

function updateEnvFile(filePath, updates) {
    if (!fs.existsSync(filePath)) {
        const lines = Object.entries(updates).map(([k, v]) => `${k}=${v}`);
        fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
        return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    const pending = { ...updates };

    // Cập nhật các dòng đã tồn tại
    const updatedLines = content.split(/\r?\n/).map(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match && pending[match[1]] !== undefined) {
            const key = match[1];
            const newVal = pending[key];
            delete pending[key];
            return `${key}=${newVal}`;
        }
        return line;
    });

    // Thêm các key mới chưa từng có vào cuối file
    Object.entries(pending).forEach(([k, v]) => {
        updatedLines.push(`${k}=${v}`);
    });

    fs.writeFileSync(filePath, updatedLines.join('\n'), 'utf-8');
}

// ─── 2. Kiểm Tra Hiệu Lực Token Qua Metabase API ───────────────────────────────

async function verifyMetabaseSession(baseUrl, sessionToken) {
    if (!sessionToken) return { valid: false, error: 'Chưa có token' };
    try {
        const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/user/current`, {
            headers: {
                'X-Metabase-Session': sessionToken,
                'Cookie': `metabase.SESSION=${sessionToken}`,
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
            const user = await res.json();
            return { valid: true, user };
        }
        return { valid: false, error: `HTTP ${res.status}` };
    } catch (err) {
        return { valid: false, error: err.message };
    }
}

async function fetchDatabases(baseUrl, sessionToken) {
    try {
        const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/database`, {
            headers: {
                'X-Metabase-Session': sessionToken,
                'Cookie': `metabase.SESSION=${sessionToken}`,
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(8000)
        });
        if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : (data.data || []);
        }
    } catch (_) {}
    return [];
}

// ─── 3. CLI Main Workflow ─────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const isCheckOnly = args.includes('--check');
    const isForce     = args.includes('--force');
    const isSetActive = args.includes('--set-active');
    const isUat       = args.includes('--uat');

    const env = parseEnv(envPath);

    // Xác định URL mục tiêu
    let targetUrl = env.METABASE_PROD_URL || 'https://mb.dnse.com.vn';
    if (isUat) {
        targetUrl = env.METABASE_UAT_URL || env.METABASE_URL || 'https://mb-uat.dnse.com.vn';
    }
    const customUrlIdx = args.indexOf('--url');
    if (customUrlIdx !== -1 && args[customUrlIdx + 1]) {
        targetUrl = args[customUrlIdx + 1];
    }
    targetUrl = targetUrl.replace(/\/+$/, '');

    console.log(`\n==============================================================`);
    console.log(`🔐 METABASE SSO AUTHENTICATION HELPER`);
    console.log(`🌐 Mục tiêu: ${targetUrl}`);
    console.log(`==============================================================\n`);

    // Kiểm tra token hiện tại trong .env
    const existingToken = isUat
        ? (env.METABASE_UAT_API_TOKEN || env.METABASE_SESSION_TOKEN || env.METABASE_API_TOKEN)
        : (env.METABASE_PROD_SESSION_TOKEN || env.METABASE_SESSION_TOKEN);

    if (existingToken && !isForce) {
        process.stdout.write(`⏳ Đang kiểm tra session token hiện có trong .env... `);
        const check = await verifyMetabaseSession(targetUrl, existingToken);
        if (check.valid) {
            console.log(`✅ HỢP LỆ!`);
            console.log(`👤 Người dùng: ${check.user.email || check.user.common_name} (ID: ${check.user.id})`);
            console.log(`🔑 Vai trò: ${check.user.is_superuser ? 'Superuser' : 'Thành viên'}`);
            console.log(`\n💡 Session token hiện tại vẫn hoạt động tốt.`);
            console.log(`   Nếu muốn ép mở lại trình duyệt để đăng nhập mới, chạy với cờ: --force\n`);
            return;
        } else {
            console.log(`❌ HẾT HẠN hoặc KHÔNG HỢP LỆ (${check.error}).`);
            if (isCheckOnly) {
                console.log(`\n⚠️  Token không hợp lệ. Vui lòng chạy không kèm --check để mở trình duyệt đăng nhập lại.`);
                process.exit(1);
            }
        }
    } else if (isCheckOnly) {
        console.log(`⚠️  Chưa có Session Token trong .env để kiểm tra.`);
        process.exit(1);
    }

    // Mở Browser cho người dùng đăng nhập SSO
    console.log(`🚀 Đang khởi chạy trình duyệt Chromium (giao diện thực)...`);
    console.log(`👉 Vui lòng hoàn tất đăng nhập SSO (Google / Okta) trên cửa sổ vừa mở.`);
    console.log(`⏳ Đang lắng nghe cookie 'metabase.SESSION' (chờ tối đa 3 phút)...\n`);

    let browser;
    try {
        browser = await chromium.launch({
            headless: false,
            args: ['--start-maximized', '--no-sandbox']
        });
    } catch (launchErr) {
        console.error(`❌ Không thể mở trình duyệt Chromium: ${launchErr.message}`);
        console.log(`\n💡 HƯỚNG DẪN THỦ CÔNG:`);
        console.log(`1. Mở trình duyệt Chrome của bạn và truy cập: ${targetUrl}`);
        console.log(`2. Đăng nhập bằng SSO.`);
        console.log(`3. Bấm F12 -> tab 'Application' -> mục 'Cookies' -> chọn '${targetUrl}'.`);
        console.log(`4. Copy giá trị của cookie 'metabase.SESSION'.`);
        console.log(`5. Dán vào biến METABASE_PROD_SESSION_TOKEN trong file .env.\n`);
        process.exit(1);
    }

    const context = await browser.newContext({
        viewport: null,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    let sessionToken = null;

    // Lắng nghe API responses
    page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('/api/session') || url.includes('/api/user/current')) {
            try {
                const headers = res.headers();
                const setCookie = headers['set-cookie'] || '';
                const match = setCookie.match(/metabase\.SESSION=([^;]+)/);
                if (match) sessionToken = match[1];
            } catch (_) {}
        }
    });

    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (navErr) {
        console.warn(`[Cảnh báo] Lỗi tải trang ban đầu (${navErr.message}), vẫn tiếp tục đợi user đăng nhập...`);
    }

    // Polling tìm session cookie
    const startTime = Date.now();
    const timeoutMs = 180000; // 3 phút

    while (Date.now() - startTime < timeoutMs) {
        if (!sessionToken) {
            const cookies = await context.cookies([targetUrl, `${targetUrl}/`]);
            const sCookie = cookies.find(c => c.name === 'metabase.SESSION' || c.name === 'SESSION');
            if (sCookie && sCookie.value) {
                sessionToken = sCookie.value;
            }
        }

        if (sessionToken) {
            // Xác thực token
            const check = await verifyMetabaseSession(targetUrl, sessionToken);
            if (check.valid) {
                console.log(`\n🎉 ĐĂNG NHẬP SSO THÀNH CÔNG!`);
                console.log(`👤 Tài khoản: ${check.user.email || check.user.common_name} (ID: ${check.user.id})`);
                console.log(`🔑 Session Token: ${sessionToken.slice(0, 8)}...${sessionToken.slice(-6)}`);

                // Dò tìm danh sách Database trên Metabase
                console.log(`\n🔍 Đang dò tìm danh sách Databases trên Metabase...`);
                const dbs = await fetchDatabases(targetUrl, sessionToken);
                let discoveredTimescaleId = null;
                let discoveredOpenApiId   = null;

                if (dbs.length > 0) {
                    console.log(`📋 Các database khả dụng trên ${targetUrl}:`);
                    dbs.forEach(d => {
                        console.log(`   - [ID: ${d.id}] ${d.name} (${d.engine})`);
                        const nameLower = (d.name || '').toLowerCase();
                        if (nameLower.includes('timescale') && !discoveredTimescaleId) {
                            discoveredTimescaleId = d.id;
                        }
                        if (nameLower.includes('openapi') && !nameLower.includes('sandbox') && !discoveredOpenApiId) {
                            discoveredOpenApiId = d.id;
                        }
                    });
                }

                // Cập nhật .env
                console.log(`\n💾 Đang cập nhật Session Token vào file .env...`);
                const updates = {};
                if (isUat) {
                    updates.METABASE_UAT_API_TOKEN = sessionToken;
                    updates.METABASE_SESSION_TOKEN = sessionToken;
                } else {
                    updates.METABASE_PROD_SESSION_TOKEN = sessionToken;
                    updates.METABASE_SESSION_TOKEN = sessionToken;
                    if (discoveredTimescaleId) updates.METABASE_PROD_DB_TIMESCALE_ID = String(discoveredTimescaleId);
                    if (discoveredOpenApiId)   updates.METABASE_PROD_DB_OPENAPI_ID   = String(discoveredOpenApiId);
                }

                if (isSetActive) {
                    updates.METABASE_ENV = isUat ? 'uat' : 'prod';
                    updates.METABASE_URL = targetUrl;
                }

                updateEnvFile(envPath, updates);
                console.log(`✅ Đã lưu cấu hình vào ${envPath}!`);

                await browser.close();
                console.log(`\n✨ Hoàn tất! Bạn có thể bắt đầu sử dụng db-mcp và test-data-mcp ngay bây giờ.\n`);
                return;
            }
        }

        // Kiểm tra xem user có đóng cửa sổ trình duyệt sớm không
        if (page.isClosed() || !browser.isConnected()) {
            console.error(`\n❌ Trình duyệt đã bị đóng trước khi hoàn tất đăng nhập.`);
            process.exit(1);
        }

        await new Promise(r => setTimeout(r, 1500));
    }

    console.error(`\n⏰ Quá thời gian chờ đăng nhập (3 phút). Vui lòng thử lại.`);
    await browser.close();
    process.exit(1);
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
        console.error(`❌ Lỗi không mong đợi:`, err);
        process.exit(1);
    });
}


export {
    parseEnv,
    updateEnvFile,
    verifyMetabaseSession,
    fetchDatabases,
};

