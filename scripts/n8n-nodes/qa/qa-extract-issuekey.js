const input = $input.first();
const json = input.json;
let issueKey = '';
let project = '';
let skill = '';

if (json.params) {
  issueKey = json.params.issueKey || '';
  project = json.params.project || '';
  skill = json.params.skill || '';
} else if (json.body) {
  issueKey = json.body.issueKey || '';
  project = json.body.project || '';
  skill = json.body.skill || '';
}

if (!issueKey && json.issueKey) {
  issueKey = json.issueKey;
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
      _triggerSource: triggerSource
    }
  }];
}

return [{
  json: {
    issueKey: issueKey.toUpperCase(),
    project: (project || '').trim(),
    skill: (skill || 'run-test').trim(),
    _triggerSource: triggerSource
  }
}];
