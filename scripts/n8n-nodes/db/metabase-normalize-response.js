const input = $input.first();
const httpRes = (input && input.json) || {};
const context = $('Prepare & Sanitize Query').first()?.json || {};

const triggerSource = context._triggerSource || httpRes._triggerSource || 'internal';
const userName = context.userName || 'User';
const dbName = context.dbName || 'DB';
const envName = context.environment || 'UAT';
const sql = context.sanitizedQuery || '';
const userQuestion = context.userQuestion || '';

// 1. Xử lý lỗi Pre-flight từ bước Sanitize
if (context.isError || httpRes.isError) {
  return [{
    json: {
      success: false,
      isError: true,
      errorType: context.errorType || httpRes.errorType,
      reportText: context.reportText || httpRes.reportText,
      data: [],
      rowCount: 0,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

// 2. Xử lý lỗi từ Metabase API
if (httpRes.error || (httpRes.status && httpRes.status >= 400)) {
  let errMsg = (httpRes.error && (httpRes.error.message || httpRes.error.description || httpRes.error)) || httpRes.message || 'Lỗi không xác định từ Metabase API';
  let suggestion = '';
  
  if (httpRes.status === 401 || httpRes.status === 403 || String(errMsg).toLowerCase().includes('unauthenticated')) {
    errMsg = 'Phiên đăng nhập Metabase (Session Token) đã hết hạn hoặc không hợp lệ.';
    suggestion = '\n\n*👉 Hãy chạy lệnh sau trên terminal để làm mới Session Token:\n`node scripts/db/metabase-sso-login.js`*';
  }
  
  const reportText = `🚨 **[Lỗi Truy Vấn Metabase]** (${dbName.toUpperCase()} / ${envName}):\n> ${errMsg}${suggestion}\n\n\`\`\`sql\n${sql}\n\`\`\``;
  return [{
    json: {
      success: false,
      isError: true,
      errorType: 'METABASE_API_ERROR',
      message: errMsg,
      reportText,
      sql,
      data: [],
      rowCount: 0,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

// 3. Chuẩn hóa dữ liệu trả về: cols + rows -> Array of JSON Objects
const rawData = httpRes.data || {};
const cols = (rawData.cols || []).map(c => c.name || c.display_name || 'col');
const rawRows = rawData.rows || [];

const normalizedData = rawRows.map(row => {
  const obj = {};
  cols.forEach((colName, idx) => {
    obj[colName] = row[idx];
  });
  return obj;
});

const rowCount = normalizedData.length;

// 4. Phát hiện sớm khi kết quả Metabase bị cắt cụt ở ngưỡng 2000 dòng
const isTruncated = rawData.rows_truncated === true || rawRows.length >= 2000;
const warnings = [];
if (isTruncated) {
  warnings.push('⚠️ CẢNH BÁO: Kết quả trả về từ Metabase chạm ngưỡng giới hạn (bị cắt cụt tại ' + rowCount + ' dòng). Cần thu hẹp WHERE hoặc gom nhóm SQL.');
}

// 5. Render Bảng Markdown trực quan
let reportText = '';
let headerTitle = `🔍 **[Metabase Query Result]**\n- **Cơ sở dữ liệu:** \`${dbName.toUpperCase()} (${envName})\` | **Bản ghi:** **${rowCount}** records`;
if (userQuestion) {
  headerTitle += `\n- **Yêu cầu:** _"${userQuestion}"_`;
}
if (warnings.length > 0) {
  headerTitle += `\n> ${warnings.join('\n> ')}`;
}

if (rowCount === 0) {
  reportText = `${headerTitle}\n\n⚠️ **Không tìm thấy bản ghi nào khớp với điều kiện query.**\n\n💡 **SQL:** \`${sql}\``;
} else {
  // Lấy tối đa 6 cột hiển thị đầu tiên để không bị vỡ khung chat di động
  const displayCols = cols.slice(0, 6);
  let tableMd = '| ' + displayCols.join(' | ') + ' |\n';
  tableMd += '| ' + displayCols.map(() => ':---').join(' | ') + ' |\n';
  
  // Hiển thị tối đa 10 dòng đầu
  const displayRows = normalizedData.slice(0, 10);
  for (const item of displayRows) {
    const rowValues = displayCols.map(c => {
      const val = item[c];
      if (val === null || val === undefined) return '_null_';
      if (typeof val === 'number') return val.toLocaleString();
      const str = String(val).replace(/\|/g, '/').replace(/\n/g, ' ');
      return str.length > 30 ? (str.slice(0, 27) + '...') : str;
    });
    tableMd += '| ' + rowValues.join(' | ') + ' |\n';
  }
  
  let truncationNote = '';
  if (rowCount > 10) {
    truncationNote = `\n> *(Đã ẩn ${rowCount - 10} dòng dữ liệu tiếp theo để tối ưu hiển thị)*`;
  }
  
  reportText = `${headerTitle}\n\n${tableMd}${truncationNote}\n\n💡 **SQL:** \`${sql}\``;
}

return [{
  json: {
    success: true,
    isError: false,
    database: dbName,
    environment: envName,
    databaseId: context.databaseId,
    sql,
    userQuestion,
    columns: cols,
    rowCount,
    isTruncated,
    warnings,
    data: normalizedData,
    reportText,
    _triggerSource: triggerSource,
    userName
  }
}];
