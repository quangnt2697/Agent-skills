/**
 * Node Script: Securities Fixture Engine (`scripts/n8n-nodes/securities-fixture-engine.js`)
 *
 * Mục đích (WF-02):
 * - Xử lý dữ liệu từ bảng `security_definition_v3` trên TimescaleDB/Metabase UAT.
 * - Lấy đầy đủ 4 phân khúc thị trường:
 *   1. Phái sinh (market_id = 3): Ưu tiên `41I1GA0000`, tự động rollover nếu đáo hạn.
 *   2. HOSE (market_id = 6): Mã `SHB`.
 *   3. UPCOM (market_id = 8): Mã `OIL`.
 *   4. HNX (market_id = 7): Mã `SHS`.
 * - Tự động nạp `apiKey`, `apiSecret`, `baseUrl` từ biến môi trường (.env).
 * - KHÔNG gửi Mattermost — trả về JSON thuần túy để tăng tốc quy trình sinh test tự động.
 */

const input = $input.first();
const json = (input && input.json) || {};

// 1. Nạp biến môi trường xác thực từ $env hoặc process.env
const baseUrl = ($env && $env.BASE_URL) || (process.env && process.env.BASE_URL) || 'https://openapi-uat.example.com';
const apiKey = ($env && $env.API_KEY) || (process.env && process.env.API_KEY) || '';
const apiSecret = ($env && $env.API_SECRET) || (process.env && process.env.API_SECRET) || '';

// 2. Trích xuất danh sách rows từ kết quả query Metabase hoặc payload
let rows = [];
if (Array.isArray(json.data)) {
  rows = json.data;
} else if (Array.isArray(json.rows)) {
  rows = json.rows;
} else if (json.data && Array.isArray(json.data.rows)) {
  const cols = (json.data.cols || []).map(c => (typeof c === 'string' ? c : c.name).toLowerCase());
  rows = json.data.rows.map(r => {
    const obj = {};
    cols.forEach((col, idx) => { obj[col] = r[idx]; });
    return obj;
  });
} else if (json.body && Array.isArray(json.body.rows)) {
  rows = json.body.rows;
}

// Hàm tính ngày thứ Năm thứ 3 của tháng (Ngày đáo hạn phái sinh VN30)
function getThirdThursdayOfMonth(year, month) {
  // month: 1-12
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay(); // 0: Sun, 1: Mon, ..., 4: Thu
  let firstThursdayOffset = (4 - dayOfWeek + 7) % 7;
  const thirdThursdayDate = 1 + firstThursdayOffset + 14;
  return new Date(year, month - 1, thirdThursdayDate, 15, 0, 0); // 15:00 hết phiên
}

const now = new Date();

// 3. Phân loại và trích xuất 4 phân khúc
let derivativeSymbol = null;
let hoseSymbol = null;
let upcomSymbol = null;
let hnxSymbol = null;

const allDerivatives = [];

for (const row of rows) {
  const sym = (row.symbol || '').toUpperCase().trim();
  const mId = parseInt(row.market_id, 10);
  const basic = parseFloat(row.basic_price) || 0;
  const ceiling = parseFloat(row.ceiling_price) || 0;
  const floor = parseFloat(row.floor_price) || 0;
  const lot = parseInt(row.board_lot, 10) || (mId === 3 ? 1 : 100);

  if (mId === 3 || sym.startsWith('41I1') || sym.startsWith('VN30F')) {
    allDerivatives.push({
      symbol: sym,
      marketId: 3,
      exchange: 'DERIVATIVES',
      basicPrice: basic,
      ceilingPrice: ceiling,
      floorPrice: floor,
      boardLot: 1,
      maturityDate: row.maturity_date || null,
      isTargetIsin: sym === '41I1GA0000'
    });
  }

  if ((mId === 6 || sym === 'SHB') && sym === 'SHB') {
    hoseSymbol = {
      symbol: 'SHB',
      marketId: 6,
      exchange: 'HOSE',
      basicPrice: basic || 11500,
      ceilingPrice: ceiling || 12300,
      floorPrice: floor || 10700,
      boardLot: lot || 100,
      priceStep: (basic || 11500) < 10000 ? 10 : ((basic || 11500) <= 50000 ? 50 : 100)
    };
  }

  if ((mId === 8 || sym === 'OIL') && sym === 'OIL') {
    upcomSymbol = {
      symbol: 'OIL',
      marketId: 8,
      exchange: 'UPCOM',
      basicPrice: basic || 13200,
      ceilingPrice: ceiling || 15100,
      floorPrice: floor || 11300,
      boardLot: lot || 100,
      priceStep: 100
    };
  }

  if ((mId === 7 || sym === 'SHS') && sym === 'SHS') {
    hnxSymbol = {
      symbol: 'SHS',
      marketId: 7,
      exchange: 'HNX',
      basicPrice: basic || 14000,
      ceilingPrice: ceiling || 15400,
      floorPrice: floor || 12600,
      boardLot: lot || 100,
      priceStep: 100
    };
  }
}

// 4. Xử lý logic Phái sinh: ưu tiên 41I1GA0000 hoặc tự động lấy mã tháng chưa đáo hạn
const currentMonthExpiry = getThirdThursdayOfMonth(now.getFullYear(), now.getMonth() + 1);
const isCurrentMonthExpired = now > currentMonthExpiry;

// Tìm 41I1GA0000 trước
const isinMatch = allDerivatives.find(d => d.symbol === '41I1GA0000');

if (isinMatch && !isCurrentMonthExpired) {
  derivativeSymbol = {
    ...isinMatch,
    expiryStatus: 'ACTIVE_CURRENT_MONTH',
    note: 'Hợp đồng 41I1GA0000 tháng hiện tại còn hiệu lực'
  };
} else if (allDerivatives.length > 0) {
  // Tìm hợp đồng chưa đáo hạn gần nhất
  const unexpired = allDerivatives
    .filter(d => !d.maturityDate || new Date(d.maturityDate) >= now)
    .sort((a, b) => {
      const tA = a.maturityDate ? new Date(a.maturityDate).getTime() : 9999999999999;
      const tB = b.maturityDate ? new Date(b.maturityDate).getTime() : 9999999999999;
      return tA - tB;
    });

  if (unexpired.length > 0) {
    derivativeSymbol = {
      ...unexpired[0],
      expiryStatus: isCurrentMonthExpired ? 'ROLLOVER_NEXT_MONTH' : 'ACTIVE_NEAREST',
      note: isCurrentMonthExpired ? 'Tháng hiện tại đã đáo hạn, tự động lấy hợp đồng mở tiếp theo' : 'Hợp đồng gần nhất chưa đáo hạn'
    };
  } else {
    derivativeSymbol = {
      ...allDerivatives[0],
      expiryStatus: 'ACTIVE_FALLBACK',
      note: 'Hợp đồng phái sinh đầu tiên trong bảng'
    };
  }
}

// 5. Fallback chuẩn nếu môi trường DB chưa có sẵn dữ liệu đầy đủ
if (!derivativeSymbol) {
  derivativeSymbol = {
    symbol: '41I1GA0000',
    marketId: 3,
    exchange: 'DERIVATIVES',
    basicPrice: 1250.0,
    ceilingPrice: 1337.5,
    floorPrice: 1162.5,
    boardLot: 1,
    expiryStatus: isCurrentMonthExpired ? 'ROLLOVER_NEXT_MONTH' : 'ACTIVE_CURRENT_MONTH',
    note: 'Dữ liệu chuẩn fallback định nghĩa sàn phái sinh'
  };
}

if (!hoseSymbol) {
  hoseSymbol = {
    symbol: 'SHB',
    marketId: 6,
    exchange: 'HOSE',
    basicPrice: 11500,
    ceilingPrice: 12300,
    floorPrice: 10700,
    boardLot: 100,
    priceStep: 50
  };
}

if (!upcomSymbol) {
  upcomSymbol = {
    symbol: 'OIL',
    marketId: 8,
    exchange: 'UPCOM',
    basicPrice: 13200,
    ceilingPrice: 15100,
    floorPrice: 11300,
    boardLot: 100,
    priceStep: 100
  };
}

if (!hnxSymbol) {
  hnxSymbol = {
    symbol: 'SHS',
    marketId: 7,
    exchange: 'HNX',
    basicPrice: 14000,
    ceilingPrice: 15400,
    floorPrice: 12600,
    boardLot: 100,
    priceStep: 100
  };
}

// 6. Xây dựng bộ payload mẫu (Fixtures) cho automation test
const sampleOrders = {
  validHoseBuy: {
    symbol: hoseSymbol.symbol,
    price: hoseSymbol.basicPrice,
    quantity: hoseSymbol.boardLot,
    orderType: 'LO',
    side: 'BUY'
  },
  invalidHoseCeiling: {
    symbol: hoseSymbol.symbol,
    price: Math.round(hoseSymbol.ceilingPrice * 1.05),
    quantity: hoseSymbol.boardLot,
    orderType: 'LO',
    side: 'BUY',
    expectedError: 'ORS-0010: Vượt mức giá trần cho phép'
  },
  invalidHoseStep: {
    symbol: hoseSymbol.symbol,
    price: hoseSymbol.basicPrice + 17, // Sai bước giá 50đ
    quantity: hoseSymbol.boardLot,
    orderType: 'LO',
    side: 'BUY',
    expectedError: 'ORS-0012: Giá vi phạm bước giá quy định'
  },
  validDerivativeBuy: {
    symbol: derivativeSymbol.symbol,
    price: derivativeSymbol.basicPrice,
    quantity: 1,
    orderType: 'LO',
    side: 'BUY'
  },
  validUpcomBuy: {
    symbol: upcomSymbol.symbol,
    price: upcomSymbol.basicPrice,
    quantity: upcomSymbol.boardLot,
    orderType: 'LO',
    side: 'BUY'
  },
  validHnxBuy: {
    symbol: hnxSymbol.symbol,
    price: hnxSymbol.basicPrice,
    quantity: hnxSymbol.boardLot,
    orderType: 'LO',
    side: 'BUY'
  }
};

return [{
  json: {
    isError: false,
    timestamp: now.toISOString(),
    auth: {
      baseUrl,
      apiKey,
      apiSecret,
      hasApiKey: Boolean(apiKey),
      hasApiSecret: Boolean(apiSecret)
    },
    segments: {
      derivatives: derivativeSymbol,
      hose: hoseSymbol,
      upcom: upcomSymbol,
      hnx: hnxSymbol
    },
    sampleOrders
  }
}];
