// Unit test cho lớp convert Markdown → ADF của ba-refine.
//
// Ba lỗi từng làm hỏng description trên Jira, mỗi lỗi một nhóm test:
//   1. URL Jira bị dùng nguyên làm issueKey → sai đường dẫn workspace
//   2. md-to-adf nối cả bảng (kể cả hàng |---|) thành một paragraph
//   3. ngắt dòng "2 khoảng trắng" bị nuốt → User Story thành một dòng dài

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const {
  normalizeIssueKey,
  markdownToAdf,
  splitBlocks,
} = require(path.join(__dirname, '..', 'skills', 'ba-refine', 'scripts', 'jira-push-spec.js'));

// --- normalizeIssueKey --------------------------------------------------------

test('accepts a bare issue key unchanged', () => {
  assert.strictEqual(normalizeIssueKey('G3PTP-17057'), 'G3PTP-17057');
});

test('extracts the key from a browse URL with an anchor', () => {
  assert.strictEqual(
    normalizeIssueKey('https://entrade.atlassian.net/browse/G3PTP-17057#icft=G3PTP-17057'),
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

test('the shipped template converts with both of its tables intact', () => {
  const fs = require('fs');
  const templatePath = path.join(
    __dirname, '..', 'skills', 'ba-refine', 'templates', 'jira-description-template.md',
  );
  const doc = markdownToAdf(fs.readFileSync(templatePath, 'utf8'));

  assert.strictEqual(doc.content.filter(n => n.type === 'table').length, 2);
});

test('the shipped template carries no leftover meta text', () => {
  const fs = require('fs');
  const templatePath = path.join(
    __dirname, '..', 'skills', 'ba-refine', 'templates', 'jira-description-template.md',
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
