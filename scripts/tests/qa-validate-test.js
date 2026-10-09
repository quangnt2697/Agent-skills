import test from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('qa-validate.js', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-validate-test-'));
  const testDir = path.join(tmpDir, 'test');
  fs.mkdirSync(testDir, { recursive: true });
  const fixturesDir = path.join(testDir, 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });

  const scriptPath = path.resolve('scripts/qa/qa-validate.js');

  const runValidate = (checklist, feature, grounding = null) => {
    const checklistPath = path.join(testDir, 'checklist.md');
    const featurePath = path.join(testDir, 'test.feature');
    const groundingPath = path.join(fixturesDir, 'data-grounding.json');
    
    fs.writeFileSync(checklistPath, checklist);
    fs.writeFileSync(featurePath, feature);
    
    if (grounding) {
      fs.writeFileSync(groundingPath, typeof grounding === 'string' ? grounding : JSON.stringify(grounding));
    } else {
      if (fs.existsSync(groundingPath)) fs.unlinkSync(groundingPath);
    }

    try {
      const out = execSync(`node ${scriptPath} --checklist ${checklistPath} ${featurePath}`, { encoding: 'utf8' });
      return JSON.parse(out);
    } catch (err) {
      if (err.stdout) return JSON.parse(err.stdout);
      throw err;
    }
  };

  await t.test('passes when all rules are satisfied', () => {
    const checklist = `- [P0] CL-001 test`;
    const feature = `@happy-path @CL-001\nScenario: test\nGiven "0001170086"\nThen no numbers`;
    const grounding = {
      items: [{ kind: 'precondition', verified: true, value: '0001170086' }]
    };
    const res = runValidate(checklist, feature, grounding);
    assert.strictEqual(res.status, 'pass');
    assert.strictEqual(res.failures.length, 0);
  });

  await t.test('fails traceability when @CL tag missing from checklist', () => {
    const checklist = `- [P0] CL-001 test`;
    const feature = `@CL-002\nScenario: test\nThen no numbers`;
    const res = runValidate(checklist, feature, null);
    assert.strictEqual(res.status, 'fail');
    assert.strictEqual(res.failures[0].rule, 'traceability');
  });

  await t.test('fails G1 when happy-path missing grounding and [DATA-ASSUMED]', () => {
    const checklist = `- [P0] CL-001 test`;
    const feature = `@happy-path @CL-001\nScenario: test\nGiven "123"`;
    const res = runValidate(checklist, feature, null); // No grounding file
    assert.strictEqual(res.status, 'fail');
    assert.ok(res.failures.some(f => f.rule === 'G1'));
  });

  await t.test('passes G1 when happy-path missing grounding but has [DATA-ASSUMED]', () => {
    const checklist = `- [P0] CL-001 test`;
    const feature = `# [DATA-ASSUMED]\n@happy-path @CL-001\nScenario: test\nGiven "123"`;
    const res = runValidate(checklist, feature, null);
    assert.strictEqual(res.status, 'pass');
  });

  await t.test('fails G1 when happy-path has grounding file but no verified data matches and no [DATA-ASSUMED]', () => {
    const checklist = `- [P0] CL-001 test`;
    const feature = `@happy-path @CL-001\nScenario: test\nGiven "123"`;
    const grounding = {
      items: [{ kind: 'precondition', verified: true, value: '0001170086' }] // "123" not here
    };
    const res = runValidate(checklist, feature, grounding);
    assert.strictEqual(res.status, 'fail');
    assert.ok(res.failures.some(f => f.rule === 'G1'));
  });

  await t.test('warnings G2 when Then step has numbers but no expected kind in grounding', () => {
    const checklist = `- [P0] CL-001 test`;
    const feature = `@CL-001\nScenario: test\nThen API returns 200`;
    const res = runValidate(checklist, feature, null);
    // Status is pass because G2 is just a warning
    assert.strictEqual(res.status, 'pass');
    assert.ok(res.warnings.some(w => w.rule === 'G2'));
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
