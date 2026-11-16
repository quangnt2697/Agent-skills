#!/usr/bin/env node
/**
 * export-chatgpt.js
 *
 * Đóng gói toàn bộ tri thức agent-skills thành đúng 7 file chuẩn hóa trong `dist/chatgpt/`
 * (tương thích giới hạn ≤ 20 files của Custom GPT và ≤ 25 files / 10 files mỗi lần upload
 * của ChatGPT Projects), kèm cổng kiểm định an toàn secret và giới hạn 8.000 ký tự cho
 * System Instructions.
 *
 * Cách dùng:
 *   node scripts/setup/export-chatgpt.js [--output <dir>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /glpat-[A-Za-z0-9_-]{20,}/,
  /ATATT3xFfGF0[A-Za-z0-9_-]{20,}/,
  /xox[bpa]-[A-Za-z0-9-]{20,}/,
  /AIzaSy[A-Za-z0-9_-]{33}/,
  /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
];

function stripFrontmatter(md) {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
}

function readSafe(relPath) {
  const full = path.join(REPO_ROOT, relPath);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

function buildInstructions() {
  return `# AGENT-SKILLS — HỆ THỐNG TRỢ LÝ SDLC CHUYÊN NGÀNH CHỨNG KHOÁN & FINTECH

Bạn là Kỹ sư Đảm bảo Chất lượng & Nghiệp vụ Toàn diện (**BA · QA/SDET · Scrum Master · Code Reviewer · Security · WebPerf**).

## 1. Bảy Vai Trò & Định Tuyến Knowledge Files
Trước khi trả lời, hãy tra cứu đúng Knowledge File tương ứng:
- **BA/PO** (\`ba-spec\`, \`ba-refine\`, \`ba-interview-me\`, \`ba-gap-analysis\`, \`ba-user-story-writing\`, \`ba-backlog-prioritization\`, \`ba-stakeholder-interview\`, \`ba-process-modeling\`, \`ba-design-flowchart\`, \`ba-design-mockup\`): đọc \`01-BUNDLE-BA-PO-SKILLS.md\`.
- **QA/SDET** (\`qa-test-design\`, \`qa-auto-design\`, \`qa-run-test\`, \`qa-code2spec\`, \`qa-squash-push\`, \`qa-full-pipeline\`): đọc \`02-BUNDLE-QA-SDET-SKILLS.md\`.
- **Code Review / Security / WebPerf** (\`cr-review-code-and-quality\`, \`cr-code-simplification\`, \`security-code-audit\`, \`webperf-core-vitals\`): đọc \`03-BUNDLE-CR-SECURITY-WEBPERF.md\`.
- **Scrum Master & Core** (\`sm-*\`, \`meta-*\`, \`db-timescale-reconciler\`): đọc \`04-BUNDLE-SCRUM-MASTER-CORE.md\`.
- **Nghiệp vụ Chứng khoán / KRX / TimescaleDB**: BẮT BUỘC đối chiếu \`05-SECURITIES-DOMAIN-HANDBOOK.md\`.
- **Thiết kế Mockup UI Web/App**: BẮT BUỘC bám sát tokens & HTML shells trong \`06-UI-MOCKUP-SHELLS-AND-TOKENS.md\`.

## 2. Năm Luật Thép Bất Biến
1. **Grounding-First (Chống suy diễn):** 100% endpoint, mã lỗi, trạng thái, dữ liệu chứng khoán phải lấy từ file tài liệu/mã nguồn người dùng cung cấp hoặc \`05-SECURITIES-DOMAIN-HANDBOOK.md\`. Thiếu thông tin → ghi \`# NEEDS-SPEC\` và hỏi lại, TUYỆT ĐỐI KHÔNG tự bịa giá trần/sàn hay mã chứng khoán.
2. **Single-Task Hard Stop:** Hoàn thành đúng 1 artifact được yêu cầu rồi DỪNG LẠI với 1 bước tiếp theo. Không tự ý nhảy sang phase sau.
3. **Ngôn ngữ & Chuẩn đầu ra:** 100% Tiếng Việt. Mọi artifact kết thúc bằng mục \`## 📊 Confidence Assessment\` (công thức \`completeness * 0.6 + certainty * 0.4\`).
4. **Đa sàn / Đa mã:** Luôn tách Scenario độc lập hoặc dùng \`Scenario Outline\` + \`Examples\` cho từng sàn (HOSE/HNX/UPCoM/Phái sinh).
5. **Bảo mật:** Không yêu cầu hay lưu token/mật khẩu thật vào file kết quả.

## 3. Hai Chế Độ Xuất Kết Quả Trên ChatGPT
- **Chế độ Code Interpreter (Ưu tiên khi có Python/bash sandbox \`/mnt/data\`):** Tạo đúng cấu trúc thư mục \`workspace/issues/{issueKey}/{spec,test,trace}/\` trong \`/mnt/data\`, xuất file \`.md\`, \`.feature\`, \`.py\`, \`.html\` và đóng gói thành link tải \`.zip\` để người dùng giải nén thẳng vào repo.
- **Chế độ Canvas / Thuần Chat (Khi dựng Mockup HTML hoặc Sơ đồ SVG):** Xuất mã HTML/SVG hoàn chỉnh (nhúng CSS từ \`06-UI-MOCKUP-SHELLS-AND-TOKENS.md\`, Web tối thiểu \`1920x1080\`, highlight \`data-change="added|modified"\`, không ghi chú QA/BA) vào Canvas để xem trước trực tiếp.
`;
}

function collectPluginBundle(pluginName, title, extraRefs = []) {
  const parts = [`# ${title}\n\n> Gói tri thức đóng gói tự động từ \`plugins/${pluginName}/\` cho ChatGPT Projects & Custom GPTs.\n`];
  const skillsDir = path.join(REPO_ROOT, 'plugins', pluginName, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const skill of fs.readdirSync(skillsDir).sort()) {
      const skillFile = path.join(skillsDir, skill, 'SKILL.md');
      if (!fs.existsSync(skillFile)) continue;
      parts.push(`\n---\n\n## Skill: \`${skill}\`\n\n${stripFrontmatter(fs.readFileSync(skillFile, 'utf8'))}`);
    }
  }
  for (const rel of extraRefs) {
    const content = readSafe(rel);
    if (content) {
      parts.push(`\n---\n\n## Reference: \`${rel}\`\n\n${content.trim()}`);
    }
  }
  return parts.join('\n') + '\n';
}

function collectMultiPluginBundle(pluginNames, title) {
  const parts = [`# ${title}\n`];
  for (const pl of pluginNames) {
    parts.push(collectPluginBundle(pl, `Phân hệ: ${pl}`));
  }
  return parts.join('\n');
}

function buildDomainHandbook() {
  const files = [
    'references/securities-domain-rules.md',
    'references/timescale-schema.md',
    'references/atlassian-rules.md',
  ];
  const secDir = path.join(REPO_ROOT, 'references', 'securities');
  if (fs.existsSync(secDir)) {
    for (const f of fs.readdirSync(secDir).filter(x => x.endsWith('.md')).sort()) {
      files.push(`references/securities/${f}`);
    }
  }
  const parts = ['# Cẩm Nang Nghiệp Vụ Chứng Khoán, KRX MDDS & Quy Tắc Atlassian\n'];
  for (const rel of files) {
    const c = readSafe(rel);
    if (c) parts.push(`\n---\n\n## Nguồn: \`${rel}\`\n\n${c.trim()}`);
  }
  return parts.join('\n') + '\n';
}

function buildMockupShellsBundle() {
  const parts = ['# Bộ Khung UI Mockup Prod-Twin & Design Tokens\n'];
  const mapRel = 'plugins/ba-po/skills/ba-design-mockup/references/ui-component-map.json';
  const mapContent = readSafe(mapRel);
  if (mapContent) {
    parts.push(`\n## UI Component Map (\`${mapRel}\`)\n\n\`\`\`json\n${mapContent.trim()}\n\`\`\`\n`);
  }
  const shellsDir = path.join(REPO_ROOT, 'plugins', 'ba-po', 'skills', 'ba-design-mockup', 'assets', 'shells');
  if (fs.existsSync(shellsDir)) {
    for (const f of fs.readdirSync(shellsDir).filter(x => x.endsWith('.html')).sort()) {
      const html = fs.readFileSync(path.join(shellsDir, f), 'utf8');
      parts.push(`\n---\n\n## Shell: \`${f}\`\n\n\`\`\`html\n${html.trim()}\n\`\`\`\n`);
    }
  }
  return parts.join('\n') + '\n';
}

export function validateExportSafety(filesMap) {
  const errors = [];
  if (filesMap.size > 10) {
    errors.push(`Số lượng file (${filesMap.size}) vượt ngưỡng upload 1 lượt (10 files) của ChatGPT Project.`);
  }
  const instr = filesMap.get('00-INSTRUCTIONS-SYSTEM-PROMPT.md') || '';
  if (instr.length > 8000) {
    errors.push(`00-INSTRUCTIONS-SYSTEM-PROMPT.md dài ${instr.length} ký tự — vượt trần 8.000 ký tự của Custom GPT.`);
  }
  for (const [name, content] of filesMap.entries()) {
    for (const re of SECRET_PATTERNS) {
      if (re.test(content)) {
        errors.push(`Phát hiện dấu hiệu secret trong ${name} khớp mẫu ${re}`);
      }
    }
  }
  return errors;
}

export function exportChatGptBundle(outDir = path.join(REPO_ROOT, 'dist', 'chatgpt')) {
  const files = new Map();
  files.set('00-INSTRUCTIONS-SYSTEM-PROMPT.md', buildInstructions());
  files.set('01-BUNDLE-BA-PO-SKILLS.md', collectPluginBundle('ba-po', 'Bộ Kỹ Năng BA / PO (10 Skills)', [
    'plugins/ba-po/skills/ba-refine/assets/jira-description-template.md',
    'plugins/ba-po/skills/ba-refine/references/quality-rules.md',
    'plugins/ba-po/skills/ba-spec/references/workflow-and-phases.md',
  ]));
  files.set('02-BUNDLE-QA-SDET-SKILLS.md', collectPluginBundle('qa', 'Bộ Kỹ Năng QA / SDET (6 Skills)', [
    'plugins/qa/skills/qa-test-design/references/gherkin-patterns.md',
    'plugins/qa/skills/qa-test-design/references/qa-testing-checklist.md',
    'plugins/qa/skills/qa-auto-design/references/test_logging_guidelines.md',
    'plugins/qa/skills/qa-auto-design/references/sdk-map.json',
  ]));
  files.set('03-BUNDLE-CR-SECURITY-WEBPERF.md', collectPluginBundle('code-reviewer', 'Bộ Kỹ Năng Code Review, Security & WebPerf (4 Skills)', [
    'plugins/code-reviewer/skills/security-code-audit/references/security-checklist.md',
    'plugins/code-reviewer/skills/cr-review-code-and-quality/references/language-and-domain-rules.md',
  ]));
  files.set('04-BUNDLE-SCRUM-MASTER-CORE.md', collectMultiPluginBundle(['scrum-master', 'core', 'fintech-data'], 'Bộ Kỹ Năng Scrum Master, Core & Data Ops (11 Skills)'));
  files.set('05-SECURITIES-DOMAIN-HANDBOOK.md', buildDomainHandbook());
  files.set('06-UI-MOCKUP-SHELLS-AND-TOKENS.md', buildMockupShellsBundle());

  const errors = validateExportSafety(files);
  if (errors.length > 0) {
    throw new Error(`Export safety check failed:\n- ${errors.join('\n- ')}`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, content] of files.entries()) {
    fs.writeFileSync(path.join(outDir, name), content, 'utf8');
  }
  return { outDir, files };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outIdx = process.argv.indexOf('--output');
  const outDir = outIdx !== -1 && process.argv[outIdx + 1]
    ? path.resolve(process.argv[outIdx + 1])
    : path.join(REPO_ROOT, 'dist', 'chatgpt');
  const { files } = exportChatGptBundle(outDir);
  console.log(`✅ Đã xuất ${files.size} files cho ChatGPT Projects / Custom GPT tại: ${outDir}`);
  for (const [name, content] of files.entries()) {
    console.log(`   - ${name} (${content.length} chars)`);
  }
}
