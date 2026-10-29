/**
 * Jira Keyword Searcher Helper (`scripts/lib/jira-keyword-searcher.js`)
 *
 * Chức năng:
 * - Trích xuất từ khóa nghiệp vụ (business keywords) và thực thể ghép đôi (bigrams/domain phrases) từ tiêu đề Jira (summary).
 * - Loại bỏ các tag prefix [WEB], [APP], [API], [BE]... và stopwords tiếng Việt.
 * - Tìm kiếm các issue Jira (JQL) và trang Confluence (CQL) liên quan.
 */

const VIETNAMESE_STOPWORDS = new Set([
  'la', 'là', 'toi', 'tôi', 'muon', 'muốn', 'de', 'để', 'co', 'có', 'the', 'thể',
  'va', 'và', 'hoac', 'hoặc', 'cho', 'cua', 'của', 'tai', 'tại', 'trong', 'tren', 'trên',
  'khi', 'voi', 'với', 'nhu', 'như', 'ra', 'sao', 'duoc', 'được', 'bi', 'bị', 'boi', 'bởi',
  'cac', 'các', 'nhung', 'những', 'mot', 'một', 'nhieu', 'nhiều', 'it', 'ít',
  'cap', 'cập', 'nhat', 'nhật', 'bo', 'bổ', 'sung', 'them', 'thêm', 'sua', 'sửa', 'xoa', 'xóa',
  'tao', 'tạo', 'xu', 'xử', 'ly', 'lý', 'fix', 'bug', 'task', 'feature', 'story',
  'chuc', 'chức', 'nang', 'năng', 'tinh', 'tính', 'he', 'hệ', 'thong', 'thống',
  'man', 'màn', 'hinh', 'hình', 'giao', 'dien', 'diện', 'trang', 'tab', 'component',
  'chuyen', 'chuyển', 'sang', 've', 'về', 'theo', 'dung', 'đúng', 'lai', 'lại', 'moi', 'mới',
  'danh', 'đánh', 'quy', 'tac', 'tắc', 'cong', 'công', 'cu', 'cụ', 'tu', 'từ', 'den', 'đến',
  'can', 'cần', 'lam', 'làm', 'hien', 'hiển', 'thi', 'thị', 'kiem', 'kiểm', 'tra', 'rà', 'soát'
]);

// Các cụm thuật ngữ chuyên ngành chứng khoán & sản phẩm cần ưu tiên giữ nguyên cụm
const DOMAIN_COMPOUND_TERMS = [
  'bảng giá', 'sổ lệnh', 'đặt lệnh', 'hủy lệnh', 'sửa lệnh', 'lệnh điều kiện',
  'lô lẻ', 'lô chẵn', 'ký quỹ', 'sức mua', 'tỷ lệ ký quỹ', 'call margin', 'force sell',
  'giá trần', 'giá sàn', 'giá tham chiếu', 'bước giá', 'biên độ', 'giá tạm tính', 'giá dự kiến',
  'khớp lệnh', 'phiên ato', 'phiên atc', 'phiên plo', 'phiên liên tục', 'random end',
  'phái sinh', 'cổ phiếu', 'trái phiếu', 'chứng quyền', 'tiểu khoản',
  'lightweight chart', 'tradingview', 'stock-gift', 'smart otp', 'smartotp',
  'monitor giá', 'giám sát', 'cảnh báo', 'khối ngoại', 'nến phút'
];

/**
 * Trích xuất danh sách từ khóa nghiệp vụ từ summary (ưu tiên cụm từ ghép domain + từ đơn đặc trưng)
 * @param {string} summary Tiêu đề Jira
 * @returns {{ detectedType: string, cleanSummary: string, keywords: string[] }}
 */
export function extractSummaryKeywords(summary = '') {
  if (!summary || typeof summary !== 'string') {
    return { detectedType: 'UNKNOWN', cleanSummary: '', keywords: [] };
  }

  const raw = summary.trim();

  // 1. Nhận diện prefix task type: [APP], [WEB], [API], [BE], [KRX], etc.
  let detectedType = 'UNKNOWN';
  const prefixMatch = raw.match(/^\s*\[([^\]]+)\]/i);
  if (prefixMatch) {
    const p = prefixMatch[1].toUpperCase();
    if (p.includes('APP') || p.includes('MOBILE')) detectedType = 'APP';
    else if (p.includes('WEB') || p.includes('FE')) detectedType = 'WEB';
    else if (p.includes('API') || p.includes('BE') || p.includes('BACKEND') || p.includes('WS')) detectedType = 'API';
    else detectedType = p;
  }

  // 2. Làm sạch summary: bỏ các tag [TAG] ở đầu
  const cleanSummary = raw.replace(/\[[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim();
  const lowerSummary = cleanSummary.toLowerCase();

  const keywords = [];
  const seen = new Set();

  const addKeyword = (kw) => {
    const clean = kw.trim();
    if (!clean || clean.length < 2) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      keywords.push(clean);
    }
  };

  // 3. Bắt các cụm từ chuyên ngành (Domain Compound Terms) xuất hiện trong summary trước
  for (const phrase of DOMAIN_COMPOUND_TERMS) {
    if (lowerSummary.includes(phrase)) {
      // Lấy đúng chữ hoa/thường trong bản gốc nếu tìm thấy
      const idx = lowerSummary.indexOf(phrase);
      const originalPhrase = cleanSummary.slice(idx, idx + phrase.length);
      addKeyword(originalPhrase);
    }
  }

  // 4. Tách các token đơn (giữ mã sàn, mã CK, tên kỹ thuật/feature như HNX, HOSE, KRX, VN30F1M, ±10%, monitor...)
  const tokens = cleanSummary
    .split(/[\s,;:!?"'()\[\]{}<>\/\\|]+/i)
    .map(t => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const cleanToken = token.replace(/^[^\wÀ-ỹ±%]+|[^\wÀ-ỹ±%-]+$/g, '');
    if (!cleanToken || cleanToken.length < 2 || /^\d+$/.test(cleanToken)) continue;
    const cleanLower = cleanToken.toLowerCase();

    if (VIETNAMESE_STOPWORDS.has(cleanLower)) continue;
    // Bỏ qua các từ tiếng Việt đơn âm tiết quá phổ thông nếu đã nằm trong cụm từ ghép
    if (['cổ', 'phiếu', 'biên', 'độ', 'giá', 'sàn', 'mã', 'lệnh'].includes(cleanLower) &&
        keywords.some(k => k.toLowerCase().includes(cleanLower) && k.includes(' '))) {
      continue;
    }

    addKeyword(cleanToken);
  }

  return {
    detectedType,
    cleanSummary,
    keywords: keywords.slice(0, 10)
  };
}

/**
 * Xây dựng JQL tìm kiếm task liên quan dựa trên issueKey và keywords
 * @param {string} issueKey Mã Jira hiện tại
 * @param {string[]} keywords Danh sách từ khóa
 * @param {string} project Mã project Jira (VD: G3PTP)
 * @returns {string} Câu lệnh JQL
 */
export function buildRelatedIssuesJql(issueKey, keywords = [], project = '') {
  const parts = [];
  if (project) {
    parts.push(`project = "${project}"`);
  } else if (issueKey && issueKey.includes('-')) {
    const proj = issueKey.split('-')[0];
    parts.push(`project = "${proj}"`);
  }

  if (issueKey) {
    parts.push(`issueKey != "${issueKey}"`);
  }

  if (keywords.length > 0) {
    const topKeywords = keywords.slice(0, 4);
    const summaryClauses = topKeywords.map(k => `summary ~ "${k.replace(/"/g, '\\"')}"`).join(' OR ');
    parts.push(`(${summaryClauses})`);
  }

  return parts.join(' AND ') + ' ORDER BY updated DESC';
}

/**
 * Xây dựng CQL tìm kiếm trang Confluence liên quan
 * @param {string[]} keywords Danh sách từ khóa
 * @returns {string} Câu lệnh CQL
 */
export function buildRelatedConfluenceCql(keywords = []) {
  if (!keywords || keywords.length === 0) return 'type = page ORDER BY lastModified DESC';
  const topKw = keywords.slice(0, 3).map(k => `"${k.replace(/"/g, '\\"')}"`).join(' OR ');
  return `type = page AND (title ~ ${topKw} OR text ~ ${topKw}) ORDER BY lastModified DESC`;
}
