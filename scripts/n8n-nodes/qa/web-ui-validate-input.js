// ── NODE 1: VALIDATE INPUT & PREPARE WEB PLAYWRIGHT PAYLOAD ─────
const raw = ($input.first().json.body || $input.first().json.params || $input.first().json || {});

const urlOverride = String(raw.urlOverride || raw.url || '').trim();
const rawIssueKey = String(raw.issueKey || (urlOverride ? 'ADHOC-WEB' : '')).toUpperCase().trim();
const targetPage = String(raw.targetPage || 'home').toLowerCase().trim();
const project = String(raw.project || '').trim();

const ISSUE_KEY_RE = /^[A-Z][A-Z0-9_-]{1,63}$/;
if (!rawIssueKey || !ISSUE_KEY_RE.test(rawIssueKey)) {
  return [{
    json: {
      error: '[WebUILocator] Thiếu hoặc sai định dạng tham số bắt buộc: issueKey',
      success: false
    }
  }];
}

if (urlOverride && !/^https?:\/\//i.test(urlOverride)) {
  return [{
    json: {
      error: '[WebUILocator] urlOverride phải bắt đầu bằng http:// hoặc https://',
      issueKey: rawIssueKey,
      targetPage,
      success: false
    }
  }];
}

const issueKeyTemplate = (($env && $env.ISSUE_KEY_URL) || '').replace(/\/$/, '');
const webBaseUrl = (($env && $env.WEB_BASE_URL) || '').replace(/\/$/, '');
const issueKeyUrl = issueKeyTemplate.includes('{issueKey}')
  ? issueKeyTemplate.replace('{issueKey}', rawIssueKey.toLowerCase())
  : issueKeyTemplate;

const tradingUsername = ($env && $env.TRADING_USERNAME) || '';
const tradingPassword = ($env && $env.TRADING_PASSWORD) || '';

// Mặc định HEADLESS = true để tự động chạy ngầm trên Host Bridge không cần xin quyền hay mở cửa sổ
const headless = raw.headless !== undefined
  ? Boolean(raw.headless)
  : String(($env && $env.HEADLESS) || 'true').toLowerCase() !== 'false';
const skipLogin = raw.skipLogin !== undefined
  ? Boolean(raw.skipLogin)
  : Boolean(urlOverride && (!tradingUsername || !tradingPassword));

const slowMo = parseInt(raw.slowMo ?? (($env && $env.SLOW_MO_MS) || '0'), 10) || 0;
const viewportWidth = parseInt(raw.viewportWidth ?? (($env && $env.VIEWPORT_WIDTH) || '1920'), 10) || 1920;
const viewportHeight = parseInt(raw.viewportHeight ?? (($env && $env.VIEWPORT_HEIGHT) || '1080'), 10) || 1080;
const playwrightTimeout = parseInt(raw.playwrightTimeout ?? (($env && $env.PLAYWRIGHT_TIMEOUT_MS) || '30000'), 10) || 30000;

return [{
  json: {
    issueKey: rawIssueKey,
    project,
    targetPage,
    issueKeyUrl,
    webBaseUrl,
    urlOverride,
    skipLogin,
    tradingUsername,
    tradingPassword,
    headless,
    slowMo,
    viewportWidth,
    viewportHeight,
    playwrightTimeout,
    success: true
  }
}];
