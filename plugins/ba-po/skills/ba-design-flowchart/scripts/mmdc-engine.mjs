#!/usr/bin/env node

/**
 * Engine render dùng Mermaid chuẩn (@mermaid-js/mermaid-cli).
 *
 * Vì sao tồn tại: engine `beautiful-mermaid` (layout bằng elkjs) không render đúng
 * flowchart LR có cạnh quay lại — node đầu tiên bị đẩy sang phải, `subgraph` phá bố cục,
 * và cú pháp neo `~~~` bị bỏ qua im lặng. Mermaid chuẩn (layout bằng dagre) xử lý đúng
 * cả ba trường hợp, nên nó là engine mặc định cho sơ đồ nghiệp vụ theo Rule 7 (AGENTS.md).
 *
 * Đánh đổi: cần Chrome. Module này tự dò Chrome sẵn có thay vì bắt tải thêm ~180MB,
 * và trả về null khi không tìm thấy để bên gọi lùi về engine `beautiful`.
 */

import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const skillRoot = join(__dirname, '..');

/** Bản mới nhất trong một thư mục cache có nhiều phiên bản (mac_arm-151.x, chromium-1228...). */
function newestSubdir(parent) {
  if (!existsSync(parent)) return null;
  const entries = readdirSync(parent).sort();
  return entries.length > 0 ? join(parent, entries[entries.length - 1]) : null;
}

function firstExisting(candidates) {
  return candidates.find(p => p && existsSync(p)) ?? null;
}

/** Các binary Chrome bên trong một thư mục cache puppeteer/playwright, theo nền tảng. */
function browserBinariesIn(dir) {
  if (!dir) return [];
  switch (process.platform) {
    case 'darwin':
      return [
        join(dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        join(dir, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        join(dir, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      ];
    case 'win32':
      return [join(dir, 'chrome-win64', 'chrome.exe'), join(dir, 'chrome-win', 'chrome.exe')];
    default:
      return [join(dir, 'chrome-linux64', 'chrome'), join(dir, 'chrome-linux', 'chrome')];
  }
}

function systemChromePaths() {
  switch (process.platform) {
    case 'darwin':
      return [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
      ];
    case 'win32': {
      const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
      const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
      return [
        join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      ];
    }
    default:
      return [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
      ];
  }
}

/**
 * Tìm Chrome theo thứ tự ưu tiên. Trả về {path, source} hoặc null.
 * Thứ tự này được ghi trong SKILL.md — sửa ở đây thì sửa cả tài liệu.
 */
export function resolveChrome() {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (env) {
    // Biến môi trường trỏ sai là lỗi cấu hình của người dùng, phải nói thẳng chứ không
    // âm thầm dò tiếp — nếu không họ sẽ tưởng biến đã có tác dụng.
    if (existsSync(env)) return { path: env, source: 'PUPPETEER_EXECUTABLE_PATH' };
    console.error(`[mmdc] PUPPETEER_EXECUTABLE_PATH trỏ tới đường dẫn không tồn tại: ${env}`);
  }

  const puppeteerCache = firstExisting(
    browserBinariesIn(newestSubdir(join(homedir(), '.cache', 'puppeteer', 'chrome')))
  );
  if (puppeteerCache) return { path: puppeteerCache, source: 'cache puppeteer' };

  const system = firstExisting(systemChromePaths());
  if (system) return { path: system, source: 'Chrome hệ thống' };

  const playwrightRoot = process.platform === 'darwin'
    ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
    : join(homedir(), '.cache', 'ms-playwright');
  const playwrightDirs = existsSync(playwrightRoot)
    ? readdirSync(playwrightRoot).filter(d => d.startsWith('chromium-')).sort()
    : [];
  const playwright = firstExisting(
    playwrightDirs.flatMap(d => browserBinariesIn(join(playwrightRoot, d)))
  );
  if (playwright) return { path: playwright, source: 'cache playwright' };

  return null;
}

/** Hướng dẫn khắc phục khi không tìm thấy Chrome. Dùng chung cho render.mjs, batch.mjs, doctor.mjs. */
export const CHROME_HELP = `Cách khắc phục (chọn 1):
  1. Cài Google Chrome: https://www.google.com/chrome/
  2. Tải Chromium riêng cho puppeteer:
       cd ${skillRoot} && npx puppeteer browsers install chrome
  3. Trỏ tới Chrome đã có sẵn:
       export PUPPETEER_EXECUTABLE_PATH="/duong/dan/toi/chrome"
Chạy \`npm run doctor\` trong ${skillRoot} để kiểm tra lại.`;

export function mmdcBinary() {
  const bin = join(skillRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'mmdc.cmd' : 'mmdc');
  return existsSync(bin) ? bin : null;
}

/**
 * Ánh xạ tên theme của beautiful-mermaid sang theme Mermaid chuẩn.
 * Mermaid chỉ có 5 theme dựng sẵn nên đây là ánh xạ sáng/tối, không phải tương đương 1-1.
 */
const THEME_MAP = {
  'zinc-light': 'base',
  'github-light': 'base',
  'nord-light': 'base',
  'tokyo-night': 'dark',
  'github-dark': 'dark',
  'dracula': 'dark',
  'nord': 'dark',
};
const MERMAID_BUILTIN_THEMES = ['default', 'base', 'dark', 'forest', 'neutral'];

export function resolveMermaidTheme(name) {
  if (!name) return { theme: 'base', dark: false };
  if (MERMAID_BUILTIN_THEMES.includes(name)) return { theme: name, dark: name === 'dark' };
  // hasOwnProperty: tên như "__proto__" hoặc "constructor" phải bị coi là không hợp lệ,
  // không được rơi vào prototype chain rồi lọt một object lạ xuống file config.
  if (Object.prototype.hasOwnProperty.call(THEME_MAP, name)) {
    const mapped = THEME_MAP[name];
    return { theme: mapped, dark: mapped === 'dark' };
  }
  console.error(
    `[mmdc] Theme "${name}" chỉ có ở engine beautiful — engine mmdc dùng "base" thay thế.\n` +
    `       Dùng --engine beautiful nếu cần đúng theme này.`
  );
  return { theme: 'base', dark: false };
}

/**
 * themeVariables mặc định: nền trắng, chữ đen — đúng Rule 7 mục 3 (AGENTS.md).
 * Mermaid mặc định tô subgraph vàng và node tím, không dùng được cho sơ đồ nghiệp vụ.
 */
function themeVariables({ bg, fg, dark }) {
  if (dark) return {};
  const background = bg ?? '#ffffff';
  const foreground = fg ?? '#000000';
  return {
    background,
    primaryColor: background,
    secondaryColor: background,
    tertiaryColor: background,
    clusterBkg: background,
    edgeLabelBackground: background,
    primaryTextColor: foreground,
    secondaryTextColor: foreground,
    tertiaryTextColor: foreground,
    textColor: foreground,
    primaryBorderColor: foreground,
    clusterBorder: foreground,
    lineColor: foreground,
  };
}

/** Các cờ chỉ engine beautiful mới hiểu. Dùng với mmdc thì cảnh báo, không fail. */
export const BEAUTIFUL_ONLY_FLAGS = [
  'line', 'accent', 'muted', 'surface', 'border',
  'padding', 'nodeSpacing', 'layerSpacing', 'componentSpacing', 'interactive',
];

export function warnIgnoredFlags(opts, defaults) {
  const ignored = BEAUTIFUL_ONLY_FLAGS.filter(k => {
    const v = opts[k];
    if (v === undefined || v === null || v === false) return false;
    return defaults[k] === undefined || v !== defaults[k];
  });
  if (ignored.length > 0) {
    console.error(`[mmdc] Bỏ qua cờ chỉ dành cho engine beautiful: ${ignored.map(f => `--${f}`).join(', ')}`);
  }
}

/**
 * Render một file .mmd bằng mermaid-cli. Ném Error nếu mmdc thất bại.
 * Trả về đường dẫn output đã ghi.
 */
export function renderWithMmdc({ input, output, format, width, bg, fg, transparent, theme, font, chrome }) {
  const bin = mmdcBinary();
  if (!bin) {
    throw new Error(`Không tìm thấy mmdc. Chạy: cd ${skillRoot} && npm install`);
  }

  const tmp = mkdtempSync(join(tmpdir(), 'mmdc-'));
  try {
    const { theme: mermaidTheme, dark } = resolveMermaidTheme(theme);
    const puppeteerConfig = join(tmp, 'puppeteer.json');
    const mermaidConfig = join(tmp, 'mermaid.json');

    writeFileSync(puppeteerConfig, JSON.stringify({
      executablePath: chrome.path,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    }));

    writeFileSync(mermaidConfig, JSON.stringify({
      theme: mermaidTheme,
      themeVariables: {
        ...themeVariables({ bg, fg, dark }),
        ...(font && { fontFamily: `${font}, Helvetica, Arial, sans-serif` }),
      },
      flowchart: { htmlLabels: true, useMaxWidth: false },
    }));

    const args = ['-i', input, '-o', output, '-c', mermaidConfig, '-p', puppeteerConfig];
    args.push('-b', transparent ? 'transparent' : (bg ?? 'white'));
    if (format === 'png' && width) args.push('-w', String(width));

    const res = spawnSync(bin, args, { encoding: 'utf8', timeout: 120000 });
    if (res.error) throw res.error;
    if (res.status !== 0) {
      const detail = (res.stderr || res.stdout || '').trim();
      throw new Error(`mmdc thất bại (exit ${res.status}).\n${detail}`);
    }
    return output;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Quyết định engine sẽ dùng. Không bao giờ ném lỗi — thiếu Chrome thì lùi về beautiful
 * để lệnh vẫn chạy được, chỉ cảnh báo về hệ quả bố cục.
 *
 * Trả về {engine: 'mmdc'|'beautiful', chrome}.
 */
export function selectEngine({ requested, format, explicit }) {
  if (requested === 'beautiful') return { engine: 'beautiful', chrome: null };

  if (format === 'ascii') {
    if (explicit) {
      console.error('[mmdc] Engine mmdc không render được ASCII — dùng engine beautiful cho định dạng này.');
    }
    return { engine: 'beautiful', chrome: null };
  }

  if (!mmdcBinary()) {
    console.error(`[mmdc] Chưa cài @mermaid-js/mermaid-cli. Chạy: cd ${skillRoot} && npm install`);
    console.error('[mmdc] Tạm dùng engine beautiful.');
    return { engine: 'beautiful', chrome: null };
  }

  const chrome = resolveChrome();
  if (!chrome) {
    console.error('[mmdc] Không tìm thấy Chrome — lùi về engine beautiful.');
    console.error('[mmdc] Lưu ý: engine beautiful render sai bố cục flowchart LR có cạnh quay lại');
    console.error('[mmdc] (node đầu tiên bị đẩy sang phải, vi phạm Rule 7 mục 2).');
    console.error(CHROME_HELP);
    return { engine: 'beautiful', chrome: null };
  }

  return { engine: 'mmdc', chrome };
}
