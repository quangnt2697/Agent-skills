/**
 * UI Mockup Playwright Snapshot Renderer & Layout Integrity Checker
 * (`plugins/ba-po/skills/ba-refine/assets/render-mockup.js`)
 *
 * Chụp ảnh giao diện mẫu từ file HTML sang file PNG chất lượng cao (2x DPI Retina).
 * - Chế độ Web/Desktop: Độ phân giải tối thiểu Full HD (1920x1080).
 * - Chế độ Mobile: Khung điện thoại (393x852, viewport 440x950).
 * - Tự động ẩn các thanh công cụ/bảng ghi chú nội bộ (nếu có) để ảnh mockup chỉ chứa giao diện sản phẩm thuần khiết kèm highlight phần thiết kế mới.
 * - Tự động kiểm tra lỗi vỡ layout (tràn chiều ngang, bảng tràn khỏi card, chiều rộng dưới chuẩn Full HD).
 *
 * Usage:
 *   node render-mockup.js <src.html> <out.png> [mode: mobile|desktop|fit] [scale: 2] [state: all|default|error|locked]
 */

import fs from 'node:fs';
import path from 'node:path';

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

  fs.mkdirSync(outDir, { recursive: true });

  const chromePath = process.env.CHROME_BIN || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });

  // Thiết lập viewport: Web bắt buộc tối thiểu Full HD (1920x1080)
  const viewport = mode === 'mobile'
    ? { width: 440, height: 950 }
    : { width: 1920, height: 1080 };

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale
  });

  const page = await context.newPage();

  try {
    await page.goto(`file://${resolvedSrc}`, { waitUntil: 'networkidle' });

    await page.waitForFunction(() => {
      return window.__MOCKUP_READY__ === undefined || window.__MOCKUP_READY__ === true;
    }, { timeout: 3000 }).catch(() => {});

    // Ẩn mọi phần tử ghi chú QA/BA hoặc thanh công cụ preview nếu vô tình xuất hiện trong DOM
    await page.evaluate(() => {
      const selectorsToHide = [
        '.preview-toolbar',
        '.delta-legend-card',
        '.delta-table',
        '.delta-pin',
        '.delta-badge'
      ];
      selectorsToHide.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          el.style.display = 'none';
        });
      });
    });

    const isMobileDom = await page.evaluate(() => {
      return Boolean(document.querySelector('.mobile-frame, .device-frame.mobile-mode'));
    });

    // Kiểm tra tính toàn vẹn Layout (Layout Integrity Check)
    const layoutReport = await page.evaluate((expectedIsMobile) => {
      const issues = [];
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;

      if (docWidth > winWidth + 8) {
        issues.push(`Tràn chiều ngang (Horizontal Overflow): scrollWidth (${docWidth}px) > viewport (${winWidth}px).`);
      }

      if (!expectedIsMobile) {
        const mainFrame = document.querySelector('.device-frame, #mockup-canvas, .workspace-layout, #root, .ant-layout') || document.body;
        const rect = mainFrame.getBoundingClientRect();
        if (rect.width < 1900) {
          issues.push(`Chiều rộng khung giao diện chính (${Math.round(rect.width)}px) nhỏ hơn chuẩn Full HD (1920px).`);
        }
      }

      // Kiểm tra bảng bị tràn khỏi card/container cha
      document.querySelectorAll('table').forEach((tbl, idx) => {
        if (tbl.offsetParent === null) return; // Bỏ qua bảng ẩn
        const parent = tbl.parentElement;
        if (parent) {
          const tblRect = tbl.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          if (tblRect.width > parentRect.width + 8 && getComputedStyle(parent).overflowX === 'visible') {
            issues.push(`Bảng #${idx + 1} rộng (${Math.round(tblRect.width)}px) tràn khỏi khung chứa (${Math.round(parentRect.width)}px).`);
          }
        }
      });

      return {
        viewportWidth: winWidth,
        viewportHeight: window.innerHeight,
        scrollWidth: docWidth,
        scrollHeight: document.documentElement.scrollHeight,
        layoutValid: issues.length === 0,
        issues
      };
    }, mode === 'mobile' || isMobileDom);

    const frameLocator = page.locator('.device-frame, #mockup-canvas, .mockup-viewport, .workspace-layout, .mobile-frame').first();
    const count = await frameLocator.count();

    const captureToPath = async (targetFilePath) => {
      if (count > 0 && (mode === 'mobile' || isMobileDom)) {
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
      await page.waitForTimeout(100);
    };

    const results = [];

    if (stateArg === 'all') {
      await applyState('default');
      const case1Path = path.join(outDir, 'mockup-case-1.png');
      await captureToPath(case1Path);
      results.push(case1Path);

      await captureToPath(resolvedOut);
      results.push(resolvedOut);

      await applyState('error');
      const case2Path = path.join(outDir, 'mockup-case-2.png');
      await captureToPath(case2Path);
      results.push(case2Path);

      await applyState('locked');
      const case3Path = path.join(outDir, 'mockup-case-3.png');
      await captureToPath(case3Path);
      results.push(case3Path);
    } else {
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
      viewport,
      layout_check: layoutReport,
      generated_files: results
    }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
