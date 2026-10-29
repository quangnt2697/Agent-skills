import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMockupFidelity } from '../../plugins/ba-po/skills/ba-design-mockup/assets/validate-mockup-fidelity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('validate-mockup-fidelity: phát hiện lỗi thiếu Delta và thiếu switchState', () => {
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

test('validate-mockup-fidelity: pass với web-trading-shell chuẩn', () => {
  const shellPath = path.resolve(__dirname, '../../plugins/ba-po/skills/ba-design-mockup/assets/shells/web-trading-shell.html');
  assert.ok(fs.existsSync(shellPath), 'web-trading-shell.html phải tồn tại');

  const mockInventory = path.join(__dirname, 'temp_mock_inv.json');
  fs.writeFileSync(mockInventory, JSON.stringify({
    labels: ['mã chứng khoán', 'giá đặt', 'khối lượng đặt', 'giao dịch', 'sổ lệnh']
  }), 'utf8');

  try {
    const res = validateMockupFidelity(shellPath, mockInventory);
    assert.equal(res.valid, true);
    assert.ok(res.score >= 90);
    assert.equal(res.errors.length, 0);
  } finally {
    if (fs.existsSync(mockInventory)) fs.unlinkSync(mockInventory);
  }
});

test('validate-mockup-fidelity: tất cả 6 Production Shells phải pass kiểm định', () => {
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

test('validate-mockup-fidelity: bắt lỗi lệch Badge Parity giữa UI và Bảng Delta', () => {
  const tmpBadHtml = path.join(__dirname, 'temp_unmapped_badge.html');
  const badHtml = `
<!DOCTYPE html>
<html>
<body>
  <div data-change="added"><span class="delta-pin">①</span> Thêm 1</div>
  <div data-change="modified"><span class="delta-pin">②</span> Sửa 2</div>
  <div class="delta-legend-card">
    <table class="delta-table">
      <tr><th>Badge</th><th>Mô tả</th></tr>
      <tr><td>①</td><td>Chỉ giải thích badge 1</td></tr>
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
  fs.writeFileSync(tmpBadHtml, badHtml, 'utf8');

  try {
    const res = validateMockupFidelity(tmpBadHtml);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('Huy hiệu ②') && e.includes('UI Delta Mapping')));
  } finally {
    if (fs.existsSync(tmpBadHtml)) fs.unlinkSync(tmpBadHtml);
  }
});

test('validate-mockup-fidelity: bắt lỗi thiếu trạng thái locked trong switchState', () => {
  const tmpBadHtml = path.join(__dirname, 'temp_missing_locked.html');
  const badHtml = `
<!DOCTYPE html>
<html>
<body>
  <div data-change="added"><span class="delta-pin">①</span> Thêm 1</div>
  <div class="delta-legend-card">
    <table class="delta-table">
      <tr><th>Badge</th><th>Mô tả</th></tr>
      <tr><td>①</td><td>Giải thích badge 1</td></tr>
    </table>
  </div>
  <script>
    function switchState(s) {
      if (s === 'error') {}
      else {}
    }
  </script>
</body>
</html>
`;
  fs.writeFileSync(tmpBadHtml, badHtml, 'utf8');

  try {
    const res = validateMockupFidelity(tmpBadHtml);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('locked')));
  } finally {
    if (fs.existsSync(tmpBadHtml)) fs.unlinkSync(tmpBadHtml);
  }
});

test('ui-component-map: chứa tối thiểu 25 Standard UI Components chuẩn Production', () => {
  const mapPath = path.resolve(__dirname, '../../plugins/ba-po/skills/ba-design-mockup/references/ui-component-map.json');
  assert.ok(fs.existsSync(mapPath), 'ui-component-map.json phải tồn tại');
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const compCount = Object.keys(map.standard_components || {}).length;
  assert.ok(compCount >= 25, `standard_components phải có >= 25 components (thực tế: ${compCount})`);
});

