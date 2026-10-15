/**
 * UI Mockup Playwright Snapshot Renderer
 * (`plugins/ba-po/skills/ba-refine/scripts/render-mockup.js`)
 *
 * Chụp ảnh giao diện mẫu từ file HTML sang file PNG chất lượng cao (2x DPI Retina).
 * Hỗ trợ chế độ mobile (khung điện thoại 390x844) hoặc desktop (1440x900).
 *
 * Usage:
 *   node render-mockup.js <src.html> <out.png> [mode: mobile|desktop|fit] [scale: 2]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node render-mockup.js <src.html> <out.png> [mode] [scale]");
  process.exit(1);
}

const [srcPath, outPath, mode = 'fit', scaleArg = '2'] = args;
const scale = parseFloat(scaleArg) || 2.0;

(async () => {
  let chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (e) {
    console.error("Lỗi: Không tìm thấy thư viện Playwright. Cài đặt bằng: npm install playwright");
    process.exit(1);
  }

  const resolvedSrc = path.resolve(srcPath);
  const resolvedOut = path.resolve(outPath);

  if (!fs.existsSync(resolvedSrc)) {
    console.error(`Không tìm thấy file nguồn HTML: ${resolvedSrc}`);
    process.exit(1);
  }

  // Đảm bảo thư mục đích tồn tại
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  
  // Thiết lập viewport dựa theo chế độ
  const viewport = mode === 'mobile' 
    ? { width: 440, height: 950 } 
    : { width: 1440, height: 900 };

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale
  });

  const page = await context.newPage();

  try {
    await page.goto(`file://${resolvedSrc}`, { waitUntil: 'networkidle' });

    // Đợi tối đa 2 giây nếu có cờ __MOCKUP_READY__
    await page.waitForFunction(() => {
      return window.__MOCKUP_READY__ === undefined || window.__MOCKUP_READY__ === true;
    }, { timeout: 3000 }).catch(() => {});

    // Ưu tiên chụp element khung hiển thị nếu có
    const frameLocator = page.locator('.device-frame, #mockup-canvas, .mockup-viewport').first();
    const count = await frameLocator.count();

    if (count > 0 && mode === 'fit') {
      await frameLocator.screenshot({ path: resolvedOut, omitBackground: false });
    } else {
      await page.screenshot({ path: resolvedOut, fullPage: mode !== 'mobile' });
    }

    console.log(JSON.stringify({
      success: true,
      source: resolvedSrc,
      output: resolvedOut,
      scale,
      mode
    }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
