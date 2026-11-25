const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Buffer } = require('buffer');

const input = $input.first();
const resolveRes = (input && input.json) || {};
let prepContext = {};
try {
  prepContext = $('Prepare Resolver Input').first()?.json || {};
} catch (_) {}

const triggerSource = prepContext._triggerSource || resolveRes._triggerSource || 'internal';
const issueKey = prepContext.issueKey || resolveRes.issueKey || '';
const userName = prepContext.userName || resolveRes.userName || 'User';
const isDryRun = Boolean(prepContext.dryRun || resolveRes.dryRun);
const isForce = Boolean(prepContext.force || resolveRes.force);
const hasInlinePayload = Boolean(prepContext.hasInlinePayload && typeof prepContext.markdownContent === 'string');
const isExternalCaller = Boolean(hasInlinePayload || prepContext.callerWorkspaceDir);

let targetFilePath = '';
let specDir = '';
let specType = '';
let markdownContent = '';
let inlineAttachments = Array.isArray(prepContext.attachments) ? prepContext.attachments : [];

if (hasInlinePayload) {
  markdownContent = prepContext.markdownContent;
  targetFilePath = prepContext.filePath || `workspace/issues/${issueKey}/spec/refined.md`;
  specDir = path.dirname(targetFilePath);
  const isFinal = path.basename(targetFilePath).toLowerCase().includes('final');
  specType = prepContext.specType || (isFinal ? 'final.md (chuẩn ba-spec)' : 'refined.md (chuẩn ba-refine)');
} else {
  // 1. Kiểm tra kết quả từ Workspace Resolver (fallback khi chạy từ Slack / trong container)
  if (resolveRes.isError || !resolveRes.found) {
    return [{
      json: {
        isError: true,
        errorType: resolveRes.errorType || 'DIR_NOT_FOUND',
        reportText: resolveRes.reportText || `🚨 Không tìm thấy thư mục workspace cho ticket **${issueKey}**.`,
        _triggerSource: triggerSource,
        userName,
        issueKey
      }
    }];
  }

  specDir = resolveRes.resolvedPath || resolveRes.dirPath || '';
  const refinedPath = path.join(specDir, 'refined.md');
  const finalPath = path.join(specDir, 'final.md');

  if (fs.existsSync(refinedPath)) {
    targetFilePath = refinedPath;
    specType = 'refined.md (chuẩn ba-refine)';
  } else if (fs.existsSync(finalPath)) {
    targetFilePath = finalPath;
    specType = 'final.md (chuẩn ba-spec)';
  } else {
    return [{
      json: {
        isError: true,
        errorType: 'SPEC_NOT_FOUND',
        reportText: `🚨 **[Không Tìm Thấy Spec]** Ticket **${issueKey}** chưa có file đặc tả chuẩn trong thư mục:\n> \`${specDir}\`\n\n*👉 Cần có ít nhất 1 trong 2 file: \`spec/refined.md\` (từ ba-refine) hoặc \`spec/final.md\` (từ ba-spec) trước khi đẩy lên Jira.*`,
        _triggerSource: triggerSource,
        userName,
        issueKey
      }
    }];
  }

  try {
    markdownContent = fs.readFileSync(targetFilePath, 'utf8');
  } catch (e) {
    return [{
      json: {
        isError: true,
        errorType: 'READ_ERROR',
        reportText: `🚨 **[Lỗi Đọc File]** Không thể đọc nội dung file tại \`${targetFilePath}\`: ${e.message}`,
        _triggerSource: triggerSource,
        userName,
        issueKey
      }
    }];
  }

  // Thu thập ảnh local từ markdown (![...](...)) và diagrams/ khi chạy ở Resolver Mode
  const collectedPaths = new Set();
  const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let mImg;
  while ((mImg = imgRegex.exec(markdownContent)) !== null) {
    const rawSrc = mImg[1].trim().split(/\s+/)[0];
    if (!rawSrc || rawSrc.startsWith('http://') || rawSrc.startsWith('https://')) continue;
    const cands = [
      path.resolve(specDir, rawSrc),
      path.resolve(specDir, 'diagrams', path.basename(rawSrc)),
      path.resolve(specDir, path.basename(rawSrc))
    ];
    const hit = cands.find(c => fs.existsSync(c) && fs.statSync(c).isFile());
    if (hit) collectedPaths.add(hit);
  }
  const diagramDir = path.join(specDir, 'diagrams');
  if (fs.existsSync(diagramDir)) {
    try {
      for (const f of fs.readdirSync(diagramDir)) {
        if (/\.(png|jpe?g|svg)$/i.test(f)) collectedPaths.add(path.join(diagramDir, f));
      }
    } catch (_) {}
  }
  inlineAttachments = Array.from(collectedPaths).map(full => {
    const f = path.basename(full);
    const ext = path.extname(f).toLowerCase();
    const mimeType = ext === '.svg' ? 'image/svg+xml' : (ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png');
    return {
      filename: f,
      mimeType,
      dataBase64: fs.readFileSync(full).toString('base64')
    };
  });
}

if (!markdownContent.trim()) {
  return [{
    json: {
      isError: true,
      errorType: 'EMPTY_FILE',
      reportText: `🚨 **[File Spec Rỗng]** File tại \`${targetFilePath}\` không có nội dung.`,
      _triggerSource: triggerSource,
      userName,
      issueKey
    }
  }];
}

// 2. Pre-flight Quality Gate (Chuẩn ba-refine; bỏ qua khi --force hoặc final.md)
const isFinalSpec = path.basename(targetFilePath).toLowerCase().includes('final');
const qualityErrors = [];

if (!isForce && !isFinalSpec) {
  if (/\[\.\.\.\]/.test(markdownContent)) {
    qualityErrors.push("Spec còn chứa placeholder chưa điền: `[...]`");
  }

  const forbiddenSections = [
    /##\s*Giả định\s*(&|và)\s*Rủi ro/i,
    /##\s*Ngoài Phạm vi/i,
    /##\s*Đánh giá Độ tin cậy/i,
    /##\s*(?:🧱\s*)?Technical Notes/i
  ];
  for (const pattern of forbiddenSections) {
    if (pattern.test(markdownContent)) {
      qualityErrors.push(`Spec còn chứa section nội bộ bị cấm trên Jira: \`${pattern.source}\``);
    }
  }

  if (targetFilePath.endsWith('refined.md')) {
    if (!/^##\s*(?:🧩\s*)?User Story/im.test(markdownContent)) {
      qualityErrors.push("Spec refine bắt buộc phải có `## 🧩 User Story` (`**As a**`, `**I want**`, `**So that**`).");
    }
  }

  const hasGiven = /Given\b/i.test(markdownContent);
  const hasWhen = /When\b/i.test(markdownContent);
  const hasThen = /Then\b/i.test(markdownContent);

  if (!hasGiven || !hasWhen || !hasThen) {
    qualityErrors.push("Acceptance Criteria bắt buộc phải có cấu trúc Gherkin chuẩn (`Given` / `When` / `Then`).");
  }

  const scenarioCountCheck = (markdownContent.match(/Scenario(?:\s+Outline)?\s*:/gi) || []).length;
  if (scenarioCountCheck < 2) {
    qualityErrors.push(`Acceptance Criteria cần có tối thiểu 2 Scenarios kiểm thử (hiện có: ${scenarioCountCheck}).`);
  }

  const lines = markdownContent.split('\n');
  let inGherkin = false;
  for (const line of lines) {
    if (/^```gherkin/i.test(line)) inGherkin = true;
    else if (/^```/.test(line)) inGherkin = false;
    else if (inGherkin) {
      if (/^\s*@[a-zA-Z0-9_-]+/.test(line)) {
        qualityErrors.push(`Acceptance Criteria không được chứa automation @tag: "${line.trim()}".`);
        break;
      }
      if (/Scenario(?:\s+Outline)?\s*:.*\[AC(?:-\d+(?:\.\d+)?)?\]/i.test(line)) {
        qualityErrors.push(`Scenario không được gắn tag mã [AC]: "${line.trim()}".`);
        break;
      }
    }
  }
}

const scenarioCount = (markdownContent.match(/Scenario(?:\s+Outline)?\s*:/gi) || []).length;

if (qualityErrors.length > 0) {
  const errMsg = `⚠️ **[Chặn Ghi Đè - Spec Chưa Đạt Chuẩn]** File \`${path.basename(targetFilePath)}\` của ticket **${issueKey}** chưa hoàn thiện:\n` +
                 qualityErrors.map(e => `> - ${e}`).join('\n') + '\n\n' +
                 `*Vui lòng mở file \`${targetFilePath}\` để hoàn thiện spec trước khi đẩy lên Jira.*`;
  return [{
    json: {
      isError: true,
      errorType: 'PREFLIGHT_FAILED',
      reportText: errMsg,
      _triggerSource: triggerSource,
      userName,
      issueKey,
      filePath: targetFilePath
    }
  }];
}

let procEnv = {};
let procCwd = '';
try {
  const proc = typeof process !== 'undefined' ? process : require('process');
  if (proc) {
    if (proc.env) procEnv = proc.env;
    if (typeof proc.cwd === 'function') procCwd = proc.cwd();
  }
} catch (_) {}
const projectRoot = ($env && $env.AGENT_WORKSPACE_DIR) || (fs.existsSync('/workspace/package.json') ? '/workspace' : procCwd);

function loadProjectLib(relPath) {
  const candidates = [
    path.join(projectRoot, relPath),
    path.join('/workspace', relPath)
  ];
  const hit = candidates.find(c => fs.existsSync(c)) || '';
  if (!hit) return { mod: null, filePath: '' };
  try {
    return { mod: require(hit), filePath: hit };
  } catch (_) {
    return { mod: null, filePath: hit };
  }
}

const { mod: jiraAdfModRaw, filePath: jiraAdfPath } = loadProjectLib('scripts/lib/jira-adf.cjs');
const jiraAdfMod = jiraAdfModRaw;
const markdownToAdfFn = jiraAdfMod && typeof jiraAdfMod.markdownToAdf === 'function' ? jiraAdfMod.markdownToAdf : null;
const { mod: nodeEnvMod } = loadProjectLib('scripts/lib/n8n-node-env.cjs');

function buildChildNodeEnv() {
  if (nodeEnvMod && typeof nodeEnvMod.buildNodeChildEnv === 'function') {
    return nodeEnvMod.buildNodeChildEnv({ env: $env || {}, procEnv, projectRoot });
  }
  const childEnv = { ...procEnv };
  const caCert = [
    $env && $env.NODE_EXTRA_CA_CERTS,
    procEnv.NODE_EXTRA_CA_CERTS,
    '/home/node/.n8n/corporate-ca.pem',
    projectRoot ? path.join(projectRoot, '.n8n-data', 'corporate-ca.pem') : ''
  ].find(p => p && fs.existsSync(p));
  if (caCert) childEnv.NODE_EXTRA_CA_CERTS = caCert;
  if (String(($env && $env.ALLOW_INSECURE_TLS) || procEnv.ALLOW_INSECURE_TLS || '').toLowerCase() === 'true') {
    childEnv.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  return childEnv;
}

const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || '').replace(/\/+$/, '');
const email = ($env && $env.ATLASSIAN_EMAIL) || '';
const token = ($env && $env.ATLASSIAN_API_TOKEN) || '';
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');

// 4. Nạp kích thước ảnh local (kể cả Dry Run để xem trước chuẩn kích thước mẫu G3PTP-17483);
// Khi Live Push: luôn chạy qua child process Node có truyền NODE_EXTRA_CA_CERTS vì n8n task-runner
// cắt bỏ biến CA khỏi process.env khiến fetch() nội bộ lỗi SELF_SIGNED_CERT_IN_CHAIN.
const attachmentMap = {};
for (const att of inlineAttachments) {
  if (!att || !att.filename) continue;
  const name = path.basename(att.filename);
  let nw = Number(att.naturalWidth) || 0;
  let nh = Number(att.naturalHeight) || 0;
  if ((!nw || !nh) && att.dataBase64) {
    try {
      const headBuf = Buffer.from(att.dataBase64, 'base64');
      if (jiraAdfMod && typeof jiraAdfMod.getImageDimensionsFromBuffer === 'function') {
        const d = jiraAdfMod.getImageDimensionsFromBuffer(headBuf);
        if (d) { nw = d.width; nh = d.height; }
      } else if (headBuf.length >= 24 && headBuf[0] === 0x89 && headBuf[1] === 0x50 && headBuf[2] === 0x4E && headBuf[3] === 0x47) {
        nw = headBuf.readUInt32BE(16);
        nh = headBuf.readUInt32BE(20);
      }
    } catch (_) {}
  }
  attachmentMap[name] = {
    filename: name,
    ...(nw > 0 && nh > 0 ? { naturalWidth: nw, naturalHeight: nh } : {})
  };
}
let oldDescription = null;
let uploadedCount = 0;

if (!isDryRun && baseUrl && email && token) {
  const syncScript = `
    const fs = require('fs');
    const path = require('path');
    const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
    const { baseUrl, authHeader, issueKey, attachments, jiraAdfPath } = payload;
    let adfLib = null;
    if (jiraAdfPath) { try { adfLib = require(jiraAdfPath); } catch (_) {} }
    const fmtErr = (e) => (e && e.cause && (e.cause.code || e.cause.message)) ? (e.message + ' (' + (e.cause.code || e.cause.message) + ')') : (e && e.message ? e.message : String(e));
    const out = { oldDescription: null, attachmentMap: {}, uploadedCount: 0, errors: [] };
    (async () => {
      try {
        const r = await fetch(baseUrl + '/rest/api/3/issue/' + issueKey + '?fields=attachment,description', {
          headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
        });
        if (r.ok) {
          const d = await r.json();
          out.oldDescription = d?.fields?.description || null;
          for (const att of (d?.fields?.attachment || [])) {
            out.attachmentMap[att.filename] = { id: att.id, filename: att.filename, content: att.content, size: att.size };
          }
        } else {
          out.errors.push('GET issue HTTP ' + r.status);
        }
      } catch (e) { out.errors.push('GET issue: ' + fmtErr(e)); }
      for (const att of (attachments || [])) {
        if (!att || !att.filename || !att.dataBase64) continue;
        try {
          const buf = Buffer.from(att.dataBase64, 'base64');
          const dims = adfLib && typeof adfLib.getImageDimensionsFromBuffer === 'function'
            ? adfLib.getImageDimensionsFromBuffer(buf)
            : null;
          const blob = new Blob([buf], { type: att.mimeType || 'image/png' });
          const fd = new FormData();
          fd.append('file', blob, path.basename(att.filename));
          const up = await fetch(baseUrl + '/rest/api/3/issue/' + issueKey + '/attachments', {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'X-Atlassian-Token': 'no-check' },
            body: fd
          });
          if (up.ok) {
            for (const item of (await up.json())) {
              const mediaId = adfLib && typeof adfLib.resolveJiraMediaUuid === 'function'
                ? await adfLib.resolveJiraMediaUuid(item.content, authHeader)
                : null;
              out.attachmentMap[item.filename] = {
                id: item.id,
                filename: item.filename,
                content: item.content,
                size: item.size,
                ...(mediaId ? { mediaId } : {}),
                ...(dims ? { naturalWidth: dims.width, naturalHeight: dims.height } : {})
              };
              out.uploadedCount++;
            }
          } else {
            const errBody = await up.text().catch(() => '');
            out.errors.push('Upload ' + att.filename + ' HTTP ' + up.status + (errBody ? ': ' + errBody.slice(0, 200) : ''));
          }
        } catch (e) { out.errors.push('Upload ' + att.filename + ': ' + fmtErr(e)); }
      }
      process.stdout.write(JSON.stringify(out));
    })();
  `;
  const childEnv = buildChildNodeEnv();
  const upRun = spawnSync('node', ['-e', syncScript], {
    input: JSON.stringify({ baseUrl, authHeader, issueKey, attachments: inlineAttachments, jiraAdfPath }),
    env: childEnv,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 32 * 1024 * 1024
  });

  const uploadErrors = [];
  if (upRun.status !== 0 || !upRun.stdout) {
    uploadErrors.push((upRun.stderr || upRun.error?.message || `child node exit ${upRun.status}`).trim());
  } else {
    try {
      const upRes = JSON.parse(upRun.stdout);
      oldDescription = upRes.oldDescription || null;
      for (const [k, v] of Object.entries(upRes.attachmentMap || {})) {
        attachmentMap[k] = { ...(attachmentMap[k] || {}), ...v };
      }
      uploadedCount = upRes.uploadedCount || 0;
      if (Array.isArray(upRes.errors)) {
        uploadErrors.push(...upRes.errors.filter(e => !e.startsWith('GET issue')));
        if (inlineAttachments.length > 0 && uploadedCount === 0) {
          uploadErrors.push(...upRes.errors.filter(e => e.startsWith('GET issue')));
        }
      }
    } catch (e) {
      uploadErrors.push(`Parse upload response lỗi: ${e.message}`);
    }
  }

  const missingAttachments = inlineAttachments
    .filter(a => a && a.filename && a.dataBase64)
    .map(a => path.basename(a.filename))
    .filter(name => {
      const mapped = attachmentMap[name];
      return !mapped || (!mapped.mediaId && !mapped.content && !mapped.id);
    });

  if (inlineAttachments.length > 0 && (uploadErrors.length > 0 || missingAttachments.length > 0)) {
    const details = [...new Set([
      ...uploadErrors,
      ...(missingAttachments.length > 0 ? [`Thiếu Jira attachment metadata cho: ${missingAttachments.join(', ')}`] : [])
    ])];
    return [{
      json: {
        isError: true,
        errorType: 'ATTACHMENT_UPLOAD_FAILED',
        reportText: `🚨 **[Lỗi Upload Ảnh Mockup Lên Jira]** Không thể đính kèm ảnh cho **${issueKey}** (đã chặn đẩy node \`local-*\` gây lỗi 400).\n` +
                    details.map(d => `> - ${d}`).join('\n') +
                    `\n\n*Kiểm tra chứng chỉ CA (\`NODE_EXTRA_CA_CERTS=${childEnv.NODE_EXTRA_CA_CERTS || 'chưa thiết lập'}\`) hoặc kết nối tới \`${baseUrl}\`.*`,
        _triggerSource: triggerSource,
        userName,
        issueKey
      }
    }];
  }
}

// 5. Chuyển đổi Markdown sang ADF kèm attachmentMap thật (tuyệt đối KHÔNG fallback đẩy raw #)
let adfContent = null;
let adfError = '';
if (markdownToAdfFn) {
  try {
    adfContent = markdownToAdfFn(markdownContent, attachmentMap);
  } catch (e) {
    adfError = e.message;
  }
} else if (jiraAdfPath) {
  const adfRun = spawnSync('node', [jiraAdfPath, '--stdin'], {
    input: JSON.stringify({ markdown: markdownContent, attachmentMap }),
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024
  });
  if (adfRun.status === 0 && adfRun.stdout) {
    try {
      adfContent = JSON.parse(adfRun.stdout);
    } catch (e) {
      adfError = `Parse ADF JSON lỗi: ${e.message}`;
    }
  } else {
    adfError = (adfRun.stderr || adfRun.error?.message || `exit ${adfRun.status}`).trim();
  }
} else {
  adfError = `Không tìm thấy parser jira-adf.cjs tại ${path.join(projectRoot, 'scripts/lib/jira-adf.cjs')}`;
}

if (!adfContent || !Array.isArray(adfContent.content) || adfContent.content.length === 0) {
  return [{
    json: {
      isError: true,
      errorType: 'ADF_CONVERSION_FAILED',
      reportText: `🚨 **[Lỗi Chuyển Đổi ADF]** Không thể chuyển Markdown sang Jira ADF cho **${issueKey}** (chặn đẩy raw text chứa \`#\` lên Jira).\n> Chi tiết: ${adfError || 'adfContent rỗng'}`,
      _triggerSource: triggerSource,
      userName,
      issueKey
    }
  }];
}

function collectLocalMediaIds(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (node.type === 'media' && node.attrs && typeof node.attrs.id === 'string' && node.attrs.id.startsWith('local-')) {
    found.push(node.attrs.id);
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) collectLocalMediaIds(child, found);
  }
  return found;
}

if (!isDryRun) {
  const unresolvedLocalIds = collectLocalMediaIds(adfContent);
  if (unresolvedLocalIds.length > 0) {
    return [{
      json: {
        isError: true,
        errorType: 'UNRESOLVED_LOCAL_MEDIA',
        reportText: `🚨 **[Chặn Đẩy Media ID Giả]** ADF cho **${issueKey}** còn chứa media chưa được upload lên Jira: ${unresolvedLocalIds.join(', ')}.\n> Kiểm tra lại đường dẫn ảnh mockup hoặc kết nối Jira Attachments API.`,
        _triggerSource: triggerSource,
        userName,
        issueKey
      }
    }];
  }
}

const tableCount = (adfContent.content || []).filter(n => n.type === 'table').length;
const blockCount = (adfContent.content || []).length;
const diagramFiles = inlineAttachments.map(a => a.filename).filter(Boolean);

return [{
  json: {
    isError: false,
    issueKey,
    project: resolveRes.project || prepContext.project,
    filePath: targetFilePath,
    specType,
    dryRun: isDryRun,
    force: isForce,
    isExternalCaller,
    adfContent,
    oldDescription,
    attachmentMap,
    uploadedCount,
    tableCount,
    blockCount,
    scenarioCount,
    diagramFiles,
    userName,
    authHeader,
    _triggerSource: triggerSource
  }
}];
