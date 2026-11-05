// Unit test cho lớp convert Markdown → ADF của ba-refine.
//
// Ba lỗi từng làm hỏng description trên Jira, mỗi lỗi một nhóm test:
//   1. URL Jira bị dùng nguyên làm issueKey → sai đường dẫn workspace
//   2. md-to-adf nối cả bảng (kể cả hàng |---|) thành một paragraph
//   3. ngắt dòng "2 khoảng trắng" bị nuốt → User Story thành một dòng dài

import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeIssueKey,
  markdownToAdf,
  splitBlocks,
  exportTestabilityManifest,
} from '../../plugins/ba-po/skills/ba-refine/assets/jira-push-spec.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// --- normalizeIssueKey --------------------------------------------------------

test('accepts a bare issue key unchanged', () => {
  assert.strictEqual(normalizeIssueKey('G3PTP-17057'), 'G3PTP-17057');
});

test('extracts the key from a browse URL with an anchor', () => {
  assert.strictEqual(
    normalizeIssueKey('https://your-domain.atlassian.net/browse/G3PTP-17057#icft=G3PTP-17057'),
    'G3PTP-17057',
  );
});

test('extracts the key from a URL carrying a query string', () => {
  assert.strictEqual(
    normalizeIssueKey('https://x.atlassian.net/browse/PROJ-123?filter=1'),
    'PROJ-123',
  );
});

test('uppercases a lowercase key', () => {
  assert.strictEqual(normalizeIssueKey('proj-9'), 'PROJ-9');
});

test('returns null when there is no key to find', () => {
  assert.strictEqual(normalizeIssueKey('https://example.com/no-key-here'), null);
  assert.strictEqual(normalizeIssueKey(''), null);
  assert.strictEqual(normalizeIssueKey(undefined), null);
});

// --- Bảng ---------------------------------------------------------------------

const METRICS_TABLE = [
  '| Metric | Current | Target |',
  '|--------|---------|--------|',
  '| Visibility | Chỉ **Connection** | Unique Clients |',
  '| MTTD | Khó phát hiện | Alert < 5 phút |',
].join('\n');

test('builds a real ADF table instead of one flattened paragraph', () => {
  const doc = markdownToAdf(METRICS_TABLE);
  const tables = doc.content.filter(n => n.type === 'table');

  assert.strictEqual(tables.length, 1);
  // header + 2 hàng dữ liệu — hàng phân cách |---| KHÔNG được thành một hàng
  assert.strictEqual(tables[0].content.length, 3);
});

test('marks the first row as header cells and the rest as body cells', () => {
  const table = markdownToAdf(METRICS_TABLE).content.find(n => n.type === 'table');

  assert.deepStrictEqual(
    table.content[0].content.map(c => c.type),
    ['tableHeader', 'tableHeader', 'tableHeader'],
  );
  assert.deepStrictEqual(
    table.content[1].content.map(c => c.type),
    ['tableCell', 'tableCell', 'tableCell'],
  );
});

test('keeps the |---| delimiter row out of the rendered text', () => {
  const doc = markdownToAdf(METRICS_TABLE);
  assert.ok(!JSON.stringify(doc).includes('---------'));
});

test('preserves inline marks inside a cell', () => {
  const table = markdownToAdf(METRICS_TABLE).content.find(n => n.type === 'table');
  const cell = table.content[1].content[1];
  const strong = cell.content[0].content.find(n => n.marks?.some(m => m.type === 'strong'));

  assert.strictEqual(strong.text, 'Connection');
});

test('pads short rows so every row has the header column count', () => {
  const doc = markdownToAdf([
    '| A | B | C |',
    '|---|---|---|',
    '| only-one |',
  ].join('\n'));
  const table = doc.content.find(n => n.type === 'table');

  assert.strictEqual(table.content[1].content.length, 3);
});

test('does not treat pipes inside a code block as a table', () => {
  const doc = markdownToAdf([
    '```gherkin',
    'Scenario: x',
    '  Given | a | b |',
    '  | --- | --- |',
    '```',
  ].join('\n'));

  assert.strictEqual(doc.content.filter(n => n.type === 'table').length, 0);
  assert.strictEqual(doc.content[0].type, 'codeBlock');
});

test('keeps prose before and after a table in document order', () => {
  const doc = markdownToAdf([
    '## Success Metrics',
    '',
    METRICS_TABLE,
    '',
    'Ghi chú sau bảng.',
  ].join('\n'));

  assert.deepStrictEqual(
    doc.content.map(n => n.type),
    ['heading', 'table', 'paragraph'],
  );
});

// --- Ngắt dòng mềm -------------------------------------------------------------

const USER_STORY = [
  '**As a** System Admin  ',
  '**I want** theo dõi metric  ',
  '**So that** giám sát tải',
].join('\n');

test('turns a two-space line break into a hardBreak node', () => {
  const paragraph = markdownToAdf(USER_STORY).content[0];
  const breaks = paragraph.content.filter(n => n.type === 'hardBreak');

  assert.strictEqual(breaks.length, 2);
});

test('does not leak the sentinel into the pushed text', () => {
  assert.ok(!JSON.stringify(markdownToAdf(USER_STORY)).includes('HARDBREAK'));
});

test('keeps bold marks across a hard break', () => {
  const paragraph = markdownToAdf(USER_STORY).content[0];
  const bold = paragraph.content
    .filter(n => n.marks?.some(m => m.type === 'strong'))
    .map(n => n.text);

  assert.deepStrictEqual(bold, ['As a', 'I want', 'So that']);
});

// --- splitBlocks ---------------------------------------------------------------

test('splits a document into md and table blocks in order', () => {
  const blocks = splitBlocks(['# H', '', METRICS_TABLE, '', 'tail'].join('\n'));
  assert.deepStrictEqual(blocks.map(b => b.type), ['md', 'table', 'md']);
});

// --- Template ------------------------------------------------------------------

test('the shipped template converts with both of its tables intact (no UI Delta table in template)', () => {
  const templatePath = path.join(
    __dirname, '..', '..', 'plugins', 'ba-po', 'skills', 'ba-refine', 'assets', 'jira-description-template.md',
  );
  const doc = markdownToAdf(fs.readFileSync(templatePath, 'utf8'));

  // 2 bảng: Success Metrics và Tracking (Mục UI Design / Mockup chỉ chứa ảnh mockup, không có bảng ghi chú)
  assert.strictEqual(doc.content.filter(n => n.type === 'table').length, 2);
});

test('the shipped template carries no leftover meta text', () => {
  const templatePath = path.join(
    __dirname, '..', '..', 'plugins', 'ba-po', 'skills', 'ba-refine', 'assets', 'jira-description-template.md',
  );
  const raw = fs.readFileSync(templatePath, 'utf8');


  for (const banned of [
    'Jira Description Template',
    'Format 1:',
    'Format 2:',
    '(Required)',
    '(Optional)',
    'Generated by:',
    'Local file:',
  ]) {
    assert.ok(!raw.includes(banned), `template vẫn còn: ${banned}`);
  }
});

// --- Testability Manifest & UI Delta Mapping -----------------------------------

test('exportTestabilityManifest extracts BR, AC, and UI delta mapping table', () => {
  const sampleMarkdown = `
## 5. Quy tắc Nghiệp vụ
- [BR-01] Quy tắc gói vay ký quỹ ưu đãi
- [BR-02] Quy tắc kiểm tra bước giá

## 6. Tiêu chí Nghiệm thu
- [AC-1.1] Đặt lệnh thành công với gói T+10
- [AC-1.2] Báo lỗi khi sai bước giá

## 8. Thiết kế Giao diện & Điểm chạm Màn hình (UI/UX & Mockup)
| Ký hiệu trên Mockup | Thành phần Giao diện | Loại thay đổi | Mô tả chi tiết & Trạng thái | Ràng buộc Nghiệp vụ |
| :---: | --- | :---: | --- | :---: |
| **①** | Chọn Gói vay Ký quỹ | Thêm mới (Dropdown) | Dropdown chọn gói T+10 | [BR-01], [AC-1.1] |
| **②** | Ô Nhập Khối Lượng | Sửa đổi (Stepper) | Bổ sung nút tăng giảm +/- | [BR-02], [AC-1.2] |
`;

  const tmpPath = path.join(__dirname, 'temp_test_spec.md');
  fs.writeFileSync(tmpPath, sampleMarkdown, 'utf8');

  try {
    const manifest = exportTestabilityManifest('G3PTP-17057', sampleMarkdown, tmpPath);

    assert.strictEqual(manifest.issueKey, 'G3PTP-17057');
    assert.deepStrictEqual(manifest.rules, ['BR-01', 'BR-02']);
    assert.deepStrictEqual(manifest.acceptance_criteria, ['AC-1.1', 'AC-1.2']);
    assert.strictEqual(manifest.ui_elements.length, 2);

    assert.strictEqual(manifest.ui_elements[0].badge, '①');
    assert.strictEqual(manifest.ui_elements[0].name, 'Chọn Gói vay Ký quỹ');
    assert.strictEqual(manifest.ui_elements[0].change_type, 'added');
    assert.deepStrictEqual(manifest.ui_elements[0].rules, ['BR-01']);
    assert.deepStrictEqual(manifest.ui_elements[0].criteria, ['AC-1.1']);

    assert.strictEqual(manifest.ui_elements[1].badge, '②');
    assert.strictEqual(manifest.ui_elements[1].name, 'Ô Nhập Khối Lượng');
    assert.strictEqual(manifest.ui_elements[1].change_type, 'modified');
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    const generatedManifest = path.join(__dirname, 'testability-manifest.json');
    if (fs.existsSync(generatedManifest)) fs.unlinkSync(generatedManifest);
    const generatedFinal = path.join(__dirname, 'final.md');
    if (fs.existsSync(generatedFinal)) fs.unlinkSync(generatedFinal);
  }
});

// --- Ảnh Mockup Inline (mediaSingle / media) -----------------------------------

test('splitBlocks identifies markdown image line as image block', () => {
  const md = [
    '### Case 1: Thao tác đặt lệnh',
    '![Case 1: Thao tác đặt lệnh](workspace/issues/G3PTP-17057/spec/diagrams/mockup-case-1.png)',
    '- **① Chọn Gói vay:** Click chọn gói T+10',
  ].join('\n');

  const blocks = splitBlocks(md);
  assert.strictEqual(blocks.length, 3);
  assert.strictEqual(blocks[0].type, 'md');
  assert.strictEqual(blocks[1].type, 'image');
  assert.strictEqual(blocks[1].alt, 'Case 1: Thao tác đặt lệnh');
  assert.strictEqual(blocks[1].src, 'workspace/issues/G3PTP-17057/spec/diagrams/mockup-case-1.png');
  assert.strictEqual(blocks[2].type, 'md');
});

test('markdownToAdf converts markdown image into mediaSingle ADF node with attachment url or id', () => {
  const md = '![Case 1: Thao tác chính](mockup-case-1.png)';
  const attachmentMap = {
    'mockup-case-1.png': {
      id: '99881',
      filename: 'mockup-case-1.png',
    },
  };

  const doc = markdownToAdf(md, attachmentMap);
  const mediaSingles = doc.content.filter(n => n.type === 'mediaSingle');

  assert.strictEqual(mediaSingles.length, 1);
  assert.strictEqual(mediaSingles[0].attrs.layout, 'center');
  assert.strictEqual(mediaSingles[0].content[0].type, 'media');
  assert.strictEqual(mediaSingles[0].content[0].attrs.type, 'file');
  assert.strictEqual(mediaSingles[0].content[0].attrs.id, '99881');
  assert.strictEqual(mediaSingles[0].content[0].attrs.alt, 'Case 1: Thao tác chính');
});

test('markdownToAdf handles dry-run or unmapped images gracefully with placeholder id', () => {
  const md = '![Case 2: Cảnh báo ngoại lệ](mockup-case-2.png)';
  const doc = markdownToAdf(md, {});
  const mediaSingles = doc.content.filter(n => n.type === 'mediaSingle');

  assert.strictEqual(mediaSingles.length, 1);
  assert.strictEqual(mediaSingles[0].content[0].attrs.id, 'local-mockup-case-2.png');
  assert.strictEqual(mediaSingles[0].content[0].attrs.alt, 'Case 2: Cảnh báo ngoại lệ');
});

test('the shipped template converts with 3 mediaSingle mockup blocks for Case 1, 2, and 3', () => {
  const templatePath = path.join(
    __dirname, '..', '..', 'plugins', 'ba-po', 'skills', 'ba-refine', 'assets', 'jira-description-template.md',
  );
  const doc = markdownToAdf(fs.readFileSync(templatePath, 'utf8'));

  const mediaSingles = doc.content.filter(n => n.type === 'mediaSingle');
  assert.strictEqual(mediaSingles.length, 3, 'Template phải có đúng 3 khối ảnh mockup cho Case 1, Case 2, Case 3');
});

