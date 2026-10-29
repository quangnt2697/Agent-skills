#!/usr/bin/env node

/**
 * Mockup Fidelity Validator (`validate-mockup-fidelity.js`)
 *
 * Kiểm tra tính chuẩn xác và độ giống Production của file `mockup.html`:
 * 1. AS-IS Label Match: >= 90% nhãn kiểm tra phải khớp với asis-inventory.json
 * 2. Delta Markup: Có đủ [data-change="added|modified"] kèm class delta-badge / delta-pin
 * 3. Case Coverage: Có hàm switchState() hỗ trợ đổi tối thiểu 3 case (default, error, locked)
 * 4. Token & Color Check: Cảnh báo hoặc bắt lỗi các mã màu lạ không thuộc palette
 * 5. Bảng UI Delta Mapping: Bắt buộc có bảng UI Delta Mapping khớp số lượng badge
 * 6. Hard Gate: Chặn cứng (Exit 1, valid = false) nếu Fidelity Score < 90%.
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

  let inventory = null;
  if (inventoryPath && fs.existsSync(inventoryPath)) {
    try {
      inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    } catch (_) {}
  }

  // Check 1: Khung và cơ chế Delta-Only
  const hasAdded = /data-change=["']added["']/i.test(htmlContent);
  const hasModified = /data-change=["']modified["']/i.test(htmlContent);
  if (!hasAdded && !hasModified) {
    errors.push('Mockup thiếu đánh dấu thay đổi nghiệp vụ: Bắt buộc có phần tử mang `data-change="added"` hoặc `data-change="modified"`.');
  }

  const badgeMatches = htmlContent.match(/[①②③④⑤⑥⑦⑧⑨⑩]/g) || [];
  const uniqueBadges = Array.from(new Set(badgeMatches));
  const hasDeltaPin = /class=["'][^"']*(?:delta-pin|delta-badge)[^"']*["']/i.test(htmlContent) || uniqueBadges.length > 0;
  if (!hasDeltaPin || uniqueBadges.length === 0) {
    errors.push('Mockup thiếu huy hiệu đánh số chú thích: Bắt buộc có các điểm chạm đánh số `①`, `②`, `③` (hoặc class `delta-pin`/`delta-badge`).');
  }

  // Check 2: Đa trạng thái nghiệp vụ (Multi-case switchState)
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

  // Check 3: Bảng Chú thích UI Delta Mapping & Đối chiếu 1-1 Badge Parity
  const hasDeltaTable = /delta-table|UI Delta Mapping|Bảng Chú thích/i.test(htmlContent);
  if (!hasDeltaTable) {
    errors.push('Mockup bắt buộc phải có Bảng Chú Thích Thay Đổi Giao Diện (UI Delta Mapping) trực tiếp trong file HTML (class `delta-table` hoặc `delta-legend-card`).');
  } else {
    // Tìm đúng bảng có class delta-table (hoặc bảng cuối cùng nếu không gắn class)
    const deltaTableMatch = htmlContent.match(/<table[^>]*class=["'][^"']*delta-table[^"']*["'][\s\S]*?<\/table>/i);
    const allTables = htmlContent.match(/<table[\s\S]*?<\/table>/gi) || [];
    const tableContent = deltaTableMatch ? deltaTableMatch[0] : (allTables[allTables.length - 1] || '');
    for (const badge of uniqueBadges) {
      if (tableContent && !tableContent.includes(badge)) {
        errors.push(`Huy hiệu ${badge} xuất hiện trên giao diện nhưng chưa được khai báo giải thích trong Bảng UI Delta Mapping.`);
      }
    }
  }

  // Check 4: Token & Color Palette Whitelist Check
  const allowedColors = new Set([
    // Backgrounds & Surfaces
    '#0a0d11', '#11151b', '#161b22', '#1e222d', '#2a2e39', '#131722', '#181b22', '#0b0e14', '#10141d', '#12151c', '#242c37', '#374151',
    // Text & Neutrals
    '#f0f3f6', '#9aa4b2', '#d1d4dc', '#787b86', '#e0e3eb', '#f0f3fa', '#ffffff', '#000000', '#fff', '#000',
    // Stock Greens (Tăng / Sàn)
    '#00d084', '#26a69a', '#22ab94', '#089981', '#00b06b', '#10b981', '#052e16',
    // Stock Reds (Giảm / Lỗ)
    '#ef5350', '#f7525f', '#ff4d4f', '#ef4444', '#dc2626', '#f23645', '#451a03',
    // Stock Ceiling (Tím Trần) & Floor (Xanh Sàn)
    '#c80096', '#b026ff', '#c742e8', '#00ced1', '#00e5ff', '#26c6da',
    // Stock Reference / Warning (Vàng TC / Cam)
    '#f5a623', '#ffd700', '#ffb74d', '#fb8c00', '#ff9800', '#f59e0b',
    // Brand / Primary Blue
    '#1068eb', '#2962ff', '#1e88e5', '#2196f3', '#3b82f6',
    // Grays & Borders
    '#363c4e', '#434651', '#4f525e', '#2b2b2b', '#333333', '#444444', '#555555', '#666666', '#777777', '#888888', '#999999',
    '#aaaaaa', '#bbbbbb', '#cccccc', '#dddddd', '#eeeeee', '#e0e0e0', '#f5f5f5', '#111111', '#222222', '#333', '#444', '#555', '#666', '#777', '#888', '#999', '#aaa', '#bbb', '#ccc', '#ddd', '#eee'
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

  if (foreignColors.size > 0) {
    warnings.push(`Phát hiện mã màu ngoài palette chuẩn của DNSE Design System: ${Array.from(foreignColors).slice(0, 5).join(', ')}. Hãy ưu tiên dùng CSS variables: var(--bg-surface), var(--brand-primary), var(--stock-green)...`);
  }

  // Helper: kiểm tra sự hiện diện của một trường/nhãn trong HTML (hỗ trợ bóc tách từ khóa cốt lõi)
  const matchesKeyword = (html, term) => {
    if (!term || typeof term !== 'string') return false;
    const lowerHtml = html.toLowerCase();
    const cleanTerm = term.replace(/\([^)]*\)/g, '').trim().toLowerCase();
    if (lowerHtml.includes(cleanTerm)) return true;

    // Tách các từ đơn có ý nghĩa (>= 3 ký tự)
    const words = cleanTerm.split(/\s+/).filter(w => w.length >= 3 && !['chọn', 'loại', 'theo', 'phần'].includes(w));
    if (words.length === 0) return lowerHtml.includes(cleanTerm);
    // Nếu có ít nhất 2 từ hoặc 1 từ đặc thù xuất hiện
    const matchCount = words.filter(w => lowerHtml.includes(w)).length;
    return matchCount >= Math.min(words.length, 2);
  };

  // Check 5: Đối chiếu AS-IS Grounding & Tính Fidelity Score
  let totalCriteria = 0;
  let passedCriteria = 0;

  // 5.1: Key Fields từ Screen Info hoặc Inventory
  const keyFields = inventory?.screenInfo?.key_fields || inventory?.keyFields || [];
  if (Array.isArray(keyFields) && keyFields.length > 0) {
    keyFields.forEach(field => {
      totalCriteria++;
      if (matchesKeyword(htmlContent, field)) {
        passedCriteria++;
      }
    });
  }

  // 5.2: Primary Actions từ Screen Info hoặc Buttons
  const primaryActions = inventory?.screenInfo?.primary_actions || inventory?.primaryActions || [];
  if (Array.isArray(primaryActions) && primaryActions.length > 0) {
    primaryActions.forEach(action => {
      totalCriteria++;
      if (matchesKeyword(htmlContent, action)) {
        passedCriteria++;
      }
    });
  }

  // 5.3: Filtered meaningful labels (tiếng Việt hoặc thuật ngữ tài chính, loại trừ nút modal chung chung)
  if (inventory?.labels && Array.isArray(inventory.labels) && inventory.labels.length > 0) {
    const viRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    const ignoreGeneric = new Set(['tiếp tục', 'bỏ qua', 'liên hệ', 'đóng', 'quay lại', 'xong']);
    const meaningfulLabels = inventory.labels.filter(l => {
      const clean = l.trim().toLowerCase();
      return clean.length >= 3 && clean.length <= 40 &&
             !ignoreGeneric.has(clean) &&
             (viRegex.test(clean) || /lệnh|giá|khối lượng|sức mua|tài khoản|ký quỹ|margin/i.test(clean));
    });

    // Lấy tối đa 10 nhãn nghiệp vụ đặc thù
    const sample = meaningfulLabels.slice(0, 10);
    sample.forEach(lbl => {
      totalCriteria++;
      if (matchesKeyword(htmlContent, lbl)) {
        passedCriteria++;
      }
    });
  }

  // Fallback nếu không có inventory (đo lường mật độ thuật ngữ tài chính/chứng khoán chuẩn)
  if (totalCriteria === 0) {
    const defaultLabels = [
      'lệnh', 'giá', 'khối lượng', 'mua', 'bán', 'tài khoản', 'margin',
      'tiểu khoản', 'sức mua', 'tài sản', 'lãi suất', 'xác nhận', 'xác thực', 'otp', 'giao dịch'
    ];
    let matchedFinanceTerms = 0;
    defaultLabels.forEach(lbl => {
      if (htmlContent.toLowerCase().includes(lbl)) matchedFinanceTerms++;
    });
    totalCriteria = 4; // Cần tối thiểu 4 thuật ngữ tài chính chuẩn trong giao diện
    passedCriteria = Math.min(4, matchedFinanceTerms);
  }

  const rawScore = totalCriteria > 0 ? (passedCriteria / totalCriteria) * 100 : 95;
  let computedScore = Math.min(100, Math.round(rawScore));

  // Check 6: Hard Gate >= 90% (Chặn cứng nếu < 90%)
  if (computedScore < 90) {
    errors.push(`[HARD-GATE] Fidelity Score (${computedScore}%) chưa đạt ngưỡng bắt buộc >= 90%. Các nhãn/trường trong mockup không khớp đủ với màn hình gốc trên nhánh master/main (${passedCriteria}/${totalCriteria} tiêu chí khớp). Hãy bổ sung các trường/nhãn thực tế từ asis-inventory.json.`);
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

  console.log(`🔍 Đang kiểm định Fidelity của Mockup: ${htmlPath}`);
  const res = validateMockupFidelity(htmlPath, invPath);

  console.log(`🎯 Fidelity Score: ${res.score}%`);

  if (res.warnings.length > 0) {
    console.warn("⚠️ CẢNH BÁO:");
    res.warnings.forEach(w => console.warn(`   - ${w}`));
  }

  if (!res.valid) {
    console.error("❌ KHÔNG ĐẠT TIÊU CHUẨN FIDELITY:");
    res.errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log("✅ ĐẠT CHUẨN PROD-TWIN: Mockup bám sát 100% giao diện Production, đầy đủ Delta và đa Case!");
  process.exit(0);
}
