# Chiến Lược Tích Hợp n8n Fast-Path (n8n Integration Strategy)

## 1. Tổng Quan & Triết Lý Thiết Kế

Hệ thống `agent-skills` áp dụng mô hình kiến trúc lai giữa **Tầng Tích Hợp Tự Động Hóa (n8n Fast-Path Fabric)** và **Tầng Nhận Thức (Cognitive Agent Layer)** nhằm đạt tốc độ thực thi tối đa (Wall-clock Time) và giảm thiểu tối đa token tiêu tốn.

### Nguyên Tắc 3-Tier Fallback

Mọi kỹ năng (Skill) cần tương tác với dịch vụ bên ngoài (Jira, Confluence, Squash TM, GitLab, Mattermost, TimescaleDB) đều tuân theo chuỗi ưu tiên 3 tầng:

```
[Tier 1: n8n Fast-Path Webhook] (Ưu tiên số 1 - Tức thời, payload lọc sạch, 0 token rác)
          │ (Nếu n8n offline / timeout / lỗi)
          ▼
[Tier 2: MCP Tools] (Ưu tiên số 2 - Atlassian Rovo MCP / GitLab MCP)
          │ (Nếu MCP chưa cài / không khả dụng)
          ▼
[Tier 3: Shell Script / curl] (Ưu tiên số 3 - Fallback truyền thống qua .env)
```

---

## 2. Danh Mục Webhook Endpoints Chuẩn Hóa

Các workflow n8n được lưu trữ mẫu tại thư mục `n8n-workflows/`. Khi import vào n8n, các endpoint sau sẽ khả dụng tại `http://localhost:5678/webhook/<path>`:

| Endpoint | Method | Persona | Mục đích | Payload Input | Response Output |
|---|:---:|:---:|---|---|---|
| `/webhook/jira-prep` | `POST` | BA/PO | Lấy tóm tắt và mô tả Jira sạch (bỏ ADF rác) | `{"issueKey": "G3PTP-17396"}` | `{"issueKey", "summary", "status", "assignee", "descriptionSnippet"}` |
| `/webhook/confluence-doc` | `POST` | BA/PO | Bóc tách Confluence Storage XHTML sang Markdown tinh gọn | `{"pageUrlOrId": "..."}` | `{"title", "version", "markdownContent", "stats"}` |
| `/webhook/securities-fixture` | `POST` | QA | Lấy Test Fixtures chứng khoán 4 sàn từ security_definition_v3 | `{}` | `{"auth", "segments": {derivatives, hose, upcom, hnx}, "sampleOrders"}` |
| `/webhook/squash-batch` | `POST` | QA | Đẩy hàng loạt Test Cases & Gherkin lên Squash TM | `{"baseUrl", "apiToken", "folderId", "testCases": [...]}` | `{"status": "success", "importedCount": 15}` |
| `/webhook/qa-run-test` | `POST` | QA | Kích hoạt bộ test chạy ngầm (Non-blocking) | `{"issueKey": "...", "testCommand": "pytest ..."}` | `{"jobId": "...", "status": "queued"}` |
| `/webhook/jira-ready-to-test` | `POST` | QA / ChatOps | Nhận Webhook Jira chuyển trạng thái Ready to Test, báo Mattermost | `{"issue": {...}, "changelog": {...}}` | `{"isReadyToTest", "gherkinBadge", "autoScriptBadge", "suggestedCommand"}` |
| `/webhook/cr-diff-clean` | `POST` | Code Reviewer | Lọc bỏ lockfiles, minified bundle, phân tầng git diff | `{"rawDiff": "..."}` | `{"summary", "categorizedFiles", "cleanedDiffText"}` |
| `/webhook/security-scan` | `POST` | Security | Quét ngầm npm audit và rà soát secrets rò rỉ | `{"projectPath": "..."}` | `{"securityStatus", "vulnerabilities", "scorecardMarkdown"}` |
| `/webhook/sm-standup` | `POST` | Scrum Master | Lấy báo cáo Standup và đẩy thẳng qua Mattermost | `{}` | `{"reportText", "totalIssues", "stuckCount"}` |

---

## 3. Cách Tích Hợp Vào Từng Skill

### 3.1. Phân Hệ BA/PO (`ba-refine` & `ba-spec`)
- **Tại Phase 0 (Scan & Lấy Metadata):**
  Trước khi chạy `curl` tải toàn bộ JSON Jira thô, Agent chạy đoạn mã tiện ích qua `scripts/lib/n8n-client.js`:
  ```javascript
  import { isN8nAvailable, prepJiraContext, fetchConfluenceDoc } from './scripts/lib/n8n-client.js';

  if (await isN8nAvailable()) {
    const cleanData = await prepJiraContext(issueKey);
    // cleanData đã được lọc sạch, nạp trực tiếp vào context!
    if (confluenceUrl) {
      const doc = await fetchConfluenceDoc(confluenceUrl);
      // doc.markdownContent đã được dọn sạch XHTML/CSS!
    }
  } else {
    // Fallback sang MCP hoặc curl như bình thường
  }
  ```
- **Lợi ích:** Tiết kiệm 85% token và rút ngắn thời gian nạp dữ liệu từ 30s xuống 0.5s.

### 3.2. Phân Hệ QA (`qa-auto-design`, `qa-squash-push`, `qa-run-test`)
- **Fast-Path Dữ liệu Chứng khoán:**
  Trong bước chuẩn bị fixture của `qa-auto-design`:
  ```javascript
  import { getSecuritiesFixture } from './scripts/lib/n8n-client.js';

  const fixtures = await getSecuritiesFixture();
  // fixtures.segments.derivatives -> 41I1GA0000 (tự rollover khi đáo hạn)
  // fixtures.segments.hose -> SHB (bước giá 50đ, lô 100)
  // fixtures.segments.upcom -> OIL (biên độ 15%, bước giá 100đ)
  // fixtures.segments.hnx -> SHS (biên độ 10%, bước giá 100đ)
  // fixtures.auth -> Nạp sẵn API_KEY và API_SECRET từ .env!
  ```
- **⚠️ Ranh giới quan trọng:**
  - Lệnh `batchSquashPush` qua n8n **CHỈ** được thiết kế để tạo nhanh hàng loạt Test Case thô (Dumb Batch Creation) từ checklist, giúp tiết kiệm thời gian (đẩy 20 test cases chỉ mất 3-4 giây). Tuy nhiên, nó **KHÔNG** chứa logic dọn dẹp rác hay liên kết Campaign.
  - Kỹ năng `/qa-squash-push` (đẩy file kịch bản Gherkin hoàn chỉnh lên hệ thống) **BẮT BUỘC phải dùng Shell Script (Tier 3: `squash-push.sh`)**, tuyệt đối KHÔNG dùng n8n Fast-Path.
  - **Lý do:** Script Shell thực thi thông qua session cookie XSRF nội bộ của hệ thống Squash TM để dọn dẹp execution cũ, dò tìm Sprint mới nhất, và gán Campaign Workspace một cách an toàn nhất, đảm bảo tính toàn vẹn dữ liệu.

### 3.3. Phân Hệ Code Reviewer (`cr-review-code-and-quality`)
- **Fast-Path Lọc sạch Git Diff:**
  Trước khi đưa diff vào ngữ cảnh review:
  ```javascript
  import { cleanDiffForReview } from './scripts/lib/n8n-client.js';

  const cleanDiff = await cleanDiffForReview(rawDiffText);
  // Loại bỏ 100% lockfiles, assets, build artifacts; phân chia theo tầng Domain, API, Database, Tests.
  ```

### 3.4. Phân Hệ Security Auditor (`security-code-audit`)
- **Fast-Path Quét Lỗ Hổng & Secret:**
  ```javascript
  import { runSecurityDigest } from './scripts/lib/n8n-client.js';

  const digest = await runSecurityDigest(projectPath);
  // Trích xuất CVEs High/Critical và cảnh báo rò rỉ secret nhạy cảm.
  ```

### 3.5. Phân Hệ Scrum Master & ChatOps (Single Router Pattern & Jira Ready-to-Test Notifier)
Hệ thống sử dụng **Mattermost** làm giao diện tương tác duy nhất (Single Entry Point):
- **Tự động hóa Standup:** Cron workflow trên n8n kích hoạt lúc 08:30 sáng, phân tích vé Jira kẹt > 3 ngày và đẩy báo cáo Markdown vào kênh Mattermost qua Incoming Webhook.
- **Jira Ready to Test Notifier:** Lắng nghe Webhook Jira, lọc task Board G.3.1 trong Active Sprint chuyển sang Ready to test, quét workspace local báo `✅/❌ Gherkin file` và `✅/❌ Autoscript test`, gửi card `### 🎯 READY TO TEST` kèm gợi ý lệnh lên Mattermost.
- **Single Router (Lệnh `/agent`):** Khai báo duy nhất một Slash Command `/agent` trên Mattermost. n8n đóng vai trò là Router, hứng toàn bộ payload text, cắt chuỗi và gọi đúng Agent Skill cục bộ thay vì phải cấu hình hàng chục lệnh nhỏ nhặt.

---

## 4. Quản Lý & Vận Hành Chi Phí 0 Đồng

1. **Khởi động n8n:**
   ```bash
   npm run n8n
   ```
2. **Khởi động kèm Tunnel (nhận Webhook ngoài Internet):**
   ```bash
   npm run n8n:tunnel
   ```
3. **Chạy ngầm (Daemon qua PM2):**
   ```bash
   npm run n8n:bg
   ```

---

## 5. Quy Tắc Bất Biến Về An Toàn GitLab (GitLab Read-Only Boundary)

> ⚠️ **QUY TẮC BẢO MẬT TUYỆT ĐỐI (NON-NEGOTIABLE):**
> Các quy trình n8n **TUYỆT ĐỐI KHÔNG** được thực hiện bất kỳ hành động ghi nào (`POST`, `PUT`, `DELETE`, `PATCH`) lên GitLab, ngoại trừ chính repository `agent-skills` (khi được user phê duyệt).

1. **Nghiêm cấm ghi dữ liệu lên các dự án/microservices trên GitLab:**
   - ❌ **KHÔNG** comment vào Merge Request, Commit hay Issue trên GitLab.
   - ❌ **KHÔNG** push commit, tạo branch, approve hoặc merge bất kỳ branch nào trên GitLab.
   - ❌ **KHÔNG** trigger pipeline ghi hoặc thay đổi trạng thái CI/CD của các repo dự án.
2. **Quyền hạn cho phép duy nhất với GitLab:**
   - ✅ **CHỈ ĐỌC (Read-Only):** Lắng nghe Webhook sự kiện (push, MR) để kích hoạt git fetch/pull nội bộ phục vụ việc đọc code.
   - ✅ **Chỉ đọc qua GET API:** Đọc diff, commit log, file content.
3. **Ngoại lệ duy nhất (`agent-skills`):**
   - Chỉ duy nhất repository mã nguồn của chính dự án này (`agent-skills`) được phép commit/push theo đúng quy trình **Git Workflow Branch-based** (Section 5.1 AGENTS.md) SAU KHI người dùng trực tiếp review và chấp thuận. Không bao giờ tự ý push/merge ngầm qua n8n.

---

## 6. Chiến Lược Sử Dụng AI Model (Gemini) trên n8n

Dự án tích hợp mô hình **Antigravity** trực tiếp vào các luồng workflow của n8n qua node HTTP Request gọi Google AI Studio API:

**Endpoint chuẩn:**
```
https://generativelanguage.googleapis.com/v1beta/models/antigravity:generateContent?key={{ $env.GEMINI_API_KEY }}
```

1. **AI Intent Recognition (Fuzzy Matching):**
   - Áp dụng tại luồng Single Router (Mattermost). Thay vì match text cứng nhắc, n8n đẩy câu lệnh của người dùng (VD: *"chạy giùm test vé G3PTP-17059"*) vào Antigravity.
   - Trả về JSON chuẩn: `{"intent": "test", "params": {"issueKey": "G3PTP-17059"}}`.
   - Dùng `system_instruction` + `responseMimeType: "application/json"` để đảm bảo output là JSON thuần túy (không cần regex cleanup).
2. **Help Menu & Mattermost Message Attachments:**
   - Nếu AI nhận diện ý định là "hỏi đáp / danh sách lệnh", n8n tự động chặn luồng gọi terminal và trả về tin nhắn Mattermost.
3. **Phân bổ tác vụ AI hiệu quả:**
   - **`Antigravity`** ← Model duy nhất đang dùng: Tốc độ cực cao (<1s), Free tier 100 req/ngày, đủ cho mọi tác vụ trong dự án này (Intent classifier, Parse JSON, Tóm tắt, Làm sạch ADF).

> 📖 **Hướng dẫn chi tiết kết nối + test:** `docs/guides/installation-guide.md`

---

## 7. Hướng Dẫn Cấu Hình Mattermost + Slash Command `/agent`

> 📖 **Xem hướng dẫn đầy đủ từng bước tại:** `docs/guides/installation-guide.md` (Phần Cài đặt n8n & Mattermost)

Tóm tắt nhanh:

1. **Incoming Webhook** (n8n → Mattermost):
   ```env
   MATTERMOST_WEBHOOK_URL=https://your-mattermost.com/hooks/xxx-yyy-zzz
   ```
   Dùng trong n8n: `{{ $env.MATTERMOST_WEBHOOK_URL }}`

2. **Slash Command** `/agent` (Mattermost → n8n):
   - Request URL: `https://<tunnel-url>/webhook/mattermost-router`
   - Method: `POST`
   - Xem `docs/guides/installation-guide.md` để biết cách tạo.

3. **n8n Tunnel** (khi Mattermost Cloud hoặc khác mạng nội bộ):
   ```bash
   npm run n8n:tunnel    # Built-in tunnel, URL thay đổi mỗi lần restart
   # Hoặc dùng ngrok/Cloudflare Tunnel cho URL cố định
   ```
   Xem `docs/guides/installation-guide.md` để biết chi tiết.
