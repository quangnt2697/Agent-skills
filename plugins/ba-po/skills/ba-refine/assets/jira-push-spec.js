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
import jiraAdf from '../../../../../scripts/lib/jira-adf.cjs';
import { validateRefinedSpec } from '../../../../../scripts/validators/validate-ba-refine.js';
import { cleanIssueWorkspace } from '../../../../../scripts/workspace/clean-issue-workspace.js';

const {
    normalizeIssueKey,
    splitBlocks,
    imageBlockToAdf,
    markdownToAdf
} = jiraAdf;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Hỗ trợ parse .env thủ công phòng khi chạy script độc lập ngoài node_modules ---
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
    // PLUGIN_DIR là thư mục gốc của agent-skills (cách script này 5 cấp: plugins/ba-po/skills/ba-refine/assets)
    const pluginDir = path.resolve(__dirname, '../../../../..');
    const projectRoot = process.cwd();

    // 1. Nguồn chính: đọc từ plugin dir
    parseEnvFile(path.join(pluginDir, '.env'));

    // 2. Override: đọc từ project root
    parseEnvFile(path.join(projectRoot, '.env'));
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

    // Nếu trên refined.md chỉ nhúng ảnh mockup (không có bảng text), tự động quét các phần tử [data-change] từ spec/diagrams/mockup.html
    if (uiElements.length === 0) {
        const issueDir = path.dirname(mdFilePath);
        const mockupHtmlPath = path.join(issueDir, 'diagrams', 'mockup.html');
        if (fs.existsSync(mockupHtmlPath)) {
            try {
                const html = fs.readFileSync(mockupHtmlPath, 'utf8');
                const tagRegex = /<([a-z0-9]+)[^>]*\bdata-change=["'](added|modified|removed)["'][^>]*>([\s\S]*?)<\/\1>/gi;
                let m;
                let idx = 1;
                while ((m = tagRegex.exec(html)) !== null) {
                    const changeType = m[2].toLowerCase();
                    const innerText = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
                    uiElements.push({
                        id: `delta-${idx++}`,
                        name: innerText || `UI Element (${m[1]})`,
                        change_type: changeType,
                        description: innerText,
                        rules: uniqueBrs,
                        criteria: uniqueAcs
                    });
                }
            } catch (_) {}
        }
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

// Thu thập danh sách file ảnh mockup local được tham chiếu trong Markdown hoặc nằm ở spec/diagrams/
function collectLocalMockupFiles(mdFilePath, mdContent, baseCwd = process.cwd()) {
    const specDir = path.dirname(mdFilePath);
    const candidateFiles = new Set();

    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    while ((match = imgRegex.exec(mdContent)) !== null) {
        const src = match[2].trim();
        if (src.startsWith('http://') || src.startsWith('https://')) continue;

        const resolvedCandidates = [
            path.resolve(specDir, src),
            path.resolve(baseCwd, src),
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

    const diagramsDir = path.join(specDir, 'diagrams');
    if (fs.existsSync(diagramsDir) && fs.statSync(diagramsDir).isDirectory()) {
        const pngFiles = fs.readdirSync(diagramsDir).filter(f => f.toLowerCase().endsWith('.png') && f.toLowerCase().startsWith('mockup'));
        for (const png of pngFiles) {
            candidateFiles.add(path.join(diagramsDir, png));
        }
    }

    const directMockup = path.join(specDir, 'mockup.png');
    if (fs.existsSync(directMockup)) {
        candidateFiles.add(directMockup);
    }

    return Array.from(candidateFiles);
}

// Upload tất cả các file ảnh mockup lên Jira Attachments và trả về map { [filename]: attachmentInfo }
async function uploadAllMockupAttachments(issueKey, baseUrl, authHeader, mdFilePath, mdContent) {
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
    const candidateFiles = collectLocalMockupFiles(mdFilePath, mdContent);

    if (candidateFiles.length === 0) {
        console.log("ℹ️  Không tìm thấy ảnh Mockup PNG nào trên đĩa để đính kèm.");
        return attachmentMap;
    }

    console.log(`🖼️  Tìm thấy ${candidateFiles.length} file ảnh Mockup cần xử lý:`);
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
    const positionalArgs = args.filter(a => !a.startsWith('--'));

    if (positionalArgs.length < 1) {
        console.error("Usage: node jira-push-spec.js <issueKey> [markdownFilePath] [--dry-run] [--force|--skip-validation]");
        console.error("   VD: node jira-push-spec.js G3PTP-17057");
        console.error("   VD: node jira-push-spec.js G3PTP-17057 workspace/issues/G3PTP-17057/spec/refined.md --dry-run");
        console.error("   VD: node jira-push-spec.js G3PTP-17057 --force");
        process.exit(1);
    }

    const rawIssueKey = positionalArgs[0];
    const issueKey = normalizeIssueKey(rawIssueKey);
    if (!issueKey) {
        console.error(`❌ Không nhận diện được Jira issue key từ: "${rawIssueKey}"`);
        console.error("   Ví dụ hợp lệ: G3PTP-17057 hoặc https://domain.atlassian.net/browse/G3PTP-17057");
        process.exit(1);
    }
    if (issueKey !== rawIssueKey) {
        console.log(`ℹ️  Issue key chuẩn hoá: "${rawIssueKey}" → "${issueKey}"`);
    }

    // Tự động phân giải file spec nếu không truyền đường dẫn cụ thể
    let mdFilePath;
    if (positionalArgs[1]) {
        mdFilePath = path.resolve(positionalArgs[1]);
    } else {
        const defaultRefined = path.resolve(process.cwd(), 'workspace', 'issues', issueKey, 'spec', 'refined.md');
        const defaultFinal = path.resolve(process.cwd(), 'workspace', 'issues', issueKey, 'spec', 'final.md');

        if (fs.existsSync(defaultRefined)) {
            mdFilePath = defaultRefined;
        } else if (fs.existsSync(defaultFinal)) {
            mdFilePath = defaultFinal;
        } else {
            console.error(`❌ Không tìm thấy file spec mặc định cho ticket ${issueKey}.`);
            console.error(`   Đã kiểm tra:`);
            console.error(`   - ${defaultRefined}`);
            console.error(`   - ${defaultFinal}`);
            console.error(`   👉 Vui lòng chỉ định rõ đường dẫn file: node jira-push-spec.js ${issueKey} <đường_dẫn_file>`);
            process.exit(1);
        }
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
    const isForce = process.env.FORCE_PUSH === '1' || args.includes('--force') || args.includes('--skip-validation');
    const isFinalSpec = path.basename(mdFilePath).includes('final');

    if (isForce) {
        console.log(`⚠️  Bỏ qua Pre-flight Validation (--force/--skip-validation được bật).`);
    } else if (isFinalSpec) {
        console.log(`ℹ️  Phát hiện spec chuẩn ba-spec (${path.basename(mdFilePath)}). Chạy kiểm tra cơ bản...`);
        // Kiểm tra không rỗng và có nội dung
        if (!markdownContent.trim()) {
            console.error("❌ CẤM PUSH LÊN JIRA — File spec rỗng.");
            process.exit(1);
        }
    } else {
        console.log(`🛡️  Đang chạy Pre-flight Validation cho spec: ${path.basename(mdFilePath)}...`);
        const valResult = validateRefinedSpec(mdFilePath);
        if (!valResult.valid) {
            console.error("❌ CẤM PUSH LÊN JIRA — Spec chưa đạt chuẩn nghiệp vụ hoặc vi phạm quy tắc:");
            valResult.errors.forEach(e => console.error(`   - ${e}`));
            console.error("\n💡 GỢI Ý: Nếu bạn muốn đẩy spec nguyên trạng mà không qua bộ kiểm định cấu trúc, hãy chạy kèm cờ --force hoặc --skip-validation.");
            process.exit(1);
        }
        if (valResult.warnings.length > 0) {
            valResult.warnings.forEach(w => console.warn(`⚠️  Cảnh báo: ${w}`));
        }
        console.log("✅ Spec đạt chuẩn 100% về cấu trúc User Story, AC Gherkin sạch và không rò rỉ mã tag.");
    }

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

    // Tự động sao lưu description hiện tại về workspace trước khi ghi đè (Safety Backup)
    try {
        const getIssueUrl = `${baseUrl}/rest/api/3/issue/${issueKey}?fields=description`;
        const currentRes = await fetch(getIssueUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });
        if (currentRes.ok) {
            const currentData = await currentRes.json();
            const currentDesc = currentData?.fields?.description;
            if (currentDesc) {
                const sourceDir = path.resolve(process.cwd(), `workspace/issues/${issueKey}/source`);
                if (!fs.existsSync(sourceDir)) {
                    fs.mkdirSync(sourceDir, { recursive: true });
                }
                const backupPath = path.join(sourceDir, `jira-description-backup-${Date.now()}.json`);
                fs.writeFileSync(backupPath, JSON.stringify(currentDesc, null, 2), 'utf8');
                console.log(`💾 Đã sao lưu description cũ vào: ${path.relative(process.cwd(), backupPath)}`);
            }
        }
    } catch (backupErr) {
        console.warn(`⚠️ Không thể backup description cũ (bỏ qua): ${backupErr.message}`);
    }

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

            // Tự động dọn dẹp các file nháp, scratch debug sau khi đã chốt và push thành công (Post-Push Cleanup)
            try {
                const cleanRes = cleanIssueWorkspace(issueKey, { rootDir: process.cwd() });
                if (cleanRes.success && cleanRes.removedFiles.length > 0) {
                    console.log(`🧹 Đã tự động dọn dẹp ${cleanRes.removedFiles.length} file nháp/rác trong workspace: ${cleanRes.removedFiles.join(', ')}`);
                }
            } catch (_) {}
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
    collectLocalMockupFiles,
    exportTestabilityManifest,
    uploadMockupAttachment,
    uploadAllMockupAttachments
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main();
}
