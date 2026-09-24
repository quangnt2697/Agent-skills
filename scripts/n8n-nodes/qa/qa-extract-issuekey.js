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

if (!issueKey) {
  return [{
    json: {
      error: 'Thiếu tham số issueKey.',
      issueKey: '',
      project: project,
      skill: skill
    }
  }];
}

return [{
  json: {
    issueKey: issueKey.toUpperCase(),
    project: (project || '').trim(),
    skill: (skill || 'run-test').trim()
  }
}];
