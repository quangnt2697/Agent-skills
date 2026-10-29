import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRefinedSpec } from '../validators/validate-ba-refine.js';
import { extractSummaryKeywords, buildRelatedIssuesJql } from '../lib/jira-keyword-searcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('jira-keyword-searcher: trích xuất keywords chuẩn (bao gồm từ ghép domain), bỏ stopwords và nhận diện task type', () => {
  const s1 = '[WEB] Đánh giá giao diện Web và Mobile App khi cổ phiếu HNX chuyển sang HOSE với biên độ ±10%';
  const res1 = extractSummaryKeywords(s1);
  assert.equal(res1.detectedType, 'WEB');
  assert.ok(res1.keywords.includes('HNX'));
  assert.ok(res1.keywords.includes('HOSE'));
  assert.ok(res1.keywords.some(k => k.toLowerCase() === 'cổ phiếu'));
  assert.ok(res1.keywords.some(k => k.toLowerCase() === 'biên độ'));
  assert.ok(!res1.keywords.some(k => ['và', 'khi', 'sang', 'với', 'giao', 'diện'].includes(k.toLowerCase())));

  const s2 = 'Cập nhật quy tắc giám sát cho công cụ monitor giá';
  const res2 = extractSummaryKeywords(s2);
  assert.ok(res2.keywords.some(k => k.toLowerCase() === 'monitor giá' || k.toLowerCase() === 'monitor'));
  assert.ok(!res2.keywords.includes('Cập'));
  assert.ok(!res2.keywords.includes('nhật'));

  const jql = buildRelatedIssuesJql('G3PTP-17700', res2.keywords, 'G3PTP');
  assert.ok(jql.includes('project = "G3PTP"'));
  assert.ok(jql.includes('issueKey != "G3PTP-17700"'));
  assert.ok(jql.includes('summary ~ "monitor'));
});

test('validate-ba-refine: phát hiện các lỗi sai template 8 mục cũ, thừa @tag, [AC] và lỗi đặt tên Scenario', () => {
  const tmpBadSpec = path.join(__dirname, 'temp_bad_spec.md');

  // Case 1: Dùng heading 8 mục cũ, thiếu User Story, thừa @tag và có [AC-1.1]
  const badContent = `
## 1. Mục tiêu & Giá trị Nghiệp vụ
Nội dung mục tiêu...

## 6. Tiêu chí Nghiệm thu Nghiệp vụ
\`\`\`gherkin
Feature: Tính năng
  @happy-path @negative
  Scenario: [AC-1.1] Đặt lệnh hợp lệ
    Given tài khoản hợp lệ
    When bấm đặt lệnh
    Then thành công
\`\`\`
`;
  fs.writeFileSync(tmpBadSpec, badContent, 'utf8');

  try {
    const val = validateRefinedSpec(tmpBadSpec);
    assert.equal(val.valid, false);
    assert.ok(val.errors.some(e => e.includes('[GATE-TPL-01]')));
    assert.ok(val.errors.some(e => e.includes('## 🧩 User Story')));
    assert.ok(val.errors.some(e => e.includes('[GATE-AC-01]')));
    assert.ok(val.errors.some(e => e.includes('[GATE-AC-02]')));
    assert.ok(val.errors.some(e => e.includes('[GATE-AC-03]')));
  } finally {
    if (fs.existsSync(tmpBadSpec)) fs.unlinkSync(tmpBadSpec);
  }
});

test('validate-ba-refine: pass khi spec chuẩn template Jira Description 6 phần', () => {
  const tmpGoodSpec = path.join(__dirname, 'temp_good_spec.md');

  const goodContent = `
## 🧩 User Story
**As a** Nhà đầu tư cá nhân giao dịch trên Mobile App  
**I want** theo dõi biểu đồ nến tinh gọn  
**So that** đưa ra quyết định đặt lệnh mua bán nhanh chóng

## 💼 Business Context
- **Vấn đề (Problem):** Biểu đồ cũ tải chậm 3 giây gây lỡ nhịp thị trường.
- **Mục tiêu (Goal):** Giảm thời gian tải biểu đồ xuống dưới 500ms.
- **Tính cấp thiết (Urgency):** Nâng cao trải nghiệm trong mùa cao điểm thanh khoản.
- **Phạm vi (Scope):** Áp dụng cho màn hình chi tiết mã cổ phiếu trên App.

## 📜 Business Rules
- [BR-01] Biểu đồ nến cập nhật giá khớp thời gian thực.
- [BR-02] Tự động hiển thị đường giá hòa vốn khi có Deal mở.

## ✅ Acceptance Criteria
\`\`\`gherkin
Feature: Biểu đồ nến tinh gọn

  Scenario: Happy - Hiển thị biểu đồ trong 500ms
    Given Nhà đầu tư truy cập màn hình chi tiết mã
    When hệ thống tải biểu đồ
    Then biểu đồ nến hiển thị đầy đủ trong thời gian dưới 500ms

  Scenario: Validation - Báo mất kết nối khi mất mạng
    Given Thiết bị mất kết nối internet
    When nạp dữ liệu nến mới
    Then hệ thống hiển thị thông báo chạm để tải lại

  Scenario: Edge - Chuyển sang biểu đồ TradingView nâng cao
    Given Nhà đầu tư nhấn nút mở rộng biểu đồ
    When hệ thống chuyển sang màn hình TradingView
    Then toàn bộ chỉ báo kỹ thuật chuyên sâu được tải đầy đủ
\`\`\`

## 🎨 UI Design / Mockup
N/A — Đã kiểm thử theo fixture.

## ☀️ Success Criteria & Tracking
| Metric | Current | Target |
|---|---|---|
| Load Time | 3s | <500ms |
`;
  fs.writeFileSync(tmpGoodSpec, goodContent, 'utf8');

  try {
    const val = validateRefinedSpec(tmpGoodSpec);
    assert.equal(val.valid, true);
    assert.equal(val.errors.length, 0);
  } finally {
    if (fs.existsSync(tmpGoodSpec)) fs.unlinkSync(tmpGoodSpec);
  }
});

