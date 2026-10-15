#!/usr/bin/env node
/**
 * Unified QA Validator (`scripts/qa/qa-validate.js`)
 *
 * Hợp nhất toàn diện các bộ kiểm tra của QA:
 *   1. Gherkin Syntactic & Structural Rules (từ qa-validate.sh)
 *   2. Traceability giữa Checklist và Feature (@CL-*, @CHK-*, @AC-*)
 *   3. Data Grounding Policy (G1 & G2 rules, data-grounding.json)
 *
 * Sử dụng:
 *   node scripts/qa/qa-validate.js <feature-file-hoặc-thư-mục>
 *   node scripts/qa/qa-validate.js --checklist <checklist.md> <feature-file>
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let checklistPath = '';
let targetPath = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--checklist') {
    checklistPath = args[i + 1] || '';
    i++;
  } else if (!targetPath) {
    targetPath = args[i];
  }
}

if (!targetPath) {
  console.error('Usage: node qa-validate.js [--checklist <checklist.md>] <feature-file-or-dir>');
  process.exit(1);
}

// Thu thập danh sách file .feature
function collectFeatureFiles(src) {
  if (!fs.existsSync(src)) return [];
  const stat = fs.statSync(src);
  if (stat.isFile()) {
    return src.endsWith('.feature') ? [src] : [];
  }
  const results = [];
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(src, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
      results.push(...collectFeatureFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.feature')) {
      results.push(full);
    }
  }
  return results.sort();
}

const featureFiles = collectFeatureFiles(targetPath);
if (featureFiles.length === 0) {
  console.error(`No .feature files found at: ${targetPath}`);
  console.log(JSON.stringify({ status: 'error', message: 'No .feature files found', path: targetPath }));
  process.exit(1);
}

const report = {
  status: 'pass',
  filesChecked: featureFiles.length,
  failures: [],
  warnings: []
};

// 1. Kiểm tra Traceability nếu có checklist
let checklistSet = null;
let acSet = new Set();
if (checklistPath && fs.existsSync(checklistPath)) {
  try {
    const clContent = fs.readFileSync(checklistPath, 'utf8');
    const matches = clContent.match(/\b(CL|CHK|AC)-\d+(?:\.\d+)?\b/g) || [];
    checklistSet = new Set(matches);
    const acMatches = clContent.match(/\bAC-\d+(?:\.\d+)?\b/g) || [];
    acSet = new Set(acMatches);
  } catch (err) {
    report.failures.push({ rule: 'checklist-read', message: `Cannot read checklist: ${err.message}` });
  }
}

// 2. Validate từng file .feature
for (const file of featureFiles) {
  let content = '';
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch (e) {
    report.failures.push({ file, rule: 'file-read', message: e.message });
    continue;
  }

  const lines = content.split('\n');

  // Rule 1: Exactly one Feature: block (enforced on full feature files)
  const featureLines = lines.filter((l) => /^\s*Feature:/.test(l));
  if (featureLines.length > 1) {
    report.failures.push({ file, rule: 'single-feature', message: `Multiple Feature: blocks found (${featureLines.length})` });
  } else if (featureLines.length === 0 && !checklistPath) {
    report.failures.push({ file, rule: 'single-feature', message: 'No Feature: block found' });
  }

  // Rule 2: Feature block has at least one tag
  let featureHasTag = false;
  if (featureLines.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*Feature:/.test(lines[i])) {
        for (let j = i - 1; j >= 0; j--) {
          const prev = lines[j].trim();
          if (prev.startsWith('@')) {
            featureHasTag = true;
            break;
          } else if (prev !== '' && !prev.startsWith('#')) {
            break;
          }
        }
        break;
      }
    }
    if (!featureHasTag) {
      report.failures.push({ file, rule: 'feature-tag', message: 'Feature block has no tags' });
    }
  }

  // Phân tích Scenarios
  let currentScenario = null;
  const scenarios = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (/^\s*(Scenario|Scenario Outline):/.test(line)) {
      let j = i - 1;
      const tags = [];
      let hasDataAssumed = false;

      while (j >= 0) {
        const prevLine = lines[j].trim();
        if (prevLine.startsWith('@')) {
          tags.push(...prevLine.split(/\s+/).filter((t) => t.startsWith('@')));
        } else if (prevLine.startsWith('#')) {
          if (prevLine.includes('[DATA-ASSUMED]')) hasDataAssumed = true;
        } else if (prevLine !== '') {
          break;
        }
        j--;
      }

      currentScenario = {
        name: line,
        lineNum: i + 1,
        tags,
        hasDataAssumed,
        steps: [],
        stepOrder: [],
        rawText: line + '\n'
      };
      scenarios.push(currentScenario);
    } else if (currentScenario) {
      if (line.startsWith('#') && line.includes('[DATA-ASSUMED]')) {
        currentScenario.hasDataAssumed = true;
      }
      currentScenario.rawText += line + '\n';

      const stepMatch = line.match(/^(Given|When|Then|And|But)\s+(.*)/);
      if (stepMatch) {
        const kw = stepMatch[1];
        const stepText = stepMatch[2];
        currentScenario.steps.push({ kw, text: stepText, lineNum: i + 1 });
        currentScenario.stepOrder.push(kw === 'And' || kw === 'But' ? (currentScenario.stepOrder[currentScenario.stepOrder.length - 1] || kw) : kw);

        // Rule 6: No automation mechanics
        if (/[.#][a-zA-Z0-9_-]+\[.*?\]|\[data-testid=|\/\/[a-zA-Z0-9]+|\b(SELECT|INSERT INTO|UPDATE\s+\w+\s+SET)\b/i.test(stepText)) {
          report.failures.push({
            file,
            rule: 'no-automation-mechanics',
            message: `Line ${i + 1}: Step contains automation mechanics (CSS/XPath/SQL): '${stepText}'`
          });
        }
      }
    }
  }

  for (const sc of scenarios) {
    // Rule 3: Every Scenario has at least one tag
    if (sc.tags.length === 0) {
      report.failures.push({ file, rule: 'scenario-tag', message: `Scenario at line ${sc.lineNum} has no tags: '${sc.name}'` });
    }

    // Rule 4: Step count <= 10
    if (sc.steps.length > 10) {
      report.failures.push({
        file,
        rule: 'step-count',
        message: `Scenario '${sc.name}' exceeds 10 steps (${sc.steps.length} steps)`
      });
    }

    // Rule 5: Given -> When -> Then order (no Given after Then)
    let seenThen = false;
    for (const kw of sc.stepOrder) {
      if (kw === 'Then') seenThen = true;
      if (seenThen && kw === 'Given') {
        report.failures.push({
          file,
          rule: 'step-order',
          message: `Scenario '${sc.name}' has 'Given' step after 'Then'`
        });
        break;
      }
    }

    // Multi-symbol Parameterization & Examples table check
    const isOutline = /^\s*Scenario Outline:/.test(sc.name);
    if (isOutline) {
      if (!sc.rawText.includes('Examples:')) {
        report.failures.push({
          file,
          rule: 'missing-examples',
          message: `Scenario Outline '${sc.name}' is missing an Examples: table`
        });
      }
    } else {
      const exchangeMatches = sc.rawText.match(/\b(HOSE|HNX|UPCoM|Phái\s*sinh)\b/gi) || [];
      const uniqueExchanges = new Set(exchangeMatches.map((e) => e.toUpperCase()));
      if (uniqueExchanges.size >= 2 || sc.tags.some((t) => t.toLowerCase().includes('multi-symbol') || t.toLowerCase().includes('multi-board'))) {
        report.failures.push({
          file,
          rule: 'multi-symbol-parameterization',
          message: `Scenario '${sc.name}' tests multiple exchanges/symbols (${[...uniqueExchanges].join(', ')}) but is not a Scenario Outline. Per AGENTS.md rule, must use Scenario Outline with an Examples table.`
        });
      }
    }

    // Traceability to checklist if provided
    if (checklistSet) {
      for (const t of sc.tags) {
        const cleanTag = t.replace(/^@/, '');
        if (/^(CL|CHK|AC)-\d+(?:\.\d+)?$/.test(cleanTag) && !checklistSet.has(cleanTag)) {
          report.failures.push({
            file,
            rule: 'traceability',
            message: `Tag @${cleanTag} in '${sc.name}' not found in checklist`
          });
        }
      }
    }
  }

  // Minimum Coverage Rule (Hard Gate):
  // Mỗi mục Acceptance Criteria (AC) trong checklist/spec bắt buộc phải ánh xạ tới tối thiểu 3 kịch bản:
  // ít nhất 1 @happy-path, 1 @negative, và 1 @boundary (hoặc @bva / @edge-case / @edge).
  if (acSet.size > 0) {
    for (const acId of acSet) {
      const mappedScenarios = scenarios.filter((sc) =>
        sc.tags.some((t) => t.replace(/^@/, '') === acId) ||
        sc.name.includes(acId)
      );

      if (mappedScenarios.length === 0) {
        report.failures.push({
          file,
          rule: 'minimum-coverage',
          message: `Acceptance Criteria '${acId}' has no mapped scenarios in feature file (missing @${acId} tag)`
        });
        continue;
      }

      const allTags = mappedScenarios.flatMap((sc) => sc.tags.map((t) => t.toLowerCase()));
      const hasHappy = allTags.some((t) => t.includes('happy-path') || t.includes('happy_path') || t.includes('happy'));
      const hasNegative = allTags.some((t) => t.includes('negative'));
      const hasBoundary = allTags.some((t) => t.includes('boundary') || t.includes('bva') || t.includes('edge'));

      const missing = [];
      if (!hasHappy) missing.push('@happy-path');
      if (!hasNegative) missing.push('@negative');
      if (!hasBoundary) missing.push('@boundary/@bva');

      if (missing.length > 0) {
        report.failures.push({
          file,
          rule: 'minimum-coverage',
          message: `Acceptance Criteria '${acId}' lacks 3-tier coverage: missing ${missing.join(', ')} (requires ≥1 @happy-path, ≥1 @negative, ≥1 @boundary/@bva)`
        });
      }
    }
  }

  // Data Grounding Check (G1 & G2)
  const featureDir = path.dirname(file);
  const groundingPath = path.join(featureDir, 'fixtures', 'data-grounding.json');
  let groundingData = null;
  if (fs.existsSync(groundingPath)) {
    try {
      groundingData = JSON.parse(fs.readFileSync(groundingPath, 'utf8'));
    } catch {
      report.failures.push({ file, rule: 'G1', message: `Invalid JSON in ${groundingPath}` });
    }
  }

  for (const sc of scenarios) {
    const isHappyPath = sc.tags.includes('@happy-path');
    if (isHappyPath && !sc.hasDataAssumed) {
      if (!groundingData) {
        report.failures.push({
          file,
          rule: 'G1',
          message: `Missing data-grounding.json and no [DATA-ASSUMED] comment for happy-path scenario: '${sc.name}'`
        });
      } else {
        const preconditions = groundingData.items?.filter((it) => it.kind === 'precondition' && it.verified === true) || [];
        const hasVerified = preconditions.some((it) => sc.rawText.includes(it.value));
        if (!hasVerified && preconditions.length > 0) {
          report.failures.push({
            file,
            rule: 'G1',
            message: `Scenario '${sc.name}' lacks verified precondition from data-grounding.json and missing [DATA-ASSUMED]`
          });
        }
      }
    }
  }

  // G2 Warning
  const thenStepsWithNumbers = content.match(/^\s*Then.*?\d+.*?$/gm) || [];
  if (thenStepsWithNumbers.length > 0) {
    if (!groundingData) {
      report.warnings.push({ file, rule: 'G2', message: 'Then steps contain numbers but data-grounding.json is missing.' });
    } else {
      const expected = groundingData.items?.filter((it) => it.kind === 'expected') || [];
      if (expected.length === 0) {
        report.warnings.push({ file, rule: 'G2', message: "Then steps contain numbers but data-grounding.json has no 'expected' items." });
      }
    }
  }
}

if (report.failures.length > 0) {
  report.status = 'fail';
}

console.log(JSON.stringify(report, null, 2));

if (report.status === 'fail') {
  process.exit(1);
}
