#!/usr/bin/env node

/**
 * Live DOM & Baseline Snapshot Capturer (`capture-asis-dom.js`)
 *
 * Tầng 1 (Live DOM Snapshot & Surgical Injection):
 * Dùng Playwright kết nối vào môi trường Web UAT/Dev (hoặc gọi webhook n8n),
 * điều hướng tới màn hình thực tế, chụp ảnh nền `asis-baseline.png` và dump DOM + inline computed styles
 * ra `asis-snapshot.html`.
 *
 * Usage:
 *   node capture-asis-dom.js --url <pageUrl> --output <dir> [--login]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
let targetUrl = process.env.WEB_BASE_URL || 'https://dev.trading-test.dnse.com.vn';
let outputDir = process.cwd();
let shouldLogin = args.includes('--login');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) targetUrl = args[++i];
  if (args[i] === '--output' && args[i + 1]) outputDir = path.resolve(args[++i]);
}

(async () => {
  let chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (_) {
    console.warn('⚠️ Không tìm thấy thư viện playwright. Bỏ qua Live DOM capture, fallback sang Tầng 2 (AST & Production Shells).');
    process.exit(0);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const baselinePng = path.join(outputDir, 'asis-baseline.png');
  const snapshotHtml = path.join(outputDir, 'asis-snapshot.html');

  console.log(`🌐 Đang mở trình duyệt chụp Live DOM từ: ${targetUrl}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2.0
  });
  const page = await context.newPage();

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Xử lý tự động đăng nhập nếu có flag --login
    if (shouldLogin) {
      const username = process.env.TRADING_USERNAME || process.env.UAT_USERNAME || '';
      const password = process.env.TRADING_PASSWORD || process.env.UAT_PASSWORD || '';
      if (username && password) {
        console.log(`🔐 Đang thực hiện đăng nhập tự động với user: ${username}...`);
        const userSelector = 'input[name="username"], input[type="text"], input[placeholder*="tài khoản"], input[placeholder*="username"]';
        const passSelector = 'input[name="password"], input[type="password"]';
        const submitSelector = 'button[type="submit"], button:has-text("Đăng nhập"), button:has-text("Login")';

        if (await page.$(userSelector) && await page.$(passSelector)) {
          await page.fill(userSelector, username);
          await page.fill(passSelector, password);
          if (await page.$(submitSelector)) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
              page.click(submitSelector)
            ]);
            await page.waitForTimeout(2000);
            console.log('✅ Đã hoàn tất đăng nhập phiên Live.');
          }
        }
      } else {
        console.warn('⚠️ Cờ --login được truyền nhưng chưa thiết lập biến môi trường TRADING_USERNAME / TRADING_PASSWORD.');
      }
    }

    // Chụp ảnh baseline gốc
    await page.screenshot({ path: baselinePng, fullPage: true });

    // Trích xuất HTML đã render kèm <base href> và inline CSS styles
    const renderedHtml = await page.evaluate((baseUrl) => {
      // 1. Thêm base tag để bảo toàn đường dẫn fonts, icons, CSS relative
      let baseTag = document.querySelector('base');
      if (!baseTag) {
        baseTag = document.createElement('base');
        baseTag.href = baseUrl;
        document.head.prepend(baseTag);
      } else {
        baseTag.href = baseUrl;
      }

      // 2. Thu thập toàn bộ CSS text từ styleSheets để inline vào snapshot
      let combinedCss = '';
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            if (sheet.cssRules) {
              for (const rule of Array.from(sheet.cssRules)) {
                combinedCss += rule.cssText + '\n';
              }
            }
          } catch (_) {
            // Bỏ qua Cross-Origin stylesheets không truy cập được trực tiếp
          }
        }
      } catch (_) {}

      if (combinedCss) {
        const inlinedStyle = document.createElement('style');
        inlinedStyle.id = '__inlined_computed_styles__';
        inlinedStyle.textContent = combinedCss;
        document.head.appendChild(inlinedStyle);
      }

      return document.documentElement.outerHTML;
    }, targetUrl);

    fs.writeFileSync(snapshotHtml, renderedHtml, 'utf8');

    console.log(`✅ Đã chụp Live DOM Snapshot:`);
    console.log(`   - Ảnh gốc: ${baselinePng}`);
    console.log(`   - HTML Snapshot: ${snapshotHtml}`);
  } catch (err) {
    console.warn(`⚠️ Không thể kết nối tới Live URL (${err.message}). Tiếp tục quy trình với Production Shells.`);
  } finally {
    await browser.close();
  }
})();

