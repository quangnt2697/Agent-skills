/**
 * Node Script: CR Filter Diff (`scripts/n8n-nodes/cr/cr-filter-diff.js`)
 *
 * Mục đích (WF-07):
 * - Tiền xử lý (preprocess) git diff thô trước khi đưa vào Agent Code Review (`cr-review-code-and-quality`).
 * - Loại bỏ 100% file rác (lockfiles, minified bundle, sourcemaps, SVG, ảnh, dist/, build/).
 * - Phân nhóm các thay đổi thành 5 tầng kiến trúc (Domain, API, Database, Config, Test).
 * - Áp trần (cap) các file quá lớn (>500 dòng) để chống tràn ngữ cảnh và ảo giác.
 * - KHÔNG gửi Mattermost — trả về diff ngữ nghĩa thuần túy cho agent skill.
 */

const input = $input.first();
const json = (input && input.json) || {};
const body = json.body || json;

const rawDiff = body.rawDiff || body.gitDiffText || body.diff || '';
const maxLinesPerFile = parseInt(body.maxLinesPerFile || '500', 10);

if (!rawDiff || typeof rawDiff !== 'string') {
  return [{
    json: {
      isError: true,
      message: 'Không tìm thấy nội dung git diff thô (rawDiff).',
      filteredDiff: '',
      summary: { totalFiles: 0, additions: 0, deletions: 0 }
    }
  }];
}

// 1. Danh sách mẫu file rác (Denylist patterns)
const NOISE_PATTERNS = [
  /package-lock\.json$/i,
  /pnpm-lock\.yaml$/i,
  /yarn\.lock$/i,
  /poetry\.lock$/i,
  /Cargo\.lock$/i,
  /Gemfile\.lock$/i,
  /\.min\.(js|css)$/i,
  /\.map$/i,
  /\.(svg|png|jpg|jpeg|gif|webp|ico)$/i,
  /\.(woff|woff2|eot|ttf|otf)$/i,
  /\.(mp3|mp4|wav|webm)$/i,
  /\.(pdf|zip|tar|gz)$/i,
  /(^|\/)(dist|build|out|\.next|\.nuxt|coverage|\.turbo)\//i
];

function isNoiseFile(filePath) {
  if (!filePath) return false;
  return NOISE_PATTERNS.some(pattern => pattern.test(filePath));
}

// 2. Phân loại file theo tầng kiến trúc
function classifyFile(filePath) {
  const p = filePath.toLowerCase();
  if (p.includes('test') || p.includes('spec') || p.includes('__tests__') || p.endsWith('_test.go') || p.endsWith('_test.py')) {
    return 'tests';
  }
  if (p.includes('migration') || p.includes('schema') || p.includes('entity') || p.includes('model') || p.includes('repository') || p.includes('dao') || p.endsWith('.sql')) {
    return 'database_migrations';
  }
  if (p.includes('api') || p.includes('controller') || p.includes('route') || p.includes('handler') || p.includes('endpoint') || p.includes('grpc')) {
    return 'api_endpoints';
  }
  if (p.includes('docker') || p.includes('k8s') || p.includes('.env') || p.includes('config') || p.endsWith('.yaml') || p.endsWith('.yml') || p.endsWith('.toml')) {
    return 'config_infra';
  }
  if (p.includes('service') || p.includes('domain') || p.includes('core') || p.includes('logic') || p.includes('usecase') || p.includes('util') || p.includes('lib')) {
    return 'core_domain';
  }
  return 'other';
}

// 3. Tách diff thành các file chunks
const fileChunks = rawDiff.split(/^diff --git /m);
if (fileChunks.length > 0 && !fileChunks[0].trim()) {
  fileChunks.shift(); // Bỏ phần rỗng đầu tiên
}

let totalAdditions = 0;
let totalDeletions = 0;
let filteredCount = 0;
let keptCount = 0;

const categorized = {
  core_domain: [],
  api_endpoints: [],
  database_migrations: [],
  config_infra: [],
  tests: [],
  other: []
};

const processedDiffParts = [];

for (const rawChunk of fileChunks) {
  const fullChunk = 'diff --git ' + rawChunk;
  const lines = fullChunk.split('\n');
  const headerLine = lines[0] || '';

  // Bóc tách tên file: diff --git a/path/to/file b/path/to/file
  const pathMatch = headerLine.match(/a\/(.+?)\s+b\/(.+?)$/);
  const filePath = pathMatch ? pathMatch[2] : (headerLine.split(' ').pop() || 'unknown');

  // Kiểm tra blacklist rác
  if (isNoiseFile(filePath)) {
    filteredCount++;
    continue;
  }

  // Đếm additions / deletions
  let adds = 0;
  let dels = 0;
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) adds++;
    if (line.startsWith('-') && !line.startsWith('---')) dels++;
  }

  totalAdditions += adds;
  totalDeletions += dels;
  keptCount++;

  const category = classifyFile(filePath);

  // Áp trần dung lượng nếu file thay đổi quá lớn (>maxLinesPerFile)
  let finalChunk = fullChunk;
  let isTruncated = false;

  if (lines.length > maxLinesPerFile) {
    isTruncated = true;
    const MAX_PREVIEW_LINES = 100;
    const keptLines = lines.slice(0, MAX_PREVIEW_LINES);
    finalChunk = keptLines.join('\n') + `\n\n... [Đã rút gọn: File có ${lines.length} dòng diff (+${adds}/-${dels}), chỉ hiển thị ${MAX_PREVIEW_LINES} dòng đầu] ...\n`;
  }

  const fileItem = {
    filePath,
    category,
    additions: adds,
    deletions: dels,
    totalChanges: adds + dels,
    isTruncated
  };

  categorized[category].push(fileItem);
  processedDiffParts.push(finalChunk);
}

const cleanedDiffText = processedDiffParts.join('\n\n');

// 4. Tính toán độ rủi ro (Risk Score)
let riskLevel = 'LOW';
if (totalAdditions + totalDeletions > 1000 || keptCount > 20) {
  riskLevel = 'HIGH';
} else if (totalAdditions + totalDeletions > 300 || keptCount > 8) {
  riskLevel = 'MEDIUM';
}

return [{
  json: {
    isError: false,
    summary: {
      totalFilesScanned: fileChunks.length,
      filesKept: keptCount,
      filesFilteredNoise: filteredCount,
      totalAdditions,
      totalDeletions,
      riskLevel,
      tokenSavingsEstimatedPct: fileChunks.length > 0 ? Math.round((filteredCount / fileChunks.length) * 100) : 0
    },
    categorizedFiles: categorized,
    cleanedDiffText
  }
}];
