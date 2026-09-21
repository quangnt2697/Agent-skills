const input = $input.first();
const response = (input && input.json) || {};
const originalText = $('Webhook (Mattermost Slash Command)').first()?.json?.body?.text || '';

// ── Hàm bóc tách lệnh theo cú pháp: /agent [project hoặc group] [skill-name] [issueKey] ──
function parseCommand(text) {
  const clean = (text || '').trim();
  if (!clean) return { intent: 'help', params: { project: '', skill: '', issueKey: '' } };

  // 1. Tìm issueKey (pattern: ABC-1234)
  const issueKeyMatch = clean.match(/\b([A-Za-z0-9]+-[0-9]+)\b/i);
  const issueKey = issueKeyMatch ? issueKeyMatch[1].toUpperCase() : '';

  // Bỏ issueKey khỏi chuỗi để phân tích các token còn lại
  let remainder = clean;
  if (issueKeyMatch) {
    remainder = remainder.replace(issueKeyMatch[0], ' ').trim();
  }

  const tokens = remainder.split(/\s+/).filter(Boolean);

  // Mapping skill sang intent
  const skillIntentMap = {
    // QA / Test
    'run-test': 'run-test',
    'qa-run-test': 'run-test',
    'test': 'run-test',
    'kiểm-thử': 'run-test',
    'kiemthu': 'run-test',
    'qa-full-pipeline': 'run-test',
    'qa-auto-design': 'run-test',
    'qa-test-design': 'run-test',
    
    // Standup / Scrum
    'standup': 'standup',
    'sm-daily-standup': 'standup',
    'daily': 'standup',
    'sm-sprint-planning': 'standup',
    'sm-impediment-triage': 'standup',
    'sm-sprint-retrospective': 'standup',
    'sprint': 'standup',

    // Recon / Database Watchdog
    'recon': 'recon',
    'reconcile': 'recon',
    'db-timescale-reconciler': 'recon',
    'watchdog': 'recon',

    // Jira / BA
    'jira': 'jira',
    'ba-spec': 'jira',
    'ba-refine': 'jira',
    'ba-user-story-writing': 'jira',
    'ba-interview-me': 'jira',
    'ba-gap-analysis': 'jira',

    // Sync
    'sync': 'sync',
    'repo-group-sync': 'sync',
    'pull': 'sync',

    // Squash
    'squash': 'squash',
    'qa-squash-push': 'squash',

    // Help
    'help': 'help'
  };

  let detectedIntent = null;
  let detectedSkill = '';
  let project = '';

  if (tokens.length === 1) {
    const t0 = tokens[0].toLowerCase();
    if (skillIntentMap[t0]) {
      detectedIntent = skillIntentMap[t0];
      detectedSkill = tokens[0];
    } else {
      project = tokens[0];
    }
  } else if (tokens.length >= 2) {
    const t0 = tokens[0].toLowerCase();
    const t1 = tokens[1].toLowerCase();

    if (skillIntentMap[t1]) {
      // Dạng: [project] [skill]
      project = tokens[0];
      detectedSkill = tokens[1];
      detectedIntent = skillIntentMap[t1];
    } else if (skillIntentMap[t0]) {
      // Dạng: [skill] [project]
      detectedSkill = tokens[0];
      detectedIntent = skillIntentMap[t0];
      project = tokens[1];
    } else {
      const skillIdx = tokens.findIndex(t => skillIntentMap[t.toLowerCase()]);
      if (skillIdx !== -1) {
        detectedSkill = tokens[skillIdx];
        detectedIntent = skillIntentMap[detectedSkill.toLowerCase()];
        if (skillIdx > 0) project = tokens[0];
      }
    }
  }

  if (!detectedIntent) {
    const lower = clean.toLowerCase();
    if (lower.includes('test') || lower.includes('kiểm thử')) {
      detectedIntent = 'run-test';
    } else if (issueKey) {
      detectedIntent = 'jira';
    } else if (lower.includes('standup') || lower.includes('daily')) {
      detectedIntent = 'standup';
    } else if (lower.includes('recon')) {
      detectedIntent = 'recon';
    } else if (lower.includes('sync') || lower.includes('pull')) {
      detectedIntent = 'sync';
    } else if (lower.includes('squash')) {
      detectedIntent = 'squash';
    } else {
      detectedIntent = 'help';
    }
  }

  return {
    intent: detectedIntent,
    params: {
      issueKey: issueKey,
      project: project,
      skill: detectedSkill
    }
  };
}

const parsedFallback = parseCommand(originalText);

// Nếu Gemini API gặp lỗi
if (response.error || (response.status && response.status >= 400)) {
  return [{ json: { ...parsedFallback, _geminiError: response.error?.message || 'Lỗi Gemini API' } }];
}

try {
  const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let data;
  if (typeof rawText === 'object') {
    data = rawText;
  } else {
    const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    data = JSON.parse(cleanJson);
  }
  
  const validIntents = ['standup', 'run-test', 'recon', 'jira', 'squash', 'sync', 'help'];
  if (!validIntents.includes(data.intent)) {
    data.intent = parsedFallback.intent || 'help';
  }
  
  data.params = data.params || {};
  if (!data.params.issueKey && parsedFallback.params.issueKey) {
    data.params.issueKey = parsedFallback.params.issueKey;
  }
  if (!data.params.project && parsedFallback.params.project) {
    data.params.project = parsedFallback.params.project;
  }
  if (!data.params.skill && parsedFallback.params.skill) {
    data.params.skill = parsedFallback.params.skill;
  }
  
  return [{ json: data }];
} catch(e) {
  return [{ json: parsedFallback }];
}
