# Hướng dẫn áp dụng (Adoption Guide): Dự án mới vs. Codebase đã có sẵn

Cách triển khai agent-skills phụ thuộc rất nhiều vào việc codebase của bạn đang ở giai đoạn nào trong vòng đời của nó. Một dự án mới toanh (greenfield) có thể áp dụng toàn bộ vòng đời ngay từ commit đầu tiên. Ngược lại, một codebase đã có lịch sử nhiều năm (brownfield) cần một lộ trình áp dụng từng bước, tôn trọng những gì đã tồn tại, các quy ước hiện có, các quyết định không được ghi chép lại, và sự thiếu vắng test coverage ở những nơi mà bạn thà không đụng vào còn hơn là đụng vào một cách mù quáng.

Hướng dẫn này bao gồm cả hai lộ trình. Để biết cơ chế cài đặt, hãy xem [getting-started.md](getting-started.md) và hướng dẫn thiết lập cho từng công cụ. Để biết mỗi skill làm gì, hãy xem [danh mục skill trong README](../README.md#all-24-skills).

---

## Bạn đang ở lộ trình nào?

| Dấu hiệu                     | Dự án mới (Greenfield)          | Codebase cũ (Brownfield)                     |
| -------------------------- | ------------------------------- | -------------------------------------------- |
| Tuổi đời codebase          | Vài ngày đến vài tuần           | Vài tháng đến vài năm                        |
| Độ phủ test (coverage)     | Bạn kiểm soát từ ngày 1         | Không đồng đều; nhiều chỗ không có test      |
| Quy ước (Conventions)      | Tự định nghĩa trong lúc làm     | Đã thiết lập sẵn, thường không có tài liệu   |
| Thói quen của team         | Đang hình thành                 | Đã ăn sâu (dù tốt hay xấu)                   |
| Rủi ro khi agent làm hỏng  | Bán kính ảnh hưởng thấp         | Có thể làm hỏng những thứ không ai biết sửa  |
| Chiến lược áp dụng         | **Toàn bộ vòng đời, ngay lập tức** | **Từng bước, ưu tiên xác minh trước**       |

Nếu dự án của bạn nằm đâu đó ở giữa (một dự án non trẻ nhưng đã release lên production), hãy bắt đầu với lộ trình cho codebase cũ rồi tăng tốc, cả hai cuối cùng cũng sẽ hội tụ về cùng một đích đến.

---

## Lộ trình A | Dự án mới: toàn bộ vòng đời ngay từ ngày đầu

Một dự án mới toanh là kịch bản lý tưởng nhất: không có những hành vi (behavior) cũ kỹ nào cần phải bảo tồn, vì vậy các cổng kiểm soát chất lượng (quality gates) của các skills hầu như không tốn chi phí gì và tích lũy giá trị ngay từ commit đầu tiên.

### Ngày 0 | Cài đặt và kết nối

1. Cài đặt gói (`npx skills add addyosmani/agent-skills`, hoặc dùng tích hợp có sẵn cho công cụ của bạn, xem [getting-started.md](getting-started.md)).
2. Load `meta-using-agent-skills` (skill siêu cấp) để agent có thể tự định tuyến công việc tới đúng skill cần thiết.
3. Thêm một file quy tắc dự án ngắn gọn (`CLAUDE.md`, `.cursorrules`, v.v.) ghi rõ techstack, các lệnh build, và các ranh giới. Tham khảo `meta-context` để biết nên viết gì vào đó.

### Ngày 0 | Định nghĩa (Define) trước khi code (Build)

Hãy chạy vòng đời theo đúng thứ tự cho tính năng thực sự đầu tiên của dự án:

```
/tech-spec   →  SPEC.md            (dev-spec-driven-development)
/plan   →  tasks/plan.md      (planning-and-task-breakdown)
/build  →  từng lát cắt một    (incremental-implementation + dev-test-driven-development)
/review →  trước mọi lần merge (review-code-and-quality)
```

`/build auto` rất phù hợp cho dự án mới: bạn duyệt (approve) cái plan một lần và mỗi task sau đó vẫn được chạy theo kiểu test-driven và commit riêng biệt. Các tạo tác (artifacts) như spec và plan (`SPEC.md`, `tasks/`) là các tài liệu sống (living documents), hãy giữ chúng trong version control khi tính năng đang được phát triển.

### Ngay từ đầu, hãy coi các skills này là luôn-bật (always-on)

- **dev-test-driven-development**, món nợ coverage là rẻ nhất nếu tránh nó ngay từ con số 0.
- **git-workflow-and-versioning**, các commit nguyên tử (atomic commits) và các thay đổi tầm 100 dòng là thói quen, không phải thứ có thể làm bù về sau.
- **dev-security**, xác thực (auth), xác thực đầu vào (input validation), và xử lý bí mật (secrets) là những yếu tố thuộc về cấu trúc; chắp vá chúng vào sau này sẽ trở thành một đợt di dân (migration) cực nhọc.
- **documentation-and-adrs**, các quyết định kiến trúc đầu tiên lại chính là những thứ mà không ai nhớ nổi _tại sao_ lại làm vậy vào hai năm sau. Một file ADR bây giờ sẽ ngăn chặn cuộc khảo cổ học trong codebase cũ như được mô tả ở Lộ trình B.

### Bổ sung dần khi dự án lớn lên

| Khi nào                             | Load (Nên dùng)                                               |
| ----------------------------------- | ------------------------------------------------------------- |
| Tạo public API hoặc ranh giới module đầu tiên| `dev-api-design`                                    |
| Các công việc giao diện (UI) đầu tiên | `dev-frontend-engineering` (+ `dev-browser-testing-with-devtools`) |
| CI pipeline đầu tiên                 | `ci-cd-and-automation`                                        |
| Có yêu cầu tối ưu hiệu năng          | `dev-performance`                                    |

### Các Phản-mẫu (Anti-patterns) ở Dự án mới

- **Bỏ qua `/tech-spec` vì "đây chỉ là bản prototype".** Các prototypes thường sẽ trở thành products (sản phẩm thật). Bản spec là tạo tác rẻ nhất bạn có thể viết ra cho codebase này.
- **Load toàn bộ 24 skills vào mọi phiên làm việc.** Nó lãng phí context và làm loãng đi những skills thực sự quan trọng lúc đó. Hãy load theo giai đoạn (phase); và hãy để `meta-using-agent-skills` làm nhiệm vụ định tuyến (route).
- **Trì hoãn observability (tính quan sát) cho đến khi "có cái gì đó để quan sát".** Hãy gắn công cụ theo dõi ngay khi bạn code, việc chắp vá các cấu trúc log về sau là một vấn đề của Lộ trình B mà bạn đang tự tạo ra cho mình.

---

## Lộ trình B | Codebase cũ: áp dụng từng bước, ưu tiên xác minh trước

Trong một codebase đã được thiết lập từ lâu, hồ sơ rủi ro (risk profile) bị đảo ngược: mối nguy hiểm không phải là việc xây dựng sai thứ, mà là _thay đổi_ thứ mà hành vi của nó chưa từng được ai đặc tả đầy đủ. Do đó, thứ tự áp dụng phải bắt đầu từ các skills dùng để **đọc và bảo vệ** codebase, rồi sau đó mới chuyển sang các skills dùng để **thay đổi** nó.

### Giai đoạn 1 | Ngữ cảnh và các skills chỉ-đọc (read-only)

Mục tiêu: agent phải hiểu codebase trước khi nó sửa đổi bất cứ thứ gì.

1. **`meta-context` luôn đi đầu.** Viết file quy tắc dự án mô tả những quy ước có thật, những thứ nằm trong code, chứ không phải những thứ ghi trên wiki. Bao gồm các lệnh build/test, ý nghĩa các thư mục, các bãi mìn đã biết ("đừng đụng vào `legacy/billing`, nó không có tests và có tới ba cái workarounds chưa ai biết").
2. **`review-code-and-quality` đối với các thay đổi sắp vào.** Việc review có rủi ro bằng 0 và mang lại giá trị ngay lập tức: cách review 5 phương diện và các nhãn mức độ nghiêm trọng (giúp tách biệt rõ cái gì chặn việc merge - Critical/Required - với cái gì không chặn) có thể hoạt động tốt trên bất kỳ Pull Request nào, bất kể tình trạng của codebase ra sao.
3. **`dev-debugging` cho những con bugs mà đằng nào bạn cũng phải sửa.** Quy trình khoanh vùng 5 bước (tái hiện → cô lập → thu hẹp → sửa lỗi → rào chắn) tỏa sáng rực rỡ trong những đoạn code lạ lẫm, và bước "rào chắn (guard)" chính là lúc bạn bắt đầu xây dựng bộ test chống thoái lui (regression suite) mà dự án đang thiếu.
4. **`dev-doubt-driven-development` làm mạng lưới an toàn.** Code cũ là kịch bản điển hình của "code không quen, cái giá của sự sai lầm rất cao" mà skill này nhắm tới. Việc đánh giá đối kháng (adversarial review) dựa trên context mới (fresh-context) đối với các tuyên bố của agent về cách hệ thống cũ hoạt động sẽ bắt được những trường hợp "ảo giác tự tin" (confident hallucinations) trước khi chúng biến thành các commits.

### Giai đoạn 2 | Tests trước khi thay đổi

Mục tiêu: mọi khu vực mà agent sắp đụng tới đều phải có một mạng lưới an toàn trước đã.

- **`dev-test-driven-development`, áp dụng có chọn lọc.** Đừng cố hướng tới độ phủ toàn cục (global coverage); hãy hướng tới độ phủ _ở những nơi có kế hoạch thay đổi_. Đối với các hành vi cũ không có test, hãy viết các bài characterization tests (các tests ghim chặt lại những gì code hiện tại đang làm, dù đúng hay sai), trước khi sửa bất cứ thứ gì. Áp dụng quy tắc Beyonce: nếu agent thích một hành vi đủ để phụ thuộc vào nó, nó nên viết test cho hành vi đó.
- **`code-simplification` trên những điểm nóng (hotspots) tệ nhất.** Hàng rào Chesterton (Chesterton's Fence) là nguyên tắc hoạt động ở đây: skill này ép agent phải hiểu _tại sao_ đoạn code đó lại tồn tại trước khi quyết định xóa nó đi. Việc đơn giản hóa nhưng vẫn giữ nguyên hành vi cộng thêm characterization tests là cách an toàn nhất (lowest-risk) để làm cho code cũ có thể thay đổi được.
- **`git-workflow-and-versioning` ở mọi nơi.** Các commit nguyên tử nhỏ (small atomic commits) quan trọng _hơn_ trong codebase cũ: khi một thay đổi vào code cũ làm hỏng một thứ gì đó tinh vi, một commit cỡ 100 dòng có thể dễ dàng dùng git bisect để khoanh vùng; còn một commit "hiện đại hóa" cỡ 2000 dòng thì không.

### Giai đoạn 3 | Việc mới (New work) được chạy toàn bộ vòng đời

Mục tiêu: áp dụng hai tốc độ chạy (two-speed), code cũ tiếp tục bị kìm kẹp dưới cơ chế Giai đoạn 1–2; **tính năng mới được hưởng quy trình của Greenfield**.

- Làm tính năng mới trong codebase cũ? `/tech-spec → /plan → /build → /review`. Phần ranh giới (boundaries) của spec chính là nơi bạn khai báo xem bề mặt code cũ nào mà tính năng mới này được phép hoặc không được phép chạm vào.
- **`dev-api-design` tại các đường nối (seams).** Khi code mới phải giao tiếp với code cũ, hãy thiết kế các ranh giới hợp đồng (contract-first). Định luật Hyrum (Hyrum's Law) không phải là lý thuyết suông trong một codebase nhiều năm tuổi, luôn có ai đó hoặc thứ gì đó đang phụ thuộc vào mọi hành vi có thể quan sát được, kể cả những con bugs.
- **`dev-security` khởi đầu bằng một đợt audit, rồi biến nó thành một cổng chặn (gate).** Chạy nó một lần trên toàn bộ bề mặt tấn công hiện tại (xác thực, xử lý đầu vào, dependencies - riêng việc audit dependency cũng đã đủ bù đắp công sức bỏ ra rồi), ghi nhận những gì tìm được, sau đó ép nó thành quy tắc chặn đứng các thay đổi mới nếu vi phạm.

### Giai đoạn 4 | Trả nợ, gỡ bỏ, quan sát

- **`deprecation-and-migration`** là kỹ năng tuyệt hảo cho codebase cũ: coi code là tiêu sản, loại bỏ code chết (zombie-code), cảnh báo deprecated, mang lại cho bạn một phương pháp có kỷ luật để thu hẹp dần bề mặt code cũ thay vì chỉ bọc nó lại bằng một lớp mới.
- **`dev-performance`** khi các vấn đề thoái lui (regressions) trở nên quan trọng, quy tắc "phải đo đạc trước" (measure-first) của nó giúp bạn tránh được cái bẫy kinh điển: cố tối ưu những đoạn code cũ mà thực chất chưa bao giờ là nút thắt cổ chai (bottleneck) của hệ thống.

### Các Phản-mẫu (Anti-patterns) ở Codebase cũ

- **Áp dụng kiểu "Big bang" (làm một cục to đùng).** Ném nguyên toàn bộ vòng đời vào một codebase cũ kỹ ngay từ ngày đầu tiên sẽ sinh ra các bản specs cho đống code đã tồn tại từ đời nào, và thực hiện refactor mà không hề có các mạng lưới an toàn (safety nets). Hãy sắp xếp nó theo đúng trình tự.
- **Để agent refactor code không có test.** Không có characterization tests thì cấm tuyệt đối refactor. Đây là đường tắt đắt giá nhất khi áp dụng quy trình vào codebase cũ.
- **Bỏ qua `meta-context` vì "bản thân code chính là tài liệu rồi".** Agent sẽ tự suy luận các quy ước từ cái file tồi tệ nhất mà vô tình nó đọc được. Hãy chỉ cho nó thấy các quy ước thực sự là gì.
- **Mặc định coi hành vi của hệ thống cũ là sai.** Hàng rào Chesterton: cái vòng lặp retry kỳ quặc kia có thể là thứ đang gồng gánh cả hệ thống. Phải hiểu nó đã, rồi mới được thay đổi.
- **Không siết chặt kỷ luật.** Việc áp dụng quy trình phải làm cho chất lượng tăng lên đơn điệu (không được thụt lùi): mỗi giai đoạn phải cài cắm thêm một cổng chặn không được phép bỏ qua. Nếu sau một tháng mà bạn không thể kể tên được quy tắc nào hiện đang được ép buộc (enforced) mà trước đây thì không, thì quá trình triển khai đã bị đình trệ.

---

## Hai lộ trình hội tụ

Cả hai đều kết thúc ở cùng một trạng thái ổn định (steady state): `/tech-spec → /plan → /build → /review` cho công việc mới, luôn bật kỷ luật TDD và git, luôn có cổng review trước khi merge, và các skills được load theo từng giai đoạn (phase) thay vì nhét chung một cục. Greenfield đến đích trong vài ngày; brownfield đến đích trong một quý, và điểm khác biệt chính xác nằm ở các mạng lưới an toàn (ngữ cảnh, characterization tests, ranh giới) mà codebase cũ chưa từng có.

|                        | Dự án mới (Greenfield)         | Codebase cũ (Brownfield)                 |
| ---------------------- | ------------------------------ | ---------------------------------------- |
| Skill đầu tiên được load| `meta-using-agent-skills` + `/tech-spec` | `meta-context`                    |
| Giá trị đầu tiên tạo ra | Tính năng đầu tiên có spec, test | Review không rủi ro & sửa bug an toàn    |
| Vị thế của TDD           | Phổ quát từ commit số 1        | Chọn lọc: viết test ở nơi định thay đổi  |
| Quy tắc Refactoring     | Hiếm (chưa có gì để refactor)  | Luôn phải có Characterization tests trước|
| Anti-pattern rủi ro nhất| Bỏ qua việc viết spec          | Refactor code chưa có test               |
| Thời gian đạt full vòng đời| Ngày 1                     | ~Một quý, có 2 tốc độ chạy xen kẽ        |
