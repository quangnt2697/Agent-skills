// ── NODE 4: FORMAT WEB PLAYWRIGHT DISCOVERY / INSPECTION RESPONSE ─
const d = $input.first().json || {};
const probeInfo = d.probeStatus
  ? `probe(${d.issueKeyUrl || d.resolvedUrl})=${d.probeStatus.status || d.probeStatus.reason} -> dùng: ${d.urlSource}`
  : (d.urlSource || '');

const out = {
  issueKey: d.issueKey || '',
  targetPage: d.targetPage || 'home',
  resolvedUrl: d.resolvedUrl || '',
  finalUrl: d.finalUrl || d.resolvedUrl || '',
  pageTitle: d.pageTitle || '',
  urlSource: d.urlSource || '',
  issueKeyUrl: d.issueKeyUrl || '',
  webBaseUrl: d.webBaseUrl || '',
  probeStatus: d.probeStatus || null,
  skipLogin: Boolean(d.skipLogin),
  loginSuccess: Boolean(d.loginSuccess),
  locatorCount: d.locatorCount || 0,
  headings: d.headings || [],
  visibleTextSample: d.visibleTextSample || '',
  consoleErrors: d.consoleErrors || [],
  pageErrors: d.pageErrors || [],
  outputFile: d.outputFile || '',
  screenshotBefore: d.screenshotBefore || '',
  screenshotAfter: d.screenshotAfter || '',
  executedVia: d.executedVia || 'host-bridge',
  success: Boolean(d.success),
  message: d.success
    ? `[WebUILocator] ✅ Đã mở "${d.pageTitle || d.finalUrl || d.resolvedUrl}" (${d.locatorCount || 0} locators cho '${d.targetPage}'${probeInfo ? `, ${probeInfo}` : ''}) -> ${d.outputFile}`
    : `[WebUILocator] ❌ Thất bại: exitCode=${d.exitCode ?? 1} | ${probeInfo} | err=${(d.stderr || (d.errors && d.errors.join('; ')) || '').slice(0, 250)}`,
  errors: d.errors || d.locatorsData?.errors || [],
  capturedAt: d.capturedAt || d.locatorsData?.capturedAt || new Date().toISOString(),
  login_locators: d.login_locators || d.locatorsData?.locators?.login || {},
  page_locators: d.page_locators || (d.locatorsData?.locators?.[d.targetPage] || []).slice(0, 50)
};

return [{ json: out }];
