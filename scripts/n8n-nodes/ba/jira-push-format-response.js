const input = $input.first();
const json = (input && input.json) || {};

let specContext = {};
try {
  specContext = $('Pre-flight Gate & ADF Converter').first()?.json || {};
} catch (e) {}

const triggerSource = specContext._triggerSource || json._triggerSource || 'internal';
const issueKey = specContext.issueKey || json.issueKey || '';
const userName = specContext.userName || json.userName || 'User';
const baseUrl = (($env && $env.ATLASSIAN_BASE_URL) || 'https://entrade.atlassian.net').replace(/\/+$/, '');
const jiraUrl = `${baseUrl}/browse/${issueKey}`;

// 1. Trường hợp có lỗi từ bước Resolve hoặc Pre-flight
if (specContext.isError || json.isError) {
  return [{
    json: {
      success: false,
      isError: true,
      issueKey,
      reportText: specContext.reportText || json.reportText || 'Lỗi không xác định trong quá trình chuẩn bị spec.',
      _triggerSource: triggerSource,
      userName
    }
  }];
}

// 2. Trường hợp Dry Run
if (specContext.dryRun) {
  const dryRunMsg = `🧪 **[DRY RUN - Xem Trước Spec ADF]** Cho ticket [${issueKey}](${jiraUrl}):\n` +
                    `- **Nguồn file:** \`${specContext.filePath}\` (${specContext.specType || 'Spec'})\n` +
                    `- **Thống kê ADF:** ${specContext.blockCount || 0} blocks (gồm ${specContext.tableCount || 0} bảng nghiệp vụ, ${specContext.scenarioCount || 0} Scenarios AC)\n` +
                    `- **Sơ đồ phát hiện:** ${specContext.diagramFiles?.length || 0} sơ đồ diagrams\n` +
                    `> *Lưu ý: Chế độ Dry Run chỉ kiểm tra cú pháp và cấu trúc ADF, không ghi đè dữ liệu lên Jira.*`;
  return [{
    json: {
      success: true,
      isDryRun: true,
      issueKey,
      reportText: dryRunMsg,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

// 3. Trường hợp Live Push - kiểm tra phản hồi từ Jira API
if (json.error || json.errorMessages || (json.status && json.status >= 400)) {
  const errMsg = (json.errorMessages && json.errorMessages.join(', ')) ||
                 (json.error && (json.error.message || json.error.description)) ||
                 'Lỗi không xác định từ Jira REST API';
  const failText = `🚨 **[Lỗi Ghi Đè Jira]** Không thể cập nhật Description cho ticket [${issueKey}](${jiraUrl}):\n> ${errMsg}\n\n*Gợi ý: Kiểm tra quyền hạn của tài khoản hoặc cấu trúc ADF trong .env.*`;
  return [{
    json: {
      success: false,
      isError: true,
      issueKey,
      reportText: failText,
      _triggerSource: triggerSource,
      userName
    }
  }];
}

const formattedUser = userName ? (userName.startsWith('@') ? userName : '@' + userName) : '@User';
const projectTag = specContext.project ? specContext.project + ' ' : '';

// Tự động dọn dẹp các file nháp/rác sau khi push Jira thành công (Post-Push Cleanup)
try {
  const fs = require('fs');
  const path = require('path');
  let wsDir = ($env && $env.AGENT_WORKSPACE_DIR) || '/workspace';
  try {
    const proc = require('process');
    if (proc && typeof proc.cwd === 'function') wsDir = ($env && $env.AGENT_WORKSPACE_DIR) || proc.cwd();
  } catch (_) {}

  const issueDir = path.resolve(wsDir, 'workspace', 'issues', issueKey);
  const specDir = path.join(issueDir, 'spec');
  const refinedPath = path.join(specDir, 'refined.md');
  const finalPath = path.join(specDir, 'final.md');

  if (fs.existsSync(issueDir) && (fs.existsSync(refinedPath) || fs.existsSync(finalPath))) {
    const mdContent = (fs.existsSync(refinedPath) ? fs.readFileSync(refinedPath, 'utf8') : '') +
                      (fs.existsSync(finalPath) ? fs.readFileSync(finalPath, 'utf8') : '');
    const usedImages = new Set();
    const mdImgRegex = /!\[.*?\]\(([^)\s]+)(?:\s+["'].*?["'])?\)/g;
    let m;
    while ((m = mdImgRegex.exec(mdContent)) !== null) {
      usedImages.add(path.basename(m[1].trim()));
    }
    const htmlImgRegex = /<img\s+[^>]*?src=["']([^"']+)["']/gi;
    while ((m = htmlImgRegex.exec(mdContent)) !== null) {
      usedImages.add(path.basename(m[1].trim()));
    }

    const toDelete = [
      path.join(specDir, 'refined-draft.md'),
      path.join(specDir, 'adf.json'),
      path.join(specDir, '.scratch')
    ];
    for (const p of toDelete) {
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    }

    if (fs.existsSync(specDir)) {
      for (const f of fs.readdirSync(specDir)) {
        if (/\.(mmd|py|sh)$/i.test(f) || f.startsWith('asis-')) {
          fs.rmSync(path.join(specDir, f), { force: true });
        } else if (/\.(png|jpe?g|svg|webp|gif)$/i.test(f) && !usedImages.has(f)) {
          fs.rmSync(path.join(specDir, f), { force: true });
        }
      }
    }

    const diagDir = path.join(specDir, 'diagrams');
    if (fs.existsSync(diagDir)) {
      for (const f of fs.readdirSync(diagDir)) {
        if (/^(scratch-|temp-|debug-|test-|parse_|asis-)/i.test(f) || /\.(mmd|txt|bak|tmp)$/i.test(f)) {
          fs.rmSync(path.join(diagDir, f), { force: true });
        } else if (/\.(png|jpe?g|svg|webp|gif)$/i.test(f) && !usedImages.has(f)) {
          fs.rmSync(path.join(diagDir, f), { force: true });
        }
      }
    }

    const sourceDir = path.join(issueDir, 'source');
    if (fs.existsSync(sourceDir)) {
      const backups = fs.readdirSync(sourceDir)
        .filter((f) => /^jira-description-backup-\d+\.json$/.test(f))
        .map((f) => {
          const full = path.join(sourceDir, f);
          return { full, mtimeMs: fs.statSync(full).mtimeMs };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs);
      for (let i = 1; i < backups.length; i++) {
        fs.rmSync(backups[i].full, { force: true });
      }
    }

    for (const f of fs.readdirSync(issueDir)) {
      const full = path.join(issueDir, f);
      if (fs.statSync(full).isFile() && f !== '.pipeline-state.json' && /\.(txt|tmp|bak|log)$/i.test(f)) {
        fs.rmSync(full, { force: true });
      }
    }
  }
} catch (_) {}

const successMsg = `### 🚀 Đẩy Đặc Tả Lên Jira Thành Công!
- **Ticket:** **[${issueKey}](${jiraUrl})**
- **Nguồn spec:** \`${specContext.filePath}\` (*${specContext.specType || 'Spec'}*)
- **Dự án/Cluster:** \`${specContext.project || 'Tự động phát hiện'}\`
- **Thống kê ADF:** **${specContext.blockCount || 0}** blocks (gồm **${specContext.tableCount || 0}** bảng nghiệp vụ, **${specContext.scenarioCount || 0}** Scenarios AC)
- **Sơ đồ liên quan:** ${specContext.diagramFiles?.length > 0 ? ('✅ ' + specContext.diagramFiles.length + ' file sơ đồ') : 'Không có sơ đồ riêng'}
- **Người thực hiện:** ${formattedUser}

---
💡 **Gợi ý bước tiếp theo theo quy trình BA/QA Pipeline:**
- \`/agent ${projectTag}push-squash ${issueKey}\` để đẩy kịch bản Gherkin (.feature) lên Squash TM
- \`/agent ${projectTag}run-test ${issueKey}\` để chạy kiểm thử tự động`;

return [{
  json: {
    success: true,
    isError: false,
    issueKey,
    jiraUrl,
    filePath: specContext.filePath,
    reportText: successMsg,
    _triggerSource: triggerSource,
    userName
  }
}];
