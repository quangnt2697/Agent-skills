# Git Workflow — Branch-based Development

## Quy tắc Chính

**BẮT BUỘC:**
- ❌ KHÔNG BAO GIỜ commit trực tiếp vào nhánh chính (`main`/`master`)
- ✅ MỌI thay đổi code phải qua feature branch
- ✅ CHỈ merge vào main SAU KHI user approve và test pass

## Workflow Chuẩn

### Bước 1: Tạo Feature Branch

Khi bắt đầu code hoặc fix liên quan đến code app, agent BẮT BUỘC tạo branch mới:

```bash
# Nếu có issueKey (VD: JIRA-123)
git checkout -b feature/{issueKey}

# Nếu không có issueKey, dùng tên chức năng (kebab-case)
git checkout -b feature/{feature-name}

# Ví dụ:
git checkout -b feature/JIRA-456
git checkout -b feature/add-order-validation
git checkout -b fix/null-pointer-in-login
```

**Naming convention:**
- `feature/` — tính năng mới
- `fix/` — sửa bug
- `refactor/` — refactor code không thay đổi behavior
- `test/` — thêm test case
- `docs/` — chỉ thay đổi documentation

### Bước 2: Code & Verify (KHÔNG commit giữa chừng)

Agent tiến hành:
1. ✅ Viết code
2. ✅ Chạy test (`npm test`, `pytest`, v.v.)
3. ✅ Chạy build nếu có
4. ✅ Chạy lint/typecheck nếu có
5. ❌ **KHÔNG commit** sau mỗi increment nhỏ

**Lý do:** Commit chỉ xảy ra SAU KHI toàn bộ task hoàn thành và user approve.

### Bước 3: Trình bày Kết quả cho User

Sau khi hoàn thành toàn bộ task, agent trình bày:

```markdown
## ✅ Hoàn thành: [Tên task]

**Branch:** `feature/{issueKey}` hoặc `feature/{feature-name}`

**Thay đổi:**
- [Liệt kê file đã sửa/thêm/xóa]

**Verification:**
- [x] Tests: 15 passed, 0 failed
- [x] Build: Success
- [x] Lint: No errors

**Kiểm tra thủ công:**
- [Hướng dẫn user cách test thủ công nếu cần]

**Sẵn sàng merge?** (Chờ user trả lời "Yes" hoặc "Approve")
```

### Bước 4: Commit & Merge (CHỈ KHI user approve)

**Sau khi user xác nhận "Yes", "Approve", "OK":**

```bash
# Stage tất cả thay đổi
git add .

# Commit với message rõ ràng
git commit -m "[{issueKey}] {Short description}

- {Chi tiết thay đổi 1}
- {Chi tiết thay đổi 2}

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"

# Switch về main
git checkout main

# Merge feature branch (fast-forward nếu có thể)
git merge --no-ff feature/{branch-name}

# Xóa feature branch (optional, hỏi user trước)
git branch -d feature/{branch-name}
```

**Nếu user yêu cầu sửa:**
- Agent tiếp tục sửa trên branch hiện tại
- Lặp lại Bước 2 → Bước 3 → Bước 4

## Các Tình huống Đặc biệt

### Tình huống 1: Task quá lớn, cần nhiều ngày

**Giải pháp:** Chia thành sub-tasks với sub-branches

```bash
# Main feature branch
git checkout -b feature/JIRA-789-order-system

# Sub-task 1
git checkout -b feature/JIRA-789-order-system/validation
# ... code xong, user approve
git checkout feature/JIRA-789-order-system
git merge feature/JIRA-789-order-system/validation

# Sub-task 2
git checkout -b feature/JIRA-789-order-system/api
# ... code xong, user approve
git checkout feature/JIRA-789-order-system
git merge feature/JIRA-789-order-system/api

# Cuối cùng, merge main feature vào main
git checkout main
git merge --no-ff feature/JIRA-789-order-system
```

### Tình huống 2: Conflict với main

```bash
# Update main trước
git checkout main
git pull origin main

# Rebase feature branch
git checkout feature/{branch-name}
git rebase main

# Nếu có conflict, agent BẮT BUỘC DỪNG và hỏi user:
# "Có conflict giữa feature branch và main. Bạn muốn tôi:
#  1. Merge thủ công (giữ cả 2 thay đổi)
#  2. Ưu tiên feature branch
#  3. Ưu tiên main
#  4. Để bạn tự resolve"
```

### Tình huống 3: Cần rollback

```bash
# Nếu user nói "revert" hoặc "rollback" SAU KHI đã merge:
git revert <commit-hash>

# Nếu CHƯA merge, chỉ cần:
git checkout main
git branch -D feature/{branch-name}  # Xóa branch và mọi thay đổi
```

## Checklist cho Agent

Trước khi thông báo "Hoàn thành":

- [ ] Đã tạo feature branch với tên đúng convention
- [ ] Tất cả tests pass
- [ ] Build thành công (nếu có)
- [ ] Lint/typecheck pass (nếu có)
- [ ] CHƯA commit vào Git
- [ ] Đã chuẩn bị message trình bày cho user
- [ ] CHỜ user approve trước khi commit & merge

## Anti-patterns (TUYỆT ĐỐI TRÁNH)

❌ **KHÔNG:**
- Commit sau mỗi file thay đổi
- Commit với message chung chung "WIP", "fix", "update"
- Merge vào main mà chưa có user approve
- Push force lên main
- Xóa feature branch trước khi merge

✅ **NÊN:**
- Một feature branch = một task hoàn chỉnh
- Một commit message = tóm tắt rõ ràng toàn bộ thay đổi
- Merge chỉ sau khi test pass + user approve
- Giữ feature branch cho đến khi merge xong

## Tích hợp với Skills

### Skill: `incremental-implementation`

**TRƯỚC ĐÂY:** Mỗi increment một commit
**BÂY GIỜ:** Mỗi increment chỉ verify (test + build), KHÔNG commit

Sửa line 41 trong `skills/incremental-implementation/SKILL.md`:
```markdown
# Old
4. **Commit** -- lưu lại tiến độ với một message mô tả đàng hoàng

# New
4. **Verify & Continue** -- xác nhận increment hoạt động tốt, ghi nhận trong working memory, tiếp tục increment tiếp theo
```

### Skill: `planning-and-task-breakdown`

Output `tasks/plan.md` và `tasks/todo.md` KHÔNG cần commit riêng.
Chỉ commit KHI hoàn thành toàn bộ plan + user approve để bắt đầu code.

### Command: `/build auto`

**TRƯỚC ĐÂY:** Commit sau mỗi task
**BÂY GIỜ:** 
1. Tạo feature branch
2. Chạy tất cả tasks
3. Verify toàn bộ
4. Trình bày kết quả cho user
5. Commit 1 lần duy nhất SAU KHI user approve

## Ví dụ Hoàn chỉnh

```bash
# User: "Implement login feature theo JIRA-123"

# Agent:
# 1. Tạo branch
$ git checkout -b feature/JIRA-123

# 2. Code (nhiều file, nhiều increment)
# - Viết login API endpoint
# - Viết login UI component
# - Viết unit tests
# - Viết integration tests

# 3. Verify
$ npm test
# ✅ 12 passed

$ npm run build
# ✅ Build successful

# 4. Trình bày cho user
Agent: "✅ Hoàn thành: Login feature theo JIRA-123
  Branch: feature/JIRA-123
  Files changed: 8 files
  Tests: 12 passed
  Build: Success
  
  Sẵn sàng merge vào main? (Yes/No)"

# User: "Yes"

# 5. Commit & Merge
$ git add .
$ git commit -m "[JIRA-123] Implement login feature with email/password

- Add POST /api/auth/login endpoint with JWT token
- Add LoginForm component with validation
- Add 12 unit tests covering happy path and error cases
- Update API documentation

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"

$ git checkout main
$ git merge --no-ff feature/JIRA-123
$ git branch -d feature/JIRA-123

Agent: "✅ Đã merge feature/JIRA-123 vào main và xóa feature branch."
```

## Tổng kết

**Nguyên tắc vàng:**
1. **Một feature branch = Một task hoàn chỉnh**
2. **Verify nhiều lần, commit một lần**
3. **Merge chỉ sau khi user approve**
4. **Main branch luôn clean và stable**
