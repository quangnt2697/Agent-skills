/**
 * Node Script: Verify Health & Parity — Merge 2 Steps
 * (`scripts/n8n-nodes/db/watchdog-verify-health.js`)
 *
 * Mục đích:
 * Merge kết quả từ 2 node query riêng biệt và xuất báo cáo tổng hợp:
 *   - Step 1: Kết quả kiểm tra `security_definition_v3` (basic/ceiling/floor/board_id)
 *   - Step 2: Kết quả kiểm tra `krx_mdds_v2_stock_infos` (21 trường realtime cần clear)
 *
 * Cách dùng trong n8n:
 *   - Node "Merge" (mode: Combine/Append) nối output của "Run Query 1" và "Run Query 2"
 *     vào node này, hoặc dùng $('Run Query 1') và $('Run Query 2') để lấy input.
 *   - Node này đọc field `checkStep` để phân biệt Step 1 / Step 2.
 */

const now = new Date();
const dateStr = now.toISOString().split('T')[0];
const timeStr = now.toTimeString().split(' ')[0] + ' ICT';

// ── Helper: bóc tách danh sách report_data từ 1 item Metabase response ───────
function extractReportsFromItem(item) {
  if (!item) return [];
  const reports = [];
  const rows = Array.isArray(item.data) ? item.data : [item];
  for (const row of rows) {
    let rd = row.report_data || row.result || row;
    if (typeof rd === 'string') {
      try { rd = JSON.parse(rd); } catch (_) { rd = null; }
    }
    if (rd && typeof rd === 'object') {
      reports.push(rd);
    }
  }
  return reports;
}

// ── Helper: lấy tất cả items từ 1 node theo tên ──────────────────────────────
function getNodeItems(nodeName) {
  try {
    const nodeData = $(nodeName).all();
    return nodeData.map(i => i.json);
  } catch (_) {
    return [];
  }
}

// ── 1. Thu thập output từ cả 2 bước query ────────────────────────────────────
const allInputs = $input.all().map(i => i.json);

// Thử lấy trực tiếp từ tên node nếu có (hỗ trợ backward-compatibility)
const step1Items = getNodeItems('Run Query 1 - SecDef');
const step2Items = getNodeItems('Run Query 2 - Realtime');

let step1Data = null;
let step2Data = null;

const allCandidateReports = [];
if (step1Items.length > 0) allCandidateReports.push(...extractReportsFromItem(step1Items[0]));
if (step2Items.length > 0) allCandidateReports.push(...extractReportsFromItem(step2Items[0]));

for (const inputItem of allInputs) {
  allCandidateReports.push(...extractReportsFromItem(inputItem));
}

for (const rd of allCandidateReports) {
  if (!rd || typeof rd !== 'object') continue;
  const step = rd.step || '';
  if (step === 'sec_def_v3' || rd.total_scanned !== undefined) {
    if (!step1Data) step1Data = rd;
  }
  if (step === 'realtime_clear' || rd.unclean_count !== undefined) {
    if (!step2Data) step2Data = rd;
  }
}

// ── 2. Xử lý lỗi nếu thiếu dữ liệu từ bất kỳ step nào ──────────────────────
const missingSteps = [];
if (!step1Data) missingSteps.push('Step 1 (security_definition_v3)');
if (!step2Data) missingSteps.push('Step 2 (krx_mdds_v2_stock_infos)');

// Lấy triggerSource từ input hoặc node trước
let triggerSource = 'cron';
try {
  const prepNode = $('Prepare Watchdog Query').first();
  if (prepNode && prepNode.json) {
    triggerSource = prepNode.json._parentTriggerSource || prepNode.json._triggerSource || 'cron';
  }
} catch (_) {}
for (const item of allInputs) {
  if (item._parentTriggerSource) triggerSource = item._parentTriggerSource;
  else if (item._triggerSource && item._triggerSource !== 'executeWorkflow') triggerSource = item._triggerSource;
}

if (missingSteps.length === 2) {
  // Cả 2 đều lỗi — có thể Metabase timeout hoàn toàn hoặc lỗi truy vấn
  const firstItem = allInputs[0] || {};
  const errMsg = firstItem.reportText || firstItem.message || (allInputs.length === 0 ? 'Không nhận được dữ liệu phản hồi từ Metabase Query Executor (Sub-workflow có thể bị ngắt).' : 'Không nhận được response từ Metabase');
  const isAuthError = /401|403|unauthenticated|session token/i.test(errMsg);
  const suggestion = isAuthError
    ? '\n\n*👉 Session Token có thể đã hết hạn hoặc không hợp lệ. Hãy chạy `node scripts/db/metabase-sso-login.js`.*'
    : '\n\n*👉 Hãy kiểm tra kết nối TimescaleDB hoặc cú pháp câu lệnh SQL.*';
  const alertMsg = `🚨 **[MDDS PRODUCTION LỖI 08:20 AM]** Không thể truy vấn Metabase Production:\n> ${errMsg}${suggestion}`;
  return [{
    json: {
      environment: 'PRODUCTION',
      timestamp: now.toISOString(),
      isHealthy: false,
      totalScanned: 0,
      message: alertMsg,
      reportText: alertMsg,
      _triggerSource: triggerSource
    }
  }];
}

// ── 3. Trích xuất dữ liệu từ Step 1: Security Definition V3 ──────────────────
const totalScanned    = parseInt((step1Data && step1Data.total_scanned) || 0, 10);
const summary         = Array.isArray(step1Data && step1Data.summary)  ? step1Data.summary  : [];
const invalids        = Array.isArray(step1Data && step1Data.invalids) ? step1Data.invalids : [];

// ── 4. Trích xuất dữ liệu từ Step 2: Realtime Clear Check ────────────────────
const uncleanCount   = parseInt((step2Data && step2Data.unclean_count) || 0, 10);
const uncleanSamples = Array.isArray(step2Data && step2Data.unclean_samples) ? step2Data.unclean_samples : [];

// ── 5. Kiểm tra bảng security_definition_v3 rỗng ─────────────────────────────
if (totalScanned === 0 && step1Data) {
  const emptyAlert = `🚨 **[MDDS PRODUCTION KHẨN CẤP 08:20 AM] Bảng \`security_definition_v3\` CHƯA CÓ DỮ LIỆU!**\n\n` +
    `- **Thời gian kiểm tra:** \`${dateStr} ${timeStr}\`\n` +
    `- **Trạng thái:** ❌ **0 bản ghi** được tìm thấy trên TimescaleDB Production.\n` +
    `- **Nguyên nhân tiềm ẩn:** Pipeline MDDS chưa nhận hoặc chưa nạp bản tin Security Definition (\`d\`) từ Sở KRX.\n` +
    `- **Hành động cần làm:** Kiểm tra ngay tiến trình Ingest MDDS và gateway kết nối Sở trước giờ mở phiên ATO (09:00).`;
  return [{
    json: {
      environment: 'PRODUCTION',
      timestamp: now.toISOString(),
      isHealthy: false,
      totalScanned: 0,
      message: emptyAlert,
      reportText: emptyAlert
    }
  }];
}

// ── 6. Tổng hợp số liệu theo từng sàn ────────────────────────────────────────
let totalSymbolsAll  = 0;
let validSymbolsAll  = 0;
let invalidSymbolsAll = 0;
let missingBasicAll   = 0;
let missingCeilingAll = 0;
let missingFloorAll   = 0;
let missingBoardIdAll = 0;

let tableMd = `| Sàn Giao Dịch | Tổng Số Mã | Đủ Dữ Liệu (OK) | Thiếu Data (Lỗi) | Tỷ Lệ Đạt Chuẩn |\n`;
tableMd    += `| :--- | :---: | :---: | :---: | :---: |\n`;

for (const s of summary) {
  const floor   = s.floor_code || 'KHÁC';
  const total   = parseInt(s.total_symbols   || 0, 10);
  const valid   = parseInt(s.valid_symbols   || 0, 10);
  const invalid = parseInt(s.invalid_symbols || 0, 10);
  const pct     = total > 0 ? ((valid / total) * 100).toFixed(1) + '%' : '0.0%';

  totalSymbolsAll  += total;
  validSymbolsAll  += valid;
  invalidSymbolsAll += invalid;
  missingBasicAll   += parseInt(s.missing_basic_count   || 0, 10);
  missingCeilingAll += parseInt(s.missing_ceiling_count || 0, 10);
  missingFloorAll   += parseInt(s.missing_floor_count   || 0, 10);
  missingBoardIdAll += parseInt(s.missing_board_id_count || 0, 10);

  const statusIcon = invalid === 0 ? '✅' : '⚠️';
  tableMd += `| **${floor}** | ${total.toLocaleString()} | ${valid.toLocaleString()} | ${invalid > 0 ? `**${invalid}**` : '0'} | ${statusIcon} ${pct} |\n`;
}

// ── Helper: KRX Market Session State Machine ────────────────────────────────
function getKRXMarketSession(date = new Date()) {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const vnDate = new Date(utc + (7 * 3600000));
  
  const yyyy = vnDate.getFullYear();
  const mm = String(vnDate.getMonth() + 1).padStart(2, '0');
  const dd = String(vnDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const dayOfWeek = vnDate.getDay();

  const vnStockHolidays = [
    '2025-01-01', '2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31',
    '2025-04-07', '2025-04-30', '2025-05-01', '2025-05-02', '2025-09-01', '2025-09-02',
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
    '2026-04-26', '2026-04-30', '2026-05-01', '2026-09-01', '2026-09-02',
    '2027-01-01', '2027-02-05', '2027-02-08', '2027-02-09', '2027-02-10',
    '2027-04-16', '2027-04-30', '2027-05-01', '2027-09-02', '2027-09-03'
  ];

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = vnStockHolidays.includes(dateStr);
  const isTradingDay = !isWeekend && !isHoliday;

  const hours = vnDate.getHours();
  const minutes = vnDate.getMinutes();
  const hhmm = hours * 100 + minutes;

  let sessionPhase = 'CLOSED';
  let description = 'Thị trường đóng cửa';

  if (!isTradingDay) {
    sessionPhase = 'CLOSED';
    description = isWeekend ? 'Cuối tuần (Không có giao dịch)' : 'Ngày nghỉ lễ (Không có giao dịch)';
  } else if (hhmm < 845) {
    sessionPhase = 'PRE_OPEN';
    description = 'Trước giờ mở cửa (08:20 SecDef check)';
  } else if (hhmm < 900) {
    sessionPhase = 'ATO';
    description = 'Phiên khớp lệnh định kỳ mở cửa';
  } else if (hhmm < 1130) {
    sessionPhase = 'CONTINUOUS_MORNING';
    description = 'Phiên khớp lệnh liên tục buổi sáng';
  } else if (hhmm < 1300) {
    sessionPhase = 'LUNCH_BREAK';
    description = 'Nghỉ trưa';
  } else if (hhmm < 1430) {
    sessionPhase = 'CONTINUOUS_AFTERNOON';
    description = 'Phiên khớp lệnh liên tục buổi chiều';
  } else if (hhmm < 1445) {
    sessionPhase = 'ATC';
    description = 'Phiên khớp lệnh định kỳ đóng cửa';
  } else if (hhmm < 1500) {
    sessionPhase = 'PLO';
    description = 'Phiên khớp lệnh sau giờ (HNX PLO)';
  } else {
    sessionPhase = 'POST_CLOSE';
    description = 'Thị trường đã đóng cửa';
  }

  return {
    tradingDate: dateStr,
    sessionPhase,
    description,
    isTradingDay,
    isPreOpen: isTradingDay && (hhmm < 900),
    timeStr: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(vnDate.getSeconds()).padStart(2, '0')} ICT`
  };
}

const marketSession = getKRXMarketSession(now);
const isPreOpen = marketSession.isPreOpen;

const totalPct = totalSymbolsAll > 0 ? ((validSymbolsAll / totalSymbolsAll) * 100).toFixed(1) + '%' : '0.0%';
tableMd += `| **TỔNG CỘNG** | **${totalSymbolsAll.toLocaleString()}** | **${validSymbolsAll.toLocaleString()}** | **${invalidSymbolsAll > 0 ? invalidSymbolsAll : '0'}** | **${totalPct}** |\n`;

// ── 7. Đánh giá tính toàn vẹn tổng thể ──────────────────────────────────────
const hasDataError    = invalidSymbolsAll > 0;
const hasUncleanError = isPreOpen ? (uncleanCount > 0) : false;
const isHealthy       = !hasDataError && !hasUncleanError;

// ── 8. Thông báo nếu thiếu 1 step (partial error) ────────────────────────────
let partialWarning = '';
if (missingSteps.length > 0) {
  partialWarning = `\n> ⚠️ **Lưu ý:** Không nhận được kết quả từ: ${missingSteps.join(', ')}. Báo cáo có thể chưa đầy đủ.\n`;
}

// ── 9. Xây dựng nội dung file text chi tiết (Audit Log) ─────────────────────
const dayStr   = String(now.getDate()).padStart(2, '0');
const monthStr = String(now.getMonth() + 1).padStart(2, '0');
const yearStr  = String(now.getFullYear());
const ddmmyyyy = `${dayStr}${monthStr}${yearStr}`;
const fileName = `sec-def-v3-${ddmmyyyy}.txt`;

let txtContent = `================================================================================\n`;
txtContent += `BÁO CÁO KIỂM TRA ĐẶC TẢ CHỨNG KHOÁN (SECURITY DEFINITION V3) & RESET ĐẦU NGÀY\n`;
txtContent += `Thời gian kiểm tra: ${dateStr} ${timeStr} | Môi trường: PRODUCTION\n`;
txtContent += `================================================================================\n\n`;

txtContent += `1. KẾT QUẢ TỔNG QUAN THEO SÀN GIAO DỊCH:\n`;
for (const s of summary) {
  txtContent += `   - Sàn ${s.floor_code}: ${s.total_symbols} mã | Hợp lệ: ${s.valid_symbols} | Lỗi: ${s.invalid_symbols} `;
  txtContent += `(Thiếu TC: ${s.missing_basic_count}, Thiếu Trần: ${s.missing_ceiling_count}, Thiếu Sàn: ${s.missing_floor_count}, Thiếu Board: ${s.missing_board_id_count})\n`;
}
txtContent += `   => TỔNG CỘNG: ${totalSymbolsAll} mã đã kiểm tra. Đạt chuẩn: ${validSymbolsAll} (${totalPct}).\n\n`;

txtContent += `2. KIỂM TRA RESET CÁC TRƯỜNG GIAO DỊCH (21 trường realtime):\n`;
if (step2Data === null) {
  txtContent += `   - Trạng thái: KHÔNG CÓ DỮ LIỆU (Step 2 không chạy được).\n\n`;
} else if (isPreOpen) {
  if (uncleanCount === 0) {
    txtContent += `   - Trạng thái: HOÀN TOÀN SẠCH. 100% các mã đã được reset/clear (NULL hoặc 0) trước giờ mở phiên.\n\n`;
  } else {
    txtContent += `   - CẢNH BÁO: Phát hiện ${uncleanCount} mã CHƯA ĐƯỢC RESET/CLEAR trường giao dịch đầu ngày!\n\n`;
  }
} else {
  txtContent += `   - Trạng thái: BỎ QUA KIỂM TRA RESET ĐẦU NGÀY. Thời điểm kiểm tra (${timeStr}) thuộc phiên ${marketSession.sessionPhase}, dữ liệu realtime đã phát sinh giao dịch bình thường (${uncleanCount.toLocaleString()} bản ghi).\n\n`;
}

if (invalids.length > 0) {
  txtContent += `3. DANH SÁCH CHI TIẾT CÁC MÃ LỖI SEC DEF (${invalids.length} mã):\n`;
  txtContent += `--------------------------------------------------------------------------------\n`;
  txtContent += `STT | MÃ CK    | SÀN   | THAM CHIẾU | GIÁ TRẦN   | GIÁ SÀN    | BOARD ID   | LỖI\n`;
  txtContent += `--------------------------------------------------------------------------------\n`;
  invalids.forEach((inv, idx) => {
    const num  = String(idx + 1).padEnd(3);
    const sym  = String(inv.symbol       || '').padEnd(8);
    const flr  = String(inv.floor_code   || '').padEnd(5);
    const ref  = String(inv.basic_price   ?? 'NULL').padEnd(10);
    const ceil = String(inv.ceiling_price ?? 'NULL').padEnd(10);
    const fl   = String(inv.floor_price   ?? 'NULL').padEnd(10);
    const brd  = String(inv.board_id      ?? 'NULL').padEnd(10);
    txtContent += `${num} | ${sym} | ${flr} | ${ref} | ${ceil} | ${fl} | ${brd} | ${inv.error_detail || ''}\n`;
  });
  txtContent += `--------------------------------------------------------------------------------\n\n`;
}

if (isPreOpen && uncleanSamples.length > 0) {
  txtContent += `4. DANH SÁCH CHI TIẾT CÁC MÃ CHƯA RESET/CLEAR TRƯỜNG REALTIME (${uncleanSamples.length} mã):\n`;
  txtContent += `--------------------------------------------------------------------------------\n`;
  txtContent += `STT | MÃ CK    | SÀN   | CÁC TRƯỜNG CHƯA CLEAR\n`;
  txtContent += `--------------------------------------------------------------------------------\n`;
  uncleanSamples.forEach((unc, idx) => {
    const num = String(idx + 1).padEnd(3);
    const sym = String(unc.symbol     || '').padEnd(8);
    const flr = String(unc.floor_code || '').padEnd(5);
    txtContent += `${num} | ${sym} | ${flr} | ${unc.uncleared_fields || ''}\n`;
  });
  txtContent += `--------------------------------------------------------------------------------\n\n`;
}

// ── 10. Lưu file báo cáo .txt vào workspace/mdds-watchdog/ ──────────────────
let displayFilePath   = `workspace/mdds-watchdog/${fileName}`;
let physicalFilePath  = null;

try {
  let fsModule = null;
  let pathMod  = null;
  if (typeof require !== 'undefined') {
    fsModule = require('fs');
    pathMod  = require('path');
  }

  if (fsModule && pathMod) {
    const envObj     = (typeof $env !== 'undefined' && $env) ? $env : ((typeof process !== 'undefined' && process.env) ? process.env : {});
    const currentDir = (envObj && envObj.AGENT_WORKSPACE_DIR) || process.cwd();

    const configFiles = [
      pathMod.join(currentDir, 'config', 'projects.json'),
      pathMod.join(currentDir, 'projects.json'),
      pathMod.join(currentDir, 'project.js'),
      pathMod.join(currentDir, 'projects.js'),
      pathMod.resolve(currentDir, '..', 'config', 'projects.json'),
      pathMod.resolve(currentDir, '..', 'projects.json'),
      pathMod.resolve(currentDir, '..', '..', 'projects.json')
    ];

    let baseDir    = '';
    let resolvedKey = '';

    for (const cfgPath of configFiles) {
      if (fsModule.existsSync(cfgPath)) {
        try {
          let configObj = null;
          if (cfgPath.endsWith('.json')) {
            configObj = JSON.parse(fsModule.readFileSync(cfgPath, 'utf8'));
          } else if (typeof require !== 'undefined') {
            configObj = require(cfgPath);
          }
          if (configObj && typeof configObj === 'object') {
            const keys     = Object.keys(configObj);
            const foundKey = (envObj && envObj.WATCHDOG_PROJECT_KEY)
              || keys.find(k => /^\d+(\.\d+)+$/.test(k))
              || keys.find(k => !k.includes('-') && !k.includes('_'))
              || keys[0];
            if (foundKey && configObj[foundKey]) {
              resolvedKey = foundKey;
              baseDir     = configObj[foundKey];
              break;
            }
          }
        } catch (_) {}
      }
    }

    if (!baseDir) {
      if (envObj && (envObj.MDDS_WATCHDOG_DIR || envObj.WATCHDOG_DIR)) {
        baseDir = envObj.MDDS_WATCHDOG_DIR || envObj.WATCHDOG_DIR;
      } else if (envObj && envObj.PROJECT_SCAN_DIRS) {
        const scanDirs = String(envObj.PROJECT_SCAN_DIRS)
          .split(',')
          .map(d => d.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        const matchedDir = scanDirs.find(d =>
          /^\d+(\.\d+)+$/.test(pathMod.basename(d)) ||
          fsModule.existsSync(pathMod.join(d, 'workspace'))
        );
        if (matchedDir) {
          baseDir     = matchedDir;
          resolvedKey = pathMod.basename(matchedDir);
        }
      }
    }

    if (!baseDir) baseDir = currentDir;

    const relativeWatchdogPath = pathMod.join('workspace', 'mdds-watchdog', fileName);
    const targetWatchdogDir    = pathMod.join(baseDir, 'workspace', 'mdds-watchdog');

    if (!fsModule.existsSync(targetWatchdogDir)) {
      fsModule.mkdirSync(targetWatchdogDir, { recursive: true });
    }

    physicalFilePath = pathMod.join(targetWatchdogDir, fileName);
    fsModule.writeFileSync(physicalFilePath, txtContent, 'utf-8');

    displayFilePath = resolvedKey ? pathMod.join(resolvedKey, relativeWatchdogPath) : relativeWatchdogPath;
  }
} catch (_) {
  // Lỗi ghi file không làm gián đoạn pipeline thông báo
}

// ── 10.5. Cơ chế Chống Spam & Quản lý Trạng thái Cảnh báo (Stateful Alert Deduplication) ──
let alertStateSummary = {
  firing: [],
  ongoing: [],
  recovered: [],
  suppressed: []
};

try {
  let fsMod = null;
  let pathM = null;
  let cryptoM = null;
  if (typeof require !== 'undefined') {
    fsMod = require('fs');
    pathM = require('path');
    try { cryptoM = require('crypto'); } catch (_) {}
  }

  function getFingerprint(str) {
    if (cryptoM) {
      return cryptoM.createHash('sha256').update(str).digest('hex').slice(0, 16);
    }
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(16).padStart(16, '0');
  }

  if (fsMod && pathM) {
    const envObj = (typeof $env !== 'undefined' && $env) ? $env : ((typeof process !== 'undefined' && process.env) ? process.env : {});
    const currentDir = (envObj && envObj.AGENT_WORKSPACE_DIR) || process.cwd();
    const stateDir = pathM.join(currentDir, 'workspace', 'adhoc', 'database');
    const stateFile = pathM.join(stateDir, 'watchdog-alert-state.json');

    if (!fsMod.existsSync(stateDir)) {
      fsMod.mkdirSync(stateDir, { recursive: true });
    }

    let state = { tradingDate: dateStr, activeAlerts: {}, resolvedAlerts: [] };
    if (fsMod.existsSync(stateFile)) {
      try {
        const loaded = JSON.parse(fsMod.readFileSync(stateFile, 'utf8'));
        if (loaded && loaded.tradingDate === dateStr) {
          state = loaded;
          if (!state.activeAlerts) state.activeAlerts = {};
          if (!state.resolvedAlerts) state.resolvedAlerts = [];
        }
      } catch (_) {}
    }

    // Thu thập danh sách bất thường hiện tại
    const currentAnomalies = [];
    if (totalScanned === 0 && step1Data) {
      currentAnomalies.push({
        topic: 'SecDef',
        symbol: 'ALL',
        anomalyType: 'EMPTY_TABLE',
        severity: 'CRITICAL',
        detail: 'Bảng security_definition_v3 chưa có dữ liệu'
      });
    }
    for (const inv of invalids) {
      currentAnomalies.push({
        topic: 'SecDef',
        symbol: inv.symbol || 'UNKNOWN',
        anomalyType: 'INVALID_SEC_DEF',
        severity: 'CRITICAL',
        detail: inv.error_detail || 'Thiếu biên độ/giá/board'
      });
    }
    if (isPreOpen) {
      for (const unc of uncleanSamples) {
        currentAnomalies.push({
          topic: 'StockInfoRealtime',
          symbol: unc.symbol || 'UNKNOWN',
          anomalyType: 'UNCLEAN_REALTIME',
          severity: 'WARNING',
          detail: unc.uncleared_fields || 'Chưa clear trường realtime'
        });
      }
    }

    const currentFpMap = {};
    const nowIso = now.toISOString();
    const nowMs = now.getTime();

    for (const anom of currentAnomalies) {
      const rawKey = `${dateStr}:${anom.topic}:${anom.symbol}:${anom.anomalyType}`;
      const fp = getFingerprint(rawKey);
      currentFpMap[fp] = anom;

      if (!state.activeAlerts[fp]) {
        // Lỗi mới xuất hiện -> FIRING
        state.activeAlerts[fp] = {
          fingerprint: fp,
          topic: anom.topic,
          symbol: anom.symbol,
          anomalyType: anom.anomalyType,
          severity: anom.severity,
          detail: anom.detail,
          firstSeen: nowIso,
          lastSeen: nowIso,
          occurrenceCount: 1,
          lastAlertSentAt: nowIso
        };
        alertStateSummary.firing.push(state.activeAlerts[fp]);
      } else {
        // Lỗi đã tồn tại -> ONGOING
        const alertObj = state.activeAlerts[fp];
        alertObj.occurrenceCount = (alertObj.occurrenceCount || 1) + 1;
        alertObj.lastSeen = nowIso;

        const lastAlertMs = alertObj.lastAlertSentAt ? new Date(alertObj.lastAlertSentAt).getTime() : 0;
        const minutesSinceLastAlert = (nowMs - lastAlertMs) / (60 * 1000);

        if (minutesSinceLastAlert >= 60) {
          // Nhắc lại sau 60 phút
          alertObj.lastAlertSentAt = nowIso;
          alertStateSummary.ongoing.push(alertObj);
        } else {
          // Tắt cảnh báo trùng lặp (Suppressed)
          alertStateSummary.suppressed.push(alertObj);
        }
      }
    }

    // Kiểm tra các lỗi đã phục hồi (RESOLVED)
    for (const fp of Object.keys(state.activeAlerts)) {
      if (!currentFpMap[fp]) {
        const resolvedObj = state.activeAlerts[fp];
        const downtimeMinutes = Math.round((nowMs - new Date(resolvedObj.firstSeen).getTime()) / (60 * 1000));
        resolvedObj.resolvedAt = nowIso;
        resolvedObj.downtimeMinutes = downtimeMinutes;
        state.resolvedAlerts.push(resolvedObj);
        alertStateSummary.recovered.push(resolvedObj);
        delete state.activeAlerts[fp];
      }
    }

    // Ghi lại state mới
    fsMod.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
  }
} catch (_) {
  // Lỗi alert state tracking không làm ngắt pipeline
}

// ── 11. Định dạng thông báo Markdown gửi lên Mattermost ─────────────────────
let msgTitle = '';
if (isHealthy) {
  msgTitle = `✅ **[MDDS PRODUCTION ${isPreOpen ? '08:20 AM' : 'WATCHDOG'}] Dữ Liệu Security Definition V3 & Bảng Giá Đầu Ngày ỔN ĐỊNH**`;
} else if (hasDataError && hasUncleanError) {
  msgTitle = `🚨 **[CẢNH BÁO MDDS PRODUCTION] Phát Hiện Mã THIẾU DỮ LIỆU BIÊN ĐỘ VÀ CHƯA CLEAR DỮ LIỆU REALTIME!**`;
} else if (hasDataError) {
  msgTitle = `🚨 **[CẢNH BÁO MDDS PRODUCTION] Phát Hiện ${invalidSymbolsAll} Mã CHỨNG KHOÁN THIẾU Dữ Liệu Trần/Sàn/TC/Board!**`;
} else {
  msgTitle = `⚠️ **[CẢNH BÁO MDDS PRODUCTION 08:20 AM] Phát Hiện ${uncleanCount} Mã CHƯA ĐƯỢC CLEAR Trường Realtime Đầu Ngày!**`;
}

if (alertStateSummary.firing.length > 0) {
  msgTitle = `🚨 **[FIRING: ${alertStateSummary.firing.length} LỖI MỚI]** ${msgTitle}`;
} else if (alertStateSummary.ongoing.length > 0) {
  msgTitle = `⚠️ **[ONGOING: ${alertStateSummary.ongoing.length} LỖI TIẾP DIỄN (Nhắc lại sau 60p)]** ${msgTitle}`;
}

let recoveredBanner = '';
if (alertStateSummary.recovered.length > 0) {
  recoveredBanner = `\n> ✅ **[RECOVERED]** Đã phục hồi **${alertStateSummary.recovered.length}** lỗi trước đó (Thời gian gián đoạn: ~${alertStateSummary.recovered[0]?.downtimeMinutes || 0} phút).\n`;
}

let suppressionBanner = '';
if (alertStateSummary.suppressed.length > 0 && alertStateSummary.firing.length === 0) {
  suppressionBanner = `\n> ℹ️ *Đã tắt âm ${alertStateSummary.suppressed.length} cảnh báo đang tiếp diễn để chống spam (sẽ nhắc lại sau 60 phút).* \n`;
}

const step2StatusMd = step2Data === null
  ? `⚪ **Không kiểm tra được**`
  : (isPreOpen
      ? (hasUncleanError ? `❌ **${uncleanCount} mã chưa clear trước phiên**` : `✅ **100% đã clear sạch (NULL / 0) trước giờ ATO**`)
      : `ℹ️ **Bỏ qua kiểm tra reset đầu ngày** (Đang trong/sau phiên \`${marketSession.sessionPhase}\`, ${uncleanCount.toLocaleString()} bản ghi giao dịch bình thường)`);

let reportMarkdown = `${msgTitle}\n${recoveredBanner}${suppressionBanner}${partialWarning}\n`;
reportMarkdown += `- **Thời gian chạy kiểm tra:** \`${dateStr} ${timeStr}\` | **Môi trường:** \`PRODUCTION\`\n`;
reportMarkdown += `- **Tổng số mã niêm yết đã kiểm tra:** **${totalSymbolsAll.toLocaleString()}** mã\n`;
reportMarkdown += `- **[Step 1] Dữ Liệu (Trần/Sàn/TC/Board):** ${hasDataError ? `❌ **${invalidSymbolsAll} mã thiếu dữ liệu**` : `✅ **100% đầy đủ**`}\n`;
reportMarkdown += `- **[Step 2] Clear trường realtime (21 fields):** ${step2StatusMd}\n\n`;

reportMarkdown += `### 📊 Bảng Thống Kê Theo Sàn Giao Dịch:\n`;
reportMarkdown += `${tableMd}\n`;

if (hasDataError) {
  reportMarkdown += `### 🚨 Danh Sách Mã Thiếu Dữ Liệu (${invalids.length} mã):\n`;
  reportMarkdown += `\`\`\`txt\n`;
  invalids.slice(0, 25).forEach((inv, i) => {
    reportMarkdown += `[${i + 1}] Mã: ${inv.symbol} (${inv.floor_code}) -> ${inv.error_detail} | TC: ${inv.basic_price ?? 'NULL'} | Trần: ${inv.ceiling_price ?? 'NULL'} | Sàn: ${inv.floor_price ?? 'NULL'} | Board: ${inv.board_id ?? 'NULL'}\n`;
  });
  if (invalids.length > 25) {
    reportMarkdown += `... (Đã ẩn ${invalids.length - 25} mã lỗi tiếp theo. Xem chi tiết đầy đủ trong file txt)\n`;
  }
  reportMarkdown += `\`\`\`\n\n`;
}

if (hasUncleanError && isPreOpen) {
  reportMarkdown += `### ⚠️ Danh Sách Mã Chưa Clear Trường Realtime (${uncleanSamples.length} mã):\n`;
  reportMarkdown += `\`\`\`txt\n`;
  uncleanSamples.slice(0, 25).forEach((unc, i) => {
    reportMarkdown += `[${i + 1}] Mã: ${unc.symbol} (${unc.floor_code}) -> Chưa clear: ${unc.uncleared_fields}\n`;
  });
  if (uncleanSamples.length > 25) {
    reportMarkdown += `... (Đã ẩn ${uncleanSamples.length - 25} mã tiếp theo. Xem chi tiết đầy đủ trong file txt)\n`;
  }
  reportMarkdown += `\`\`\`\n\n`;
}

reportMarkdown += `📁 **File báo cáo kiểm toán chi tiết (.txt):** \`${displayFilePath}\``;

return [{
  json: {
    environment: 'PRODUCTION',
    timestamp: now.toISOString(),
    isHealthy: isHealthy,
    totalScanned: totalSymbolsAll,
    validSymbols: validSymbolsAll,
    invalidSymbols: invalidSymbolsAll,
    uncleanCount: uncleanCount,
    filePath: displayFilePath,
    logFilePath: displayFilePath,
    physicalFilePath: physicalFilePath,
    fileName: fileName,
    fileContent: txtContent,
    message: reportMarkdown,
    reportText: reportMarkdown,
    alertState: {
      firingCount: alertStateSummary.firing.length,
      ongoingCount: alertStateSummary.ongoing.length,
      suppressedCount: alertStateSummary.suppressed.length,
      recoveredCount: alertStateSummary.recovered.length
    },
    shouldNotify: alertStateSummary.firing.length > 0 || alertStateSummary.ongoing.length > 0 || alertStateSummary.recovered.length > 0 || isHealthy,
    _triggerSource: triggerSource
  }
}];
