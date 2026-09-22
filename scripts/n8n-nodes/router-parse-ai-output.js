const input = $input.first();
const response = (input && input.json) || {};
const webhookJson = $('Webhook (Mattermost Slash Command)').first()?.json || {};
const webhookBody = webhookJson.body || webhookJson;
const originalText = webhookBody.text || '';
const userName = webhookBody.user_name || webhookBody.userName || 'User';

function buildAckMessage(intent, params, rawText) {
  if (intent === 'help') return '';
  const intentDescriptions = {
    'run-test': `chạy kiểm thử tự động (Pytest) cho ${params?.project ? ('`' + params.project + '` / ') : ''}ticket **${params?.issueKey || 'được yêu cầu'}**`,
    'standup': 'tổng hợp báo cáo **Daily Standup Sprint** và phân tích impediments (>3 ngày)',
    'recon': 'đối chiếu dữ liệu thị trường **KRX MDDS TimescaleDB** (Ticks v3)',
    'jira': `tra cứu thông tin vé Jira **${params?.issueKey || ''}** và kiểm tra trạng thái spec local`,
    'sync': `đồng bộ mã nguồn mới nhất cho ${params?.project ? ('repo `' + params.project + '`') : 'toàn bộ group microservices'}`,
    'squash': `đẩy kịch bản BDD Gherkin (.feature) lên **Squash TM** và gán vào Campaign Test Plan cho ticket **${params?.issueKey || 'được yêu cầu'}** (Project: \`${params?.project || 'tự động phát hiện'}\`)`,
    'push-jira': `tìm kiếm file spec local và đẩy lên Jira Description cho ticket **${params?.issueKey || 'được yêu cầu'}** (Project: \`${params?.project || 'tự động phát hiện'}\`)`,
    'query': `truy vấn dữ liệu Metabase ${params?.database ? ('(`' + params.database.toUpperCase() + '`)') : ''}: *"${params?.userQuestion || (params?.query ? params.query.slice(0, 60) + '...' : 'Truy vấn Metabase')}"*`
  };

  const actionText = intentDescriptions[intent] || 'thực thi tác vụ';
  let cleanCmd = (rawText || '').trim();
  cleanCmd = cleanCmd.replace(/^(\/?agent\s*)+/i, '').trim();

  return `⏳ **[Agent System]** Đã tiếp nhận lệnh \`/agent ${cleanCmd}\`.\n> ⚙️ Hệ thống đang tiến hành **${actionText}** ...`;
}

// ── Hàm bóc tách lệnh thủ công (Fallback & Deterministic Engine) ──
function parseCommand(text) {
  let clean = (text || '').trim();
  // Loại bỏ các tiền tố /agent hoặc agent dư thừa
  clean = clean.replace(/^(\/?agent\s*)+/i, '').trim();

  if (!clean) return { intent: 'help', params: { project: '', skill: '', issueKey: '' } };

  // Chuẩn hóa cú pháp multi-word thông dụng: get jira / info jira / push jira / push squash / run test
  clean = clean.replace(/\b(get|info|push)\s+jira\b/gi, '$1-jira');
  clean = clean.replace(/\b(push)\s+squash\b/gi, '$1-squash');
  clean = clean.replace(/\b(run)\s+test\b/gi, '$1-test');

  // 0. Nhận diện intent query (SQL hoặc ngôn ngữ tự nhiên)
  const queryPrefixMatch = clean.match(/^(query|sql|db)\s+(.*)$/i);
  if (queryPrefixMatch) {
    const subQuery = queryPrefixMatch[2].trim();
    let db = 'openapi';
    let sql = '';
    
    const accMatch = subQuery.match(/^(account|tk|tiểu khoản)\s+([0-9A-Za-z]+)/i);
    const balMatch = subQuery.match(/^(balance|sodu|số dư)\s+([0-9A-Za-z]+)/i);
    const ordMatch = subQuery.match(/^(order|lệnh)\s+([0-9A-Za-z]+)/i);
    const vaMatch = subQuery.match(/^(va|virtual)\s+([0-9A-Za-z]+)/i);
    const tickMatch = subQuery.match(/^(ticks|gia|giá)\s+([A-Za-z]{3})/i);

    if (accMatch) {
      sql = `SELECT * FROM accounts WHERE account_no = '${accMatch[2]}' LIMIT 5`;
    } else if (balMatch) {
      sql = `SELECT account_no, status, available_cash, hold_amount FROM accounts WHERE account_no = '${balMatch[2]}' LIMIT 1`;
    } else if (ordMatch) {
      sql = `SELECT order_id, account_no, symbol, volume, price, status, side, created_at FROM orders WHERE account_no = '${ordMatch[2]}' OR order_id = '${ordMatch[2]}' ORDER BY created_at DESC LIMIT 5`;
    } else if (vaMatch) {
      sql = `SELECT * FROM virtual_accounts WHERE investor_account_id = '${vaMatch[2]}' OR account_number = '${vaMatch[2]}' LIMIT 5`;
    } else if (tickMatch) {
      db = 'timescale';
      sql = `SELECT sending_time, symbol, price, volume, match_type FROM mdds_ticks_v3 WHERE symbol = '${tickMatch[2].toUpperCase()}' ORDER BY sending_time DESC LIMIT 10`;
    } else if (/^select\b/i.test(subQuery)) {
      sql = subQuery;
      if (/mdds_|ohlc/i.test(sql)) db = 'timescale';
    } else {
      const numMatch = subQuery.match(/\b(\d{8,12})\b/);
      if (numMatch) {
        sql = `SELECT account_no, status, available_cash, hold_amount FROM accounts WHERE account_no = '${numMatch[1]}' LIMIT 1`;
      } else {
        sql = `SELECT * FROM accounts LIMIT 5`;
      }
    }

    return {
      intent: 'query',
      params: {
        database: db,
        query: sql,
        userQuestion: subQuery
      }
    };
  }

  // 1. Tìm issueKey (pattern: ABC-1234)
  const issueKeyMatch = clean.match(/\b([A-Za-z0-9]+-[0-9]+)\b/i);
  const issueKey = issueKeyMatch ? issueKeyMatch[1].toUpperCase() : '';

  let remainder = clean;
  if (issueKeyMatch) {
    remainder = remainder.replace(issueKeyMatch[0], ' ').trim();
  }

  const tokens = remainder.split(/\s+/).filter(Boolean);

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

    // Jira / BA (Tra cứu thông tin vé & spec local)
    'jira': 'jira',
    'get-jira': 'jira',
    'get_jira': 'jira',
    'getjira': 'jira',
    'info-jira': 'jira',
    'info_jira': 'jira',
    'infojira': 'jira',
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
    'push-squash': 'squash',
    'push_squash': 'squash',
    'pushsquash': 'squash',

    // Push Jira Spec
    'push-jira': 'push-jira',
    'push_jira': 'push-jira',
    'pushjira': 'push-jira',
    'push-spec': 'push-jira',

    // Query
    'query': 'query',
    'sql': 'query',
    'db': 'query',

    // Help
    'help': 'help'
  };

  let detectedIntent = null;
  let detectedSkill = '';
  let project = '';

  // Tìm skill trên toàn bộ các tokens
  const skillIdx = tokens.findIndex(t => skillIntentMap[t.toLowerCase()]);
  if (skillIdx !== -1) {
    detectedSkill = tokens[skillIdx];
    detectedIntent = skillIntentMap[detectedSkill.toLowerCase()];
    // Các tokens còn lại là project
    const otherTokens = tokens.filter((_, idx) => idx !== skillIdx);
    if (otherTokens.length > 0) {
      project = otherTokens[0];
    }
  }

  // Fallback nếu không khớp token trực tiếp
  if (!detectedIntent) {
    const lower = clean.toLowerCase();
    if (lower.includes('push-jira') || lower.includes('push_jira') || lower.includes('push-spec')) {
      detectedIntent = 'push-jira';
    } else if (lower.includes('push-squash') || lower.includes('push_squash') || lower.includes('squash')) {
      detectedIntent = 'squash';
    } else if (lower.includes('run-test') || lower.includes('test') || lower.includes('kiểm thử') || lower.includes('kiemthu')) {
      detectedIntent = 'run-test';
    } else if (lower.includes('standup') || lower.includes('daily') || lower.includes('sprint')) {
      detectedIntent = 'standup';
    } else if (lower.includes('recon') || lower.includes('watchdog') || lower.includes('reconcile')) {
      detectedIntent = 'recon';
    } else if (lower.includes('sync') || lower.includes('pull')) {
      detectedIntent = 'sync';
    } else if (lower.startsWith('select ') || lower.includes('tra cứu') || lower.includes('tìm tài khoản')) {
      detectedIntent = 'query';
    } else if (lower.includes('get-jira') || lower.includes('info-jira') || lower.includes('jira') || lower.includes('ba-spec') || issueKey) {
      detectedIntent = 'jira';
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

// Nếu Gemini API gặp lỗi hoặc không khả dụng
if (response.error || (response.status && response.status >= 400)) {
  const ackMessage = buildAckMessage(parsedFallback.intent, parsedFallback.params, originalText, userName);
  return [{
    json: {
      ...parsedFallback,
      userName: userName,
      originalCommand: originalText,
      ackMessage: ackMessage,
      _geminiError: response.error?.message || 'Lỗi Gemini API'
    }
  }];
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
  
  const validIntents = ['standup', 'run-test', 'recon', 'jira', 'squash', 'sync', 'push-jira', 'query', 'help'];
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
  if (!data.params.query && parsedFallback.params?.query) {
    data.params.query = parsedFallback.params.query;
    data.params.database = parsedFallback.params.database || 'openapi';
    data.params.userQuestion = parsedFallback.params.userQuestion || originalText;
  }
  
  const ackMessage = buildAckMessage(data.intent, data.params, originalText, userName);
  return [{
    json: {
      ...data,
      userName: userName,
      originalCommand: originalText,
      ackMessage: ackMessage
    }
  }];
} catch(e) {
  const ackMessage = buildAckMessage(parsedFallback.intent, parsedFallback.params, originalText, userName);
  return [{
    json: {
      ...parsedFallback,
      userName: userName,
      originalCommand: originalText,
      ackMessage: ackMessage
    }
  }];
}
