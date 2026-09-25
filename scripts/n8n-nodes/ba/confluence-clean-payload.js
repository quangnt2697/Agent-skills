/**
 * Node Script: Confluence Clean Payload (`scripts/n8n-nodes/ba/confluence-clean-payload.js`)
 *
 * Mục đích (WF-03):
 * - Nhận payload trả về từ Confluence Cloud REST API (v1 hoặc v2).
 * - Bóc tách định dạng Confluence Storage XHTML (`body.storage.value` hoặc `body.view.value`).
 * - Loại bỏ toàn bộ CSS, style inline, layout div, macro rác, script tracking.
 * - Chuyển đổi thành Markdown chuẩn tinh gọn (Tables, Code blocks, Lists, Headings).
 * - KHÔNG gửi Mattermost — trả về trực tiếp cho BA/PO agent skill (tiết kiệm >90% token).
 */

const input = $input.first();
const json = (input && input.json) || {};

// 1. Trích xuất thông tin trang Confluence
const pageId = json.id || json.pageId || '';
const title = json.title || 'Untitled Document';
const version = json.version?.number || json.version || 1;
const author = json.version?.by?.displayName || json.history?.createdBy?.displayName || 'Unknown Author';
const spaceKey = json.space?.key || json.spaceId || '';

// 2. Lấy nội dung XHTML
let rawHtml = '';
if (json.body?.storage?.value) {
  rawHtml = json.body.storage.value;
} else if (json.body?.view?.value) {
  rawHtml = json.body.view.value;
} else if (typeof json.body === 'string') {
  rawHtml = json.body;
} else if (json.content) {
  rawHtml = typeof json.content === 'string' ? json.content : JSON.stringify(json.content);
}

// 3. Parser chuyển đổi Confluence Storage XHTML sang Markdown
function cleanConfluenceXhtml(html) {
  if (!html) return '';

  let text = html;

  // A. Xử lý code macro: <ac:structured-macro ac:name="code">...</ac:structured-macro>
  text = text.replace(/<ac:structured-macro[^>]*ac:name="code"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi, (match, inner) => {
    let lang = '';
    const langMatch = inner.match(/<ac:parameter[^>]*ac:name="language"[^>]*>([^<]+)<\/ac:parameter>/i);
    if (langMatch) lang = langMatch[1].trim();

    let codeBody = '';
    const bodyMatch = inner.match(/<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>/i);
    if (bodyMatch) {
      codeBody = bodyMatch[1];
    } else {
      codeBody = inner.replace(/<[^>]+>/g, '');
    }
    return `\n\`\`\`${lang}\n${codeBody.trim()}\n\`\`\`\n`;
  });

  // B. Xử lý alert/callout macro: info, note, warning, tip
  text = text.replace(/<ac:structured-macro[^>]*ac:name="(info|note|warning|tip)"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi, (match, type, inner) => {
    const cleanInner = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return `\n> [!${type.toUpperCase()}]\n> ${cleanInner}\n`;
  });

  // C. Loại bỏ các macro không liên quan
  text = text.replace(/<ac:structured-macro[\s\S]*?<\/ac:structured-macro>/gi, '');
  text = text.replace(/<ac:placeholder[\s\S]*?<\/ac:placeholder>/gi, '');

  // D. Xử lý Bảng biểu (Tables)
  text = text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, tableContent) => {
    const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    if (rowMatches.length === 0) return '';

    let mdTable = '\n';
    let columnCount = 0;

    rowMatches.forEach((rowHtml, rowIndex) => {
      const cellMatches = rowHtml.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
      if (cellMatches.length === 0) return;

      const cells = cellMatches.map(cell => {
        return cell.replace(/<[^>]+>/g, '').replace(/[\r\n\t]+/g, ' ').trim();
      });

      if (rowIndex === 0) {
        columnCount = cells.length;
        mdTable += '| ' + cells.join(' | ') + ' |\n';
        mdTable += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
      } else {
        // Cân bằng số lượng cột
        while (cells.length < columnCount) cells.push('');
        mdTable += '| ' + cells.slice(0, columnCount).join(' | ') + ' |\n';
      }
    });

    return mdTable + '\n';
  });

  // E. Headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

  // F. Lists
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, item) => `- ${item.replace(/<[^>]+>/g, '').trim()}\n`);
  text = text.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');

  // G. Text styling
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  text = text.replace(/<(s|strike|del)[^>]*>([\s\S]*?)<\/\1>/gi, '~~$2~~');
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  text = text.replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // H. Paragraphs & Linebreaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n---\n');
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');

  // I. Dọn dẹp toàn bộ thẻ HTML còn sót lại và entity HTML
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // J. Chuẩn hóa khoảng trắng & dòng trống
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

const cleanMarkdown = cleanConfluenceXhtml(rawHtml);

// 4. Trích xuất tài liệu đính kèm (Attachments) nếu có
const attachments = [];
if (json._embedded?.attachments?.results) {
  json._embedded.attachments.results.forEach(att => {
    attachments.push({
      id: att.id,
      title: att.title,
      mediaType: att.mediaType || att.metadata?.mediaType,
      fileSize: att.fileSize,
      downloadUrl: att._links?.download
    });
  });
}

// 5. Thống kê số ký tự và ước lượng token tiết kiệm
const rawLength = rawHtml.length;
const cleanLength = cleanMarkdown.length;
const tokenSavingsPct = rawLength > 0 ? Math.round(((rawLength - cleanLength) / rawLength) * 100) : 0;

return [{
  json: {
    isError: false,
    pageId,
    title,
    spaceKey,
    version,
    author,
    markdownContent: cleanMarkdown,
    attachments,
    stats: {
      rawChars: rawLength,
      cleanChars: cleanLength,
      tokenSavingsPct: Math.max(0, tokenSavingsPct),
      estimatedTokens: Math.round(cleanLength / 4)
    }
  }
}];
