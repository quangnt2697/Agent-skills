/**
 * Node Script: Verify Health & Parity — Merge 2 Steps
 * (`scripts/n8n-nodes/watchdog-verify-health.js`)
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

// ── Helper: parse report_data từ 1 item Metabase response ────────────────────
function parseReportData(item) {
  if (!item) return null;
  const row = (item.data && item.data[0]) || item;
  let rd = row.report_data || row.result || row;
  if (typeof rd === 'string') {
    try { rd = JSON.parse(rd); } catch (_) { rd = {}; }
  }
  return rd;
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
// Strategy: lấy tất cả input items, phân loại theo checkStep
const allInputs = $input.all().map(i => i.json);

// Thử lấy trực tiếp từ tên node nếu có
const step1Items = getNodeItems('Run Query 1 - SecDef');
const step2Items = getNodeItems('Run Query 2 - Realtime');

// Gộp: ưu tiên named node, fallback về allInputs nếu dùng Merge node
let step1Data = null;
let step2Data = null;

if (step1Items.length > 0) {
  step1Data = parseReportData(step1Items[0]);
}
if (step2Items.length > 0) {
  step2Data = parseReportData(step2Items[0]);
}

// Fallback: phân loại từ allInputs theo field checkStep hoặc step trong report_data
if (!step1Data || !step2Data) {
  for (const item of allInputs) {
    const rd = parseReportData(item);
    if (!rd) continue;

    // Nhận diện theo checkStep trên input item
    const cs = item.checkStep || (rd && rd.step) || '';
    if (cs === 'step1_sec_def_v3' || rd.total_scanned !== undefined) {
      if (!step1Data) step1Data = rd;
    } else if (cs === 'step2_realtime_clear' || rd.unclean_count !== undefined) {
      if (!step2Data) step2Data = rd;
    }
  }
}

// ── 2. Xử lý lỗi nếu thiếu dữ liệu từ bất kỳ step nào ──────────────────────
const missingSteps = [];
if (!step1Data) missingSteps.push('Step 1 (security_definition_v3)');
if (!step2Data) missingSteps.push('Step 2 (krx_mdds_v2_stock_infos)');

if (missingSteps.length === 2) {
  // Cả 2 đều lỗi — có thể Metabase timeout hoàn toàn
  const firstItem = allInputs[0] || {};
  const errMsg = firstItem.reportText || firstItem.message || 'Không nhận được response từ Metabase';
  const alertMsg = `🚨 **[MDDS PRODUCTION LỖI 08:30 AM]** Không thể truy vấn Metabase Production:\n> ${errMsg}\n\n*👉 Hãy kiểm tra kết nối TimescaleDB hoặc chạy SSO login nếu session token hết hạn.*`;
  return [{
    json: {
      environment: 'PRODUCTION',
      timestamp: now.toISOString(),
      isHealthy: false,
      totalScanned: 0,
      message: alertMsg
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
  const emptyAlert = `🚨 **[MDDS PRODUCTION KHẨN CẤP 08:30 AM] Bảng \`security_definition_v3\` CHƯA CÓ DỮ LIỆU!**\n\n` +
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
      message: emptyAlert
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

const totalPct = totalSymbolsAll > 0 ? ((validSymbolsAll / totalSymbolsAll) * 100).toFixed(1) + '%' : '0.0%';
tableMd += `| **TỔNG CỘNG** | **${totalSymbolsAll.toLocaleString()}** | **${validSymbolsAll.toLocaleString()}** | **${invalidSymbolsAll > 0 ? invalidSymbolsAll : '0'}** | **${totalPct}** |\n`;

// ── 7. Đánh giá tính toàn vẹn tổng thể ──────────────────────────────────────
const hasDataError    = invalidSymbolsAll > 0;
const hasUncleanError = uncleanCount > 0;
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
} else if (uncleanCount === 0) {
  txtContent += `   - Trạng thái: HOÀN TOÀN SẠCH. 100% các mã đã được reset/clear (NULL hoặc 0) trước giờ mở phiên.\n\n`;
} else {
  txtContent += `   - CẢNH BÁO: Phát hiện ${uncleanCount} mã CHƯA ĐƯỢC RESET/CLEAR trường giao dịch đầu ngày!\n\n`;
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

if (uncleanSamples.length > 0) {
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
      pathMod.join(currentDir, 'projects.json'),
      pathMod.join(currentDir, 'project.js'),
      pathMod.join(currentDir, 'projects.js'),
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

// ── 11. Định dạng thông báo Markdown gửi lên Mattermost ─────────────────────
let msgTitle = '';
if (isHealthy) {
  msgTitle = `✅ **[MDDS PRODUCTION 08:30 AM] Dữ Liệu Security Definition V3 & Bảng Giá Đầu Ngày ỔN ĐỊNH**`;
} else if (hasDataError && hasUncleanError) {
  msgTitle = `🚨 **[CẢNH BÁO MDDS PRODUCTION 08:30 AM] Phát Hiện Mã THIẾU DỮ LIỆU BIÊN ĐỘ VÀ CHƯA CLEAR DỮ LIỆU REALTIME!**`;
} else if (hasDataError) {
  msgTitle = `🚨 **[CẢNH BÁO MDDS PRODUCTION 08:30 AM] Phát Hiện ${invalidSymbolsAll} Mã CHỨNG KHOÁN THIẾU Dữ Liệu Trần/Sàn/TC/Board!**`;
} else {
  msgTitle = `⚠️ **[CẢNH BÁO MDDS PRODUCTION 08:30 AM] Phát Hiện ${uncleanCount} Mã CHƯA ĐƯỢC CLEAR Trường Realtime Đầu Ngày!**`;
}

let reportMarkdown = `${msgTitle}\n${partialWarning}\n`;
reportMarkdown += `- **Thời gian chạy kiểm tra:** \`${dateStr} ${timeStr}\` | **Môi trường:** \`PRODUCTION\`\n`;
reportMarkdown += `- **Tổng số mã niêm yết đã kiểm tra:** **${totalSymbolsAll.toLocaleString()}** mã\n`;
reportMarkdown += `- **[Step 1] Dữ Liệu (Trần/Sàn/TC/Board):** ${hasDataError ? `❌ **${invalidSymbolsAll} mã thiếu dữ liệu**` : `✅ **100% đầy đủ**`}\n`;
reportMarkdown += `- **[Step 2] Clear trường realtime (21 fields):** ${step2Data === null ? `⚪ **Không kiểm tra được**` : (hasUncleanError ? `❌ **${uncleanCount} mã chưa clear**` : `✅ **100% đã clear sạch (NULL / 0)**`)}\n\n`;

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

if (hasUncleanError) {
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
    message: reportMarkdown
  }
}];
