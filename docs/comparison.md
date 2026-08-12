<!--
  Tài liệu này dành cho các lập trình viên đang đánh giá (evaluate) dự án. Nó KHÔNG phải là một skill và
  không nhằm mục đích được load vào context của agent. Nó nằm trong thư mục docs/ để
  giữ nó tách biệt khỏi tập tin làm việc (working set) của agent.
-->

# So sánh agent-skills

Mọi người thường hỏi **agent-skills** liên quan như thế nào so với hai bộ sưu tập "skills cho coding agents" được nhắc đến nhiều nhất khác: **Superpowers** (của Jesse Vincent / obra) và **Matt Pocock's skills**. Cả ba đều tốt, chia sẻ nhiều DNA chung, và đều đáng để học hỏi. Trang này là một bản đồ trung thực về việc chúng được *định hình* khác nhau ra sao, để bạn có thể chọn cái phù hợp với cách bạn làm việc, hoặc vay mượn từ cả ba.

> **TL;DR** — Chúng tối ưu hóa cho những thời điểm khác nhau. **agent-skills** tổ chức *toàn bộ vòng đời sản phẩm* (Define, Plan, Build, Verify, Review) với các review personas, các hàng rào chống ngụy biện (anti-rationalization), và một bộ khung đánh giá (eval framework) nằm ngay trong repo để kiểm tra xem các skills có thực sự định tuyến và hành xử đúng không. **Superpowers** thiên về các phiên chạy *tự chủ, nặng về suy luận* (reasoning-heavy) với các subagents, một luồng pipeline nghiêm ngặt và cách ly bằng git-worktree. **Matt Pocock's skills** là một *bộ công cụ Claude Code sắc bén, mang đậm quan điểm cá nhân*, được đúc kết từ luồng làm việc hàng ngày của một chuyên gia, với điểm nhấn là vòng lặp tra khảo "grill me". Không có cái nào là "tốt nhất" một cách trừu tượng; điều đó phụ thuộc vào công việc trước mắt của bạn.

---

## Nhìn lướt qua

| | **agent-skills** | **Superpowers** | **Matt Pocock's skills** |
|---|---|---|---|
| **Ý tưởng cốt lõi** | Mã hóa toàn bộ vòng đời kỹ thuật senior thành các skills | Một *phương pháp luận* phát triển phần mềm hoàn chỉnh xây dựng trên các skills có thể kết hợp | Quy trình Claude Code của một chuyên gia, được mã nguồn mở và không ngừng tiến hóa |
| **Nguyên tắc tổ chức** | Các **giai đoạn (phases)** của SDLC đứng đằng sau một meta-skill định tuyến | Một vòng lặp kỷ luật duy nhất: brainstorm, plan, execute, review | Một hộp công cụ gồm các lệnh tập trung, có thể lắp ghép được |
| **Kích thước danh mục** | 24 skills bao phủ toàn bộ vòng đời | ~14 skills, đào sâu vào vòng lặp build lõi | ~30 skills, nhóm thành engineering / productivity / in-progress / deprecated |
| **Độ phủ vòng đời** | Rộng: tinh chỉnh ý tưởng, thiết kế API và UI, bảo mật, hiệu năng, CI/CD, tính quan sát, gỡ bỏ mã cũ, ADRs | Sâu nhưng hẹp: TDD, debugging, planning, review, viết skill | Nặng về Define và Build: tra khảo (grilling), PRDs, issues, TDD, kiến trúc, phân loại bug, quản lý tri thức |
| **Điểm truy cập (Entry points)** | Slash commands ánh xạ 1:1 với các giai đoạn (`/tech-spec` `/plan` `/build` `/unit-test` `/review` `/code-simplify`, cộng thêm `/webperf`), cùng với `/build auto` và `/dev-audit` (luồng Auto-fix) | Chuỗi skill pipeline (`brainstorming`, `writing-plans`, `subagent-driven-development`) | Slash commands (`/grill-me`, `/tdd`, `/to-prd`, `/diagnosing-bugs`, `/grill-with-docs`) |
| **Cơ chế khác biệt** | Các bảng Chống Ngụy Biện (Anti-rationalization) và Cờ Đỏ (Red Flags) trong mọi skill; các **personas** review song song trong `/dev-audit`; các checklists tham chiếu; một **framework đánh giá 3 tầng** trong CI | Phát triển hướng subagent với một reviewer chấm task (spec + quality) và một vòng lặp sửa lỗi; cách ly bằng git-worktree; các skills viết ra skills, được thử lửa áp lực | Lệnh sơ khai **grilling** (hỏi từng câu một, duyệt qua cây thiết kế); TDD dựa trên ranh giới (seam-based); phân chia rõ ràng giữa do user gọi và do model gọi; tích hợp công cụ theo dõi lỗi (issue-tracker) |
| **Đo lường chất lượng** | Các evals về Trigger, định tuyến và hành vi chạy đối chiếu với danh mục (trong repo, một phần trong CI) | Phương pháp luận thử lửa áp lực (Pressure-testing) là cốt lõi của triết lý; bản thân bộ eval hiện nằm ở một repo riêng biệt | Không đi kèm eval trong repo |
| **Mức độ tương thích công cụ** | Claude Code, Cursor, Gemini CLI, Antigravity, OpenCode, Windsurf, Copilot, Kiro, Codex, và CLI `npx skills` | Một trong những diện tích phủ rộng nhất và biến động nhiều nhất: Claude Code, Codex, Cursor, Copilot CLI, OpenCode, Kimi, Factory Droid, Antigravity, Pi | Claude Code là ưu tiên số 1, phân phối qua `npx skills add`; các agents khác hoạt động với độ trung thực khác nhau |
| **Quản trị (Governance)** | Tích cực review và merge các đóng góp từ cộng đồng; mọi skill đi kèm một eval | Phần lớn do một người viết; có một lượng lớn PR từ cộng đồng chưa được merge | Do một người viết, tự merge, phát triển mở công khai |
| **Phù hợp nhất cho** | Thúc đẩy một tính năng đi qua mọi giai đoạn với một điểm kiểm tra của con người ở mỗi chốt | Các công việc dài hơi, tự chủ, đòi hỏi suy luận nặng hoặc mang tính khám phá | Một vòng lặp hàng ngày thực dụng, đã qua thực chiến, mạnh nhất ở khâu lấy yêu cầu (requirements) và TDD |

*(Chúng tôi cố ý bỏ qua số lượng sao và số liệu áp dụng: chúng được trích dẫn rất khác nhau trên các blogs và thay đổi hàng tuần. Cả ba đều đang được sử dụng và bảo trì tích cực.)*

---

## Ba dự án, theo cách riêng của chúng

### Superpowers (obra)

Một *phương pháp luận* phát triển phần mềm hoàn chỉnh xây dựng trên các skills có thể kết hợp. Nó đặt cược vào **tính tự chủ và suy luận từ đầu (upfront reasoning)**. Một phiên chạy một luồng pipeline tuyến tính có chủ đích: Brainstorming kiểu Socrates để viết ra một spec có ngày tháng và chỉ cho phép bàn giao chính xác một lần; các kế hoạch chi tiết được viết ra để có thể thực thi bởi "một kỹ sư junior nhiệt huyết với tư duy thẩm mỹ kém và không có ngữ cảnh"; sau đó là quá trình thực thi do subagent đảm nhận (subagent-driven execution) nơi một subagent mới toanh sẽ implement mỗi task, và một reviewer task ký duyệt cả độ tuân thủ spec lẫn chất lượng code trước khi đóng task, với một vòng lặp sửa lỗi cho bất cứ thứ gì nó cắm cờ, và một đợt review toàn bộ branch trên model mạnh nhất ở bước cuối. Git worktrees giữ cho các luồng công việc song song được cách ly, và skill `writing-skills` của nó áp dụng TDD cho chính tài liệu: không có skill nào được đưa ra mà không có một test failing (báo lỗi) trước.

Điểm mạnh của nó là rất thật: ném cho nó một cục công việc to và quay lại với một kết quả đã được review, với các rào chắn mạnh mẽ chống lại việc agent tự biện hộ lách qua quy trình. Đổi lại của kỷ luật đó: Phạm vi phủ hẹp (nó là một phương pháp luận build vòng lặp trong, không phải một vòng đời từ bảo mật tới khi lên production), pipeline đơn nhất có thể tạo cảm giác quá nặng nề cho các thay đổi nhỏ, và định hướng gần đây là làm sao giảm bớt chi phí đó, ví dụ như gom về một task reviewer duy nhất để tăng gấp đôi tốc độ và giảm một nửa token. Điều mà cộng đồng của nó yêu cầu nhiều nhất, là khả năng thực thi bằng một nhóm (multi-agent team execution), vẫn chưa có sẵn trong hộp.

**Repo:** <https://github.com/obra/superpowers>

### Matt Pocock's skills

Matt mã nguồn mở các Claude Code skills mà anh ấy thực sự sử dụng, và bộ sưu tập này đã phát triển thành một hộp công cụ phong phú, mang đậm quan điểm cá nhân được tổ chức công khai, hoàn chỉnh với các thư mục `in-progress/` và `deprecated/` có thể nhìn thấy rõ, làm hình mẫu cho kỷ luật mà các skills thuyết giảng. Trọng tâm của nó không phải là TDD, mà là **tra khảo (grilling)**: một vòng lặp chất vấn có thể tái sử dụng, hỏi từng câu một, duyệt qua từng nhánh của cây thiết kế để giải quyết các phụ thuộc theo thứ tự, đưa ra một câu trả lời đề xuất cho mỗi câu hỏi, ưu tiên việc đọc codebase hơn là hỏi, và từ chối đi tiếp cho đến khi bạn xác nhận đã hiểu ý nhau. `grill-me` và `grill-with-docs` là những lớp bọc mỏng bên trên nó. Kỹ năng TDD cũng rất khác biệt và khá là khác thường một cách vui vẻ ("refactoring không phải là một phần của vòng lặp", nó thuộc về code review), và có sự phân chia có chủ ý giữa skills do người dùng gọi (user-invoked) và skills do model tự gọi (model-invoked) nhằm coi context của agent như một ngân sách khan hiếm.

Điểm mạnh của nó là tính chân thực và sự sắc bén: đây là cách một kỹ sư rất giỏi làm việc, không phải ý tưởng của một ủy ban về một framework, và vòng lặp lấy yêu cầu bằng grilling thực sự xuất sắc. Những sự đánh đổi: trên thực tế nó ưu tiên Claude Code nhất (các agents khác cho thấy sự thiếu mượt mà về độ tin cậy), không có evals trong repo để bắt lỗi regression, độ phủ vòng đời qua bước Build là khá mỏng, và một số skills bị gắn chặt với các conventions theo dõi cá nhân và wizard cài đặt cá nhân. Các công việc gần đây đang đẩy từ skills đơn phiên sang điều phối đa phiên thông qua các công cụ theo dõi lỗi (issue trackers) (như `wayfinder` đang được làm).

**Repo:** <https://github.com/mattpocock/skills> · xem thêm: <https://github.com/mattpocock/agent-rules-books>

### agent-skills (Dự án này)

agent-skills tổ chức **toàn bộ vòng đời sản phẩm** dưới dạng skills, với một meta-skill (`using-agent-skills`) để định tuyến một task tới đúng skill phù hợp. Mọi skill đều đi kèm một bảng **Những Sự Ngụy Biện Phổ Biến (Common Rationalizations)** (các lời bào chữa mà agent tạo ra để bỏ qua một bước, mỗi lời đều có luận điểm phản bác) và **Cờ Đỏ (Red Flags)**. Các Slash commands ánh xạ một-một tới các giai đoạn của vòng đời; `/build auto` chạy toàn bộ plan đã được duyệt trong một lần quét; và `/dev-audit` chạy song song (fan out) các **personas** review (`code-reviewer`, `security-auditor`, `qa`, `web-performance-auditor`), sau đó hợp nhất chúng lại thành quyết định go/no-go. Nó giữ một điểm kiểm tra (checkpoint) của con người ở mỗi giai đoạn, cung cấp bảy checklists tham chiếu bao gồm một Definition of Done, và chạy trơn tru trên hầu hết các công cụ agent chính với cài đặt chỉ bằng một lệnh duy nhất.

Cái mới hơn, và là điểm khác biệt hiện tại: một **framework đánh giá 3 tầng (three-tier eval framework)** nằm ngay trong repo. Tầng 1 kiểm tra cấu trúc, Tầng 2 kiểm tra xem description của mỗi skill có chứa đúng các từ vựng mà người dùng hay nói không và đảm bảo không có hai skills nào xung đột trong quá trình định tuyến (hoạt động theo tính tất định, chạy trong CI), và Tầng 3 chấm điểm thực tế dấu vết chạy của một agent so với kỳ vọng của từng skill. Cả hai dự án kia đều không đi kèm kiểu đo lường ở quy mô toàn danh mục nằm ngay trong repo như thế này. Sự đánh đổi thành thực ở phía ngược lại: agent-skills có ít "đợt chạy" cố định mang tính quan điểm hơn so với Superpowers, và cả ba đều chưa giải quyết tốt vấn đề bộ nhớ bền vững xuyên suốt các phiên (durable cross-session memory).

---

## So sánh trực diện: Superpowers vs. agent-skills

Om Mishra đã thực hiện một thử nghiệm có kiểm soát (cùng model, cùng repo, cùng prompt trong Claude Code, chỉ thay đổi skill framework), và viết bài tóm tắt:

**["Superpowers vs Agent-Skills: Faster Shipping, Safer Reasoning"](https://www.linkedin.com/pulse/superpowers-vs-agent-skills-faster-shipping-safer-reasoning-om-mishra-dzakf/)** bởi Om Mishra

Tóm tắt công bằng:

- **agent-skills** chuyển sang viết code nhanh hơn (~8 phút so với ~12 phút) và chạy **nhiều lượt validation hơn** (7 so với 5, bao gồm toàn bộ test suite). Việc validation rộng hơn đó đã bắt được một lỗi không tương thích *nằm ngoài* tính năng trực tiếp đang làm mà các tests viết riêng cho tính năng đó đã bỏ qua. Anh ấy đánh giá agent-skills nhỉnh hơn về **chiều sâu validation (validation depth)** cho task đó.
- **Superpowers** đầu tư nhiều **suy luận kiến trúc (architectural reasoning) từ đầu**, thứ mà anh ấy vẫn thích dùng làm luồng làm việc hàng ngày cho các hệ thống production đang tiến hóa và công việc mang tính khám phá khi chưa có một pattern nào được thiết lập sẵn để làm theo.
- Hiệu suất token gần như giống hệt nhau; cả hai đều phải lập lại kế hoạch (replan) một lần.

Đây chỉ là thử nghiệm một task của một lập trình viên, không phải là một benchmark, nhưng nó là minh họa cụ thể cho sự đánh đổi cốt lõi: **validation rộng rãi có kỷ luật so với suy luận nặng nề ngay từ đầu**. Kết luận của riêng anh ấy cũng rất trung thực: hãy chọn công cụ phù hợp với công việc.

---

## Cách quyết định nên dùng cái nào

Bảng "Nhìn lướt qua" cho bạn biết chúng được định hình như thế nào. Còn đây là cách để lựa chọn trên thực tế.

### Bắt đầu với hình thái công việc của bạn

- **Một tính năng hoàn chỉnh, từ đầu đến cuối?** agent-skills. Đây là bộ duy nhất trong ba bộ dẫn bạn đi từ đặc tả (spec) qua bảo mật, hiệu năng, với một chốt kiểm tra (checkpoint) ở mỗi giai đoạn, vì vậy không có gì bị bỏ qua trong quá trình review hoặc tiền kiểm (pre-flight).
- **Một cục công việc lớn, mơ hồ mà bạn muốn khoán trắng rồi đi chỗ khác?** Superpowers. Pipeline và chế độ review bằng subagent của nó được xây dựng để chạy trong một thời gian dài và trả lại kết quả đã được review cẩn thận đối chiếu với spec.
- **Một vòng lặp công việc hàng ngày nhanh gọn, tập trung, đặc biệt là chốt chặt yêu cầu (requirements) trước khi code?** Matt Pocock's skills. Vòng lặp tra khảo (grilling) là công cụ lấy yêu cầu sắc bén nhất trong cả ba, và bộ công cụ này không hề gây cản trở bạn.

### Sau đó cân nhắc những gì bạn thực sự quan tâm

- **Độ phủ rộng** (bảo mật, hiệu năng, CI/CD, quan sát hệ thống): agent-skills là lựa chọn rõ ràng; các bộ kia tập trung vào vòng lặp build bên trong.
- **Tính tự chủ xuyên suốt luồng chạy dài**: Superpowers, bởi thiết kế.
- **Thủ tục gọn nhẹ cho các thay đổi nhỏ**: Bộ toolkit của Pocock là nhẹ nhất; agent-skills cung cấp một tầng giữa (một thay đổi nhỏ có thể nhảy thẳng tới `/unit-test` và `/review`); Superpowers thì quy trình nặng nề nhất.
- **Sự tự tin rằng bản thân các skills hoạt động đúng**: agent-skills là bộ duy nhất có các evals toàn danh mục ngay trong repo, nên nếu có lỗi thoái lui về description hay routing, nó sẽ báo lỗi (fail) trong CI chứ không nổi lên dưới dạng câu hỏi bí ẩn "tại sao skill này lại không tự chạy" về sau.
- **Chất vấn yêu cầu (Requirements interrogation)**: Tính năng grilling của Pocock là bản thực thi tham chiếu mẫu mực; `ba-interview-me` của agent-skills cũng mang tinh thần tương tự và đang có thêm một chế độ hợp tác chọn-khi-cần (opt-in).
- **Độ lan tỏa trên nền tảng**: Cả agent-skills và Superpowers đều chạy mượt trên gần như mọi công cụ; Pocock thì hợp với Claude Code nhất.
- **Cổng chốt của con người ở mỗi bước so với quy trình chạy rảnh tay**: agent-skills đặt checkpoints làm mặc định; Superpowers cố tình giảm thiểu các lần check-in giữa chừng.

### Các kịch bản cụ thể

- *"Làm một API endpoint mới kèm auth, tests, và review bảo mật trước khi merge."* agent-skills: dùng `/tech-spec` tới `/review`, sau đó chạy `/dev-audit` để các personas security-auditor và qa cùng review.
- *"Refactor một hệ thống con rắc rối xuyên đêm và xem lại vào buổi sáng."* Superpowers: giao cho nó cái plan, để cho chế độ subagent-driven development và task reviewer chạy tự động.
- *"Tôi có một ý tưởng mơ hồ và cứ để agent đoán mò yêu cầu."* Dùng `grill-me` của Pocock (hoặc `ba-interview-me` của agent-skills) để ghim chặt ý định trước khi viết dòng code nào.
- *"Sửa một bug rõ ràng, theo kiểu test-first."* Dùng cái nào cũng được; cứ chọn cái nhẹ nhất mà bạn đã cài sẵn.
- *"Chuẩn hóa cách một team kỹ sư sử dụng agents trên toàn bộ repo."* agent-skills: các lệnh theo giai đoạn, các personas, và các checklists dùng chung cung cấp cho một team một hệ từ vựng chung, và các evals giúp các skills tùy biến (custom skills) luôn giữ được độ tin cậy.
- *"Tự viết skills của riêng mình và muốn biết chắc chắn là chúng kích hoạt đúng."* agent-skills, và mượn thêm kỷ luật thử lửa áp lực (pressure-testing) của Superpowers cho những skills tuyệt đối không được phép lách quy trình.

### Cá nhân (Solo) vs. Đội nhóm (Team)

Đối với lập trình viên cá nhân, gu thẩm mỹ và tính tiện dụng sẽ chiến thắng: hãy chọn cái có cấu hình mặc định khớp với cách bạn làm việc, và lựa chọn nào ít thủ tục rườm rà nhất thường sẽ được dùng nhiều nhất. Đối với một team, bài toán sẽ chuyển hướng sang cấu trúc dùng chung và các rào chắn (guardrails) mà bạn có thể ép buộc tuân thủ: các giai đoạn được đặt tên, các personas review, các checklists, và evals báo lỗi trong CI là những thứ giữ cho năm con người (và các agents của họ) cùng hội tụ về một chuẩn mực thay vì chạy năm workflows cá nhân. Đó chính là tình huống mà agent-skills được xây dựng để phục vụ, mặc dù một team hoàn toàn có thể áp dụng thêm kỷ luật review của Superpowers hay vòng lặp tra khảo của Pocock vào bên trong nó.

### Ranh giới chung (Đúng với cả ba)

Hiện tại chưa có công cụ nào giải quyết tốt được vấn đề **bộ nhớ bền vững xuyên suốt các phiên (durable cross-session memory)**: những gì một agent học được ở phiên này hiếm khi được mang sang nguyên vẹn phiên tiếp theo. Cả ba đều đang xoay quanh giải quyết nó (bằng các file ghi chép bài học, tài liệu bàn giao, các bản đồ kế hoạch dựa trên tracker). Nếu đó là nút thắt của bạn, hãy hiểu rằng bạn đang ở ranh giới ngoài cùng của những gì các công cụ này làm được hiện tại, và hãy chuẩn bị tinh thần phải tự khâu nối một vài phần lại với nhau.

---

## Kết hợp chúng

Bạn không nhất thiết phải chọn độc quyền một cái, nhưng hãy kết hợp cẩn thận. Đây là các skills định dạng Markdown, không phải runtimes, vì vậy việc chọn lọc (cherry-picking) *từng skill đơn lẻ* hoạt động rất tốt: lấy tính năng `grill-me` của Pocock, lấy một pattern cách ly của Superpowers, hoặc một checklist cụ thể nào đó đặt cạnh bộ cài chính của bạn.

Điều sẽ thất bại là việc chạy hai trong số chúng làm **bộ định tuyến (router) chính cùng một lúc**. Các meta-skills xếp chồng lên nhau sẽ đánh nhau vì trùng tên lệnh (`/tdd` được định nghĩa ở tận hai nơi), cạnh tranh nhau về logic định tuyến, và lôi kéo những triết lý TDD khác nhau, dẫn đến hành vi không đoán trước được thay vì gom được những thứ tốt nhất của cả hai. Hãy chọn một framework làm bộ định tuyến (router) chính, và vay mượn từ các framework khác theo kiểu gọi món (a la carte).

---

## Nguồn tham khảo

- Superpowers: <https://github.com/obra/superpowers>
- Matt Pocock's skills: <https://github.com/mattpocock/skills>
- Om Mishra, *Superpowers vs Agent-Skills*: <https://www.linkedin.com/pulse/superpowers-vs-agent-skills-faster-shipping-safer-reasoning-om-mishra-dzakf/>

*Bạn phát hiện ra điều gì đó không chính xác về một dự án khác ở đây? Hãy mở một issue hoặc PR. Chúng tôi muốn công bằng hơn là nịnh bợ.*
