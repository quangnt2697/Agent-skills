# Chiến Lược Lọc Tĩnh & Chia Cụm File (Deterministic Filtering & Smart Bundling)

Tài liệu này định nghĩa quy chuẩn kỹ thuật tất định (deterministic engineering) nhằm giải quyết 2 điểm yếu phổ biến nhất của AI Code Review: **lãng phí token do nạp file rác** và **bỏ sót file (cut corners) khi Changeset / Pull Request quá lớn**.

---

## 1. Bộ Lọc Loại Trừ Tĩnh (Deterministic Pre-filtering)

Trước khi đọc nội dung diff chi tiết, Agent **BẮT BUỘC** loại trừ các file nằm trong danh mục sau khỏi danh sách cần phân tích chuyên sâu:

### A. Danh mục Tự động Bỏ qua (Exclude List)
| Phân loại | Mẫu đường dẫn (Glob Patterns) | Lý do loại trừ |
| :--- | :--- | :--- |
| **Package Lockfiles** | `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `go.sum`, `Cargo.lock`, `composer.lock`, `poetry.lock` | Dữ liệu sinh tự động, kích thước cực lớn, gây cạn kiệt token |
| **Generated Code & Mappings** | `*.min.js`, `*.min.css`, `*.map`, `*.pb.go`, `*_pb2.py`, `*.generated.*`, `build/**`, `dist/**`, `out/**` | Code do máy biên dịch hoặc code generator sinh ra |
| **Binary & Media Files** | `*.png`, `*.jpg`, `*.jpeg`, `*.gif`, `*.ico`, `*.svg`, `*.pdf`, `*.jar`, `*.exe`, `*.bin`, `*.wasm` | File nhị phân không thể review logic |
| **Vendor & Third-party** | `node_modules/**`, `vendor/**`, `.venv/**`, `third_party/**` | Thư viện bên ngoài, không thuộc phạm vi review nội bộ |
| **IDE & Temporary Files** | `.idea/**`, `.vscode/**`, `*.swp`, `.DS_Store`, `tmp/**` | Cấu hình máy trạm cá nhân |

### B. Quy tắc Báo cáo Độ Bao Phủ (Coverage Accounting)
- Không được âm thầm bỏ qua bất kỳ file nào.
- Mọi file bị loại trừ phải được ghi nhận rõ ràng trong phần tóm tắt:
  `Tự động bỏ qua: N files (K lockfile, M generated code, P binary)`
- **Ngoại lệ xem xét:** Nếu PR *chỉ* bao gồm thay đổi trên lockfile/config, ghi nhận: *"PR chỉ thay đổi lockfile/dependencies tự động — xác nhận không chứa logic nghiệp vụ cần review."*

---

## 2. Chiến Lược Chia Cụm Ngữ Nghĩa (Smart File Bundling)

Khi một Pull Request / Changeset có **từ 6 files mã nguồn trở lên**, tuyệt đối **KHÔNG** nhồi nhét toàn bộ diff của tất cả các file vào một lượt gọi prompt duy nhất. Điều này sẽ khiến LLM bị quá tải ngữ cảnh, dẫn đến hiện tượng trôi vị trí (position drift) và bỏ sót các file thứ cấp.

Thay vào đó, áp dụng chiến lược **Chia để trị (Divide-and-Conquer)** bằng cách phân chia changeset thành các **Cụm ngữ nghĩa (FileGroups)**, tối đa **5 – 8 files/cụm**:

### Quy tắc Gom Cụm Ngữ Nghĩa (Grouping Rules)
1. **Cụm 1: Data & Persistence (Dữ liệu & Lược đồ)**
   - Files: `migrations/**`, `models/**`, `entities/**`, `schemas/**`, `dto/**`, `*mapper*.xml`
   - Mục tiêu: Kiểm tra toàn vẹn dữ liệu, index, quan hệ khóa ngoại, tương thích ngược.
2. **Cụm 2: Business Logic & Unit Tests (Nghiệp vụ & Kiểm thử)**
   - Files: `services/**`, `usecases/**`, `helpers/**` đi kèm với file test tương ứng (`*.test.ts`, `*_test.go`, `test_*.py`).
   - Mục tiêu: Luôn gom file implementation và file unit test cùng một cụm để đối soát tính đúng đắn và độ bao phủ kiểm thử.
3. **Cụm 3: API, Routing & Specs (Giao tiếp & Đặc tả)**
   - Files: `controllers/**`, `routes/**`, `handlers/**`, `openapi.yaml`, `swagger.json`.
   - Mục tiêu: Kiểm tra validation đầu vào, mã lỗi HTTP, phân quyền, tính bảo mật endpoint.
4. **Cụm 4: UI Components & Styles (Giao diện)**
   - Files: `components/**`, `views/**`, `pages/**`, `*.css`, `*.scss`.
   - Mục tiêu: Kiểm tra re-render thừa, hooks lifecycle, khả năng tiếp cận (a11y), responsive.
5. **Cụm 5: Configuration & i18n (Cấu hình & Đa ngôn ngữ)**
   - Files: `*.properties`, `locales/**`, `*.yaml` cấu hình, file env template.
   - Mục tiêu: Đồng bộ key ngôn ngữ (`message_en.properties` cùng `message_vi.properties`), kiểm tra định dạng cấu hình.

---

## 3. Quy Trình Thực Thi Từng Cụm (Bundle Execution Loop)

Với mỗi cụm file (FileGroup):
1. **Đọc Diff của Cụm:** Lấy diff riêng cho các file trong cụm (`git diff HEAD -- <file1> <file2>...`).
2. **Nạp Ruleset tương ứng:** Chỉ nạp các quy tắc liên quan đến loại file trong cụm (xem `language-and-domain-rules.md`).
3. **Thực hiện Review:** Ghi nhận các findings của cụm vào danh sách tạm thời.
4. **Đánh dấu trạng thái:** Xác nhận 100% file trong cụm đã được `reviewed` hoặc `skipped` với lý do cụ thể.
5. **Tổng hợp:** Sau khi duyệt hết tất cả các cụm, chuyển toàn bộ findings sang **Bước Fact-Checking (Lọc phản tư)** trước khi xuất báo cáo.
