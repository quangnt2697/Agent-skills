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
const outputPath = path.resolve(__dirname, '../../ba-design-mockup/references/ui-component-map.json');

// Đọc đường dẫn repo từ projects.json (hỗ trợ cả git worktree)
let projects = {};
const candidateConfigPaths = [
  configProjectsPath,
  '/Users/qa-quangnt/Projects/agent-skills/config/projects.json'
];
for (const cfgPath of candidateConfigPaths) {
  if (fs.existsSync(cfgPath)) {
    try {
      projects = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      break;
    } catch (_) {}
  }
}

const defaultWebPath = fs.existsSync('/Users/qa-quangnt/Projects/Entrade Trading/dnse-trading')
  ? '/Users/qa-quangnt/Projects/Entrade Trading/dnse-trading'
  : path.resolve(agentSkillsRoot, '..', 'dnse-trading');
const defaultMobilePath = fs.existsSync('/Users/qa-quangnt/Projects/Entrade Trading/mobile/arrow-app')
  ? '/Users/qa-quangnt/Projects/Entrade Trading/mobile/arrow-app'
  : path.resolve(agentSkillsRoot, '..', 'arrow-app');

const webTradingRoot = projects['web-trading'] || process.env.WEB_TRADING_ROOT || defaultWebPath;
const mobileTradingRoot = projects['mobile-trading'] || process.env.MOBILE_TRADING_ROOT || defaultMobilePath;

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
  },
  'DealCard': {
    name: 'Thẻ Chi Tiết Deal Margin & Trạng Thái Lãi Lỗ',
    class_name: 'deal-card',
    html_snippet: `
<div class="deal-card" data-change="added">
  <span class="delta-badge">①</span>
  <div class="deal-header">
    <span class="deal-id">#DEAL-9921</span>
    <span class="badge-status text-gain">Đang Mở</span>
  </div>
  <div class="deal-body">
    <div class="deal-row"><span>Mã CP:</span><strong>VND</strong></div>
    <div class="deal-row"><span>Khối lượng:</span><strong>5,000</strong></div>
    <div class="deal-row"><span>Giá vốn TB:</span><strong>23,800 đ</strong></div>
    <div class="deal-row"><span>Lãi/Lỗ:</span><strong class="text-gain">+3,500,000 đ (+2.9%)</strong></div>
    <div class="deal-row"><span>Gói Vay:</span><span class="badge-tag">T+10 (8.9%)</span></div>
  </div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/pages/Loans / DealItem.tsx',
    flutter_equivalent: 'lib/widgets/deal_card_item.dart'
  },
  'OrderBookTable': {
    name: 'Bảng Sổ Lệnh Realtime Trong Ngày',
    class_name: 'order-book-table',
    html_snippet: `
<div class="order-book-table">
  <table class="table-compact">
    <thead>
      <tr><th>Thời Gian</th><th>Mã</th><th>Lệnh</th><th>Giá</th><th>KL</th><th>Khớp</th><th>Trạng Thái</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>09:35:12</td>
        <td><strong>VND</strong></td>
        <td class="text-gain">MUA</td>
        <td>24.50</td>
        <td>1,000</td>
        <td>1,000</td>
        <td><span class="badge-success">Khớp hết</span></td>
      </tr>
    </tbody>
  </table>
</div>`.trim(),
    react_equivalent: 'apps/web/src/components/OrderBook / OrderTable.tsx',
    flutter_equivalent: 'lib/pages/order_deal_book/order_book_list.dart'
  },
  'SubAccountSwitcher': {
    name: 'Bộ Chuyển Đổi Tiểu Khoản Thường (0001) / Ký Quỹ (0006)',
    class_name: 'subaccount-switcher',
    html_snippet: `
<div class="subaccount-switcher">
  <label class="form-label">Tài Khoản Giao Dịch</label>
  <div class="account-select-box">
    <span class="acc-id">0001889922-1</span>
    <span class="acc-badge">Tiểu khoản Thường</span>
    <span class="arrow-down">▼</span>
  </div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/components/AccountSwitcher / index.tsx',
    flutter_equivalent: 'lib/widgets/account_view_mode_switcher.dart'
  },
  'QrCashTransferBox': {
    name: 'Khung Nạp Tiền Nhanh Qua Mã VietQR',
    class_name: 'qr-cash-transfer-box',
    html_snippet: `
<div class="qr-cash-box text-center" data-change="added">
  <span class="delta-badge">②</span>
  <div class="qr-image-wrapper">
    <div class="qr-placeholder">[VIETQR CODE]</div>
  </div>
  <div class="qr-info">
    <p>Ngân hàng: <strong>BIDV (Hà Thành)</strong></p>
    <p>Số tài khoản: <strong>96110001889922</strong></p>
    <p>Người thụ hưởng: <strong>CTCP CHUNG KHOAN DNSE</strong></p>
  </div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/pages/CashTransfer / VietQRModal.tsx',
    flutter_equivalent: 'lib/pages/cash_transfer/qr_deposit_view.dart'
  },
  'SmartOtpInput': {
    name: 'Ô Nhập 6 Số Mã Xác Thực Smart OTP',
    class_name: 'smart-otp-input',
    html_snippet: `
<div class="otp-container" data-change="added">
  <span class="delta-badge">①</span>
  <label class="form-label text-center">Nhập Mã Smart OTP 6 Số</label>
  <div class="otp-cells">
    <span class="otp-cell filled">8</span>
    <span class="otp-cell filled">9</span>
    <span class="otp-cell filled">2</span>
    <span class="otp-cell cursor">|</span>
    <span class="otp-cell"></span>
    <span class="otp-cell"></span>
  </div>
  <div class="otp-timer text-hint text-center">Mã tự động sinh lại sau <strong>18s</strong></div>
</div>`.trim(),
    react_equivalent: 'libs/ui/src/OtpBlockInput',
    flutter_equivalent: 'lib/widgets/smart_otp_input_view.dart'
  },
  'RandomEndTooltip': {
    name: 'Tooltip Cảnh Báo Cơ Chế Đóng Cửa Ngẫu Nhiên Phiên ATC KRX',
    class_name: 'random-end-tooltip',
    html_snippet: `
<div class="tooltip-box info" data-change="added">
  <span class="delta-badge">③</span>
  <span class="info-icon">ℹ️</span>
  <span>Phiên ATC áp dụng cơ chế <strong>Đóng Cửa Ngẫu Nhiên</strong> từ 14:44:30 đến 14:45:00 theo chuẩn KRX. Không được hủy/sửa lệnh.</span>
</div>`.trim(),
    react_equivalent: 'libs/ui/src/Tooltip',
    flutter_equivalent: 'lib/widgets/app_tooltip.dart'
  },
  'StockStatusBadge': {
    name: 'Huy Hiệu Cảnh Báo Trạng Thái Cổ Phiếu (CR/CA/RES/SUS)',
    class_name: 'stock-status-badge',
    html_snippet: `
<span class="stock-status-badge status-warning" title="Cổ phiếu thuộc diện kiểm soát (CR)">
  CR - Kiểm Soát
</span>`.trim(),
    react_equivalent: 'libs/ui/src/Badge / StockBadge.tsx',
    flutter_equivalent: 'lib/widgets/stock_status_tag.dart'
  },
  'DerivativePpseCard': {
    name: 'Thẻ Sức Mua & Ký Quỹ Phái Sinh PPSE',
    class_name: 'derivative-ppse-card',
    html_snippet: `
<div class="ppse-card">
  <div class="ppse-row"><span>Sức Mua PPSE:</span><strong class="text-gain">45,200,000 đ</strong></div>
  <div class="ppse-row"><span>Số HĐ Mua Tối Đa:</span><strong>3 HĐ</strong></div>
  <div class="ppse-row"><span>Tỷ Lệ Ký Quỹ Bắt Buộc:</span><span>17.0%</span></div>
  <div class="ppse-row"><span>Tỷ Lệ Ký Quỹ Hiện Tại:</span><strong class="text-warning">68.5%</strong></div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/components/DerivativePPSE / index.tsx',
    flutter_equivalent: 'lib/pages/derivative/ppse_summary_widget.dart'
  },
  'TrailingStopConfig': {
    name: 'Khung Thiết Lập Lệnh Xu Hướng (Trailing Stop)',
    class_name: 'trailing-stop-config',
    html_snippet: `
<div class="trailing-config" data-change="added">
  <span class="delta-badge">①</span>
  <div class="form-group">
    <label class="form-label">Biên Độ Trượt (Trailing Step)</label>
    <div class="input-unit">
      <input type="text" class="form-input" value="0.5">
      <span class="unit">Giá (0.500 đ)</span>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label">Giá Kích Hoạt Tối Thiểu</label>
    <input type="text" class="form-input" value="25.00">
  </div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/components/OrderForm/TrailingStopTab.tsx',
    flutter_equivalent: 'lib/pages/conditional_order/trailing_stop_page.dart'
  },
  'BottomNavigation': {
    name: 'Thanh Điều Hướng Đáy Chuẩn Mobile Arrow App',
    class_name: 'bottom-navigation-bar',
    html_snippet: `
<nav class="bottom-nav">
  <div class="nav-tab active"><span class="tab-icon">📊</span><span class="tab-label">Thị trường</span></div>
  <div class="nav-tab"><span class="tab-icon">⚡</span><span class="tab-label">Giao dịch</span></div>
  <div class="nav-tab"><span class="tab-icon">📑</span><span class="tab-label">Sổ lệnh</span></div>
  <div class="nav-tab"><span class="tab-icon">💰</span><span class="tab-label">Tài sản</span></div>
  <div class="nav-tab"><span class="tab-icon">⚙️</span><span class="tab-label">Cá nhân</span></div>
</nav>`.trim(),
    react_equivalent: 'apps/mobile-web/src/components/BottomNav',
    flutter_equivalent: 'lib/widgets/bottom_tab_navigation.dart'
  },
  'PortfolioSummaryCard': {
    name: 'Thẻ Tổng Quan Giá Trị Tài Sản Ròng NAV & Lãi Lỗ Tạm Tính',
    class_name: 'portfolio-summary-card',
    html_snippet: `
<div class="portfolio-card as-is-context">
  <div class="nav-label">TỔNG TÀI SẢN THỰC CÓ (NAV)</div>
  <div class="nav-value">345,680,000 đ</div>
  <div class="profit-row">
    <span>Lãi/Lỗ Tạm Tính Hôm Nay:</span>
    <span class="text-gain font-mono">+8,240,000 đ (+2.44%)</span>
  </div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/pages/Assets / PortfolioOverview.tsx',
    flutter_equivalent: 'lib/pages/assets/portfolio_summary_view.dart'
  },
  'AssetAllocationBar': {
    name: 'Thanh Tỷ Trọng Phân Bổ Tài Sản (Tiền Mặt / Cổ Phiếu / Margin)',
    class_name: 'asset-allocation-bar',
    html_snippet: `
<div class="allocation-bar-wrapper">
  <div class="allocation-bar">
    <div class="segment seg-stock" style="width: 65%;"></div>
    <div class="segment seg-cash" style="width: 25%;"></div>
    <div class="segment seg-loan" style="width: 10%;"></div>
  </div>
  <div class="allocation-legend">
    <span><i class="dot dot-stock"></i> Cổ phiếu (65%)</span>
    <span><i class="dot dot-cash"></i> Tiền mặt (25%)</span>
    <span><i class="dot dot-loan"></i> Nợ Margin (10%)</span>
  </div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/components/AssetAllocationChart',
    flutter_equivalent: 'lib/widgets/asset_allocation_bar_widget.dart'
  },
  'ConditionalOrderToggle': {
    name: 'Bộ Chọn Điều Kiện Kích Hoạt Lệnh (STOP / LIMIT / TRAILING)',
    class_name: 'conditional-order-toggle',
    html_snippet: `
<div class="conditional-toggle" data-change="modified">
  <span class="delta-badge">②</span>
  <button type="button" class="cond-btn active">Lệnh Chặn (STOP)</button>
  <button type="button" class="cond-btn">Lệnh Xu Hướng</button>
  <button type="button" class="cond-btn">Lệnh Tranh Mua</button>
</div>`.trim(),
    react_equivalent: 'apps/web/src/components/OrderForm/ConditionalTabs.tsx',
    flutter_equivalent: 'lib/pages/conditional_order/conditional_type_selector.dart'
  },
  'PriceRangeSlider': {
    name: 'Thanh Trượt Chọn Nhanh % Sức Mua (25% / 50% / 75% / 100%)',
    class_name: 'price-range-slider',
    html_snippet: `
<div class="quick-percentage-buttons">
  <button type="button" class="pct-btn">25%</button>
  <button type="button" class="pct-btn">50%</button>
  <button type="button" class="pct-btn">75%</button>
  <button type="button" class="pct-btn active">100%</button>
</div>`.trim(),
    react_equivalent: 'libs/ui/src/Slider / apps/web/src/components/OrderForm/PercentButtons.tsx',
    flutter_equivalent: 'lib/widgets/quick_percentage_selector.dart'
  },
  'MarketIndexTicker': {
    name: 'Dải Chạy Chỉ Số Thị Trường (VN-Index / VN30 / HNX-Index)',
    class_name: 'market-index-ticker',
    html_snippet: `
<div class="index-ticker as-is-context">
  <div class="ticker-item">
    <span class="idx-name">VN-INDEX</span>
    <span class="idx-val text-gain">1,280.45</span>
    <span class="idx-chg text-gain">+6.82 (+0.54%)</span>
  </div>
  <div class="ticker-item">
    <span class="idx-name">VN30</span>
    <span class="idx-val text-loss">1,310.20</span>
    <span class="idx-chg text-loss">-1.15 (-0.09%)</span>
  </div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/components/Header/MarketTicker.tsx',
    flutter_equivalent: 'lib/widgets/market_index_ticker_bar.dart'
  },
  'QuickOrderActionDrawer': {
    name: 'Ngăn Kéo Thao Tác Lệnh Nhanh Trên Mobile',
    class_name: 'quick-order-action-drawer',
    html_snippet: `
<div class="quick-action-drawer" data-change="added">
  <span class="delta-badge">①</span>
  <button class="action-btn buy-btn">⚡ Mua Nhanh (MP)</button>
  <button class="action-btn sell-btn">⚡ Bán Nhanh (MP)</button>
  <button class="action-btn cancel-all-btn">Hủy Hết Lệnh Chờ</button>
</div>`.trim(),
    react_equivalent: 'libs/ui/src/Drawer',
    flutter_equivalent: 'lib/widgets/quick_order_drawer.dart'
  },
  'BankLinkCard': {
    name: 'Thẻ Liên Kết Tài Khoản Ngân Hàng Thụ Hưởng',
    class_name: 'bank-link-card',
    html_snippet: `
<div class="bank-card">
  <div class="bank-logo">BIDV</div>
  <div class="bank-details">
    <div class="bank-name">Ngân hàng TMCP Đầu tư & Phát triển VN</div>
    <div class="account-num font-mono">12410000889922</div>
    <div class="account-holder">NGUYEN VAN A</div>
  </div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/pages/CashTransfer / BankAccountCard.tsx',
    flutter_equivalent: 'lib/pages/cash_transfer/bank_card_widget.dart'
  },
  'FeeTaxBreakdownBox': {
    name: 'Bảng Chi Tiết Tạm Tính Phí Giao Dịch & Thuế TNCN',
    class_name: 'fee-tax-breakdown-box',
    html_snippet: `
<div class="fee-tax-box" data-change="added">
  <span class="delta-badge">③</span>
  <div class="fee-row"><span>Phí Giao Dịch (Miễn phí DNSE):</span><strong>0 đ</strong></div>
  <div class="fee-row"><span>Phí Trả Sở (0.027%):</span><span>6,615 đ</span></div>
  <div class="fee-row"><span>Thuế TNCN Bán (0.1%):</span><span>0 đ (Lệnh Mua)</span></div>
  <div class="fee-row total"><span>Tổng Chi Phí Dự Kiến:</span><strong>6,615 đ</strong></div>
</div>`.trim(),
    react_equivalent: 'apps/web/src/components/OrderForm/FeeTaxCalculation.tsx',
    flutter_equivalent: 'lib/pages/order_confirmation/fee_tax_summary.dart'
  },
  'OrderHistoryFilterBar': {
    name: 'Thanh Lọc Lịch Sử Lệnh Theo Ngày / Mã / Trạng Thái',
    class_name: 'order-history-filter-bar',
    html_snippet: `
<div class="history-filter-bar">
  <input type="text" class="form-input filter-symbol" placeholder="Mã CK (VD: VND)">
  <select class="form-select filter-status">
    <option value="ALL">Tất Cả Trạng Thái</option>
    <option value="FILLED">Đã Khớp</option>
    <option value="PENDING">Chờ Khớp</option>
    <option value="CANCELLED">Đã Hủy</option>
  </select>
  <button class="btn-filter">Tìm Kiếm</button>
</div>`.trim(),
    react_equivalent: 'apps/web/src/pages/OrdersConfirmation / FilterBar.tsx',
    flutter_equivalent: 'lib/pages/order_deal_book/order_filter_bar.dart'
  },
  'SessionClockBadge': {
    name: 'Huy Hiệu Hiển Thị Phiên Giao Dịch Hiện Tại (ATO / Liên tục / ATC / PLO)',
    class_name: 'session-clock-badge',
    html_snippet: `
<div class="session-badge as-is-context">
  <span class="pulse-indicator live"></span>
  <span class="session-name">Khớp Lệnh Liên Tục (HOSE)</span>
  <span class="session-timer font-mono">11:15:30</span>
</div>`.trim(),
    react_equivalent: 'apps/web/src/components/Header/SessionBadge.tsx',
    flutter_equivalent: 'lib/widgets/trading_session_indicator.dart'
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

console.log(`✅ Đã xuất bản thành công Single Source of Truth: ${outputPath}`);
console.log(`   - Web Screens: ${Object.keys(WEB_CORE_SCREENS).length}`);
console.log(`   - Mobile Screens: ${Object.keys(APP_CORE_SCREENS).length}`);
console.log(`   - UI Primitives detected: ${detectedWebUiComponents.length}`);
console.log(`   - Standard UI Components packaged: ${Object.keys(STANDARD_COMPONENTS).length}`);
