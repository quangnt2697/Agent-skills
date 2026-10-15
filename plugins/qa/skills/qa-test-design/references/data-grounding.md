# Data Grounding — Gắn kết kịch bản với dữ liệu thật

> Mục đích: Tránh việc agent "tự bịa" dữ liệu (accountNo, symbol, orderId) khi viết Gherkin. Dữ liệu trong Gherkin (loại a) phải có thể xác thực được trên môi trường UAT.

## 1. Phân loại 3 loại dữ liệu trong Test Design

| Loại | Ví dụ | Yêu cầu đúng |
|---|---|---|
| **(a) Dữ liệu định danh/precondition** | `accountNo` có VA, `symbol` đang giao dịch, `orderId` tồn tại, `napasCode` hợp lệ, số dư ≥ giá trị lệnh | **PHẢI là thật trong UAT** — Bắt buộc phải grounding qua n8n/Metabase/API |
| **(b) Dữ liệu xấu chủ đích** (Negative case) | token hết hạn, accountNo không tồn tại `9999999999`, napasCode sai `999999` | **Dummy là ĐÚNG thiết kế** — Không cần grounding, chỉ cần đảm bảo *không tồn tại thật* |
| **(c) Ranh giới tượng trưng** (BVA) | `TAI_HAN_MUC`, `VUOT_HAN_MUC`, `TRONG_NGUONG` | **Giữ nguyên nhãn tượng trưng** — Tuyệt đối không thay bằng số tĩnh |

## 2. Chuỗi Ưu Tiên Nguồn Dữ Liệu (Data Source Chain)

Khi tìm dữ liệu loại (a), BẮT BUỘC tra cứu theo thứ tự sau. Dừng lại ở nguồn đầu tiên trả về kết quả hợp lệ:

1. **n8n Fast-Path (`getSecuritiesFixture`)**: Cho symbol, giá, bước giá, biên độ.
   - Lệnh: `node scripts/lib/n8n-client.js getSecuritiesFixture "{}"`
2. **Metabase UAT SQL (READ-ONLY)**: Cho `accountNo`, `VA`, `order`, trạng thái, `napasCode`, số lượng đếm được. Dùng DB ID trong UAT (644, 535, 655).
   - Lệnh: `node scripts/lib/db-client.js metabaseRunSql '{"database": 644, "query": "SELECT account_no FROM virtual_account LIMIT 1"}'`
3. **Gọi API UAT (GET public/internal)**
4. **Fallback (Gắn nhãn `[DATA-ASSUMED]`)**: Nếu các nguồn trên lỗi/timeout, dùng giá trị symbolic hoặc tự bịa nhưng BẮT BUỘC gắn comment `[DATA-ASSUMED] ...` phía trên Scenario trong `.feature` để cảnh báo. Việc lỗi kết nối CẤM không được làm dừng pipeline.

## 3. Chính sách Zero-Mutation (Chỉ Đọc)

Tại phase thiết kế (qa-test-design), **NGHIÊM CẤM** thực thi các thao tác thay đổi dữ liệu (INSERT, UPDATE, DELETE, POST/PUT/PATCH). Việc tạo dữ liệu test (nếu cần) là trách nhiệm của phase execution (`qa-auto-design`).
- Chỉ dùng các câu lệnh `SELECT` hoặc gọi API `GET`.

## 4. Định dạng file `data-grounding.json`

Lưu tại: `workspace/{issueKey}/test/fixtures/data-grounding.json`

```json
{
  "issueKey": "G3PTP-17145",
  "groundedAt": "2026-10-09T10:30:00+07:00",
  "env": "uat",
  "items": [
    {
      "field": "accountNo",
      "value": "0001170086",
      "kind": "precondition",
      "source": "metabase-uat/openapi",
      "query": "SELECT account_no FROM virtual_account LIMIT 1",
      "verified": true,
      "usedIn": ["Background", "@happy-path @smoke"]
    },
    {
      "field": "napasCode_invalid",
      "value": "999999",
      "kind": "negative-dummy",
      "source": "design-intent",
      "verified": false,
      "usedIn": ["@edge-case"]
    }
  ],
  "assumptions": []
}
```

## 5. Quy ước gắn nhãn `[DATA-ASSUMED]` trong Gherkin

Nếu phải dùng Fallback (nguồn số 4) cho dữ liệu loại (a), BẮT BUỘC ghi chú vào `.feature`:

```gherkin
# [DATA-ASSUMED] accountNo=0001170086 chưa verify trong UAT (Metabase timeout)
@happy-path @smoke
Scenario: Chuyển tiền vào tài khoản tồn tại
...
```
