# Các Mẫu Điều Phối Tác Tử (Orchestration Patterns)

Danh mục tham chiếu các mẫu điều phối đa tác tử (agent orchestration patterns) được kho lưu trữ này chuẩn hóa và khuyến nghị sử dụng, kèm theo các phản mẫu (anti-patterns) cần tránh. Hãy đọc kỹ tài liệu này trước khi thêm một slash command mới phối hợp nhiều vai trò (personas), hoặc trước khi tạo một persona mới "bọc" các persona đã có.

Quy tắc cốt lõi: **Người dùng (hoặc một slash command) chính là bộ điều phối (orchestrator). Các Persona không tự ý gọi chéo Persona khác.** Các kỹ năng (skills) là các bước thực thi chuyên môn bên trong luồng công việc của một Persona.

---

## Các Mẫu Điều Phối Được Khuyến Nghị (Endorsed Patterns)

### 1. Gọi Trực Tiếp (Direct Invocation — Không điều phối trung gian)

Một persona duy nhất, một góc nhìn chuyên môn duy nhất, một sản phẩm đầu ra (artifact) duy nhất. Đây là phương án mặc định và tiết kiệm chi phí nhất.

```text
user → code-reviewer → report → user
```

**Khi nào dùng:** Khi công việc chỉ cần đánh giá hoặc xử lý từ một góc độ chuyên môn trên một đối tượng cụ thể và có thể diễn đạt gọn trong một câu.

**Ví dụ:**
- *"Review Merge Request này"* → `code-reviewer`
- *"Rà soát lỗ hổng bảo mật trong `auth.ts`"* → `security-auditor`
- *"Thiết kế kịch bản kiểm thử cho luồng đặt lệnh"* → `qa`

**Chi phí:** Một lượt gọi duy nhất (1 round trip). Đây là mức chuẩn cơ sở (baseline) để so sánh hiệu quả với mọi mẫu điều phối phức tạp hơn.

---

### 2. Slash Command Đơn Vai Trò (Single-Persona Slash Command)

Một lệnh tắt (slash command) đóng gói sẵn một persona cùng với kỹ năng chuyên biệt của dự án. Giúp người dùng không phải giải thích lại quy trình ở mỗi lần gọi.

```text
/cr-review → code-reviewer (với kỹ năng cr-review-code-and-quality) → report
```

**Khi nào dùng:** Khi cùng một thao tác gọi persona lặp đi lặp lại thường xuyên với cùng một cấu hình và quy trình chuẩn.

**Ví dụ trong repo này:** `/ba-spec`, `/ba-refine`, `/qa-test-design`, `/cr-review`, `/cr-code-simplify`, `/sm-daily-standup`.

**Chi phí:** Tương đương với gọi trực tiếp. Slash command thực chất là một bản prompt chuẩn hóa được lưu sẵn.

**Dấu hiệu cảnh báo (Anti-signal):** Nếu nội dung của slash command chủ yếu chỉ là *"hãy suy nghĩ xem nên gọi persona nào"*, hãy xóa nó đi và để người dùng gọi trực tiếp persona cần thiết.

---

### 3. Phân Nhánh Song Song & Hợp Nhất (Parallel Fan-Out with Merge)

Nhiều personas cùng xử lý một đầu vào đồng thời (song song), mỗi persona sinh ra một báo cáo độc lập theo chuyên môn của mình. Sau đó một bước hợp nhất (nằm trong ngữ cảnh của agent chính) sẽ tổng hợp lại thành quyết định cuối cùng.

```text
                     ┌─→ code-reviewer    ─┐
/e2e-audit → fan out ┼─→ security-auditor ─┤→ merge → quyết định Go/No-Go + phương án rollback
                     └─→ qa               ─┘
```

**Khi nào dùng:**
- Các tác vụ con thực sự độc lập với nhau (không dùng chung trạng thái biến đổi, không phụ thuộc thứ tự trước sau).
- Mỗi subagent được hưởng lợi khi có cửa sổ ngữ cảnh (context window) riêng biệt, không bị nhiễu bởi tiêu chí của vai trò khác.
- Bước hợp nhất đủ gọn để xử lý ngay trong ngữ cảnh của agent chính.
- Cần tối ưu tổng thời gian chờ đợi thực tế (wall-clock latency).

**Chi phí:** $N$ ngữ cảnh subagent chạy song song + 1 lượt tổng hợp. Tốn nhiều token hơn gọi đơn lẻ, nhưng thời gian phản hồi thực tế nhanh và chất lượng báo cáo sâu sắc hơn vì mỗi subagent chỉ tập trung 100% vào một lăng kính chuyên môn.

**Checklist thẩm định trước khi áp dụng mẫu này:**
- [ ] Có thể chạy đồng thời tất cả các subagents mà không gặp xung đột ghi file hay phụ thuộc thứ tự không?
- [ ] Mỗi persona có tạo ra một *loại phát hiện* khác biệt thực sự không (hay chỉ nói lại cùng một ý bằng từ ngữ khác)?
- [ ] Bước tổng hợp kết quả có vừa vặn trong cửa sổ ngữ cảnh còn lại của agent chính không?
- [ ] Thời gian chờ của người dùng có đủ dài để việc chạy song song mang lại lợi ích rõ rệt không?

Nếu bất kỳ câu trả lời nào là *"Không"*, hãy quay về mẫu gọi trực tiếp hoặc Slash Command đơn vai trò.

---

### 4. Chuỗi Pipeline Tuần Tự Do Người Dùng Điều Khiển (Sequential Pipeline)

Người dùng chủ động chạy các slash commands theo một trình tự xác định, truyền ngữ cảnh thông qua các file artifacts chuẩn trong `workspace/issues/{issueKey}/`. Không có một "agent điều phối trung gian" nào đứng giữa — chính người dùng (hoặc pipeline định sẵn với các cổng kiểm tra tất định) là người điều phối.

```text
Người dùng chạy:  /ba-spec  →  /qa-test-design  →  /qa-auto-design  →  /qa-run-test
```

**Khi nào dùng:** Khi quy trình có tính phụ thuộc tuần tự (bước sau cần sản phẩm đầu ra đã được kiểm duyệt của bước trước) và sự phán đoán/phê duyệt của con người giữa các bước mang lại giá trị kiểm soát chất lượng cao.

**Ví dụ trong repo này:** Chuỗi BA Pipeline (`/ba-spec` hoặc `/ba-refine` với Gate 1 & Gate 2) chuyển giao sang QA Pipeline (`/qa-test-design` → `/qa-auto-design` → `/qa-run-test`).

**Chi phí:** Một ngữ cảnh cho mỗi bước. Chi phí tầng điều phối bằng 0 vì không cần nuôi một agent trung gian chỉ để đọc đi đọc lại.

**Tại sao không để một LLM tự động gọi nối tiếp không cần cổng chặn:** Một "siêu agent điều phối" chạy tự do thường (a) làm rơi rớt chi tiết nghiệp vụ quan trọng khi tự tóm tắt để truyền giữa các bước, (b) bỏ qua các cổng phê duyệt (Approval Gates) của con người khiến sai sót ở bước đặc tả lan truyền sang tận bước viết code test, và (c) làm tăng gấp đôi chi phí token do phải diễn giải lại kết quả ở mỗi bước chuyển tiếp.

---

### 5. Cách Ly Nghiên Cứu Để Bảo Toàn Ngữ Cảnh (Research Isolation)

Khi một tác vụ đòi hỏi phải đọc và quét một lượng lớn tài liệu hoặc mã nguồn mà nếu nạp thẳng sẽ làm tràn hoặc làm loãng ngữ cảnh của phiên làm việc chính, hãy tách riêng một subagent nghiên cứu (chỉ đọc) để nó trả về bản tóm tắt tinh gọn (digest).

```text
main agent → research sub-agent (đọc 50 files codebase) → bản tóm tắt (digest) → main agent tiếp tục xử lý
```

**Khi nào dùng:**
- Phiên làm việc chính cần giữ sự tập trung cao độ cho tác vụ thiết kế/triển khai phía sau.
- Kết quả đúc kết nhỏ gọn hơn rất nhiều so với khối lượng dữ liệu thô phải đọc.
- Chất lượng quyết định của agent chính tốt hơn khi cửa sổ ngữ cảnh còn nhiều khoảng trống.

**Ví dụ:** *"Tìm toàn bộ các nơi gọi API đặt lệnh cũ trên khắp monorepo"*, *"Quét cây component UI để trích xuất danh sách linh kiện AS-IS"*.

**Chi phí:** Một ngữ cảnh subagent cô lập. Rất đáng giá khi phương án thay thế là phải nhồi hàng trăm file vào phiên làm việc chính.

**Trên Claude Code / Antigravity:** Hãy ưu tiên dùng subagent `research` / `Explore` dựng sẵn (chế độ chỉ đọc — read-only, tốc độ cao) thay vì tự định nghĩa lại một persona nghiên cứu mới, trừ khi bạn cần nạp sẵn một bộ quy tắc domain đặc thù.

---

## Tương Thích Với Claude Code & Antigravity

Danh mục này được thiết kế độc lập với nền tảng, nhưng dưới đây là cách từng mẫu ánh xạ trực tiếp vào các cơ chế thực thi của Claude Code và Antigravity — cũng như các quy tắc được nền tảng cưỡng chế tự động.

### Vị Trí Lưu Trữ Personas

Các subagent đại diện cho từng vai trò nằm trong thư mục `plugins/<plugin-name>/agents/` (ví dụ: `plugins/ba-po/agents/ba-po.md`, `plugins/qa/agents/qa.md`, `plugins/code-reviewer/agents/code-reviewer.md`). Khi plugin được kích hoạt, hệ thống sẽ tự động nhận diện mà không cần cấu hình đường dẫn thủ công.

### Subagents vs. Agent Teams

Claude Code cung cấp hai cơ chế chạy song song: Mẫu số 3 (Phân nhánh song song & Hợp nhất) ánh xạ vào **Subagents**. Nếu bạn cần các tác tử thảo luận và phản biện trực tiếp với nhau, hãy dùng **Agent Teams**.

| Tiêu chí | Subagents | Agent Teams |
|---|---|---|
| **Cơ chế phối hợp** | Agent chính phân việc, các subagent chỉ báo cáo kết quả về agent chính | Các thành viên (teammates) nhắn tin trực tiếp cho nhau, dùng chung bảng công việc |
| **Ngữ cảnh (Context)** | Cửa sổ ngữ cảnh riêng cho từng subagent | Cửa sổ ngữ cảnh riêng cho từng thành viên |
| **Khi nào sử dụng** | Các tác vụ độc lập tạo báo cáo riêng biệt | Công việc phức tạp cần tranh biện, đối chiếu giả thuyết |
| **Trạng thái** | Ổn định (Stable) | Thử nghiệm (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) |
| **Chi phí** | Thấp hơn | Cao hơn — mỗi thành viên là một phiên Claude độc lập |

**Các persona trong kho lưu trữ này hoạt động tốt ở cả hai chế độ.** Khi được gọi như subagent, chúng báo cáo phát hiện về phiên chính. Khi được khởi tạo như thành viên trong đội (Agent Team), chúng có thể chất vấn và kiểm chứng chéo kết quả của nhau.

### Các Quy Tắc Được Nền Tảng Cưỡng Chế Tự Động

Hai quy tắc quan trọng trong danh mục này được chính nền tảng cưỡng chế ở tầng hệ thống:
- **"Subagent không thể tự sinh ra subagent con khác"**: Phản mẫu B (persona gọi persona) và Phản mẫu D (cây persona đa tầng) bị chặn ngay từ kiến trúc hệ thống.
- **"Không lồng ghép đội trong đội (No nested teams)"**: Các thành viên trong đội không thể tự tạo đội con mới.

### Các Subagent Dựng Sẵn Cần Biết

Trước khi tạo mới một subagent tùy chỉnh, hãy kiểm tra xem các subagent dựng sẵn của nền tảng đã đáp ứng được nhu cầu chưa:

| Subagent dựng sẵn | Mục đích sử dụng |
|---|---|
| `Explore` / `research` | Tìm kiếm và phân tích codebase ở chế độ chỉ đọc (Read-only). Dùng cho Mẫu số 5 (Cách ly nghiên cứu). |
| `Plan` | Nghiên cứu chỉ đọc trong chế độ lập kế hoạch. |
| `general-purpose` / `self` | Các tác vụ nhiều bước cần cả khám phá lẫn chỉnh sửa file trong ngữ cảnh tách biệt. |

### Khởi Tạo Nhiều Subagents Song Song

Để thực thi Mẫu số 3 (Phân nhánh song song) thực sự chạy đồng thời, agent chính **bắt buộc phải phát ra nhiều lệnh gọi công cụ Agent/Subagent trong cùng một lượt phản hồi duy nhất**. Nếu gọi ở các lượt kế tiếp nhau, hệ thống sẽ chạy tuần tự. Ví dụ trong lệnh `/e2e-delivery`, sau khi có `spec/final.md`, cả hai nhánh DEV track và QA test-design track đều được phát lệnh trong cùng một lượt để chạy song song trên hai thư mục tách biệt (`tech/` và `test/`).

---

## Ví Dụ Thực Tế: Sử Dụng Agent Teams Để Gỡ Lỗi Theo Các Giả Thuyết Cạnh Tranh

Ví dụ này minh họa thời điểm nên dùng **Agent Teams** thay vì chỉ phân nhánh subagent độc lập.

### Tình Huống Sự Cố

> *Luồng đặt lệnh đôi khi bị treo khoảng 30 giây trước khi hoàn tất. Hiện tượng xảy ra ngẫu nhiên khoảng 1/50 phiên giao dịch. Không có dòng lỗi nào trong log. Bắt đầu xuất hiện sau bản phát hành tuần trước.*

Các nguyên nhân gốc rễ khả dĩ (đều khớp với triệu chứng):
1. Điều kiện tranh chấp (race condition) trong luồng xác nhận lệnh mới.
2. Bước kiểm tra xác thực/phiên đôi khi bị rơi vào một lệnh gọi mạng đồng bộ bị nghẽn.
3. Thiếu chỉ mục (index) trên một câu truy vấn kiểm tra danh mục tăng dần theo số lượng tiểu khoản.
4. Một API bên thứ ba chập chờn khiến SDK âm thầm thử lại (retry) nhiều lần trước khi timeout.

Một agent đơn lẻ thường sẽ bám vào giả thuyết hợp lý đầu tiên mà nó nghĩ ra và dừng tìm kiếm. Còn nếu chỉ dùng subagent fan-out thông thường, mỗi persona sẽ nộp một báo cáo riêng lẻ mà không đối chất với nhau để loại trừ các giả thuyết sai.

Với **Agent Teams**, nhiều điều tra viên độc lập sẽ chủ động tìm bằng chứng để bác bỏ giả thuyết của nhau — giả thuyết nào trụ vững sau cùng qua các bằng chứng thực nghiệm sẽ có xác suất cao nhất là nguyên nhân gốc rễ thực sự.

### Thiết Lập & Câu Lệnh Kích Hoạt Mẫu

Trong `~/.claude/settings.json`, bật cờ thử nghiệm:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Sau đó nhập yêu cầu vào phiên chính:

```text
Người dùng báo cáo luồng đặt lệnh thỉnh thoảng bị treo ~30 giây sau bản
release tuần trước và không có lỗi trong log.

Hãy tạo một agent team để điều tra theo các giả thuyết cạnh tranh với 3 thành viên:
  - code-reviewer    — điều tra race conditions và các lệnh gọi đồng bộ gây chặn (blocking calls)
  - security-auditor — kiểm tra bước xác thực phiên và các kết nối mạng phát sinh trong luồng auth
  - qa               — đề xuất kịch bản kiểm thử giúp phân biệt rõ các giả thuyết và kiểm tra lỗ hổng độ phủ test

Yêu cầu các thành viên nhắn tin trực tiếp để phản biện giả thuyết của nhau và chỉ hội tụ khi có bằng chứng thực nghiệm bác bỏ các giả thuyết còn lại.
```

### Khi Nào *Không* Dùng Agent Teams

- Cần kết luận nghiệm thu trên một bản diff/MR đã biết rõ → Dùng subagents độc lập.
- Chỉ cần một góc nhìn chuyên môn trên một tài liệu/code → Gọi trực tiếp 1 persona (Mẫu số 1).
- Quy trình tuần tự qua các cổng phê duyệt (Spec → Test Design → Auto Code) → Chạy slash commands tuần tự (Mẫu số 4).
- Quét tìm kiếm dữ liệu lớn để lấy bản tóm tắt → Dùng subagent `Explore` / `research` (Mẫu số 5).

Chỉ dùng Agent Teams khi các thành viên **thực sự cần phản biện trực tiếp với nhau** để tìm ra câu trả lời đúng.

---

## Các Phản Mẫu Cần Tránh (Anti-Patterns)

### A. Persona Chỉ Làm Nhiệm Vụ Định Tuyến ("Meta-Orchestrator")

Một persona mà công việc duy nhất chỉ là đọc câu hỏi rồi quyết định xem nên gọi persona nào tiếp theo.

```text
/work → router-persona → "việc này cần review code" → code-reviewer → router (tóm tắt lại) → user
```

**Tại sao thất bại:**
- Tầng trung gian thuần túy không tạo ra bất kỳ giá trị nghiệp vụ hay kỹ thuật nào.
- Phát sinh thêm 2 bước diễn giải lại → làm rơi rớt thông tin gốc và tốn gấp đôi chi phí token.
- Người dùng vốn đã biết mình cần review code và có thể gõ thẳng `/cr-review`.
- Lặp lại vô ích công việc mà bảng điều hướng trong `AGENTS.md` và `CATALOG.md` đã làm.

**Giải pháp đúng:** Chuẩn hóa hệ thống slash commands và bảng định tuyến rõ ràng trong `AGENTS.md`.

---

### B. Persona Tự Ý Gọi Chéo Persona Khác

Ví dụ: `code-reviewer` tự động gọi ngầm `security-auditor` bên trong nó khi nhìn thấy code xác thực.

**Tại sao thất bại:**
- Mỗi persona được thiết kế để giữ một lăng kính chuyên môn sắc bén; việc nối chuỗi ngầm làm mờ ranh giới đó.
- Bản tóm tắt mà persona thứ nhất truyền sang làm mất ngữ cảnh gốc mà persona thứ hai cần.
- Khó kiểm soát định dạng đầu ra và ẩn giấu chi phí thực thi khỏi người dùng.

**Giải pháp đúng:** Persona hiện tại hoàn thành tốt báo cáo của mình và **đề xuất rõ ở mục Bước tiếp theo** (ví dụ: *"Phát hiện thay đổi trong luồng xác thực — khuyến nghị chạy tiếp `/security-audit`"*).

---

### C. Bộ Điều Phối Tuần Tự Tự Động Diễn Giải Lại (Paraphrasing Sequential Orchestrator)

Một agent trung gian tự ý gọi nối tiếp hàng loạt bước mà không qua cổng kiểm định tất định hoặc sự phê duyệt của người dùng, đồng thời tự tóm tắt lại đầu ra của bước trước để làm đầu vào cho bước sau.

**Tại sao thất bại:**
- Làm mất các cổng kiểm soát (Approval Gates) của con người giúp phát hiện lệch hướng ngay từ khâu đặc tả.
- Mỗi lần tóm tắt qua lời văn của LLM sẽ tích lũy độ lệch (context drift) qua chuỗi pipeline dài.
- Tăng gấp đôi chi phí token ở mọi bước.

**Giải pháp đúng:** Truyền dữ liệu giữa các bước thông qua **file artifacts chuẩn hóa trên đĩa** (`spec/final.md`, `spec/testability-manifest.json`, `test/checklist.md`) kèm theo các script kiểm định tất định (`validate-ba-refine.js`, `trace-check.js`), và giữ quyền phê duyệt của người dùng tại các cổng chặn quan trọng.

---

### D. Cây Điều Phối Đa Tầng (Deep Persona Trees)

Lệnh gọi một `coordinator-cap-1`, rồi gọi tiếp `coordinator-cap-2`, rồi mới gọi tới `code-reviewer`.

**Tại sao thất bại:**
- Mỗi tầng trung gian cộng dồn độ trễ và chi phí token mà không đóng góp giá trị quyết định.
- Việc gỡ lỗi khi kết quả sai trở thành một mê cung đa tầng.
- Persona thực thi ở tầng lá bị mất ngữ cảnh gốc sau nhiều lần tóm tắt qua các tầng cha.

**Giải pháp đúng:** Giữ độ sâu điều phối tối đa là **1 cấp** (Slash command / Main agent → Personas). Bước hợp nhất (nếu có) diễn ra trực tiếp tại agent chính.

---

## Sơ Đồ Quyết Định Lựa Chọn Mẫu Điều Phối

Khi thiết kế một luồng công việc mới, hãy đi theo cây quyết định sau:

```text
Công việc chỉ cần 1 góc nhìn chuyên môn trên 1 artifact?
├── Có  → Gọi trực tiếp Persona (Mẫu 1) hoặc Slash Command đơn vai trò (Mẫu 2). Dừng.
└── Không → Tổ hợp phối hợp này có lặp lại thường xuyên không?
          ├── Không → Gọi trực tiếp từng bước theo nhu cầu phát sinh. Dừng.
          └── Có    → Các tác vụ con có hoàn toàn độc lập với nhau không?
                    ├── Không → Chuỗi Slash Commands tuần tự qua file artifacts chuẩn (Mẫu 4).
                    └── Có    → Phân nhánh song song & Hợp nhất (Mẫu 3).
                                Kiểm tra với Checklist thẩm định ở Mẫu 3.
                                Nếu bất kỳ tiêu chí nào không đạt → Quay về Mẫu 2 hoặc Mẫu 4.
```

---

## Khi Nào Mới Thêm Mẫu Mới Vào Danh Mục Này

Chỉ bổ sung một mẫu điều phối mới vào tài liệu này sau khi:
1. Bạn đã áp dụng mẫu đó thành công ít nhất 2 lần trong công việc thực tế của dự án.
2. Bạn chỉ ra được một lệnh hoặc artifact cụ thể trong kho lưu trữ này đang vận hành theo mẫu đó.
3. Bạn giải thích rõ vì sao cả 5 mẫu hiện có đều không đáp ứng được bài toán.
4. Bạn mô tả được "cái bóng phản mẫu" của nó (những sai lầm mà người khác dễ mắc phải khi áp dụng sai).
