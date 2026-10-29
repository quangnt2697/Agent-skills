#!/usr/bin/env node

/**
 * AS-IS UI Extractor (`extract-asis-ui.js`)
 *
 * Tự động bóc tách đệ quy thông tin màn hình gốc trực tiếp từ origin/master hoặc origin/main
 * của dnse-trading (React .tsx) hoặc arrow-app (Flutter .dart).
 * Trích xuất:
 * - Tiêu đề, nhãn trường (labels), nút bấm (buttons), tabs, placeholders từ toàn bộ cây thư mục
 * - Đọc trực tiếp Design Tokens từ color.ts hoặc color_scheme.dart
 *
 * Xuất ra:
 * 1. asis-inventory.json (máy đọc để validator đối chiếu)
 * 2. asis-inventory.md (người đọc cho BA/PO và QA)
 *
 * Usage:
 *   node extract-asis-ui.js --project <web-trading|mobile-trading> --screen <ScreenKey> --output <dir>
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc danh mục screens từ references/ui-component-map.json
const uiMapPath = path.resolve(__dirname, '../references/ui-component-map.json');
let uiMap = {};
if (fs.existsSync(uiMapPath)) {
  try {
    uiMap = JSON.parse(fs.readFileSync(uiMapPath, 'utf8'));
  } catch (_) {}
}

const args = process.argv.slice(2);
let projectKey = 'web-trading';
let screenKey = 'OrderForm';
let outputDir = process.cwd();

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project' && args[i + 1]) projectKey = args[++i];
  if (args[i] === '--screen' && args[i + 1]) screenKey = args[++i];
  if (args[i] === '--output' && args[i + 1]) outputDir = path.resolve(args[++i]);
}

// Xác định root của project
let projectRoot = '';
const projectsConfigPath = path.resolve(__dirname, '../../../../../config/projects.json');
if (fs.existsSync(projectsConfigPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(projectsConfigPath, 'utf8'));
    projectRoot = cfg[projectKey] || '';
  } catch (_) {}
}

if (!projectRoot) {
  if (projectKey === 'web-trading') projectRoot = '/Users/qa-quangnt/Projects/Entrade Trading/dnse-trading';
  else projectRoot = '/Users/qa-quangnt/Projects/Entrade Trading/mobile/arrow-app';
}

console.log(`🔍 Bắt đầu bóc tách AS-IS UI từ codebase: ${projectKey} -> Màn hình: ${screenKey}`);
console.log(`📁 Project Root: ${projectRoot}`);

// Lấy thông tin màn hình từ ui-component-map.json
const screenInfo = (projectKey === 'web-trading')
  ? (uiMap.web_trading?.screens?.[screenKey] || {})
  : (uiMap.mobile_trading?.screens?.[screenKey] || {});

const sourceDirsOrFiles = screenInfo.source_files || [];
const primaryActions = screenInfo.primary_actions || [];
const keyFields = screenInfo.key_fields || [];

// Tìm remote branch hợp lệ (origin/master hoặc origin/main hoặc HEAD)
let masterRef = 'HEAD';
const candidateRefs = ['origin/main', 'origin/master', 'main', 'master', 'HEAD'];
for (const cr of candidateRefs) {
  try {
    execSync(`git -C "${projectRoot}" rev-parse --verify "${cr}" 2>/dev/null`, { encoding: 'utf8' });
    masterRef = cr;
    break;
  } catch (_) {}
}

let commitHash = 'UNKNOWN';
try {
  commitHash = execSync(`git -C "${projectRoot}" rev-parse "${masterRef}" 2>/dev/null`, { encoding: 'utf8' }).trim();
} catch (_) {}

console.log(`📌 Source Reference: ${masterRef} | Commit: ${commitHash.substring(0, 8)}`);

const extractedLabels = new Set();
const extractedButtons = new Set();
const conditionalLocks = [];
const filesRead = [];

const VI_CHAR_REGEX = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const TRADING_TERMS_REGEX = /lệnh|giá|khối lượng|mua|bán|hủy|sửa|tiểu khoản|tài khoản|ký quỹ|margin|sức mua|hạn mức|phí|thuế|lãi suất|phiên|khớp|xác nhận|từ chối/i;

// 1. Quét đệ quy toàn bộ file nguồn trong các source_files
for (const targetPath of sourceDirsOrFiles) {
  let matchedFiles = [];
  try {
    // Thử dùng git ls-tree -r để lấy toàn bộ file con nếu là thư mục
    const treeOut = execSync(`git -C "${projectRoot}" ls-tree -r --name-only "${masterRef}" "${targetPath}" 2>/dev/null`, { encoding: 'utf8' });
    if (treeOut) {
      matchedFiles = treeOut.split('\n').map(s => s.trim()).filter(f => /\.(tsx?|dart)$/i.test(f));
    }
  } catch (_) {}

  // Fallback nếu là file lẻ
  if (matchedFiles.length === 0) {
    const candidates = [
      targetPath, `${targetPath}.tsx`, `${targetPath}/index.tsx`,
      `${targetPath}.dart`, `${targetPath}/index.dart`
    ];
    for (const c of candidates) {
      try {
        const check = execSync(`git -C "${projectRoot}" rev-parse --verify "${masterRef}:${c}" 2>/dev/null`, { encoding: 'utf8' });
        if (check) { matchedFiles.push(c); break; }
      } catch (_) {}
    }
  }

  for (const filePath of matchedFiles.slice(0, 15)) {
    try {
      const fileContent = execSync(`git -C "${projectRoot}" show "${masterRef}:${filePath}" 2>/dev/null`, { encoding: 'utf8' });
      if (fileContent) {
        filesRead.push({ file: filePath, lines: fileContent.split('\n').length });

        // 1.1 Trích xuất các chuỗi nhãn giao diện tiếng Việt & thuật ngữ tài chính thực tế
        const stringMatches = fileContent.match(/["'`]([^"'`\n]{2,50})["'`]/g) || [];
        stringMatches.forEach(m => {
          const clean = m.slice(1, -1).trim();
          // Lọc bỏ chuỗi code, URL, CSS, hằng số lỗi API, biến nội bộ
          if (
            clean &&
            !clean.includes('http') &&
            !clean.includes('/') &&
            !clean.includes('{') &&
            !clean.includes(';') &&
            !clean.includes('px') &&
            !clean.includes('rem') &&
            !/^[A-Z0-9_-]+$/.test(clean) && // Bỏ qua CONSTANT_CASE hoặc BROKER-API-035
            !/^[0-9\s%.,+-]+$/.test(clean) && // Bỏ qua chỉ số thuần số hoặc 1 1 0%
            (VI_CHAR_REGEX.test(clean) || TRADING_TERMS_REGEX.test(clean))
          ) {
            extractedLabels.add(clean);
          }
        });

        // 1.2 Trích xuất button / nút bấm
        const btnMatches = fileContent.match(/<Button[^>]*>([^<]+)<\/Button>/gi) ||
                           fileContent.match(/Text\(['"]([A-ZÀ-Ỹ][^'"]+)['"]\)/g) || [];
        btnMatches.forEach(bm => {
          const cleanBtn = bm.replace(/<[^>]+>/g, '').replace(/Text\(['"]/, '').replace(/['"]\)/, '').trim();
          if (cleanBtn && cleanBtn.length >= 2 && cleanBtn.length <= 30 && (VI_CHAR_REGEX.test(cleanBtn) || TRADING_TERMS_REGEX.test(cleanBtn))) {
            extractedButtons.add(cleanBtn);
          }
        });

        // 1.3 Trích xuất điều kiện khóa nút/input (disabled / conditional locks)
        const disabledMatches = fileContent.match(/disabled=\{([^}]+)\}/g) || fileContent.match(/disabled:\s*([^,\n]+)/g) || [];
        disabledMatches.slice(0, 3).forEach(dm => {
          const cond = dm.replace(/disabled=\{?/, '').replace(/\}?$/, '').trim();
          if (cond && !conditionalLocks.some(item => item.condition === cond)) {
            conditionalLocks.push({ file: filePath, condition: cond });
          }
        });
      }
    } catch (_) {}
  }
}

// 2. Đọc Design Tokens thực tế từ codebase
const tokens = {
  colors: {},
  fontFamily: 'Inter, -apple-system, sans-serif'
};

const tokenCandidates = [
  'libs/ui/src/theme/color.ts',
  'libs/ui/src/theme/enColor.ts',
  'lib/theme/color_scheme.dart',
  'lib/theme/color_utils.dart'
];

for (const tc of tokenCandidates) {
  try {
    const tContent = execSync(`git -C "${projectRoot}" show "${masterRef}:${tc}" 2>/dev/null`, { encoding: 'utf8' });
    if (tContent) {
      const hexMatches = tContent.match(/#[0-9a-fA-F]{6}\b/g) || [];
      hexMatches.slice(0, 10).forEach(h => {
        tokens.colors[h.toLowerCase()] = tc;
      });
      break;
    }
  } catch (_) {}
}

// Bổ sung các fields và actions chuẩn từ dictionary nếu chưa quét đủ
keyFields.forEach(f => extractedLabels.add(f));
primaryActions.forEach(a => extractedButtons.add(a));

const finalLabels = Array.from(extractedLabels).slice(0, 40);
const finalButtons = Array.from(extractedButtons).slice(0, 15);

const inventoryData = {
  projectKey,
  screenKey,
  vietnameseName: screenInfo.vietnamese_name || screenKey,
  layout: screenInfo.layout || 'TwoColumnTrading',
  sourceBranch: masterRef,
  commitHash,
  extractedAt: new Date().toISOString(),
  filesRead,
  labels: finalLabels,
  buttons: finalButtons,
  primaryActions,
  keyFields,
  conditionalLocks,
  tokens
};

fs.mkdirSync(outputDir, { recursive: true });

// 1. Ghi file JSON
const jsonPath = path.join(outputDir, 'asis-inventory.json');
fs.writeFileSync(jsonPath, JSON.stringify(inventoryData, null, 2), 'utf8');

// 2. Ghi file Markdown
const mdContent = `# AS-IS UI Inventory — ${screenKey} (${screenInfo.vietnamese_name || screenKey})

> 🛡️ Bóc tách tự động đệ quy từ \`${masterRef}\` @ \`${commitHash.substring(0, 8)}\`.
> Mọi thành phần trong \`mockup.html\` BẮT BUỘC có nguồn gốc từ tài liệu này.

## Metadata Màn hình Gốc
- **Dự án:** \`${projectKey}\`
- **Màn hình:** \`${screenKey}\` (${screenInfo.vietnamese_name || ''})
- **Bố cục khung (Layout Pattern):** ${inventoryData.layout}
- **Commit hash nguồn:** \`${commitHash}\`

## Danh Sách Source Files Đã Quét (${filesRead.length} files)
| File trên ${masterRef} | Số dòng code |
|---|---|
${filesRead.map(f => `| \`${f.file}\` | ${f.lines} |`).join('\n') || '| (Sử dụng từ điển Component Map chuẩn) | - |'}

## AS-IS DOM Elements (Nhãn & Trường Dữ Liệu Thực Tế)
| Loại | Tên nhãn tiếng Việt thực tế trên Prod |
|---|---|
${finalLabels.map((lbl, idx) => `| Trường thông tin | **${lbl}** |`).join('\n')}
${finalButtons.map(btn => `| Thao tác / Nút | **${btn}** |`).join('\n')}

## Trạng Thái Khóa / Vô Hiệu Hóa Thực Tế (Conditional Locks — Cơ sở cho Case 3: Locked)
| File nguồn | Điều kiện khóa (\`disabled\`) |
|---|---|
${conditionalLocks.map(c => `| \`${c.file}\` | \`${c.condition}\` |`).join('\n') || '| (Không phát hiện biểu thức disabled tĩnh) | - |'}

## Ranh Giới Chống Bịa Đặt Giao Diện (Zero Hallucination Rules)
1. Chỉ được phép tái sử dụng các nhãn trong bảng trên làm khung nền mờ (\`class="as-is-context"\`).
2. Mọi điểm thay đổi hoặc thêm mới BẮT BUỘC gắn viền nhấn \`data-change="added|modified"\` kèm huy hiệu \`①\`, \`②\`, \`③\`.
3. Script \`validate-mockup-fidelity.js\` sẽ kiểm tra đối chiếu trực tiếp file này với \`mockup.html\`.
`;

const mdPath = path.join(outputDir, 'asis-inventory.md');
fs.writeFileSync(mdPath, mdContent, 'utf8');

console.log(`✅ Đã xuất bản AS-IS Inventory:`);
console.log(`   - JSON: ${jsonPath}`);
console.log(`   - MD:   ${mdPath}`);
console.log(`   - Đã quét ${filesRead.length} files, trích xuất ${finalLabels.length} nhãn & ${finalButtons.length} nút bấm.`);
