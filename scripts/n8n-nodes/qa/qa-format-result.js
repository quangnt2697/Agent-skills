const input = $input.first();
const extractNode = $('Extract issueKey').first().json;
const issueKey = extractNode.issueKey || input.json.issueKey || '';
const project = extractNode.project || input.json.project || '';
const targetLabel = project ? (project + ' / ' + issueKey) : issueKey;

// Xử lý lỗi Extract
const triggerSource = extractNode._triggerSource || 'webhook';

if (!issueKey || extractNode.error) {
  return [{
    json: {
      success: false,
      message: '🚨 **[QA Automation Lỗi]** Không tìm thấy issueKey hợp lệ trong yêu cầu.\n' +
               '> Cú pháp hợp lệ: `/agent [project] run-test <issueKey>` (trong đó [project] là tùy chọn).',
      _triggerSource: triggerSource
    }
  }];
}

// Xử lý kết quả lệnh Execute Command
const execRes = input.json;
let success = true;
let outputText = execRes.stdout || '';
let errText = execRes.stderr || '';

if (execRes.error || (execRes.exitCode !== undefined && execRes.exitCode !== 0)) {
  success = false;
}

// Rút gọn output nếu quá dài
let logSnippet = (outputText + '\n' + errText).trim();
if (logSnippet.length > 2500) {
  logSnippet = logSnippet.substring(logSnippet.length - 2500);
}

const statusIcon = success ? '✅' : '❌';
const statusText = success ? 'Thành công (Passed)' : 'Thất bại (Failed)';

const message = '🚀 **[QA Automation]** Kết quả chạy kiểm thử cho ticket **' + targetLabel + '**:\n' +
                '- Trạng thái: ' + statusIcon + ' **' + statusText + '**\n\n' +
                '```text\n' + logSnippet + '\n```';

return [{ json: { success, message, issueKey, project, _triggerSource: triggerSource } }];
