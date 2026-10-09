const input = $input.first();
const json = (input && input.json) || {};

let issueKey = '';
let project = '';
let skill = '';
let testFiles = '';
let testCommand = '';

// Ưu tiên trích xuất từ body -> params -> query -> root json
const candidates = [json.body, json.params, json.query, json].filter(c => c && typeof c === 'object');

for (const c of candidates) {
  if (!issueKey && c.issueKey) issueKey = String(c.issueKey).trim();
  if (!project && c.project) project = String(c.project).trim();
  if (!skill && c.skill) skill = String(c.skill).trim();
  if (!testFiles && c.testFiles) testFiles = String(c.testFiles).trim();
  if (!testCommand && c.testCommand) testCommand = String(c.testCommand).trim();
}

// Fallback regex nếu issueKey nằm trong câu lệnh hoặc text
if (!issueKey) {
  const textSource = json.originalCommand || json.text || (json.body && json.body.text) || '';
  const match = String(textSource).match(/\b([A-Za-z0-9]+-[0-9]+)\b/);
  if (match) {
    issueKey = match[1];
  }
}

// 1. Nhận diện nguồn gọi
let triggerSource = json._triggerSource || (json.body && json.body._triggerSource) || 'webhook';
try {
  const trigWebhook = $('Webhook').first();
  if (trigWebhook && trigWebhook.json) {
    triggerSource = 'webhook';
  }
} catch (_) {}
try {
  const trigExec = $('Execute Workflow Trigger').first();
  if (trigExec && trigExec.json && Object.keys(trigExec.json).length > 0) {
    triggerSource = 'executeWorkflow';
  }
} catch (_) {}

if (!issueKey) {
  return [{
    json: {
      error: 'Thiếu tham số issueKey.',
      issueKey: '',
      project: project,
      skill: skill,
      testFiles: testFiles,
      testCommand: testCommand,
      _triggerSource: triggerSource
    }
  }];
}

return [{
  json: {
    issueKey: issueKey.toUpperCase(),
    project: (project || '').trim(),
    skill: (skill || 'run-test').trim(),
    testFiles: testFiles,
    testCommand: testCommand,
    _triggerSource: triggerSource
  }
}];
