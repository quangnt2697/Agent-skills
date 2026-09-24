/**
 * Node Script: Format 4 Separate Messages for Core MDDS Recon (EOD 16:00)
 * (`scripts/n8n-nodes/db-recon-core-format.js`)
 *
 * Nhận kết quả từ bộ runner `runAllCoreRecon` và tách thành 4 items độc lập
 * để n8n gửi 4 tin nhắn riêng biệt lên Mattermost (1 tin nhắn cho mỗi query).
 */

const input = $input.first();
const rawJson = (input && input.json) || {};
const outcome = rawJson.outcome || rawJson;

const dateStr = outcome.date || new Date().toISOString().slice(0, 10);
const results = outcome.results || {};

const queryConfigs = [
  {
    key: 'q1',
    num: '1️⃣',
    title: 'Query 1: krx_mdds_v3_ticks vs prices (Trade)',
    objective: 'Đối chiếu số lượng tick & tổng khối lượng total_volume_traded',
    labelA: 'Tick V3',
    labelB: 'Tick Raw',
    colA: 'cnt_v3',
    colB: 'cnt_raw',
    hasVol: true,
    volLabelA: 'Vol V3 (Sở)',
    volLabelB: 'Vol Raw (Sở)',
    volColA: 'total_vol_v3',
    volColB: 'total_vol_raw'
  },
  {
    key: 'q2',
    num: '2️⃣',
    title: 'Query 2: krx_mdds_v3_top_prices vs prices (Quote)',
    objective: 'Đối chiếu số lượt cập nhật sổ lệnh 3/10 giá (total_volume_traded IS NULL)',
    labelA: 'Sổ Lệnh V3',
    labelB: 'Sổ Lệnh Raw',
    colA: 'cnt_v3',
    colB: 'cnt_raw',
    hasVol: false
  },
  {
    key: 'q3',
    num: '3️⃣',
    title: 'Query 3: krx_mdds_v3_ticks_extra vs prices (Trade)',
    objective: 'Đối chiếu dữ liệu làm giàu chiều mua/bán (ticks_extra) so với Raw Sở',
    labelA: 'Tick Extra',
    labelB: 'Tick Raw',
    colA: 'cnt_extra',
    colB: 'cnt_raw',
    hasVol: true,
    volLabelA: 'Vol Extra',
    volLabelB: 'Vol Raw',
    volColA: 'total_vol_extra',
    volColB: 'total_vol_raw',
    hasSide: true
  },
  {
    key: 'q4',
    num: '4️⃣',
    title: 'Query 4: krx_mdds_v3_ticks vs krx_mdds_v3_ticks_extra',
    objective: 'Đối chiếu luồng xử lý nội bộ V3 (từ Ingest Ticks sang Worker Side/AvgPrice)',
    labelA: 'Tick V3',
    labelB: 'Tick Extra',
    colA: 'cnt_v3_ticks',
    colB: 'cnt_v3_extra',
    hasVol: true,
    volLabelA: 'Vol V3',
    volLabelB: 'Vol Extra',
    volColA: 'vol_v3_ticks',
    volColB: 'vol_v3_extra',
    hasSide: true
  }
];

function formatNum(val) {
  if (val === null || val === undefined) return '0';
  if (typeof val === 'number') return val.toLocaleString('en-US');
  const num = parseInt(val, 10);
  return isNaN(num) ? String(val) : num.toLocaleString('en-US');
}

function formatVolCompact(val) {
  if (!val || val === 0) return '0';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toLocaleString('en-US');
}

const outputItems = [];

queryConfigs.forEach((cfg, idx) => {
  const qRes = results[cfg.key] || {};
  const rows = qRes.rows || [];
  const rowCount = typeof qRes.rowCount === 'number' ? qRes.rowCount : rows.length;
  const isError = Boolean(qRes.error);
  const hasDiscrepancy = isError || rowCount > 0;

  let msg = `### ${cfg.num} [MDDS EOD 16:00] ${cfg.title}\n`;
  msg += `- **Mục tiêu:** ${cfg.objective}\n`;
  msg += `- **Ngày giao dịch:** \`${dateStr}\` | **Môi trường:** \`TIMESCALEDB PROD\`\n`;

  if (isError) {
    msg += `- **Trạng thái:** ❌ **LỖI THỰC THI TRUY VẤN**\n`;
    msg += `> 🚨 ${qRes.error}\n`;
  } else if (rowCount === 0) {
    msg += `- **Trạng thái:** 🟢 **100% ĐỒNG BỘ**\n`;
    msg += `- **Kết quả:** Không phát hiện bất kỳ sai lệch nào về số bản ghi hoặc khối lượng (\`0 mã lệch\`).\n`;
  } else {
    msg += `- **Trạng thái:** 🚨 **LỆCH DỮ LIỆU (Phát hiện ${rowCount} mã sai lệch)**\n\n`;

    // Render table
    let tableMd = '';
    if (cfg.hasSide && cfg.hasVol) {
      tableMd += `| Mã CK | ${cfg.labelA} | ${cfg.labelB} | Lệch Tick | ${cfg.volLabelA} | ${cfg.volLabelB} | Lệch Volume | Tỷ Lệ Side | Trạng Thái Phân Loại |\n`;
      tableMd += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |\n`;
      rows.slice(0, 20).forEach(r => {
        const diffRec = formatNum(r.diff_records);
        const diffVol = formatVolCompact(r.diff_total_volume);
        const sidePct = r.side_pct !== null && r.side_pct !== undefined ? `${r.side_pct}%` : '—';
        tableMd += `| **${r.symbol}** | ${formatNum(r[cfg.colA])} | ${formatNum(r[cfg.colB])} | **${diffRec}** | ${formatVolCompact(r[cfg.volColA])} | ${formatVolCompact(r[cfg.volColB])} | **${diffVol}** | ${sidePct} | ${r.discrepancy_status} |\n`;
      });
    } else if (cfg.hasVol) {
      tableMd += `| Mã CK | ${cfg.labelA} | ${cfg.labelB} | Lệch Tick | ${cfg.volLabelA} | ${cfg.volLabelB} | Lệch Volume | Trạng Thái Phân Loại |\n`;
      tableMd += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |\n`;
      rows.slice(0, 20).forEach(r => {
        const diffRec = formatNum(r.diff_records);
        const diffVol = formatVolCompact(r.diff_total_volume);
        tableMd += `| **${r.symbol}** | ${formatNum(r[cfg.colA])} | ${formatNum(r[cfg.colB])} | **${diffRec}** | ${formatVolCompact(r[cfg.volColA])} | ${formatVolCompact(r[cfg.volColB])} | **${diffVol}** | ${r.discrepancy_status} |\n`;
      });
    } else {
      tableMd += `| Mã CK | ${cfg.labelA} | ${cfg.labelB} | Lệch Sổ Lệnh | Trạng Thái Phân Loại |\n`;
      tableMd += `| :--- | :---: | :---: | :---: | :--- |\n`;
      rows.slice(0, 20).forEach(r => {
        const diffRec = formatNum(r.diff_records);
        tableMd += `| **${r.symbol}** | ${formatNum(r[cfg.colA])} | ${formatNum(r[cfg.colB])} | **${diffRec}** | ${r.discrepancy_status} |\n`;
      });
    }

    if (rows.length > 20) {
      tableMd += `\n> *(Đã ẩn ${rows.length - 20} mã sai lệch tiếp theo. Vui lòng xem log chi tiết)*\n`;
    }

    msg += tableMd;
  }

  outputItems.push({
    json: {
      queryIndex: idx + 1,
      queryKey: cfg.key,
      title: cfg.title,
      hasDiscrepancy: hasDiscrepancy,
      discrepancyCount: rowCount,
      messageText: msg,
      username: 'MDDS Recon Bot',
      icon_emoji: hasDiscrepancy ? ':rotating_light:' : ':white_check_mark:',
      date: dateStr
    }
  });
});

return outputItems;
