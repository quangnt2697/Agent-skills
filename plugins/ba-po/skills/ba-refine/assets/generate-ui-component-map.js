/**
 * UI Component & Design System Index Generator for ba-refine
 * (`plugins/ba-po/skills/ba-refine/assets/generate-ui-component-map.js`)
 *
 * Tự động quét codebase dnse-trading (Web) và arrow-app (Mobile) để lập chỉ mục
 * màn hình (screens), cấu trúc khung (layouts), và thư viện component chuẩn (components).
 * Ngăn chặn Agent "tự thiết kế bừa", đảm bảo Mockup bám sát 100% ứng dụng thực tế.
 *
 * Usage:
 *   node plugins/ba-po/skills/ba-refine/assets/generate-ui-component-map.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root của agent-skills
const agentSkillsRoot = path.resolve(__dirname, '../../../../..');
const configProjectsPath = path.join(agentSkillsRoot, 'config/projects.json');
const outputPath = path.resolve(__dirname, '../references/ui-component-map.json');

// Đọc đường dẫn repo từ projects.json
let projects = {};
if (fs.existsSync(configProjectsPath)) {
  try {
    projects = JSON.parse(fs.readFileSync(configProjectsPath, 'utf8'));
  } catch (err) {
    console.warn('⚠️ Không thể đọc config/projects.json, sử dụng đường dẫn mặc định.');
  }
}

const webTradingRoot = projects['web-trading'] || '/Users/qa-quangnt/Projects/Entrade Trading/dnse-trading';
const mobileTradingRoot = projects['mobile-trading'] || '/Users/qa-quangnt/Projects/Entrade Trading/mobile/arrow-app';

console.log('🔍 Đang quét Codebase UI Design System...');
console.log(`   - Web Trading: ${webTradingRoot}`);
console.log(`   - Mobile Trading: ${mobileTradingRoot}`);

// Định nghĩa từ điển màn hình Web chuẩn
const WEB_CORE_SCREENS = {
  'OrderForm': {
    vietnamese_name: 'Màn hình Đặt lệnh Chứng khoán Cơ sở',
    category: 'Trading',
    route: '/trade',
    layout: 'TwoColumnTrading (Trái: Chart + Sổ lệnh, Phải: Đặt lệnh)',
    source_files: [
      'apps/web/src/pages/Home',
      'apps/web/src/components/OrderForm',
      'apps/web/src/components/PriceBoard'
    ],
    primary_actions: ['Đặt Mua', 'Đặt Bán', 'Chọn Tiểu khoản (Đuôi 1/Đuôi 6)', 'Chọn Gói Margin', 'Chọn Loại lệnh (LO, MP, ATO, ATC)'],
    key_fields: ['Mã CK', 'Khối lượng', 'Giá đặt', 'Sức mua khả dụng', 'Tỷ lệ ký quỹ (Margin)', 'Gói phí ưu đãi']
  },
  'OrdersConfirmation': {
    vietnamese_name: 'Sổ lệnh & Xác nhận lệnh trong ngày',
    category: 'Order Management',
    route: '/trade/orders',
    layout: 'TabTableLayout (Tabs: Chờ khớp, Đã khớp, Hủy/Hết hạn)',
    source_files: [
      'apps/web/src/pages/OrdersConfirmation',
      'apps/web/src/components/OrderBook'
    ],
    primary_actions: ['Hủy lệnh', 'Sửa giá/khối lượng', 'Hủy toàn bộ lệnh chờ', 'Lọc theo trạng thái'],
    key_fields: ['Mã lệnh', 'Thời gian', 'Mã CK', 'Lệnh M/B', 'Giá', 'Khối lượng đặt/khớp', 'Trạng thái']
  },
  'Loans': {
    vietnamese_name: 'Quản lý Khoản vay Ký quỹ & Gói Margin',
    category: 'Margin & Loans',
    route: '/assets/loans',
    layout: 'CardGridLayout (Danh sách gói vay + Bảng chi tiết từng deal)',
    source_files: [
      'apps/web/src/pages/Loans',
      'apps/web/src/pages/LoanDetail'
    ],
    primary_actions: ['Đổi gói vay', 'Trả nợ trước hạn', 'Xem hạn mức lãi suất ưu đãi', 'Gia hạn gói vay'],
    key_fields: ['Tên gói vay', 'Lãi suất ưu đãi (%/năm)', 'Dư nợ gốc', 'Tiền lãi tích lũy', 'Tỷ lệ an toàn Rtt', 'Ngày đến hạn']
  },
  'CashTransfer': {
    vietnamese_name: 'Nộp / Rút & Chuyển tiền nội bộ',
    category: 'Cash',
    route: '/cash-transfer',
    layout: 'CardCenteredForm (Tabs: Nộp tiền QR, Chuyển ra Ngân hàng, Chuyển nội bộ)',
    source_files: [
      'apps/web/src/pages/CashTransfer'
    ],
    primary_actions: ['Chuyển tiền ra tài khoản thụ hưởng', 'Chuyển giữa tiểu khoản 1 và 6', 'Quét mã QR nộp tiền'],
    key_fields: ['Số tiền chuyển', 'Tài khoản nguồn', 'Ngân hàng thụ hưởng', 'Số tài khoản nhận', 'Nội dung', 'Phí chuyển khoản']
  },
  'StockTransfer': {
    vietnamese_name: 'Chuyển Chứng khoán giữa các Tiểu khoản',
    category: 'Assets',
    route: '/stock-transfer',
    layout: 'CardCenteredForm',
    source_files: [
      'apps/web/src/pages/StockTransfer'
    ],
    primary_actions: ['Chuyển cổ phiếu thường sang ký quỹ', 'Chuyển trả về thường'],
    key_fields: ['Mã chứng khoán', 'Số lượng khả dụng', 'Số lượng muốn chuyển', 'Tỷ lệ ảnh hưởng Margin']
  },
  'Assets': {
    vietnamese_name: 'Báo cáo Tài sản & Danh mục Đầu tư',
    category: 'Assets',
    route: '/assets',
    layout: 'DashboardWithCharts (Pie Chart phân bổ tài sản + Bảng danh mục)',
    source_files: [
      'apps/web/src/pages/Assets'
    ],
    primary_actions: ['Xem lãi/lỗ chưa thực hiện', 'Xuất sao kê tài sản', 'Xem sức mua tổng quan'],
    key_fields: ['Tổng tài sản', 'Tài sản ròng (NAV)', 'Tiền mặt', 'Giá trị chứng khoán', 'Lãi/Lỗ tạm tính (% và số tiền)']
  },
  'ConditionalOrder': {
    vietnamese_name: 'Đặt Lệnh Điều kiện Chuyên sâu (Stop-Loss / Take-Profit / Trailing)',
    category: 'Trading',
    route: '/trade/conditional-orders',
    layout: 'DrawerPanel / TabPanel',
    source_files: [
      'apps/web/src/components/ConditionalOrder',
      'apps/web/src/components/OcoOrder'
    ],
    primary_actions: ['Thiết lập giá kích hoạt', 'Chọn điều kiện chốt lời/cắt lỗ', 'Xác nhận kích hoạt'],
    key_fields: ['Giá kích hoạt (Trigger Price)', 'Giá đặt lệnh', 'Khoảng cách trailing', 'Thời hạn hiệu lực']
  }
};

// Định nghĩa từ điển màn hình Mobile chuẩn (arrow-app)
const APP_CORE_SCREENS = {
  'order_deal_book': {
    vietnamese_name: 'Sổ Lệnh & Quản lý Deal Margin trên App',
    category: 'Trading',
    layout: 'ScaffoldWithTopTabs (Tabs: Sổ lệnh | Deal Margin | Lịch sử)',
    source_files: [
      'lib/pages/order_deal_book',
      'lib/pages/deal_history'
    ],
    primary_actions: ['Sửa lệnh nhanh', 'Hủy lệnh', 'Đổi gói deal margin', 'Đóng vị thế deal'],
    key_fields: ['Mã CP', 'Giá mua/bán', 'Khối lượng', 'Lãi/lỗ theo deal', 'Lãi suất áp dụng', 'Cảnh báo Rtt']
  },
  'edit_order': {
    vietnamese_name: 'Sửa / Hủy Lệnh Đang Chờ Khớp',
    category: 'Trading',
    layout: 'BottomSheetModal',
    source_files: [
      'lib/pages/edit_order'
    ],
    primary_actions: ['Tăng/giảm khối lượng (+/-)', 'Thay đổi mức giá', 'Xác nhận gửi sửa lệnh'],
    key_fields: ['Giá cũ', 'Giá mới', 'Khối lượng cũ', 'Khối lượng mới', 'Bước giá tối thiểu']
  },
  'margin_loan': {
    vietnamese_name: 'Quản lý Gói Vay & Lãi suất Ký quỹ Mobile',
    category: 'Margin & Loans',
    layout: 'ScaffoldListWithHeader (Banner hạn mức + Danh sách gói)',
    source_files: [
      'lib/pages/margin_loan',
      'lib/pages/margin_loan_rate_selection',
      'lib/pages/margin_registration'
    ],
    primary_actions: ['Chọn gói lãi suất ưu đãi', 'Kích hoạt hạn mức vay', 'Đăng ký hợp đồng ký quỹ'],
    key_fields: ['Gói phí Margin', 'Mức lãi suất (%/năm)', 'Hạn mức phê duyệt', 'Thời hạn vay ưu đãi']
  },
  'order_confirmation_page': {
    vietnamese_name: 'Xác Nhận Đặt Lệnh & Nhập Smart OTP',
    category: 'Security & Order',
    layout: 'BottomSheet / FullModal',
    source_files: [
      'lib/pages/order_confirmation_page',
      'lib/screens/confirmation_page'
    ],
    primary_actions: ['Xác nhận mã OTP', 'Bật ghi nhớ phiên giao dịch', 'Gửi lệnh'],
    key_fields: ['Thông tin lệnh (Mã, M/B, Giá, KL)', 'Tổng giá trị', 'Phí dự tính', 'Ô nhập Smart OTP 6 số']
  },
  'cash_transfer': {
    vietnamese_name: 'Chuyển Tiền & Nạp Rút Mobile',
    category: 'Cash',
    layout: 'ScaffoldWithCustomHeader',
    source_files: [
      'lib/screens/cash_transfer',
      'lib/screens/cash_transfer_withdrawal'
    ],
    primary_actions: ['Chuyển nhanh Napas 247', 'Chuyển nộp ký quỹ', 'Lưu tài khoản thụ hưởng'],
    key_fields: ['Số dư khả dụng', 'Số tiền rút', 'Tên chủ tài khoản thụ hưởng', 'Ngân hàng nhận']
  },
  'asset_report_page': {
    vietnamese_name: 'Báo cáo Tài sản & Biến động NAV Mobile',
    category: 'Assets',
    layout: 'SliverScrollViewWithCard',
    source_files: [
      'lib/pages/asset_report_page'
    ],
    primary_actions: ['Xem biểu đồ tăng trưởng NAV', 'Xem danh mục đang nắm giữ', 'Chia sẻ lợi nhuận'],
    key_fields: ['Tổng tài sản', 'Sức mua', 'Tỷ lệ an toàn Margin', 'Top cổ phiếu sinh lời']
  }
};

// Quét các component thực tế trong libs/ui/src của web-trading nếu repo tồn tại
let detectedWebUiComponents = [];
const uiLibPath = path.join(webTradingRoot, 'libs/ui/src');
if (fs.existsSync(uiLibPath)) {
  try {
    detectedWebUiComponents = fs.readdirSync(uiLibPath).filter(f => {
      const full = path.join(uiLibPath, f);
      return fs.statSync(full).isDirectory();
    });
  } catch (e) {
    console.warn('Không thể đọc libs/ui/src:', e.message);
  }
}

// Quét các widgets thực tế trong mobile nếu repo tồn tại
let detectedMobileWidgets = [];
const mobileWidgetPath = path.join(mobileTradingRoot, 'lib/widgets');
if (fs.existsSync(mobileWidgetPath)) {
  try {
    detectedMobileWidgets = fs.readdirSync(mobileWidgetPath).filter(f => f.endsWith('.dart')).map(f => f.replace('.dart', ''));
  } catch (e) {
    console.warn('Không thể đọc lib/widgets:', e.message);
  }
}

// Bảng component Design System chuẩn đóng gói sẵn cho Mockup HTML
const STANDARD_COMPONENTS = {
  'StepperInput': {
    name: 'Ô Nhập Giá / Khối lượng kèm nút Tăng Giảm (+/-)',
    class_name: 'stepper-control',
    html_snippet: `
<div class="form-group">
  <label class="form-label">{LABEL} <span class="text-hint">{HINT}</span></label>
  <div class="stepper-control">
    <button type="button" class="stepper-btn stepper-minus">−</button>
    <input type="text" class="form-input text-center" value="{VALUE}">
    <button type="button" class="stepper-btn stepper-plus">+</button>
  </div>
</div>`.trim(),
    react_equivalent: 'libs/ui/src/TextField / apps/web/src/components/OrderForm/PriceInput.tsx',
    flutter_equivalent: 'lib/widgets/stepper_input.dart'
  },
  'KrxPriceBoard': {
    name: 'Bảng Giá & Độ sâu Sổ lệnh KRX Mini (3 mức Mua - Khớp - 3 mức Bán)',
    class_name: 'krx-order-book',
    html_snippet: `
<div class="krx-order-book">
  <div class="krx-header">
    <span>Bên Mua</span>
    <span>Khớp Lệnh</span>
    <span>Bên Bán</span>
  </div>
  <div class="krx-row">
    <span class="krx-cell text-gain">24.45 <small>(12.5k)</small></span>
    <span class="krx-cell highlight-cell text-gain">24.50 <small>(50.2k)</small></span>
    <span class="krx-cell text-loss">24.55 <small>(8.3k)</small></span>
  </div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/components/PriceBoard / OrderBook',
    flutter_equivalent: 'lib/widgets/krx_order_book_widget.dart'
  },
  'SegmentedControl': {
    name: 'Thanh Chọn Phân đoạn (Tiểu khoản Thường / Margin hoặc Mua / Bán)',
    class_name: 'segmented-control',
    html_snippet: `
<div class="segmented-control">
  <button type="button" class="segment-btn active">Thường (Đuôi 1)</button>
  <button type="button" class="segment-btn">Ký quỹ (Đuôi 6)</button>
</div>`.trim(),
    react_equivalent: 'libs/ui/src/ToggleButton / ToggleGroup / Tabs',
    flutter_equivalent: 'lib/widgets/custom_segmented_tab.dart'
  },
  'MarginPackageSelect': {
    name: 'Dropdown Chọn Gói Vay Ký Quỹ & Lãi suất Ưu đãi',
    class_name: 'margin-package-select',
    html_snippet: `
<div class="form-group" data-change="added">
  <span class="delta-badge">①</span>
  <label class="form-label">Gói Lãi Suất Vay Ký Quỹ</label>
  <div class="select-wrapper">
    <select class="form-select">
      <option value="T10_8.9">Gói T+10 Ưu đãi (8.9%/năm - Miễn phí 5 ngày đầu)</option>
      <option value="STANDARD_12.5">Gói Tiêu chuẩn (12.5%/năm - Không giới hạn kỳ)</option>
    </select>
  </div>
  <div class="badge-hint text-gain">Tiết kiệm 3.6%/năm so với gói thông thường</div>
</div>`.trim(),
    react_equivalent: 'libs/ui/src/Select / MultiSelectSearch',
    flutter_equivalent: 'lib/pages/margin_loan_rate_selection'
  },
  'AlertBanner': {
    name: 'Banner Thông Báo Lỗi / Cảnh báo Call Margin & Khóa Phiên',
    class_name: 'alert-banner',
    html_snippet: `
<div class="alert-banner warning" data-change="added">
  <span class="delta-badge">③</span>
  <div class="alert-icon">⚠️</div>
  <div class="alert-content">
    <strong>Cảnh báo Tỷ lệ Ký quỹ:</strong> Tỷ lệ an toàn hiện tại là 38% (tiệm cận ngưỡng Call 35%). Vui lòng kiểm tra trước khi đặt lệnh giải ngân mới.
  </div>
</div>`.trim(),
    react_equivalent: 'libs/ui/src/Alert',
    flutter_equivalent: 'lib/widgets/app_banner.dart'
  },
  'OrderConfirmModal': {
    name: 'Hộp Thoại Xác Nhận Lệnh & Smart OTP',
    class_name: 'modal-confirm',
    html_snippet: `
<div class="modal-backdrop">
  <div class="modal-dialog">
    <div class="modal-header">
      <h3>Xác Nhận Đặt Lệnh Mua</h3>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="summary-row"><span>Mã CK:</span><strong>VND</strong></div>
      <div class="summary-row"><span>Lệnh:</span><span class="text-gain">MUA (LO)</span></div>
      <div class="summary-row"><span>Khối lượng:</span><strong>1,000</strong></div>
      <div class="summary-row"><span>Giá đặt:</span><strong>24,500 đ</strong></div>
      <div class="summary-row total"><span>Tổng giá trị:</span><strong>24,500,000 đ</strong></div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary">Hủy bỏ</button>
      <button class="btn-primary">Xác Nhận Giao Dịch</button>
    </div>
  </div>
</div>`.trim(),
    react_equivalent: 'libs/ui/src/Modal / Dialog',
    flutter_equivalent: 'lib/pages/order_confirmation_page'
  }
};

const fullIndex = {
  _doc: "Chỉ mục Màn hình UI & Thư viện Component chuẩn cho ba-refine. BẮT BUỘC đọc file này trước khi dựng Mockup để đảm bảo bám sát 100% codebase thực tế.",
  _updated: new Date().toISOString().split('T')[0],
  projects: {
    "web-trading": webTradingRoot,
    "mobile-trading": mobileTradingRoot
  },
  guardrails: {
    strict_ui_rules: [
      "1. CẤM tự viết inline CSS sáng tạo layout tự do. BẮT BUỘC lắp ghép từ các component chuẩn đã khai báo.",
      "2. BẮT BUỘC áp dụng cơ chế Delta-Only: Giữ nguyên khung màn hình gốc (as-is, opacity: 0.75) và chỉ làm nổi bật phần thay đổi ([data-change='added|modified|removed']) kèm Huy hiệu đánh số ① ② ③.",
      "3. Tên nhãn, button, dropdown BẮT BUỘC dùng đúng thuật ngữ tiếng Việt đang có trong screens của dự án (tra cứu bên dưới).",
      "4. Bảng màu chứng khoán: Tím #c80096 (Trần), Xanh sàn #00ced1 (Sàn), Vàng #f5a623 (TC), Xanh lá #00d084 (Tăng), Đỏ #ff4d4f (Giảm)."
    ],
    delta_syntax: {
      as_is_element: 'class="as-is-context" hoặc data-ui="as-is" (Hiển thị mờ nhẹ làm nền ngữ cảnh)',
      added_element: 'data-change="added" kèm <span class="delta-badge">①</span> (Viền xanh viền nổi bật)',
      modified_element: 'data-change="modified" kèm <span class="delta-badge">②</span> (Viền vàng cam nổi bật)',
      removed_element: 'data-change="removed" kèm <span class="delta-badge">③</span> (Gạch ngang mờ đỏ)'
    }
  },
  discovery_helpers: {
    web: {
      repo_key: 'web-trading',
      root: webTradingRoot,
      pages_dir: 'apps/web/src/pages',
      components_dir: 'apps/web/src/components',
      ui_lib_dir: 'libs/ui/src',
      n8n_discovery_webhook: '/webhook/web-ui-locator-discovery'
    },
    mobile: {
      repo_key: 'mobile-trading',
      root: mobileTradingRoot,
      pages_dir: 'lib/pages',
      screens_dir: 'lib/screens',
      widgets_dir: 'lib/widgets'
    }
  },
  web_trading: {
    screens: WEB_CORE_SCREENS,
    detected_ui_primitives_count: detectedWebUiComponents.length,
    detected_ui_primitives: detectedWebUiComponents
  },
  mobile_trading: {
    screens: APP_CORE_SCREENS,
    detected_widgets_count: detectedMobileWidgets.length,
    sample_detected_widgets: detectedMobileWidgets.slice(0, 30)
  },
  standard_components: STANDARD_COMPONENTS
};

// Đảm bảo thư mục đích tồn tại
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(fullIndex, null, 2), 'utf8');

console.log(`✅ Đã xuất bản thành công: ${outputPath}`);
console.log(`   - Web Screens: ${Object.keys(WEB_CORE_SCREENS).length}`);
console.log(`   - Mobile Screens: ${Object.keys(APP_CORE_SCREENS).length}`);
console.log(`   - UI Primitives detected: ${detectedWebUiComponents.length}`);
console.log(`   - Standard UI Components packaged: ${Object.keys(STANDARD_COMPONENTS).length}`);
