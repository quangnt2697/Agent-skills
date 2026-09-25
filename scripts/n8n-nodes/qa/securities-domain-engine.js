/**
 * Node Script: Securities Domain Engine (`scripts/n8n-nodes/qa/securities-domain-engine.js`)
 *
 * Mục đích:
 * - Cung cấp Tầng Tự Động Hóa Tri Thức Domain Chứng Khoán (Securities Domain Engine) cho QA & DEV.
 * - Hỗ trợ 2 chức năng chính qua Webhook:
 *   1. `getRuleMatrix`: Truy vấn ma trận loại lệnh hợp lệ/bị cấm theo sàn, phiên, cờ SI (CR/RES filter).
 *      Tự động sinh bảng Examples đa sàn (Multi-Symbol Parameterization) cho Scenario Outline.
 *   2. `lintGherkin`: Kiểm tra tính tuân thủ quy tắc nghiệp vụ chứng khoán (Domain Linter) của file .feature.
 */

const input = typeof $input !== 'undefined' ? $input.first() : null;
const json = (input && input.json) || {};
const body = json.body || json;

// ── 1. BẢNG DỮ LIỆU ĐẶC TẢ NGHIỆP VỤ KRX CHUẨN HOÁ ────────────────────────
const ALL_ORDER_TYPES = ['LO', 'ATO', 'ATC', 'MP', 'MTL', 'MOK', 'MAK', 'PLO'];

const krxOrderTypeMap = {
  STO: {
    G1: {
      GT1: ['LO', 'ATO', 'MTL', 'ATC'],
      AA1: ['LO', 'ATO'],
      BB1: ['LO', 'MTL', 'ATC'],
      BC1: ['LO', 'ATC'],
      AC2: ['LO', 'MTL', 'ATO', 'ATC'],
    },
    G4: {
      GT1: ['LO', 'ATO', 'MTL', 'ATC'],
      AA1: ['LO', 'ATO'],
      BB1: ['LO', 'MTL', 'ATC'],
      BC1: ['LO', 'ATC'],
      AD2: ['LO', 'MTL', 'ATO', 'ATC'],
    },
    G7: {
      AD1: ['LO', 'MTL', 'ATO', 'ATC'],
      AD2: ['LO', 'MTL', 'ATO', 'ATC'],
    },
    AL: {
      AW8: ['LO', 'MTL', 'ATC'],
      AW9: ['LO', 'MTL', 'ATC'],
    },
  },
  STX: {
    G1: {
      AX1: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
      BB1: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
      BC1: ['LO', 'ATC', 'PLO'],
      AC2: ['PLO'],
    },
    G3: {
      AD1: ['PLO'], // 10p đầu sau giờ nhận lệnh
      AB1: ['PLO'], // Khớp liên tục sau giờ
      AB2: ['LO', 'MTL', 'ATC', 'MOK', 'MAK', 'PLO'],
    },
    G4: {
      AX1: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
      BB1: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
      BC1: ['LO', 'ATC', 'PLO'],
      AD2: ['PLO'],
    },
    G7: {
      AD1: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
      AD2: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
    },
    AL: {
      AW8: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
      AW9: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
    },
  },
  UPX: {
    G1: {
      AB1: ['LO'],
      AB2: ['LO'],
    },
    G4: {
      AB1: ['LO'],
      AB2: ['LO'],
    },
    G7: {
      AD1: ['LO'],
      AD2: ['LO'],
    },
    AL: {
      AW8: ['LO'],
      AW9: ['LO'],
    },
  },
  FIO: {
    G1: {
      GT1: ['LO', 'MTL', 'ATO', 'MAK', 'MOK'],
      AA1: ['LO', 'ATO'],
      BB1: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
      BC1: ['LO', 'ATC'],
      AC2: ['LO', 'MTL', 'ATO', 'ATC', 'MAK', 'MOK'],
    },
    AL: {
      AW8: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
      AW9: ['LO', 'MTL', 'ATC', 'MOK', 'MAK'],
    },
  },
  FBX: {
    G1: {
      GT1: ['LO', 'MTL', 'ATO', 'MAK', 'MOK'],
      AA1: ['LO', 'ATO'],
      BB1: ['LO', 'MTL', 'MAK', 'MOK'],
      AD2: ['LO', 'MTL', 'ATO', 'MAK', 'MOK'],
    },
    AL: {
      AW8: ['LO', 'MTL', 'MOK', 'MAK'],
      AW9: ['LO', 'MTL', 'MOK', 'MAK'],
    },
  },
};

const krxDefaultOrderType = {
  STO: ['LO', 'MTL', 'ATO', 'ATC'],
  STX: ['LO', 'MTL', 'ATC', 'MOK', 'MAK', 'PLO'],
  UPX: ['LO'],
  FIO: ['LO', 'MTL', 'ATO', 'ATC', 'MOK', 'MAK'],
  FBX: ['LO', 'MTL', 'ATO', 'MOK', 'MAK'],
  HCX: ['LO'],
};

const sessionNameMap = {
  AA1: 'ATO (Mở cửa định kỳ)',
  BB1: 'CONTINUOUS (Khớp liên tục)',
  BC1: 'ATC (Đóng cửa định kỳ)',
  AC2: 'ATC_EXECUTION (Khớp phiên đóng cửa)',
  AD1: 'ORDER_ACCEPT (Nhận lệnh Buy-in / Sau giờ)',
  AD2: 'ODD_CLOSE (Đóng phiên lô lẻ / Buy-in)',
  AB1: 'POST_CONT (Khớp liên tục sau giờ G3 / Thỏa thuận)',
  AB2: 'BOARD_CLOSE (Đóng bảng giao dịch)',
  AX1: 'BOARD_OPEN (Mở bảng giao dịch)',
  AW8: 'NOON_BREAK (Nghỉ trưa)',
  AW9: 'CONT_AFTERNOON (Liên tục chiều)',
  GT1: 'GT_LOAD (Nạp lệnh GTC đầu ngày)',
};

function normalizeMarket(market) {
  if (!market) return 'STO';
  const m = String(market).toUpperCase().trim();
  if (m === '6' || m === 'HOSE' || m === 'STO') return 'STO';
  if (m === '7' || m === 'HNX' || m === 'STX') return 'STX';
  if (m === '8' || m === 'UPCOM' || m === 'UPX') return 'UPX';
  if (m === '3' || m === 'DERIVATIVES' || m === 'FIO' || m.startsWith('VN30')) return 'FIO';
  if (m === 'FBX' || m === 'BOND') return 'FBX';
  if (m === 'HCX') return 'HCX';
  return 'STO';
}

// ── 2. XỬ LÝ ACTION: getRuleMatrix ─────────────────────────────────────────
function handleGetRuleMatrix(payload) {
  const prodGrp = normalizeMarket(payload.marketId || payload.exchange || payload.prodGrpId);
  const boardId = (payload.boardId || 'G1').toUpperCase().trim();
  const eventId = (payload.eventId || 'BB1').toUpperCase().trim();
  const symbol = (payload.symbol || (prodGrp === 'STO' ? 'SSI' : prodGrp === 'STX' ? 'SHS' : prodGrp === 'UPX' ? 'OIL' : '41I1GA0000')).toUpperCase().trim();

  const sanctionStatus = (payload.sanctionStatus || payload.symbolTradingSanctionStatusCode || 'NRM').toUpperCase().trim();
  const methodStatus = (payload.methodStatus || payload.symbolTradingMethodStatusCode || 'NRM').toUpperCase().trim();
  const adminStatus = (payload.adminStatus || payload.symbolAdminStatusCode || 'NRM').toUpperCase().trim();

  // 1. Tra cứu ma trận lệnh chuẩn
  let allowed = (krxOrderTypeMap[prodGrp] && krxOrderTypeMap[prodGrp][boardId] && krxOrderTypeMap[prodGrp][boardId][eventId])
    ? [...krxOrderTypeMap[prodGrp][boardId][eventId]]
    : [...(krxDefaultOrderType[prodGrp] || ['LO'])];

  // 2. Áp dụng quy tắc giám sát SI: Chặn MTL khi CR/RES
  const isSanctionNrm = sanctionStatus === 'NRM';
  const isMethodNrmOrSls = methodStatus === 'NRM' || methodStatus === 'SLS';
  const isAdminCrOrRes = adminStatus === 'CR' || adminStatus === 'RES';

  let isMtlFiltered = false;
  let filterReason = null;

  if (isSanctionNrm && isMethodNrmOrSls && isAdminCrOrRes) {
    if (allowed.includes('MTL')) {
      allowed = allowed.filter(t => t !== 'MTL');
      isMtlFiltered = true;
      filterReason = `Mã ${symbol} đang thuộc diện Cảnh báo (${adminStatus}), hệ thống loại bỏ lệnh thị trường MTL theo quy chuẩn SI.`;
    }
  }

  // 3. Tính toán disallowed orders
  const disallowed = ALL_ORDER_TYPES.filter(t => !allowed.includes(t));

  // 4. Sinh bảng Examples đa sàn (Multi-Symbol Fixture Table cho BDD Scenario Outline)
  const multiSymbolExamples = [
    {
      symbol: 'SHB',
      exchange: 'HOSE',
      marketId: 'STO',
      boardId: 'G1',
      sessionEvent: 'BB1',
      adminStatus: 'NRM',
      allowedOrders: 'LO, MTL, ATC',
      disallowedOrders: 'ATO, MOK, MAK, PLO',
      priceStep: 50,
      note: 'HOSE khớp liên tục thông thường'
    },
    {
      symbol: 'HAG',
      exchange: 'HOSE',
      marketId: 'STO',
      boardId: 'G1',
      sessionEvent: 'BB1',
      adminStatus: 'CR',
      allowedOrders: 'LO, ATC',
      disallowedOrders: 'MTL, ATO, MOK, MAK, PLO',
      priceStep: 50,
      note: 'HOSE diện Cảnh báo (CR) - CẤM MTL'
    },
    {
      symbol: 'SHS',
      exchange: 'HNX',
      marketId: 'STX',
      boardId: 'G1',
      sessionEvent: 'BB1',
      adminStatus: 'NRM',
      allowedOrders: 'LO, MTL, ATC, MOK, MAK',
      disallowedOrders: 'ATO, PLO',
      priceStep: 100,
      note: 'HNX khớp liên tục nhận đủ MTL, MOK, MAK'
    },
    {
      symbol: 'SHS',
      exchange: 'HNX',
      marketId: 'STX',
      boardId: 'G3',
      sessionEvent: 'AB1',
      adminStatus: 'NRM',
      allowedOrders: 'PLO',
      disallowedOrders: 'LO, MTL, ATC, ATO, MOK, MAK',
      priceStep: 100,
      note: 'HNX phiên sau giờ G3 - CHỈ NHẬN PLO'
    },
    {
      symbol: 'OIL',
      exchange: 'UPCOM',
      marketId: 'UPX',
      boardId: 'G1',
      sessionEvent: 'AB1',
      adminStatus: 'NRM',
      allowedOrders: 'LO',
      disallowedOrders: 'ATO, ATC, MP, MTL, MOK, MAK, PLO',
      priceStep: 100,
      note: 'UPCOM - DUY NHẤT LỆNH LO'
    },
    {
      symbol: '41I1GA0000',
      exchange: 'DERIVATIVES',
      marketId: 'FIO',
      boardId: 'G1',
      sessionEvent: 'BB1',
      adminStatus: 'NRM',
      allowedOrders: 'LO, MTL, ATC, MOK, MAK',
      disallowedOrders: 'ATO, PLO',
      priceStep: 0.1,
      note: 'Phái sinh VN30F khớp liên tục'
    }
  ];

  return {
    success: true,
    action: 'getRuleMatrix',
    symbol,
    marketId: prodGrp,
    boardId,
    eventId,
    sessionName: sessionNameMap[eventId] || 'CUSTOM_SESSION',
    adminStatus,
    sanctionStatus,
    methodStatus,
    allowedOrders: allowed,
    disallowedOrders: disallowed,
    isMtlFiltered,
    filterReason,
    multiSymbolExamples
  };
}

// ── 3. XỬ LÝ ACTION: lintGherkin (Domain Rule Validator) ───────────────────
function handleLintGherkin(payload) {
  const gherkinText = payload.gherkinContent || payload.featureText || payload.content || '';
  const issueKey = payload.issueKey || 'UNKNOWN';

  if (!gherkinText.trim()) {
    return {
      success: false,
      valid: false,
      errorCount: 1,
      errors: ['Nội dung kịch bản Gherkin (.feature) rỗng.'],
      warnings: []
    };
  }

  const errors = [];
  const warnings = [];
  const lines = gherkinText.split('\n');

  let inScenario = '';
  let inExamples = false;
  let examplesHeaders = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const lineNum = i + 1;

    if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
      inScenario = line;
      inExamples = false;
      continue;
    }

    if (line.startsWith('Examples:')) {
      inExamples = true;
      examplesHeaders = [];
      continue;
    }

    // Phân tích dòng Examples
    if (inExamples && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (examplesHeaders.length === 0) {
        examplesHeaders = cells.map(c => c.toLowerCase());
      } else {
        const row = {};
        examplesHeaders.forEach((h, idx) => { row[h] = cells[idx] || ''; });

        // Check 1: Mã diện CR/RES có bị test đặt lệnh MTL thành công không?
        const status = (row.adminstatus || row.admin_status || '').toUpperCase();
        const orderType = (row.ordertype || row.order_type || row.loailenh || '').toUpperCase();
        const expected = (row.expected || row.result || '').toLowerCase();

        if ((status === 'CR' || status === 'RES') && orderType === 'MTL') {
          if (!expected.includes('reject') && !expected.includes('từ chối') && !expected.includes('lỗi') && !expected.includes('cấm')) {
            errors.push(`Dòng ${lineNum}: Mã diện ${status} không được phép đặt lệnh MTL thành công (Phải bị từ chối hoặc disable).`);
          }
        }

        // Check 2: UPCOM đặt lệnh khác LO
        const exchange = (row.exchange || row.market || row.san || '').toUpperCase();
        if ((exchange === 'UPCOM' || exchange === 'UPX') && orderType && orderType !== 'LO') {
          if (!expected.includes('reject') && !expected.includes('từ chối') && !expected.includes('lỗi')) {
            errors.push(`Dòng ${lineNum}: Sàn UPCOM chỉ hỗ trợ lệnh LO, không chấp nhận lệnh "${orderType}".`);
          }
        }

        // Check 3: HNX/UPCOM đặt lệnh ATO
        if ((exchange === 'HNX' || exchange === 'STX' || exchange === 'UPCOM' || exchange === 'UPX') && orderType === 'ATO') {
          errors.push(`Dòng ${lineNum}: Sàn ${exchange} không có phiên ATO, không được định nghĩa lệnh ATO.`);
        }

        // Check 4: Sau giờ G3 đặt lệnh khác PLO
        const board = (row.boardid || row.board || '').toUpperCase();
        if (board === 'G3' && orderType && orderType !== 'PLO') {
          if (!expected.includes('reject') && !expected.includes('từ chối')) {
            errors.push(`Dòng ${lineNum}: Bảng sau giờ G3 của HNX chỉ chấp nhận lệnh PLO, không hỗ trợ "${orderType}".`);
          }
        }
      }
      continue;
    }

    // Kiểm tra từng step riêng lẻ
    const stepLower = line.toLowerCase();

    // Check 5: Sửa/hủy lệnh trong phiên định kỳ ATO/ATC
    if ((stepLower.includes('hủy lệnh') || stepLower.includes('sửa lệnh') || stepLower.includes('cancel order') || stepLower.includes('amend order')) &&
        (stepLower.includes('phiên ato') || stepLower.includes('phiên atc') || stepLower.includes('random end'))) {
      if (!stepLower.includes('bị từ chối') && !stepLower.includes('không thành công') && !stepLower.includes('reject') && !stepLower.includes('cấm')) {
        errors.push(`Dòng ${lineNum}: Trong phiên ATO, ATC hoặc Random End, SGDCK TUYỆT ĐỐI CẤM sửa/hủy lệnh.`);
      }
    }

    // Check 6: Lệnh MOK/MAK trên HoSE
    if ((stepLower.includes('hose') || stepLower.includes('sto')) && (stepLower.includes('mok') || stepLower.includes('mak'))) {
      if (!stepLower.includes('từ chối') && !stepLower.includes('lỗi') && !stepLower.includes('reject')) {
        warnings.push(`Dòng ${lineNum}: Lệnh MOK/MAK chỉ áp dụng trên sàn HNX và Phái sinh, không có trên sàn HoSE.`);
      }
    }
  }

  // Check 7: Kiểm tra quy tắc Multi-Symbol Parameterization (Bắt buộc tách sàn hoặc Scenario Outline)
  const hasScenarioOutline = gherkinText.includes('Scenario Outline:');
  const mentionsMultiExchange = (gherkinText.includes('HOSE') || gherkinText.includes('HoSE')) && 
                                (gherkinText.includes('HNX') || gherkinText.includes('UPCOM') || gherkinText.includes('Phái sinh'));
  if (mentionsMultiExchange && !hasScenarioOutline) {
    warnings.push(`Tính năng bao phủ đa sàn nhưng chưa sử dụng "Scenario Outline" kèm bảng "Examples" tham số hóa chi tiết theo quy tắc QA bắt buộc.`);
  }

  return {
    success: true,
    action: 'lintGherkin',
    issueKey,
    valid: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    errors,
    warnings,
    checkedRules: [
      'RULE_CR_RES_NO_MTL: Cấm lệnh MTL cho cổ phiếu diện Cảnh báo/Hạn chế',
      'RULE_UPCOM_ONLY_LO: Sàn UPCoM chỉ cho phép lệnh LO',
      'RULE_HNX_UPCOM_NO_ATO: Sàn HNX và UPCoM không có lệnh ATO',
      'RULE_HOSE_NO_MOK_MAK: Sàn HoSE không hỗ trợ lệnh MOK/MAK',
      'RULE_PERIODIC_NO_CANCEL_AMEND: Cấm sửa/hủy lệnh trong phiên định kỳ ATO/ATC/Random End',
      'RULE_POST_MARKET_ONLY_PLO: Bảng sau giờ G3 HNX chỉ nhận lệnh PLO',
      'RULE_MULTI_SYMBOL_PARAM: Bắt buộc tham số hóa đa sàn/đa mã'
    ]
  };
}

// ── 4. MAIN ROUTER ─────────────────────────────────────────────────────────
let responsePayload;

const action = (body.action || '').toLowerCase().trim();

if (action === 'lint' || action === 'lintgherkin' || body.gherkinContent || body.featureText) {
  responsePayload = handleLintGherkin(body);
} else {
  // Mặc định là getRuleMatrix
  responsePayload = handleGetRuleMatrix(body);
}

return [{
  json: {
    timestamp: new Date().toISOString(),
    ...responsePayload
  }
}];
