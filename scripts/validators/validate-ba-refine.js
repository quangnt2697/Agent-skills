#!/usr/bin/env node

/**
 * Gate Validator cho ba-refine (`scripts/validators/validate-ba-refine.js`)
 *
 * Kiểm tra tính chuẩn xác tuyệt đối của tài liệu spec refine theo 8 mã Gate:
 * - GATE-KW-01:   Đã trích xuất từ khóa từ summary (`extractedKeywords` trong `source/jira-issue.json` hoặc `source/metadata.json` nếu tồn tại)
 * - GATE-TPL-01:  Đầy đủ 5 section chuẩn Jira (`## 🧩 User Story`, `## 💼 Business Context`,
 *                 `## ✅ Acceptance Criteria`, `## 🎨 UI Design / Mockup`, `## ☀️ Success Criteria & Tracking`)
 *                 và cấm dùng template 8 mục đánh số cũ (`## 1. Mục tiêu...`, `## 6. Tiêu chí...`)
 * - GATE-US-01:   Cấu trúc User Story (`**As a**`, `**I want**`, `**So that**`, không dùng role chung chung, không còn placeholder)
 * - GATE-AC-01:   Nghiêm cấm @tag trong Acceptance Criteria Gherkin (`@happy-path`, `@negative`, `@boundary`...)
 * - GATE-AC-02:   Nghiêm cấm tiền tố hoặc hậu tố [AC-x.y] / [AC] trong phần Acceptance Criteria
 * - GATE-AC-03:   Tối thiểu ≥ 3 Scenarios có Given/When/Then và tuân thủ phân loại (`Scenario: Happy - ...`, `Scenario: Validation - ...`, `Scenario: Edge - ...`)
 * - GATE-TECH-01: Bộ lọc chống kỹ thuật (Zero Technical Noise: cấm SQL, DB type, HTTP endpoint, `Technical Notes`)
 * - GATE-UI-01:   Kiểm tra Mục `## 🎨 UI Design / Mockup`: chỉ sử dụng ảnh mockup (`![...](...)`), cấm mô tả design bằng text hay ghi chú thêm; kiểm định `asis-inventory.md` và `validate-mockup-fidelity.js` khi là UI task.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMockupFidelity } from '../../plugins/ba-po/skills/ba-design-mockup/assets/validate-mockup-fidelity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function validateRefinedSpec(filePath, options = {}) {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      errors: [`Không tìm thấy file: ${filePath}`],
      warnings: []
    };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const isTemplateFile = path.basename(filePath) === 'jira-description-template.md' || Boolean(options.allowTemplatePlaceholders);

  // GATE-KW-01: Kiểm tra extractedKeywords trong source/jira-issue.json nếu nằm trong cấu trúc workspace/issues/{issueKey}/spec/
  const specDir = path.dirname(filePath);
  const issueRoot = path.dirname(specDir);
  const jiraIssueJsonPath = path.join(issueRoot, 'source', 'jira-issue.json');
  const metadataJsonPath = path.join(issueRoot, 'source', 'metadata.json');
  if (fs.existsSync(jiraIssueJsonPath)) {
    try {
      const jiraIssueData = JSON.parse(fs.readFileSync(jiraIssueJsonPath, 'utf8'));
      if (!Array.isArray(jiraIssueData.extractedKeywords) || jiraIssueData.extractedKeywords.length === 0) {
        errors.push('[GATE-KW-01] File `source/jira-issue.json` chưa có mảng `extractedKeywords` (bóc tách từ khóa từ tiêu đề task để tìm kiếm liên quan).');
      }
    } catch (_) {}
  } else if (fs.existsSync(metadataJsonPath)) {
    try {
      const metaData = JSON.parse(fs.readFileSync(metadataJsonPath, 'utf8'));
      if (metaData.extractedKeywords && (!Array.isArray(metaData.extractedKeywords) || metaData.extractedKeywords.length === 0)) {
        warnings.push('[GATE-KW-01] `source/metadata.json` chưa ghi nhận `extractedKeywords`.');
      }
    } catch (_) {}
  }

  // Rule 0: Không còn placeholder [...] hoặc placeholder mẫu chưa điền
  if (!isTemplateFile) {
    const templatePlaceholderRegex = /\[(?:\.\.\.|chưa\s+điền|role\/persona\s+cụ\s+thể|hành\s+động\/tính\s+năng\s+mong\s+muốn|giá\s+trị\/lợi\s+ích\s+kinh\s+doanh\s+đạt\s+được|Tên\s+tính\s+năng\s+nghiệp\s+vụ|KPI\s+\d+|baseline|target)\]/i;
    lines.forEach((line, idx) => {
      if (templatePlaceholderRegex.test(line)) {
        errors.push(`[GATE-US-01] Dòng ${idx + 1}: Chứa placeholder chưa hoàn thiện: "${line.trim()}"`);
      }
    });
  }

  // GATE-TPL-01: Cấm dùng cấu trúc 8 mục đánh số cũ và bắt buộc 5 section chuẩn Jira
  const legacyNumberedHeading = content.match(/^##\s*[1-8]\.\s*(?:Mục tiêu|Đối tượng|Phạm vi|Quy tắc|Luồng|Tiêu chí|Giả định|Thiết kế)[^\n]*/im);
  if (legacyNumberedHeading) {
    errors.push(`[GATE-TPL-01] Phát hiện heading đánh số kiểu cũ ("${legacyNumberedHeading[0].trim()}"). Bắt buộc dùng đúng khung 5 phần chuẩn Jira (` +
      '`## 🧩 User Story`, `## 💼 Business Context`, `## ✅ Acceptance Criteria`, `## 🎨 UI Design / Mockup`, `## ☀️ Success Criteria & Tracking`).');
  }

  const requiredSections = [
    { regex: /^##\s*(?:🧩\s*)?User Story\b/im, label: '## 🧩 User Story' },
    { regex: /^##\s*(?:💼\s*)?Business Context\b/im, label: '## 💼 Business Context' },
    { regex: /^##\s*(?:✅\s*)?Acceptance Criteria\b/im, label: '## ✅ Acceptance Criteria' },
    { regex: /^##\s*(?:🎨\s*)?UI Design\s*\/\s*Mockup\b/im, label: '## 🎨 UI Design / Mockup' },
    { regex: /^##\s*(?:☀️\s*)?Success Criteria\s*&\s*Tracking\b/im, label: '## ☀️ Success Criteria & Tracking' }
  ];

  requiredSections.forEach(sec => {
    if (!sec.regex.test(content)) {
      errors.push(`[GATE-TPL-01] Thiếu section bắt buộc theo chuẩn Jira template: \`${sec.label}\``);
    }
  });

  // GATE-US-01: Kiểm tra chi tiết User Story
  const hasUserStory = /^##\s*(?:🧩\s*)?User Story\b/im.test(content);
  if (hasUserStory) {
    const hasAsA = /\*\*As a\*\*\s*([^\n]+)/i.test(content) || /As a\s+\*\*([^\n*]+)\*\*/i.test(content) || /Là một\s*([^\n]+)/i.test(content);
    const hasIWant = /\*\*I want\*\*\s*([^\n]+)/i.test(content) || /I want\s+\*\*([^\n*]+)\*\*/i.test(content) || /Tôi muốn\s*([^\n]+)/i.test(content);
    const hasSoThat = /\*\*So that\*\*\s*([^\n]+)/i.test(content) || /So that\s+\*\*([^\n*]+)\*\*/i.test(content) || /Để\s*([^\n]+)/i.test(content);

    if (!hasAsA || !hasIWant || !hasSoThat) {
      errors.push('[GATE-US-01] Section User Story bắt buộc phải có đầy đủ: `**As a** [role]`, `**I want** [action]`, `**So that** [value]`');
    }

    const roleMatch = content.match(/\*\*As a\*\*\s*([^\n]+)/i) || content.match(/As a\s+\*\*([^\n*]+)\*\*/i);
    if (roleMatch && !isTemplateFile) {
      const role = roleMatch[1].replace(/\*/g, '').replace(/,/g, '').trim().toLowerCase();
      if (role === 'người dùng' || role === 'user' || role === 'khách hàng') {
        errors.push(`[GATE-US-01] Role trong User Story quá chung chung: "${role}". Bắt buộc nêu rõ persona cụ thể (VD: Nhà đầu tư cá nhân, Trader chuyên nghiệp, Quản trị viên...)`);
      }
    }
  }

  // GATE-AC-01, GATE-AC-02, GATE-AC-03: Kiểm tra khối Gherkin
  const gherkinMatch = content.match(/```gherkin([\s\S]*?)```/i);
  if (!gherkinMatch) {
    errors.push('[GATE-AC-03] Acceptance Criteria bắt buộc phải được đặt trong codeblock ```gherkin ... ```');
  } else {
    const gherkinContent = gherkinMatch[1];
    const gherkinLines = gherkinContent.split('\n');

    // GATE-AC-01: CẤM @tags trong gherkin của refine spec
    gherkinLines.forEach(gLine => {
      if (/^\s*@[a-zA-Z0-9_-]+/.test(gLine)) {
        errors.push(`[GATE-AC-01] Acceptance Criteria không được chứa automation tags: "${gLine.trim()}". Các tags này thuộc về QA test code, không đưa lên Jira Description.`);
      }
    });

    // GATE-AC-02: CẤM [AC-x.y] hoặc [AC] ở bất kỳ dòng nào trong khối Gherkin
    gherkinLines.forEach(gLine => {
      if (/\[AC(?:-\d+(?:\.\d+)?)?\]/i.test(gLine)) {
        errors.push(`[GATE-AC-02] Acceptance Criteria không được gắn tag mã [AC]: "${gLine.trim()}". Hãy dùng định dạng chuẩn: Scenario: Happy - ..., Scenario: Validation - ..., Scenario: Edge - ...`);
      }
    });

    // GATE-AC-03: Kiểm tra số lượng Scenario, phân loại Happy/Validation/Edge và Given/When/Then
    const scenarioLines = gherkinLines
      .map(l => l.trim())
      .filter(l => /^Scenario(?:\s+Outline)?\s*:/i.test(l));

    if (scenarioLines.length < 3) {
      errors.push(`[GATE-AC-03] Acceptance Criteria cần tối thiểu 3 scenarios (Happy, Validation, Edge). Hiện có: ${scenarioLines.length}`);
    }

    scenarioLines.forEach(sLine => {
      if (!/^Scenario(?:\s+Outline)?\s*:\s*(?:Happy|Validation|Edge)\s*-\s*\S+/i.test(sLine)) {
        errors.push(`[GATE-AC-03] Tiêu đề Scenario chưa đúng chuẩn phân loại ("${sLine}"). Bắt buộc dùng tiền tố: \`Scenario: Happy - ...\`, \`Scenario: Validation - ...\`, hoặc \`Scenario: Edge - ...\``);
      }
    });

    if (!/\bGiven\b/i.test(gherkinContent) || !/\bWhen\b/i.test(gherkinContent) || !/\bThen\b/i.test(gherkinContent)) {
      errors.push('[GATE-AC-03] Kịch bản Gherkin bắt buộc phải có đầy đủ các mệnh đề Given, When, Then.');
    }
  }

  // Ngoài khối Gherkin, kiểm tra xem trong section Acceptance Criteria có gắn [AC-x.y] thừa không
  const acSectionMatch = content.match(/##\s*(?:✅\s*)?Acceptance Criteria[\s\S]*?(?=\n##\s|$)/i);
  if (acSectionMatch && /\[AC(?:-\d+(?:\.\d+)?)?\]/i.test(acSectionMatch[0])) {
    if (!errors.some(e => e.includes('[GATE-AC-02]'))) {
      errors.push('[GATE-AC-02] Section Acceptance Criteria chứa mã tag `[AC]` hoặc `[AC-x.y]` dư thừa.');
    }
  }

  // GATE-TECH-01: Bộ lọc chống kỹ thuật (Zero Technical Noise)
  const forbiddenTechPatterns = [
    { pattern: /\b(?:SELECT|INSERT|UPDATE|DELETE)\s+.*FROM\b/i, name: 'Câu lệnh SQL' },
    { pattern: /\b(?:varchar|int64|bigint|jsonb|nvarchar)\b/i, name: 'Kiểu dữ liệu cơ sở dữ liệu' },
    { pattern: /\b(?:POST|GET|PUT|DELETE|PATCH)\s+\/(?:api|internal|v1|v2)\//i, name: 'HTTP REST Endpoint path' },
    { pattern: /##\s*(?:🧱\s*)?Technical Notes/i, name: 'Technical Notes section' }
  ];

  forbiddenTechPatterns.forEach(item => {
    if (item.pattern.test(content)) {
      errors.push(`[GATE-TECH-01] Vi phạm Bộ lọc Chống Kỹ thuật (Zero Technical Noise): Phát hiện ${item.name}. Hãy diễn đạt bằng ngôn ngữ thuần nghiệp vụ.`);
    }
  });

  // GATE-UI-01: Kiểm tra mục ## 🎨 UI Design / Mockup (Chỉ sử dụng ảnh mockup, không mô tả bằng text, không ghi chú gì thêm)
  const uiSectionMatch = content.match(/(?:^|\n)##\s*(?:🎨\s*)?UI Design\s*\/\s*Mockup[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i);
  if (uiSectionMatch) {
    const uiBodyClean = uiSectionMatch[1].replace(/<!--[\s\S]*?-->/g, '').trim();
    const uiNonEmptyLines = uiBodyClean.split('\n').map(l => l.trim()).filter(Boolean);

    const isBackendNA = uiNonEmptyLines.length === 1 && /^N\/A\b/i.test(uiNonEmptyLines[0]);
    if (!isBackendNA) {
      const imageLines = uiNonEmptyLines.filter(l => /^!\[[^\]]*\]\([^)]+\)$/.test(l));
      const nonImageLines = uiNonEmptyLines.filter(l => !/^!\[[^\]]*\]\([^)]+\)$/.test(l));

      if (imageLines.length === 0) {
        errors.push('[GATE-UI-01] Mục `## 🎨 UI Design / Mockup` bắt buộc phải nhúng ảnh mockup (`![...](...)`) hoặc ghi `N/A` nếu là task backend.');
      }

      if (nonImageLines.length > 0) {
        errors.push(`[GATE-UI-01] Mục \`## 🎨 UI Design / Mockup\` chỉ được phép chứa ảnh mockup, TUYỆT ĐỐI KHÔNG mô tả design bằng text hoặc ghi chú thêm. Phát hiện dòng dư thừa: "${nonImageLines[0]}"`);
      }
    }
  }

  // Kiểm tra nâng cao khi truyền cờ --ui (isUiTask)
  if (options.isUiTask) {
    const asisPath = path.join(specDir, 'asis-inventory.md');
    const asisJsonPath = path.join(specDir, 'asis-inventory.json');
    const mockupHtmlPath = path.join(specDir, 'diagrams', 'mockup.html');

    if (!fs.existsSync(asisPath)) {
      errors.push(`[GATE-UI-01] Task giao diện (WEB/APP) thiếu file bắt buộc: ${asisPath}`);
    }

    if (!fs.existsSync(asisJsonPath)) {
      warnings.push(`[GATE-UI-01] Chưa tìm thấy file ${asisJsonPath} sinh từ ba-design-mockup.`);
    }

    if (fs.existsSync(mockupHtmlPath)) {
      const fidelityRes = validateMockupFidelity(mockupHtmlPath, fs.existsSync(asisJsonPath) ? asisJsonPath : '');
      if (!fidelityRes.valid) {
        fidelityRes.errors.forEach(err => {
          errors.push(`[GATE-UI-01] ${err}`);
        });
      }
      if (fidelityRes.warnings && fidelityRes.warnings.length > 0) {
        fidelityRes.warnings.forEach(warn => {
          warnings.push(`[GATE-UI-01] ${warn}`);
        });
      }
    }

    if (options.stage === 'push' || options.isPushStage) {
      const diagramsDir = path.dirname(mockupHtmlPath);
      const case1Png = path.join(diagramsDir, 'mockup-case-1.png');
      const case2Png = path.join(diagramsDir, 'mockup-case-2.png');
      const case3Png = path.join(diagramsDir, 'mockup-case-3.png');
      const mainPng = path.join(diagramsDir, 'mockup.png');

      const hasCaseImages = fs.existsSync(case1Png) && fs.existsSync(case2Png) && fs.existsSync(case3Png);
      if (!hasCaseImages && !fs.existsSync(mainPng)) {
        errors.push(`[GATE-UI-01] Chưa tìm thấy ảnh render mockup trong ${diagramsDir}. Hãy chạy render-mockup.js.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// CLI Execution
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: node validate-ba-refine.js <path-to-refined.md> [--ui] [--allow-placeholders]");
    process.exit(1);
  }

  const targetPath = path.resolve(args[0]);
  const isUi = args.includes('--ui');
  const allowPlaceholders = args.includes('--allow-placeholders');

  console.log(`🔍 Đang kiểm tra chất lượng spec: ${targetPath}`);
  const result = validateRefinedSpec(targetPath, {
    isUiTask: isUi,
    allowTemplatePlaceholders: allowPlaceholders
  });

  if (result.warnings.length > 0) {
    console.warn("⚠️ CẢNH BÁO:");
    result.warnings.forEach(w => console.warn(`   - ${w}`));
  }

  if (!result.valid) {
    console.error("❌ PHÁT HIỆN LỖI (CẤM QUA GATE):");
    result.errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log("✅ ĐẠT CHUẨN 100%: Spec tuân thủ chính xác template Jira, không rò rỉ mã tag và đạt chuẩn nghiệp vụ!");
  process.exit(0);
}
