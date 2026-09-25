/**
 * Node Script: Security Digest Engine (`scripts/n8n-nodes/security/security-digest-engine.js`)
 *
 * Mục đích (WF-08):
 * - Phân tích kết quả quét phụ thuộc (Dependency Audit: `npm audit --json`) và quét secret rò rỉ.
 * - Lọc bỏ các cảnh báo Low / Moderate, chỉ tập trung trích xuất High và Critical CVEs theo chuẩn OWASP.
 * - Phát hiện các token nhạy cảm bị hardcode (Atlassian Token, GitLab PAT, Private Key, Passwords).
 * - KHÔNG gửi Mattermost — trả về trực tiếp cho `security-code-audit` và `dev-security`.
 */

const input = $input.first();
const json = (input && input.json) || {};
const body = json.body || json;

// 1. Phân tích kết quả npm audit
let auditJson = null;
if (body.auditOutput) {
  try {
    auditJson = typeof body.auditOutput === 'string' ? JSON.parse(body.auditOutput) : body.auditOutput;
  } catch (e) {
    auditJson = null;
  }
} else if (json.vulnerabilities || json.metadata) {
  auditJson = json;
}

const highCriticalVulnerabilities = [];
let totalVulnsCount = 0;
let highCount = 0;
let criticalCount = 0;

if (auditJson && auditJson.vulnerabilities) {
  for (const [pkgName, vuln] of Object.entries(auditJson.vulnerabilities)) {
    const severity = (vuln.severity || '').toLowerCase();
    totalVulnsCount++;

    if (severity === 'high' || severity === 'critical') {
      if (severity === 'high') highCount++;
      if (severity === 'critical') criticalCount++;

      const via = Array.isArray(vuln.via) ? vuln.via : [];
      const cves = via.map(v => (typeof v === 'object' ? v.url || v.name || v.title : v)).filter(Boolean);

      highCriticalVulnerabilities.push({
        package: pkgName,
        severity: severity.toUpperCase(),
        range: vuln.range || '',
        fixAvailable: Boolean(vuln.fixAvailable),
        fixRecommendation: typeof vuln.fixAvailable === 'object' ? `${vuln.fixAvailable.name}@${vuln.fixAvailable.version}` : (vuln.fixAvailable ? 'Có bản vá tự động' : 'Cần can thiệp thủ công'),
        details: cves
      });
    }
  }
}

// 2. Phân tích quét Secrets rò rỉ từ text hoặc scanOutput
const rawCodeOrDiff = body.scanContent || body.rawCode || '';
const detectedSecrets = [];

const SECRET_PATTERNS = [
  { name: 'Atlassian API Token', regex: /ATLASSIAN_API_TOKEN\s*=\s*['"]?[A-Za-z0-9_\-]{24,}['"]?/gi },
  { name: 'GitLab Personal Access Token', regex: /glpat-[A-Za-z0-9_\-]{20,}/gi },
  { name: 'AWS Access Key ID', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gi },
  { name: 'Hardcoded DB Password', regex: /(?:password|passwd|pwd)\s*[:=]\s*['"][a-zA-Z0-9@#$%^&*()_+]{8,}['"]/gi }
];

if (rawCodeOrDiff && typeof rawCodeOrDiff === 'string') {
  for (const pat of SECRET_PATTERNS) {
    const matches = rawCodeOrDiff.match(pat.regex);
    if (matches && matches.length > 0) {
      detectedSecrets.push({
        type: pat.name,
        occurrences: matches.length,
        sampleMasked: matches[0].slice(0, 8) + '...' + matches[0].slice(-4)
      });
    }
  }
}

// 3. Đánh giá trạng thái bảo mật (Security Gate Status)
let securityStatus = 'PASSED';
let blockReason = '';

if (criticalCount > 0) {
  securityStatus = 'BLOCKED';
  blockReason = `Phát hiện ${criticalCount} lỗ hổng bảo mật mức CRITICAL cần khắc phục ngay lập tức.`;
} else if (detectedSecrets.length > 0) {
  securityStatus = 'BLOCKED';
  blockReason = `Phát hiện ${detectedSecrets.length} mẫu secret / token bị hardcode trong mã nguồn.`;
} else if (highCount > 0) {
  securityStatus = 'WARNING';
  blockReason = `Phát hiện ${highCount} lỗ hổng bảo mật mức HIGH, khuyến nghị nâng cấp thư viện phụ thuộc.`;
}

// 4. Tạo Scorecard Markdown tóm tắt
let scorecardMd = `### 🛡️ [Security Audit Digest] Trạng Thái: **${securityStatus}**\n`;
scorecardMd += `- **Lỗ hổng nghiêm trọng:** Critical: \`${criticalCount}\` | High: \`${highCount}\` | Tổng số scan: \`${totalVulnsCount}\`\n`;
scorecardMd += `- **Secret rò rỉ:** \`${detectedSecrets.length}\` phát hiện\n\n`;

if (highCriticalVulnerabilities.length > 0) {
  scorecardMd += `| Gói Phụ Thuộc | Mức Độ | Bản Vá Đề Xuất |\n|---|:---:|---|\n`;
  for (const v of highCriticalVulnerabilities) {
    scorecardMd += `| \`${v.package}\` | **${v.severity}** | ${v.fixRecommendation} |\n`;
  }
  scorecardMd += '\n';
}

if (detectedSecrets.length > 0) {
  scorecardMd += `> ⚠️ **Cảnh báo Secret rò rỉ:**\n`;
  for (const s of detectedSecrets) {
    scorecardMd += `> - ${s.type}: \`${s.sampleMasked}\` (${s.occurrences} vị trí)\n`;
  }
}

return [{
  json: {
    isError: false,
    securityStatus,
    blockReason,
    metrics: {
      criticalCount,
      highCount,
      totalVulnsCount,
      secretsDetectedCount: detectedSecrets.length
    },
    vulnerabilities: highCriticalVulnerabilities,
    detectedSecrets,
    scorecardMarkdown: scorecardMd
  }
}];
