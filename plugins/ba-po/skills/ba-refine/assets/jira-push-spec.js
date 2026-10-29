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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import md2adf from 'md-to-adf';
import { validateRefinedSpec } from '../../../../../scripts/validators/validate-ba-refine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

        // Nhận diện block ảnh Markdown đứng riêng: ![alt](path/to/image.png)
        const imgMatch = !inCodeBlock && line.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
        if (imgMatch) {
            flush();
            blocks.push({
                type: 'image',
                alt: imgMatch[1].trim(),
                src: imgMatch[2].trim(),
                raw: line
            });
            continue;
        }

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

function imageBlockToAdf(block, attachmentMap = {}) {
    const filename = path.basename(block.src);
    // Tra cứu trong attachmentMap theo filename hoặc full src path
    const attach = attachmentMap[filename] 
        || attachmentMap[block.src] 
        || Object.values(attachmentMap).find(a => a && a.filename === filename);

    // 1. Nếu đã upload lên Jira và có attachment ID chuẩn
    if (attach && attach.id) {
        return {
            type: 'mediaSingle',
            attrs: { layout: 'center' },
            content: [
                {
                    type: 'media',
                    attrs: {
                        id: String(attach.id),
                        type: 'file',
                        collection: '',
                        alt: block.alt || filename
                    }
                }
            ]
        };
    }

    // 2. Nếu có URL trực tiếp (external content URL)
    if (attach && (attach.content || attach.url)) {
        return {
            type: 'mediaSingle',
            attrs: { layout: 'center' },
            content: [
                {
                    type: 'media',
                    attrs: {
                        type: 'external',
                        url: attach.content || attach.url,
                        alt: block.alt || filename
                    }
                }
            ]
        };
    }

    // 3. Fallback cho URL ngoài web (http:// hoặc https://)
    if (block.src.startsWith('http://') || block.src.startsWith('https://')) {
        return {
            type: 'mediaSingle',
            attrs: { layout: 'center' },
            content: [
                {
                    type: 'media',
                    attrs: {
                        type: 'external',
                        url: block.src,
                        alt: block.alt || filename
                    }
                }
            ]
        };
    }

    // 4. Fallback cho file local khi chạy dry-run / offline
    return {
        type: 'mediaSingle',
        attrs: { layout: 'center' },
        content: [
            {
                type: 'media',
                attrs: {
                    id: `local-${filename}`,
                    type: 'file',
                    collection: '',
                    alt: block.alt || filename
                }
            }
        ]
    };
}

function markdownToAdf(markdown, attachmentMap = {}) {
    // Ngắt dòng mềm của markdown: >=2 khoảng trắng cuối dòng.
    const marked = markdown.replace(/[ \t]{2,}\r?\n/g, `${HARD_BREAK_TOKEN}\n`);

    const content = [];

    for (const block of splitBlocks(marked)) {
        if (block.type === 'table') {
            content.push(markdownTableToAdf(block.lines));
            continue;
        }

        if (block.type === 'image') {
            content.push(imageBlockToAdf(block, attachmentMap));
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

// Trích xuất UI Elements từ Mục UI của markdown (UI Delta Mapping table) và tạo testability-manifest.json
function exportTestabilityManifest(issueKey, mdContent, mdFilePath) {
    const brMatches = [...mdContent.matchAll(/\[(BR-\d+)\]/gi)].map(m => m[1].toUpperCase());
    const acMatches = [...mdContent.matchAll(/\[(AC-\d+\.\d+)\]/gi)].map(m => m[1].toUpperCase());
    const uniqueBrs = [...new Set(brMatches)];
    let uniqueAcs = [...new Set(acMatches)];

    // Nếu dùng template AC sạch (không có tag [AC-x.y]), tự động suy diễn danh sách AC từ các dòng Scenario:
    if (uniqueAcs.length === 0) {
        const gherkinMatch = mdContent.match(/```gherkin([\s\S]*?)```/i);
        if (gherkinMatch) {
            const scenarioLines = gherkinMatch[1]
                .split('\n')
                .map(l => l.trim())
                .filter(l => /^Scenario(?:\s+Outline)?\s*:/i.test(l));
            uniqueAcs = scenarioLines.map((_, idx) => `AC-1.${idx + 1}`);
        }
    }

    // Parse Bảng Chú thích Thay đổi Giao diện nếu có
    const uiElements = [];
    const tableRegex = /\|\s*(\*{0,2}[①②③④⑤⑥⑦⑧⑨⑩\d]+\*{0,2})\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/g;
    let match;
    while ((match = tableRegex.exec(mdContent)) !== null) {
        const badgeRaw = match[1].replace(/\*/g, '').trim();
        // Bỏ qua header
        if (badgeRaw.toLowerCase().includes('ký hiệu') || badgeRaw.includes('-')) continue;
        const name = match[2].trim().replace(/\*\*/g, '');
        const changeType = match[3].trim();
        const desc = match[4].trim();
        const ruleMap = match[5].trim();

        const elemBrs = [...ruleMap.matchAll(/\[(BR-\d+)\]/gi)].map(m => m[1].toUpperCase());
        const elemAcs = [...ruleMap.matchAll(/\[(AC-\d+\.\d+)\]/gi)].map(m => m[1].toUpperCase());

        uiElements.push({
            badge: badgeRaw,
            name,
            change_type: changeType.toLowerCase().includes('thêm') ? 'added' : (changeType.toLowerCase().includes('sửa') ? 'modified' : 'removed'),
            change_type_label: changeType,
            description: desc,
            rules: elemBrs,
            criteria: elemAcs
        });
    }

    const manifest = {
        issueKey,
        generated_at: new Date().toISOString(),
        profiles: uiElements.length > 0 ? ['WEB', 'UI', 'STATE'] : ['API', 'DATA'],
        rules: uniqueBrs,
        acceptance_criteria: uniqueAcs,
        ui_elements: uiElements
    };

    // Lưu vào workspace/issues/{issueKey}/spec/testability-manifest.json
    const issueDir = path.dirname(mdFilePath);
    const manifestPath = path.join(issueDir, 'testability-manifest.json');
    try {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        console.log(`📋 Đã xuất bản Testability Manifest: ${manifestPath} (${uiElements.length} phần tử UI)`);
    } catch (err) {
        console.warn(`⚠️ Không thể lưu testability-manifest.json: ${err.message}`);
    }

    // Xuất bản bản sao final.md nếu chưa có
    const finalMdPath = path.join(issueDir, 'final.md');
    try {
        if (!fs.existsSync(finalMdPath) || path.basename(mdFilePath) !== 'final.md') {
            fs.copyFileSync(mdFilePath, finalMdPath);
            console.log(`📄 Đã sao chép sang artifact bàn giao: ${finalMdPath}`);
        }
    } catch (err) {
        // bỏ qua
    }

    return manifest;
}

// Upload tất cả các file ảnh mockup lên Jira Attachments và trả về map { [filename]: attachmentInfo }
async function uploadAllMockupAttachments(issueKey, baseUrl, authHeader, mdFilePath, mdContent) {
    const specDir = path.dirname(mdFilePath);
    const attachmentMap = {};

    // 1. Lấy danh sách attachment đã có sẵn trên ticket
    try {
        const getUrl = `${baseUrl}/rest/api/3/issue/${issueKey}?fields=attachment`;
        const getRes = await fetch(getUrl, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });
        if (getRes.ok) {
            const issueData = await getRes.json();
            const existingAttachments = issueData.fields?.attachment || [];
            for (const att of existingAttachments) {
                attachmentMap[att.filename] = {
                    id: att.id,
                    filename: att.filename,
                    content: att.content,
                    size: att.size
                };
            }
            if (existingAttachments.length > 0) {
                console.log(`ℹ️  Jira ticket ${issueKey} hiện có ${existingAttachments.length} attachments có sẵn.`);
            }
        }
    } catch (err) {
        console.warn(`⚠️ Không thể truy vấn danh sách attachments hiện có: ${err.message}`);
    }

    // 2. Thu thập danh sách các file ảnh local
    const candidateFiles = new Set();

    // 2.1. Trích xuất từ Markdown tags ![alt](src)
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = imgRegex.exec(mdContent)) !== null) {
        const src = match[2].trim();
        if (src.startsWith('http://') || src.startsWith('https://')) continue;

        const resolvedCandidates = [
            path.resolve(specDir, src),
            path.resolve(process.cwd(), src),
            path.resolve(specDir, 'diagrams', path.basename(src)),
            path.resolve(specDir, path.basename(src))
        ];

        for (const cand of resolvedCandidates) {
            if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
                candidateFiles.add(cand);
                break;
            }
        }
    }

    // 2.2. Quét thêm thư mục diagrams/ nếu có các file mockup*.png
    const diagramsDir = path.join(specDir, 'diagrams');
    if (fs.existsSync(diagramsDir) && fs.statSync(diagramsDir).isDirectory()) {
        const pngFiles = fs.readdirSync(diagramsDir).filter(f => f.toLowerCase().endsWith('.png') && f.toLowerCase().startsWith('mockup'));
        for (const png of pngFiles) {
            candidateFiles.add(path.join(diagramsDir, png));
        }
    }

    // 2.3. Quét thêm specDir trực tiếp
    const directMockup = path.join(specDir, 'mockup.png');
    if (fs.existsSync(directMockup)) {
        candidateFiles.add(directMockup);
    }

    if (candidateFiles.size === 0) {
        console.log("ℹ️  Không tìm thấy ảnh Mockup PNG nào trên đĩa để đính kèm.");
        return attachmentMap;
    }

    console.log(`🖼️  Tìm thấy ${candidateFiles.size} file ảnh Mockup cần xử lý:`);
    for (const file of candidateFiles) {
        console.log(`   - ${path.basename(file)} (${file})`);
    }

    // 3. Tiến hành upload từng file lên Jira Attachments
    const attachUrl = `${baseUrl}/rest/api/3/issue/${issueKey}/attachments`;

    for (const filePath of candidateFiles) {
        const fileName = path.basename(filePath);
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const blob = new Blob([fileBuffer], { type: 'image/png' });
            const formData = new FormData();
            formData.append('file', blob, fileName);

            const attachRes = await fetch(attachUrl, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'X-Atlassian-Token': 'no-check'
                },
                body: formData
            });

            if (attachRes.ok) {
                const uploadedList = await attachRes.json();
                for (const item of uploadedList) {
                    attachmentMap[item.filename] = {
                        id: item.id,
                        filename: item.filename,
                        content: item.content,
                        size: item.size
                    };
                    console.log(`✅ Đã tải lên ảnh Mockup: ${item.filename} (ID: ${item.id})`);
                }
            } else {
                const errText = await attachRes.text();
                console.warn(`⚠️ Đính kèm ảnh ${fileName} không thành công (HTTP ${attachRes.status}):`, errText);
            }
        } catch (err) {
            console.warn(`⚠️ Lỗi mạng khi đính kèm ảnh ${fileName}: ${err.message}`);
        }
    }

    return attachmentMap;
}

// Wrapper tương thích ngược
async function uploadMockupAttachment(issueKey, baseUrl, authHeader, mdFilePath) {
    const mdContent = fs.existsSync(mdFilePath) ? fs.readFileSync(mdFilePath, 'utf8') : '';
    const map = await uploadAllMockupAttachments(issueKey, baseUrl, authHeader, mdFilePath, mdContent);
    return Object.keys(map).length > 0;
}

async function main() {
    loadEnv();

    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: node jira-push-spec.js <issueKey> <markdownFilePath> [--dry-run]");
        console.error("   VD: node jira-push-spec.js G3PTP-17057 workspace/issues/G3PTP-17057/spec/refined.md");
        process.exit(1);
    }

    const rawIssueKey = args[0];
    const mdFilePath = path.resolve(args[1]);

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

    // Chốt chặn Kiểm định Chất lượng Spec (Deterministic Quality Gate)
    console.log(`🛡️  Đang chạy Pre-flight Validation cho spec: ${path.basename(mdFilePath)}...`);
    const valResult = validateRefinedSpec(mdFilePath);
    if (!valResult.valid) {
        console.error("❌ CẤM PUSH LÊN JIRA — Spec chưa đạt chuẩn nghiệp vụ hoặc vi phạm quy tắc:");
        valResult.errors.forEach(e => console.error(`   - ${e}`));
        process.exit(1);
    }
    if (valResult.warnings.length > 0) {
        valResult.warnings.forEach(w => console.warn(`⚠️  Cảnh báo: ${w}`));
    }
    console.log("✅ Spec đạt chuẩn 100% về cấu trúc User Story, AC Gherkin sạch và không rò rỉ mã tag.");

    const authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');
    let attachmentMap = {};
    const isDryRun = process.env.DRY_RUN === '1' || args.includes('--dry-run');

    if (!isDryRun) {
        console.log(`⏳ Đang kiểm tra và tải ảnh Mockup lên Jira Attachments...`);
        attachmentMap = await uploadAllMockupAttachments(issueKey, baseUrl, authHeader, mdFilePath, markdownContent);
    }

    console.log(`⏳ Đang chuyển đổi Markdown sang Jira ADF...`);
    let adfContent;
    try {
        adfContent = markdownToAdf(markdownContent, attachmentMap);
    } catch (err) {
        console.error("❌ Lỗi khi parse Markdown sang ADF:", err.message);
        process.exit(1);
    }

    const tableCount = adfContent.content.filter(n => n.type === 'table').length;
    const mediaCount = adfContent.content.filter(n => n.type === 'mediaSingle').length;
    console.log(`   → ${adfContent.content.length} block, trong đó ${tableCount} bảng, ${mediaCount} ảnh mockup inline`);

    // --dry-run: in ADF ra stdout, không gọi Jira. Dùng để soi output trước khi
    // ghi đè description của ticket thật.
    if (isDryRun) {
        exportTestabilityManifest(issueKey, markdownContent, mdFilePath);
        console.log(JSON.stringify(adfContent, null, 2));
        console.log("🧪 DRY RUN — không gọi Jira API.");
        return;
    }

    const apiUrl = `${baseUrl}/rest/api/3/issue/${issueKey}`;
    console.log(`🌐 Đang đẩy Description lên Jira: ${apiUrl}`);

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
            console.log(`✅ Thành công! Đã ghi đè Description của ticket ${issueKey} (kèm ${mediaCount} ảnh mockup inline).`);
            console.log(`👉 Xem ticket tại: ${baseUrl}/browse/${issueKey}`);

            // Xuất testability-manifest.json
            exportTestabilityManifest(issueKey, markdownContent, mdFilePath);
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
export {
    normalizeIssueKey,
    markdownToAdf,
    splitBlocks,
    imageBlockToAdf,
    exportTestabilityManifest,
    uploadMockupAttachment,
    uploadAllMockupAttachments
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main();
}
