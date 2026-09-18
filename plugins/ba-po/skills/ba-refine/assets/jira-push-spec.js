// ==============================================================================
// jira-push-spec.js — Markdown → ADF → Jira Description
// ==============================================================================
// Đường push DUY NHẤT của ba-refine. Gọi qua jira-push-spec.sh.
//
// md-to-adf@0.6.4 không hỗ trợ bảng và nuốt ngắt dòng 2 khoảng trắng, nên file
// này bọc thêm 2 lớp xử lý quanh nó:
//   1. Tách các khối bảng markdown ra, tự dựng node ADF `table` (md-to-adf để
//      nguyên sẽ nối cả bảng — kể cả hàng phân cách |---| — thành 1 paragraph).
//   2. Đánh dấu ngắt dòng "2 khoảng trắng cuối dòng" bằng sentinel trước khi
//      convert, rồi thay sentinel bằng node `hardBreak` sau khi convert.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const md2adf = require('md-to-adf');

// Sentinel đánh dấu vị trí ngắt dòng mềm: sống sót qua md-to-adf (nó chỉ coi
// đây là text thường) rồi được thay bằng node hardBreak. U+2063 là ký tự vô
// hình "invisible separator", không xuất hiện trong văn bản người viết.
const HARD_BREAK_TOKEN = '⁣HARDBREAK⁣';

// --- Hỗ trợ parse .env thủ công (vì không cài dotenv) ---
function parseEnvFile(envPath) {
    if (!fs.existsSync(envPath)) return;
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^#\s][^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            // Biến đã export sẵn trong shell được ưu tiên hơn .env
            if (process.env[key] === undefined) process.env[key] = value;
        }
    });
}

function loadEnv() {
    // PLUGIN_DIR là thư mục gốc của agent-skills (cách script này 5 cấp: plugins/ba-po/skills/ba-refine/scripts)
    const pluginDir = path.resolve(__dirname, '../../../../..');
    const projectRoot = process.cwd();

    // 1. Nguồn chính: đọc từ plugin dir
    parseEnvFile(path.join(pluginDir, '.env'));

    // 2. Override: đọc từ project root
    parseEnvFile(path.join(projectRoot, '.env'));
}

// Chấp nhận cả key trần lẫn URL Jira đầy đủ. User hay dán nguyên URL từ thanh
// địa chỉ — nếu không bóc, cả URL bị dùng làm tên thư mục workspace.
//   https://x.atlassian.net/browse/G3PTP-17057#icft=G3PTP-17057 → G3PTP-17057
function normalizeIssueKey(raw) {
    if (!raw) return null;
    const match = String(raw).match(/([A-Z][A-Z0-9]*-\d+)/i);
    return match ? match[1].toUpperCase() : null;
}

// --- Tách markdown thành các đoạn: bảng và không-bảng ------------------------

function isTableDelimiter(line) {
    return /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-');
}

function isTableRow(line) {
    return /^\s*\|.*\|\s*$/.test(line.trim()) || /\|/.test(line) && line.trim().startsWith('|');
}

// Trả về mảng { type: 'md' | 'table', lines: [] } giữ nguyên thứ tự xuất hiện.
// Một bảng = hàng header + hàng phân cách + 0..n hàng dữ liệu. Code block được
// bỏ qua: dấu | bên trong Gherkin/Examples không được hiểu là bảng.
function splitBlocks(markdown) {
    const lines = markdown.split('\n');
    const blocks = [];
    let buffer = [];
    let inCodeBlock = false;

    const flush = () => {
        if (buffer.length) blocks.push({ type: 'md', lines: buffer });
        buffer = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (/^\s*```/.test(line)) inCodeBlock = !inCodeBlock;

        if (!inCodeBlock
            && isTableRow(line)
            && i + 1 < lines.length
            && isTableDelimiter(lines[i + 1])
            && isTableRow(lines[i + 1])) {

            flush();

            const tableLines = [line, lines[i + 1]];
            let j = i + 2;
            while (j < lines.length && isTableRow(lines[j]) && lines[j].trim() !== '') {
                tableLines.push(lines[j]);
                j++;
            }
            blocks.push({ type: 'table', lines: tableLines });
            i = j - 1;
            continue;
        }

        buffer.push(line);
    }

    flush();
    return blocks;
}

function splitRow(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

// --- Chuyển đổi ---------------------------------------------------------------

// md-to-adf trả về instance Document (không phải plain object), round-trip JSON
// để lấy cây thuần rồi mới thao tác được.
function toPlainAdf(markdown) {
    return JSON.parse(JSON.stringify(md2adf(markdown)));
}

// Lấy phần inline (bold, code, link...) của một ô bảng bằng cách nhờ md-to-adf
// convert riêng ô đó rồi bóc content của paragraph đầu tiên.
function inlineContent(text) {
    if (!text) return [];
    // md-to-adf giữ nguyên <br> dưới dạng text thường, applyHardBreaks sẽ quét
    // và chuyển đổi trực tiếp thành node hardBreak.
    const doc = applyHardBreaks(toPlainAdf(text));
    const first = (doc.content || [])[0];
    if (!first || !first.content) return text ? [{ type: 'text', text }] : [];
    return first.content;
}

function tableCell(text, isHeader) {
    const content = inlineContent(text);
    return {
        type: isHeader ? 'tableHeader' : 'tableCell',
        attrs: {},
        content: [content.length
            ? { type: 'paragraph', content }
            : { type: 'paragraph', content: [] }],
    };
}

function markdownTableToAdf(tableLines) {
    const header = splitRow(tableLines[0]);
    const bodyLines = tableLines.slice(2);
    const columnCount = header.length;

    const rows = [{
        type: 'tableRow',
        content: header.map(cell => tableCell(cell, true)),
    }];

    for (const line of bodyLines) {
        const cells = splitRow(line);
        // Chuẩn hoá số cột: thiếu thì bù ô rỗng, thừa thì cắt — Jira từ chối
        // cả bảng nếu các hàng lệch số cột.
        while (cells.length < columnCount) cells.push('');
        rows.push({
            type: 'tableRow',
            content: cells.slice(0, columnCount).map(cell => tableCell(cell, false)),
        });
    }

    return {
        type: 'table',
        attrs: { isNumberColumnEnabled: false, layout: 'default' },
        content: rows,
    };
}

// Thay sentinel và thẻ <br> trong các text node bằng node hardBreak, giữ nguyên marks của
// đoạn text bao quanh. Jira ADF cấm hardBreak bên trong codeBlock.
function applyHardBreaks(node, inCodeBlock = false) {
    if (!node || typeof node !== 'object') return node;

    const isCodeBlock = inCodeBlock || node.type === 'codeBlock';

    if (Array.isArray(node.content)) {
        const rebuilt = [];

        for (const child of node.content) {
            // Quét tìm HARD_BREAK_TOKEN (ngắt dòng mềm) hoặc thẻ <br> (hard break HTML)
            if (child.type === 'text' && (child.text.includes(HARD_BREAK_TOKEN) || /<br\s*\/?>/i.test(child.text))) {
                if (isCodeBlock) {
                    // Trong codeBlock, chỉ xóa HARD_BREAK_TOKEN (sentinel), giữ nguyên <br> như text thường.
                    child.text = child.text.split(HARD_BREAK_TOKEN).join('');
                    rebuilt.push(child);
                } else {
                    // Chuẩn hóa <br> thành HARD_BREAK_TOKEN để xử lý cắt chuỗi thống nhất
                    const normalizedText = child.text.replace(/<br\s*\/?>/gi, HARD_BREAK_TOKEN);
                    const parts = normalizedText.split(HARD_BREAK_TOKEN);
                    parts.forEach((part, index) => {
                        if (index > 0) rebuilt.push({ type: 'hardBreak' });
                        // Khoảng trắng thừa ở đầu dòng mới là do md-to-adf nối dòng,
                        // không phải nội dung thật.
                        const text = index > 0 ? part.replace(/^\s+/, '') : part;
                        if (text) rebuilt.push({ ...child, text });
                    });
                }
            } else {
                rebuilt.push(applyHardBreaks(child, isCodeBlock));
            }
        }

        node.content = rebuilt;
    }

    return node;
}

const ALLOWED_LANGUAGES = new Set(['abap', 'actionscript', 'ada', 'arduino', 'autoit', 'c', 'c++', 'clojure', 'coffeescript', 'csharp', 'css', 'cuda', 'd', 'dart', 'delphi', 'elixir', 'erlang', 'fortran', 'foxpro', 'go', 'graphql', 'groovy', 'haskell', 'haxe', 'html', 'java', 'javascript', 'json', 'julia', 'kotlin', 'latex', 'lisp', 'lua', 'mathematica', 'matlab', 'objective-c', 'ocaml', 'pascal', 'perl', 'php', 'powershell', 'prolog', 'puppet', 'python', 'qml', 'r', 'racket', 'restructuredtext', 'ruby', 'rust', 'sass', 'scala', 'scheme', 'shell', 'sql', 'standardml', 'swift', 'tcl', 'tex', 'typescript', 'vala', 'vbnet', 'verilog', 'vhdl', 'xml', 'xquery']);

function sanitizeCodeBlocks(node) {
    if (!node || typeof node !== 'object') return node;
    
    if (node.type === 'codeBlock' && node.attrs && node.attrs.language) {
        if (!ALLOWED_LANGUAGES.has(node.attrs.language)) {
            delete node.attrs.language;
        }
    }
    
    if (Array.isArray(node.content)) {
        for (const child of node.content) {
            sanitizeCodeBlocks(child);
        }
    }
    
    return node;
}

function markdownToAdf(markdown) {
    // Ngắt dòng mềm của markdown: >=2 khoảng trắng cuối dòng.
    const marked = markdown.replace(/[ \t]{2,}\r?\n/g, `${HARD_BREAK_TOKEN}\n`);

    const content = [];

    for (const block of splitBlocks(marked)) {
        if (block.type === 'table') {
            content.push(markdownTableToAdf(block.lines));
            continue;
        }

        const text = block.lines.join('\n');
        if (!text.trim()) continue;

        const doc = applyHardBreaks(toPlainAdf(text));
        sanitizeCodeBlocks(doc);
        content.push(...(doc.content || []));
    }

    return { type: 'doc', version: 1, content };
}

async function main() {
    loadEnv();

    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("❌ Cách dùng: node jira-push-spec.js <JIRA_ISSUE_KEY|URL> <ĐƯỜNG_DẪN_FILE_MD>");
        process.exit(1);
    }

    const rawIssueKey = args[0];
    const mdFilePath = args[1];

    const issueKey = normalizeIssueKey(rawIssueKey);
    if (!issueKey) {
        console.error(`❌ Không nhận diện được Jira issue key từ: "${rawIssueKey}"`);
        console.error("   Ví dụ hợp lệ: G3PTP-17057 hoặc https://domain.atlassian.net/browse/G3PTP-17057");
        process.exit(1);
    }
    if (issueKey !== rawIssueKey) {
        console.log(`ℹ️  Issue key chuẩn hoá: "${rawIssueKey}" → "${issueKey}"`);
    }

    // .env của repo dùng ATLASSIAN_*; JIRA_* giữ lại cho các shell đã export sẵn.
    const baseUrl = (process.env.ATLASSIAN_BASE_URL || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
    const email = process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL;
    const apiToken = process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN;

    if (!baseUrl || !email || !apiToken) {
        console.error("❌ Thiếu biến môi trường (ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN). Vui lòng check file .env");
        process.exit(1);
    }

    if (!fs.existsSync(mdFilePath)) {
        console.error(`❌ Không tìm thấy file Markdown: ${mdFilePath}`);
        process.exit(1);
    }

    console.log(`⏳ Đang đọc file: ${mdFilePath}`);
    const markdownContent = fs.readFileSync(mdFilePath, 'utf8');

    console.log(`⏳ Đang chuyển đổi Markdown sang Jira ADF...`);
    let adfContent;
    try {
        adfContent = markdownToAdf(markdownContent);
    } catch (err) {
        console.error("❌ Lỗi khi parse Markdown sang ADF:", err.message);
        process.exit(1);
    }

    const tableCount = adfContent.content.filter(n => n.type === 'table').length;
    console.log(`   → ${adfContent.content.length} block, trong đó ${tableCount} bảng`);

    // --dry-run: in ADF ra stdout, không gọi Jira. Dùng để soi output trước khi
    // ghi đè description của ticket thật.
    if (process.env.DRY_RUN === '1' || args.includes('--dry-run')) {
        console.log(JSON.stringify(adfContent, null, 2));
        console.log("🧪 DRY RUN — không gọi Jira API.");
        return;
    }

    const apiUrl = `${baseUrl}/rest/api/3/issue/${issueKey}`;
    console.log(`🌐 Đang đẩy lên Jira: ${apiUrl}`);

    const authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');

    const body = {
        fields: {
            description: adfContent
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            console.log(`✅ Thành công! Đã ghi đè Description của ticket ${issueKey}.`);
            console.log(`👉 Xem ticket tại: ${baseUrl}/browse/${issueKey}`);
        } else {
            const errorText = await response.text();
            console.error(`❌ Cập nhật thất bại. HTTP Status: ${response.status}`);
            console.error("Chi tiết lỗi:", errorText);
            process.exit(1);
        }
    } catch (err) {
        console.error("❌ Lỗi mạng khi gọi Jira API:", err.message);
        process.exit(1);
    }
}

// Export cho unit test; chỉ chạy main khi được gọi trực tiếp từ CLI.
module.exports = { normalizeIssueKey, markdownToAdf, splitBlocks };

if (require.main === module) main();
