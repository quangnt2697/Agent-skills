import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMockupFidelity } from '../../plugins/ba-po/skills/ba-design-mockup/assets/validate-mockup-fidelity.js';
import { validateRefinedSpec } from '../validators/validate-ba-refine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('validate-mockup-fidelity: phát hiện lỗi thiếu highlight data-change và thiếu switchState', () => {
  const tmpBadHtml = path.join(__dirname, 'temp_bad_mockup.html');
  const badHtml = `
<!DOCTYPE html>
<html>
<body>
  <div>Không có data-change, không có switchState</div>
</body>
</html>
`;
  fs.writeFileSync(tmpBadHtml, badHtml, 'utf8');

  try {
    const res = validateMockupFidelity(tmpBadHtml);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('data-change')));
    assert.ok(res.errors.some(e => e.includes('switchState')));
  } finally {
    if (fs.existsSync(tmpBadHtml)) fs.unlinkSync(tmpBadHtml);
  }
});

test('validate-mockup-fidelity: pass với web-trading-shell chuẩn Full HD không ghi chú QA/BA', () => {
  const shellPath = path.resolve(__dirname, '../../plugins/ba-po/skills/ba-design-mockup/assets/shells/web-trading-shell.html');
  assert.ok(fs.existsSync(shellPath), 'web-trading-shell.html phải tồn tại');

  const mockInventory = path.join(__dirname, 'temp_mock_inv.json');
  fs.writeFileSync(mockInventory, JSON.stringify({
    labels: ['mã chứng khoán', 'giá đặt', 'khối lượng đặt', 'giao dịch', 'sổ lệnh']
  }), 'utf8');

  try {
    const res = validateMockupFidelity(shellPath, mockInventory);
    assert.equal(res.valid, true, `Errors: ${res.errors.join('; ')}`);
    assert.ok(res.score >= 90);
    assert.equal(res.errors.length, 0);
  } finally {
    if (fs.existsSync(mockInventory)) fs.unlinkSync(mockInventory);
  }
});

test('validate-mockup-fidelity: tất cả 6 Production Shells phải pass kiểm định (Full HD + Highlight + Không ghi chú QA/BA)', () => {
  const shellsDir = path.resolve(__dirname, '../../plugins/ba-po/skills/ba-design-mockup/assets/shells');
  const shells = fs.readdirSync(shellsDir).filter(f => f.endsWith('.html'));
  assert.equal(shells.length, 6, 'Bắt buộc phải có đúng 6 Production Shells');

  for (const s of shells) {
    const fullPath = path.join(shellsDir, s);
    const res = validateMockupFidelity(fullPath);
    assert.equal(res.valid, true, `Shell ${s} phải pass validate-mockup-fidelity (errors: ${res.errors.join('; ')})`);
    assert.ok(res.score >= 90, `Shell ${s} phải có Fidelity Score >= 90% (thực tế: ${res.score}%)`);
  }
});

test('validate-mockup-fidelity: chặn lỗi khi mockup chứa huy hiệu ① ② ③ hoặc bảng UI Delta Mapping của QA/BA', () => {
  const tmpPollutedHtml = path.join(__dirname, 'temp_polluted_mockup.html');
  const pollutedHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>[data-change="added"] { outline: 2px dashed #00d084; }</style>
</head>
<body>
  <div data-change="added"><span class="delta-pin">①</span> Giao diện đặt lệnh mua bán tài khoản ký quỹ</div>
  <div class="delta-legend-card">
    <table class="delta-table">
      <tr><th>Badge</th><th>Mô tả</th></tr>
      <tr><td>①</td><td>Giải thích badge 1</td></tr>
    </table>
  </div>
  <script>
    function switchState(s) {
      if (s === 'error') {}
      else if (s === 'locked') {}
      else {}
    }
  </script>
</body>
</html>
`;
  fs.writeFileSync(tmpPollutedHtml, pollutedHtml, 'utf8');

  try {
    const res = validateMockupFidelity(tmpPollutedHtml);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('huy hiệu đánh số chú thích')));
    assert.ok(res.errors.some(e => e.includes('UI Delta Mapping')));
  } finally {
    if (fs.existsSync(tmpPollutedHtml)) fs.unlinkSync(tmpPollutedHtml);
  }
});

test('validate-mockup-fidelity: chặn lỗi khi Web mockup giới hạn chiều rộng 1440px dưới chuẩn Full HD', () => {
  const tmpNarrowHtml = path.join(__dirname, 'temp_narrow_web.html');
  const narrowHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=1440, initial-scale=1.0">
  <style>
    body { width: 1440px; }
    [data-change="added"] { outline: 2px dashed #00d084; }
  </style>
</head>
<body>
  <div data-change="added">Lệnh mua bán chứng khoán giá khối lượng tài khoản</div>
  <script>
    function switchState(s) {
      if (s === 'error') {}
      else if (s === 'locked') {}
      else {}
    }
  </script>
</body>
</html>
`;
  fs.writeFileSync(tmpNarrowHtml, narrowHtml, 'utf8');

  try {
    const res = validateMockupFidelity(tmpNarrowHtml);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('Full HD')));
  } finally {
    if (fs.existsSync(tmpNarrowHtml)) fs.unlinkSync(tmpNarrowHtml);
  }
});

test('validate-ba-refine: chặn lỗi khi mục UI Design / Mockup chứa mô tả text hoặc ghi chú thêm ngoài ảnh mockup', () => {
  const tmpSpec = path.join(__dirname, 'temp_refined_with_ui_text.md');
  const specContent = `## 🧩 User Story
**As a** Chuyên viên Quản lý giao dịch (QLGD)  
**I want** tra cứu giao dịch nộp tiền  
**So that** đối soát nhanh chóng

## 💼 Business Context
- **Vấn đề (Problem):** Khó tra cứu giao dịch.
- **Mục tiêu (Goal):** Tra cứu dưới 1 phút.
- **Tính cấp thiết (Urgency):** Cần ngay trong quý này.
- **Phạm vi (Scope):** Phân hệ Dadmin.

## ✅ Acceptance Criteria
\`\`\`gherkin
Feature: Tra cứu giao dịch nộp tiền

  Scenario: Happy - Tra cứu thành công
    Given Chuyên viên đã đăng nhập
    When Nhấn tìm kiếm
    Then Hiển thị danh sách giao dịch

  Scenario: Validation - Quá khoảng thời gian
    Given Chuyên viên chọn quá 90 ngày
    When Nhấn tìm kiếm
    Then Hiển thị cảnh báo

  Scenario: Edge - Lọc theo trạng thái
    Given Chuyên viên chọn trạng thái CREATED
    When Nhấn tìm kiếm
    Then Hiển thị các dòng CREATED
\`\`\`

## 🎨 UI Design / Mockup

![Mockup](workspace/issues/PROJ-1/spec/diagrams/mockup-case-1.png)
- Ghi chú thêm bằng text không được phép xuất hiện ở đây

## ☀️ Success Criteria & Tracking

### Success Metrics
| Metric | Current | Target | Measurement |
|---|---|---|---|
| Thời gian | 10p | 1p | Log |

### Tracking
| Event | Dashboard / Report | Owner |
|---|---|---|
| search | Dashboard | QLGD |
`;
  fs.writeFileSync(tmpSpec, specContent, 'utf8');

  try {
    const res = validateRefinedSpec(tmpSpec);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('[GATE-UI-01]') && e.includes('TUYỆT ĐỐI KHÔNG mô tả design bằng text')));
  } finally {
    if (fs.existsSync(tmpSpec)) fs.unlinkSync(tmpSpec);
  }
});

test('ui-component-map: chứa tối thiểu 25 Standard UI Components chuẩn Production', () => {
  const mapPath = path.resolve(__dirname, '../../plugins/ba-po/skills/ba-design-mockup/references/ui-component-map.json');
  assert.ok(fs.existsSync(mapPath), 'ui-component-map.json phải tồn tại');
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const compCount = Object.keys(map.standard_components || {}).length;
  assert.ok(compCount >= 25, `standard_components phải có >= 25 components (thực tế: ${compCount})`);
});
