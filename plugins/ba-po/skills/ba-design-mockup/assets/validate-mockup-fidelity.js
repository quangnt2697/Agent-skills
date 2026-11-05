#!/usr/bin/env node

/**
 * Mockup Fidelity & Clean UI Validator (`validate-mockup-fidelity.js`)
 *
 * Kiểm tra tính chuẩn xác, độ phân giải Full HD và tính thuần khiết của file `mockup.html`:
 * 1. Highlight Phần Thiết Kế Mới: Bắt buộc đánh dấu `data-change="added"` hoặc `data-change="modified"` kèm CSS highlight trực quan để client dễ nhận biết phần mới so với thiết kế cũ.
 * 2. Cấm Ghi Chú QA/BA Trên Mockup: Nghiêm cấm gắn huy hiệu `① ② ③` (`delta-pin`, `delta-badge`), bảng `UI Delta Mapping` (`delta-table`), hoặc ghi chú cho QA/BA lên giao diện mockup.
 * 3. Độ Phân Giải Tối Thiểu Full HD (1920x1080) cho Web/Desktop: Cấm khóa cứng chiều rộng hẹp (1440px, 1180px).
 * 4. Case Coverage: Có hàm `switchState()` hỗ trợ tối thiểu 3 trạng thái (`default`, `error`, `locked`).
 * 5. AS-IS Label Match & Hard Gate: >= 90% nhãn kiểm tra khớp với `asis-inventory.json` (Fidelity Score >= 90%).
 *
 * Usage:
 *   node validate-mockup-fidelity.js <path-to-mockup.html> [path-to-asis-inventory.json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function validateMockupFidelity(htmlPath, inventoryPath) {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(htmlPath)) {
    return { valid: false, score: 0, errors: [`Không tìm thấy file mockup HTML: ${htmlPath}`], warnings };
  }

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  // Loại bỏ HTML comments và khối script khi kiểm tra các phần tử hiển thị trên giao diện
  const htmlWithoutComments = htmlContent.replace(/<!--[\s\S]*?-->/g, '');
  const htmlVisibleBody = htmlWithoutComments
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  let inventory = null;
  if (inventoryPath && fs.existsSync(inventoryPath)) {
    try {
      inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    } catch (_) {}
  }

  // Check 1: Highlight phần thiết kế mới / sửa đổi cho Client
  const hasAdded = /data-change=["']added["']/i.test(htmlWithoutComments);
  const hasModified = /data-change=["']modified["']/i.test(htmlWithoutComments);
  if (!hasAdded && !hasModified) {
    errors.push('Mockup thiếu đánh dấu highlight phần thiết kế mới: Bắt buộc có phần tử mang `data-change="added"` hoặc `data-change="modified"` để highlight phần thay đổi giúp client dễ nhận biết.');
  }

  const hasHighlightCss = /\[data-change=["']?(?:added|modified)["']?\][\s\S]*?(?:outline|border|box-shadow)/i.test(htmlWithoutComments);
  if ((hasAdded || hasModified) && !hasHighlightCss) {
    warnings.push('Nên định nghĩa CSS highlight (`outline`, `border` hoặc `box-shadow`) cho `[data-change="added"]` / `[data-change="modified"]` để client dễ nhận ra phần được thiết kế mới.');
  }

  // Check 2: CẤM ghi chú QA/BA, huy hiệu ① ② ③, và Bảng UI Delta Mapping trên Mockup
  const badgeMatches = htmlVisibleBody.match(/[①②③④⑤⑥⑦⑧⑨⑩]/g) || [];
  const hasDeltaPinElement = /class=["'][^"']*(?:delta-pin|delta-badge)[^"']*["']/i.test(htmlVisibleBody);
  if (badgeMatches.length > 0 || hasDeltaPinElement) {
    errors.push('Mockup chứa huy hiệu đánh số chú thích (`①`, `②`, `③` hoặc `delta-pin`/`delta-badge`). Trong mockup chỉ thiết kế giao diện theo yêu cầu của task và highlight phần mới, TUYỆT ĐỐI KHÔNG gắn ghi chú hay ký hiệu cho QA/BA.');
  }

  const hasDeltaTableElement = /class=["'][^"']*(?:delta-table|delta-legend-card)[^"']*["']/i.test(htmlVisibleBody) ||
    /UI Delta Mapping|Bảng Chú Thích Thay Đổi Giao Diện/i.test(htmlVisibleBody);
  if (hasDeltaTableElement) {
    errors.push('Mockup chứa Bảng Chú Thích Thay Đổi Giao Diện (`UI Delta Mapping` / `delta-table`). TUYỆT ĐỐI KHÔNG đưa bảng ghi chú của BA/QA vào trong mockup.');
  }

  // Check 3: Độ phân giải tối thiểu Full HD (1920x1080) cho Web/Desktop
  const isMobileMockup = /class=["'][^"']*(?:mobile-frame|mobile-mode)[^"']*["']/i.test(htmlWithoutComments) ||
    /content=["']width=393/i.test(htmlWithoutComments);
  if (!isMobileMockup) {
    const hasLegacy1440 = /width\s*:\s*1440px/i.test(htmlWithoutComments) ||
      /content=["']width=1440/i.test(htmlWithoutComments) ||
      /max-width\s*:\s*1180px/i.test(htmlWithoutComments);
    if (hasLegacy1440) {
      errors.push('Mockup Web/Desktop đang giới hạn chiều rộng dưới chuẩn Full HD (`1440px` hoặc `1180px`). Bắt buộc thiết kế ở độ phân giải tối thiểu Full HD (`1920x1080`).');
    }
  }

  // Check 4: Đa trạng thái nghiệp vụ (Multi-case switchState)
  const hasSwitchState = /function\s+switchState\s*\(/i.test(htmlContent) || /window\.switchState\s*=/i.test(htmlContent);
  if (!hasSwitchState) {
    errors.push('Mockup thiếu hàm JavaScript chuyển đổi trạng thái đa Case: `switchState(state)` (phục vụ render Case 1, Case 2, Case 3).');
  } else {
    const handlesError = /error|warning/i.test(htmlContent);
    const handlesLocked = /locked/i.test(htmlContent);
    const handlesDefault = /default/i.test(htmlContent) || /else/i.test(htmlContent);

    if (!handlesError) {
      errors.push('Hàm switchState() bắt buộc phải xử lý trạng thái lỗi/cảnh báo (`state === "error"`).');
    }
    if (!handlesLocked) {
      errors.push('Hàm switchState() bắt buộc phải xử lý trạng thái khóa phiên/biên (`state === "locked"`).');
    }
    if (!handlesDefault) {
      warnings.push('Hàm switchState() nên có nhánh khôi phục trạng thái chuẩn (`state === "default"` hoặc `else`).');
    }
  }

  // Check 5: Token & Color Palette Whitelist Check (Hỗ trợ cả Dark Theme Entrade X và Light Theme Ant Design / Dadmin)
  const allowedColors = new Set([
    // Dark Theme Backgrounds & Surfaces
    '#0a0d11', '#11151b', '#161b22', '#1e222d', '#2a2e39', '#131722', '#181b22', '#0b0e14', '#10141d', '#12151c', '#12161c', '#181d24', '#0d1117', '#0e1217', '#05070a', '#0c1016', '#1f2631', '#222933', '#282d35', '#242c37', '#374151',
    // Light Theme / Ant Design Backgrounds & Borders
    '#f0f2f5', '#f4f6f8', '#f5f5f5', '#f8fafc', '#f1f4f8', '#fafafa', '#f0f0f0', '#e5e7eb', '#d9d9d9', '#f6ffed', '#b7eb8f', '#fffbe6', '#ffe58f', '#fff1f0', '#ffa39e', '#e6f4ff', '#91caff',
    // Text & Neutrals
    '#f0f3f6', '#9aa4b2', '#d1d4dc', '#787b86', '#e0e3eb', '#f0f3fa', '#ffffff', '#000000', '#fff', '#000', '#5e6b7c', '#647082', '#434c59', '#111827', '#4b5563', '#9ca3af', '#d1d5db', '#595959', '#8c8c8c', '#262626', '#1f1f1f',
    // Stock Greens & Ant Success
    '#00d084', '#26a69a', '#22ab94', '#089981', '#00b06b', '#10b981', '#052e16', '#00ba75', '#52c41a', '#389e0d',
    // Stock Reds & Ant Error
    '#ef5350', '#f7525f', '#ff4d4f', '#ef4444', '#dc2626', '#f23645', '#451a03', '#e03e40', '#f87171', '#cf1322',
    // Stock Ceiling (Tím Trần) & Floor (Xanh Sàn)
    '#c80096', '#b026ff', '#c742e8', '#00ced1', '#00e5ff', '#26c6da',
    // Stock Reference / Warning (Vàng TC / Cam)
    '#f5a623', '#ffd700', '#ffb74d', '#fb8c00', '#ff9800', '#f59e0b', '#fbbf24', '#faad14', '#fa8c16', '#ffa940', '#d48806', '#d46b08',
    // Brand / Primary Blue
    '#1068eb', '#0c56c7', '#2962ff', '#1e88e5', '#2196f3', '#3b82f6', '#60a5fa', '#3d7fff', '#1677ff', '#1890ff', '#4096ff',
    // Grays & Borders
    '#363c4e', '#434651', '#4f525e', '#2b2b2b', '#333333', '#444444', '#555555', '#666666', '#777777', '#888888', '#999999',
    '#aaaaaa', '#bbbbbb', '#cccccc', '#dddddd', '#eeeeee', '#e0e0e0', '#111111', '#222222', '#333', '#444', '#555', '#666', '#777', '#888', '#999', '#aaa', '#bbb', '#ccc', '#ddd', '#eee'
  ]);

  if (inventory?.tokens?.colors) {
    Object.keys(inventory.tokens.colors).forEach(c => allowedColors.add(c.toLowerCase()));
  }

  const hexMatches = htmlContent.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  const foreignColors = new Set();
  hexMatches.forEach(h => {
    const norm = h.toLowerCase();
    if (!allowedColors.has(norm) && !norm.startsWith('#ffffff') && !norm.startsWith('#000000')) {
      foreignColors.add(norm);
    }
  });

  const isLiveDomSnapshot = /__inlined_computed_styles__|ant-design-pro/i.test(htmlContent);
  if (foreignColors.size > 0 && !isLiveDomSnapshot) {
    warnings.push(`Phát hiện mã màu ngoài palette chuẩn: ${Array.from(foreignColors).slice(0, 5).join(', ')}. Đảm bảo màu sắc được lấy từ codebase hoặc link thực tế của hệ thống.`);
  }

  // Helper: kiểm tra sự hiện diện của một trường/nhãn trong HTML
  const matchesKeyword = (html, term) => {
    if (!term || typeof term !== 'string') return false;
    const lowerHtml = html.toLowerCase();
    const cleanTerm = term.replace(/\([^)]*\)/g, '').trim().toLowerCase();
    if (lowerHtml.includes(cleanTerm)) return true;

    const words = cleanTerm.split(/\s+/).filter(w => w.length >= 3 && !['chọn', 'loại', 'theo', 'phần'].includes(w));
    if (words.length === 0) return lowerHtml.includes(cleanTerm);
    const matchCount = words.filter(w => lowerHtml.includes(w)).length;
    return matchCount >= Math.min(words.length, 2);
  };

  // Check 6: Đối chiếu AS-IS Grounding & Tính Fidelity Score
  let totalCriteria = 0;
  let passedCriteria = 0;

  const keyFields = inventory?.screenInfo?.key_fields || inventory?.keyFields || [];
  if (Array.isArray(keyFields) && keyFields.length > 0) {
    keyFields.forEach(field => {
      totalCriteria++;
      if (matchesKeyword(htmlContent, field)) {
        passedCriteria++;
      }
    });
  }

  const primaryActions = inventory?.screenInfo?.primary_actions || inventory?.primaryActions || [];
  if (Array.isArray(primaryActions) && primaryActions.length > 0) {
    primaryActions.forEach(action => {
      totalCriteria++;
      if (matchesKeyword(htmlContent, action)) {
        passedCriteria++;
      }
    });
  }

  if (inventory?.labels && Array.isArray(inventory.labels) && inventory.labels.length > 0) {
    const viRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    const ignoreGeneric = new Set(['tiếp tục', 'bỏ qua', 'liên hệ', 'đóng', 'quay lại', 'xong']);
    const meaningfulLabels = inventory.labels.filter(l => {
      const clean = l.trim().toLowerCase();
      return clean.length >= 3 && clean.length <= 40 &&
             !ignoreGeneric.has(clean) &&
             (viRegex.test(clean) || /lệnh|giá|khối lượng|sức mua|tài khoản|ký quỹ|margin|giao dịch|trạng thái|tìm kiếm/i.test(clean));
    });

    const sample = meaningfulLabels.slice(0, 10);
    sample.forEach(lbl => {
      totalCriteria++;
      if (matchesKeyword(htmlContent, lbl)) {
        passedCriteria++;
      }
    });
  }

  if (totalCriteria === 0) {
    const defaultLabels = [
      'lệnh', 'giá', 'khối lượng', 'mua', 'bán', 'tài khoản', 'margin',
      'tiểu khoản', 'sức mua', 'tài sản', 'lãi suất', 'xác nhận', 'xác thực', 'otp', 'giao dịch', 'trạng thái', 'tìm kiếm'
    ];
    let matchedFinanceTerms = 0;
    defaultLabels.forEach(lbl => {
      if (htmlContent.toLowerCase().includes(lbl)) matchedFinanceTerms++;
    });
    totalCriteria = 4;
    passedCriteria = Math.min(4, matchedFinanceTerms);
  }

  const rawScore = totalCriteria > 0 ? (passedCriteria / totalCriteria) * 100 : 95;
  const computedScore = Math.min(100, Math.round(rawScore));

  if (computedScore < 90) {
    errors.push(`[HARD-GATE] Fidelity Score (${computedScore}%) chưa đạt ngưỡng bắt buộc >= 90%. Các nhãn/trường trong mockup không khớp đủ với màn hình gốc (${passedCriteria}/${totalCriteria} tiêu chí khớp). Hãy bổ sung các trường/nhãn thực tế từ asis-inventory.json.`);
  }

  return {
    valid: errors.length === 0,
    score: computedScore,
    errors,
    warnings
  };
}

// CLI Execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: node validate-mockup-fidelity.js <path-to-mockup.html> [path-to-asis-inventory.json]");
    process.exit(1);
  }

  const htmlPath = path.resolve(args[0]);
  const invPath = args[1] ? path.resolve(args[1]) : '';

  console.log(`🔍 Đang kiểm định Fidelity & Clean UI của Mockup: ${htmlPath}`);
  const res = validateMockupFidelity(htmlPath, invPath);

  console.log(`🎯 Fidelity Score: ${res.score}%`);

  if (res.warnings.length > 0) {
    console.warn("⚠️ CẢNH BÁO:");
    res.warnings.forEach(w => console.warn(`   - ${w}`));
  }

  if (!res.valid) {
    console.error("❌ KHÔNG ĐẠT TIÊU CHUẨN MOCKUP:");
    res.errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log("✅ ĐẠT CHUẨN PROD-TWIN: Mockup đúng phong cách gốc, chuẩn Full HD, có highlight phần thiết kế mới và không chứa ghi chú QA/BA!");
  process.exit(0);
}
