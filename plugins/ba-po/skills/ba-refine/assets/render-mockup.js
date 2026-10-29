/**
 * UI Mockup Playwright Snapshot Renderer
 * (`plugins/ba-po/skills/ba-refine/assets/render-mockup.js`)
 *
 * Chụp ảnh giao diện mẫu từ file HTML sang file PNG chất lượng cao (2x DPI Retina).
 * Hỗ trợ chế độ mobile (khung điện thoại 393x852) hoặc desktop (1440x900).
 * Tự động kết xuất theo từng Case/Trạng thái nghiệp vụ (state = all | default | error | locked).
 *
 * Usage:
 *   node render-mockup.js <src.html> <out.png> [mode: mobile|desktop|fit] [scale: 2] [state: all|default|error|locked]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node render-mockup.js <src.html> <out.png> [mode] [scale] [state]");
  process.exit(1);
}

const [srcPath, outPath, mode = 'fit', scaleArg = '2', stateArg = 'all'] = args;
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
  const outDir = path.dirname(resolvedOut);

  if (!fs.existsSync(resolvedSrc)) {
    console.error(`Không tìm thấy file nguồn HTML: ${resolvedSrc}`);
    process.exit(1);
  }

  // Đảm bảo thư mục đích tồn tại
  fs.mkdirSync(outDir, { recursive: true });

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

    // Đợi tối đa 3 giây nếu có cờ __MOCKUP_READY__
    await page.waitForFunction(() => {
      return window.__MOCKUP_READY__ === undefined || window.__MOCKUP_READY__ === true;
    }, { timeout: 3000 }).catch(() => {});

    const frameLocator = page.locator('.device-frame, #mockup-canvas, .mockup-viewport, .workspace-layout, .mobile-frame').first();
    const count = await frameLocator.count();

    const captureToPath = async (targetFilePath) => {
      if (count > 0 && mode === 'fit') {
        await frameLocator.screenshot({ path: targetFilePath, omitBackground: false });
      } else {
        await page.screenshot({ path: targetFilePath, fullPage: mode !== 'mobile' });
      }
    };

    const applyState = async (stateName) => {
      await page.evaluate((st) => {
        if (typeof window.switchState === 'function') {
          window.switchState(st);
        }
      }, stateName);
      // Đợi DOM cập nhật nhẹ
      await page.waitForTimeout(100);
    };

    const results = [];

    if (stateArg === 'all') {
      // Case 1: Trạng thái mặc định (Default)
      await applyState('default');
      const case1Path = path.join(outDir, 'mockup-case-1.png');
      await captureToPath(case1Path);
      results.push(case1Path);

      // Lưu bản sao vào file đích chính (VD: mockup.png)
      await captureToPath(resolvedOut);
      results.push(resolvedOut);

      // Case 2: Trạng thái báo lỗi / cảnh báo (Error/Warning)
      await applyState('error');
      const case2Path = path.join(outDir, 'mockup-case-2.png');
      await captureToPath(case2Path);
      results.push(case2Path);

      // Case 3: Trạng thái khóa phiên ATO/ATC (Locked)
      await applyState('locked');
      const case3Path = path.join(outDir, 'mockup-case-3.png');
      await captureToPath(case3Path);
      results.push(case3Path);
    } else {
      // Chụp đơn trạng thái theo tham số
      await applyState(stateArg);
      await captureToPath(resolvedOut);
      results.push(resolvedOut);
    }

    console.log(JSON.stringify({
      success: true,
      source: resolvedSrc,
      output: resolvedOut,
      state: stateArg,
      scale,
      mode,
      generated_files: results
    }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
