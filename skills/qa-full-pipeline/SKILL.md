---
name: qa-full-pipeline
description: Chạy full QA pipeline từ test design đến test execution trong 1 lệnh. Orchestrate qa-test-design → qa-auto-design → qa-run-test với auto-approve mode, confidence gating, resume capability, và comprehensive reporting. Sử dụng khi cần workflow tự động end-to-end cho QA.
---

# QA Full Pipeline

## Tổng quan

Orchestrate toàn bộ QA workflow từ test design đến test execution trong 1 lệnh duy nhất. Skill này **KHÔNG viết code test trực tiếp** — nó gọi các skills con (qa-test-design, qa-auto-design, qa-run-test) theo đúng thứ tự với error handling và gating logic.

## Khi nào sử dụng

- Cần chạy full QA workflow tự động (từ spec đến report)
- Regression testing sau mỗi sprint
- CI/CD pipeline integration
- Onboarding: Demo toàn bộ QA process
- Muốn giảm context switches (1 command thay vì 3-4)

**Khi KHÔNG sử dụng:**
- Chỉ cần thiết kế test (không cần automation) → dùng `qa-test-design`
- Đã có test code, chỉ cần chạy → dùng `qa-run-test`
- Cần control chi tiết từng phase → chạy skills riêng lẻ

## Quy trình 4 Phases

```
Phase 0: Validation (Pre-flight)
         └─ Check *-final.md exists from BA/PO

Phase 1: Test Design (qa-test-design)
         ├─ Generate Checklist
         ├─ [GATE] User approval (skip if --auto)
         ├─ Generate Gherkin (.feature files)
         └─ Auto-push to Squash TM (if configured)

[DECISION GATE] Ask user: "Generate automation code?"
                (Skip if --auto mode)

Phase 2: Test Automation (qa-auto-design)
         ├─ Recon: Playwright Codegen or Manual Inspect
         ├─ Generate POM/Service Objects
         ├─ Generate test_*.py files
         └─ Self-fix loop (syntax errors)

Phase 3: Test Execution (qa-run-test)
         ├─ Pre-flight checks
         ├─ Run test suite (pytest)
         ├─ Analyze failures
         └─ Generate comprehensive report

Phase 4: Summary & Next Steps
         └─ End-to-end traceability report
```

## Command Syntax

```bash
# Manual mode (default) - có approval gates
/qa-full-pipeline {issueKey}

# Auto mode - chạy thẳng không hỏi
/qa-full-pipeline {issueKey} --auto

# Resume từ phase cụ thể
/qa-full-pipeline {issueKey} --resume=phase2

# Skip automation, chỉ test design
/qa-full-pipeline {issueKey} --no-automation

# Dry run - preview without executing
/qa-full-pipeline {issueKey} --dry-run
```

## Phase 0: Validation (Pre-flight Check)

### Bước 1: Verify Input

```python
# 1. Check issueKey format
if not re.match(r'^[A-Z]+-\d+$', issueKey):
    error("Invalid issueKey format. Expected: JIRA-123")

# 2. Check *-final.md exists (from BA/PO)
spec_path = f"specs/imports/jira/{issueKey}/{issueKey}-final.md"
if not os.path.exists(spec_path):
    error(f"""
    Business-Spec not found: {spec_path}
    
    Please run BA/PO pipeline first:
    1. /ba-spec {issueKey}
    2. /ba-interview {issueKey} (if gaps detected)
    
    Then retry: /qa-full-pipeline {issueKey}
    """)

# 3. Check file readable and not empty
content = read_file(spec_path)
if len(content) < 100:
    error(f"Spec file too short ({len(content)} chars). Corrupted?")
```

### Bước 2: Detect Resume Mode

```python
# Check existing outputs to determine resume point
outputs = {
    'checklist': f"tests/qa-test-design/{issueKey}/features/{issueKey}-checklist.md",
    'gherkin': f"tests/qa-test-design/{issueKey}/features/{issueKey}.feature",
    'test_code': f"tests/qa-test-design/{issueKey}/steps/",
    'report': f"tests/qa-test-design/{issueKey}/reports/{issueKey}-test-report.md"
}

completed_phases = []
if os.path.exists(outputs['checklist']):
    completed_phases.append('phase1.1')
if os.path.exists(outputs['gherkin']):
    completed_phases.append('phase1.2')
if os.path.exists(outputs['test_code']) and len(os.listdir(outputs['test_code'])) > 0:
    completed_phases.append('phase2')
if os.path.exists(outputs['report']):
    completed_phases.append('phase3')

# Determine start phase
if args.resume:
    start_phase = args.resume
elif completed_phases:
    log(f"✅ Found existing outputs: {completed_phases}")
    log(f"Resume from last incomplete phase? (Y/n)")
    if user_confirm():
        start_phase = get_next_phase(completed_phases)
    else:
        start_phase = 'phase1'
else:
    start_phase = 'phase1'
```

## Phase 1: Test Design (qa-test-design)

### Bước 1: Invoke qa-test-design

```python
# Set environment for auto-approve
if args.auto:
    os.environ['PIPELINE_AUTO_APPROVE'] = 'true'

# Invoke skill with parameters
result = invoke_skill('qa-test-design', issueKey, {
    'autoApprove': args.auto,
    'skipSquashPush': args.no_squash
})

# Check result confidence
confidence = result.get('confidence_level', 0)
if confidence < 0.70:
    error(f"""
    🔴 Test design failed: Low confidence ({confidence*100:.0f}%)
    
    Issues found:
    {result.get('issues', [])}
    
    Please fix and retry.
    """)
elif confidence < 0.90:
    if not args.auto:
        log(f"⚠️ Medium confidence ({confidence*100:.0f}%). Continue? (Y/n)")
        if not user_confirm():
            exit("Pipeline stopped by user")
```

### Bước 2: Verify Outputs

```python
# Check checklist exists
checklist_path = f"tests/qa-test-design/{issueKey}/features/{issueKey}-checklist.md"
if not os.path.exists(checklist_path):
    error("Checklist not generated. qa-test-design failed.")

# Check Gherkin exists
gherkin_path = f"tests/qa-test-design/{issueKey}/features/{issueKey}.feature"
if not os.path.exists(gherkin_path):
    error("Gherkin file not generated. qa-test-design failed.")

# Parse metrics from checklist
checklist_content = read_file(checklist_path)
p0_count = len(re.findall(r'\[P0\]', checklist_content))
p1_count = len(re.findall(r'\[P1\]', checklist_content))
p2_count = len(re.findall(r'\[P2\]', checklist_content))
total_items = p0_count + p1_count + p2_count

log(f"""
✅ Phase 1 Complete: Test Design
   - Checklist: {total_items} items (P0: {p0_count}, P1: {p1_count}, P2: {p2_count})
   - Gherkin: {gherkin_path}
   - Squash TM: {'✅ Pushed' if result.get('squash_pushed') else '⏭️ Skipped'}
""")
```

## Decision Gate: Generate Automation?

```python
# Skip gate in auto mode or if --no-automation
if args.auto:
    generate_automation = True
    log("[AUTO] Proceeding to automation generation")
elif args.no_automation:
    generate_automation = False
    log("[SKIP] Automation skipped by user flag")
else:
    # Ask user
    log(f"""
📋 Test Design Complete

Artifacts:
- Checklist: {total_items} items
- Gherkin: {scenario_count} scenarios
- Squash TM: {'✅ Synced' if result.get('squash_pushed') else 'N/A'}

Options:
1. Generate automation test code? (Recommended for regression)
2. Stop here (manual testing only)

Generate automation code? (Y/n)
""")
    generate_automation = user_confirm()

if not generate_automation:
    log("✅ Pipeline complete. Checklist + Gherkin ready for manual testing.")
    generate_summary(phases_completed=['phase1'])
    exit(0)
```

## Phase 2: Test Automation (qa-auto-design)

### Bước 1: Invoke qa-auto-design

```python
result = invoke_skill('qa-auto-design', issueKey, {
    'checklistPath': checklist_path,
    'gherkinPath': gherkin_path
})

# Check self-fix iterations
iterations = result.get('self_fix_iterations', 0)
if iterations > 3:
    log(f"⚠️ Warning: Nhiều self-fix iterations ({iterations}). Code quality có thể thấp.")
```

### Bước 2: Verify Test Code

```python
# Check test code directory
test_code_dir = f"tests/qa-test-design/{issueKey}/steps/"
if not os.path.exists(test_code_dir):
    error("Test code directory not created. qa-auto-design failed.")

# Count test files
test_files = [f for f in os.listdir(test_code_dir) if f.startswith('test_') and f.endswith('.py')]
if len(test_files) == 0:
    error("No test files generated. qa-auto-design failed.")

# Parse test count from files
total_tests = 0
for test_file in test_files:
    content = read_file(os.path.join(test_code_dir, test_file))
    total_tests += len(re.findall(r'def test_', content))

log(f"""
✅ Phase 2 Complete: Test Automation
   - Test files: {len(test_files)}
   - Test cases: {total_tests}
   - Self-fix iterations: {iterations}
""")
```

## Phase 3: Test Execution (qa-run-test)

### Bước 1: Invoke qa-run-test

```python
result = invoke_skill('qa-run-test', issueKey, {
    'testDir': test_code_dir
})

# Parse test results
metrics = result.get('metrics', {})
passed = metrics.get('passed', 0)
failed = metrics.get('failed', 0)
skipped = metrics.get('skipped', 0)
total = passed + failed + skipped
pass_rate = (passed / total * 100) if total > 0 else 0
```

### Bước 2: Analyze Results

```python
# Classify failures
failures = result.get('failures', [])
critical_failures = [f for f in failures if f.get('priority') == 'P0']
flaky_failures = [f for f in failures if f.get('flaky') == True]
env_failures = [f for f in failures if f.get('root_cause') == 'environment']

status = 'SUCCESS' if failed == 0 else 'PARTIAL' if pass_rate >= 0.80 else 'FAILED'

log(f"""
✅ Phase 3 Complete: Test Execution
   - Total: {total} tests
   - Passed: {passed} ({pass_rate:.1f}%)
   - Failed: {failed}
   - Status: {status}
""")

if critical_failures:
    log(f"⚠️ {len(critical_failures)} CRITICAL failures (P0) - Blocking release!")
```

## Phase 4: Summary & Next Steps

```python
def generate_summary(phases_completed, metrics=None):
    """Generate end-to-end pipeline summary"""
    
    summary = f"""
# QA Full Pipeline Summary

**Issue:** {issueKey}
**Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Mode:** {'Auto' if args.auto else 'Manual'}
**Duration:** {duration}

---

## 📊 Phase Results

"""
    
    # Phase 1: Test Design
    if 'phase1' in phases_completed:
        summary += f"""
### ✅ Phase 1: Test Design
- Checklist: {total_items} items (P0: {p0_count}, P1: {p1_count}, P2: {p2_count})
- Gherkin: {scenario_count} scenarios
- Squash TM: {'✅ Synced to Sprint ' + sprint_name if squash_pushed else 'N/A'}
- Artifacts:
  - {checklist_path}
  - {gherkin_path}
"""
    
    # Phase 2: Automation
    if 'phase2' in phases_completed:
        summary += f"""
### ✅ Phase 2: Test Automation
- Test files: {len(test_files)}
- Test cases: {total_tests}
- Self-fix iterations: {iterations}
- Framework: Playwright + Pytest
- Artifacts:
  - {test_code_dir}
"""
    
    # Phase 3: Execution
    if 'phase3' in phases_completed and metrics:
        summary += f"""
### {status_icon} Phase 3: Test Execution
- Total tests: {total}
- Passed: {passed} ({pass_rate:.1f}%)
- Failed: {failed}
- Skipped: {skipped}
- Duration: {test_duration}
- Status: **{status}**
"""
        
        if failed > 0:
            summary += f"""
#### Failed Tests ({failed})

"""
            for i, failure in enumerate(failures[:5], 1):  # Show first 5
                summary += f"""
{i}. **{failure['test_name']}** — {failure['priority']}
   - Root cause: {failure['root_cause']}
   - Action: {failure['action_required']}
"""
    
    # Traceability Matrix
    summary += f"""
---

## 🔍 End-to-End Traceability

| Business Rule (Spec) | Checklist ID | Gherkin Scenario | Test Case | Result |
|----------------------|--------------|------------------|-----------|--------|
"""
    
    # Parse traceability from test report
    if os.path.exists(report_path):
        report = read_file(report_path)
        # Extract traceability table
        traceability = extract_traceability(report)
        for row in traceability:
            summary += f"| {row['business_rule']} | {row['checklist_id']} | {row['scenario']} | {row['test_case']} | {row['result']} |\n"
    
    # Next Steps
    summary += f"""
---

## 🚀 Next Steps

"""
    
    if status == 'SUCCESS':
        summary += """
✅ **All tests passed!**

- [ ] Review test report
- [ ] Approve for deployment
- [ ] Update release notes
"""
    elif status == 'PARTIAL':
        summary += f"""
⚠️ **{failed} tests failed ({pass_rate:.1f}% pass rate)**

Priority actions:
"""
        for failure in critical_failures:
            summary += f"- [ ] Fix P0: {failure['test_name']} — {failure['action_required']}\n"
        
        summary += f"""
Then re-run:
- Full pipeline: `/qa-full-pipeline {issueKey} --resume=phase3`
- Or just tests: `/qa-run-test {issueKey}`
"""
    else:
        summary += f"""
🔴 **Pipeline failed ({pass_rate:.1f}% pass rate)**

Critical issues:
"""
        for failure in critical_failures:
            summary += f"- {failure['test_name']}: {failure['root_cause']}\n"
        
        summary += f"""
Fix issues and re-run: `/qa-full-pipeline {issueKey}`
"""
    
    # Save summary
    summary_path = f"tests/qa-test-design/{issueKey}/reports/{issueKey}-pipeline-summary.md"
    write_file(summary_path, summary)
    
    log(f"\n{summary}")
    log(f"\n📄 Full summary: {summary_path}")
```

## Error Handling & Recovery

### Graceful Degradation

```python
def handle_phase_failure(phase, error):
    """Handle phase failure gracefully"""
    
    log(f"""
❌ Phase {phase} Failed

Error: {error}

Options:
1. Retry: /qa-full-pipeline {issueKey} --resume={phase}
2. Fix manually and continue: /qa-full-pipeline {issueKey} --resume={next_phase(phase)}
3. Run phase separately: /{skill_name(phase)} {issueKey}
4. Stop here (partial completion OK)

Choose option (1-4):
""")
    
    choice = user_input()
    
    if choice == '1':
        return retry_phase(phase)
    elif choice == '2':
        return skip_phase(phase)
    elif choice == '3':
        log(f"Run manually: /{skill_name(phase)} {issueKey}")
        exit(1)
    else:
        generate_summary(phases_completed=completed_phases)
        exit(1)
```

### Resume Logic

```python
def resume_from_phase(phase_name):
    """Resume pipeline from specific phase"""
    
    phase_map = {
        'phase1': run_test_design,
        'phase1.1': run_test_design_checklist,
        'phase1.2': run_test_design_gherkin,
        'phase2': run_automation,
        'phase3': run_execution
    }
    
    if phase_name not in phase_map:
        error(f"Invalid resume phase: {phase_name}. Valid: {list(phase_map.keys())}")
    
    log(f"⏩ Resuming from {phase_name}")
    
    # Run from specified phase to end
    current_phase = phase_name
    while current_phase:
        phase_func = phase_map[current_phase]
        try:
            phase_func()
            completed_phases.append(current_phase)
            current_phase = next_phase(current_phase)
        except Exception as e:
            return handle_phase_failure(current_phase, e)
```

## Confidence-Based Gating

Theo `.claude/rules/confidence-level.md`:

```python
def check_confidence_gate(phase_result):
    """Check if phase result meets confidence threshold"""
    
    confidence = phase_result.get('confidence_level', 0)
    blockers = phase_result.get('blockers', [])
    
    if blockers:
        error(f"""
🔴 Cannot proceed: {len(blockers)} blockers found

Blockers:
{format_blockers(blockers)}

Fix blockers and retry.
""")
        return False
    
    if confidence >= 0.90:
        log(f"✅ High confidence ({confidence*100:.0f}%) - Proceeding")
        return True
    elif confidence >= 0.70:
        if args.auto:
            log(f"⚠️ Medium confidence ({confidence*100:.0f}%) - Auto mode, proceeding anyway")
            return True
        else:
            log(f"⚠️ Medium confidence ({confidence*100:.0f}%) - Manual approval required")
            log("Continue? (Y/n)")
            return user_confirm()
    else:
        error(f"""
🔴 Low confidence ({confidence*100:.0f}%) - Cannot proceed

Issues:
{format_issues(phase_result.get('issues', []))}

Fix issues and retry.
""")
        return False
```

## Idempotency & Smart Skipping

```python
def should_skip_phase(phase, outputs):
    """Determine if phase can be skipped (already done)"""
    
    # Phase 1.1: Checklist
    if phase == 'phase1.1':
        if os.path.exists(outputs['checklist']):
            content = read_file(outputs['checklist'])
            if is_valid_checklist(content):
                log(f"⏭️ Skipping Phase 1.1: Checklist already exists ({outputs['checklist']})")
                return True
    
    # Phase 1.2: Gherkin
    if phase == 'phase1.2':
        if os.path.exists(outputs['gherkin']):
            content = read_file(outputs['gherkin'])
            if is_valid_gherkin(content):
                log(f"⏭️ Skipping Phase 1.2: Gherkin already exists ({outputs['gherkin']})")
                return True
    
    # Phase 2: Test Code
    if phase == 'phase2':
        if os.path.exists(outputs['test_code']):
            test_files = [f for f in os.listdir(outputs['test_code']) if f.startswith('test_')]
            if len(test_files) > 0:
                log(f"⏭️ Skipping Phase 2: Test code already exists ({len(test_files)} files)")
                return True
    
    return False
```

## Output Files

Pipeline tạo các files sau:

```
tests/qa-test-design/{issueKey}/
├── features/
│   ├── {issueKey}-checklist.md              # Phase 1.1
│   └── {issueKey}.feature                   # Phase 1.2
├── steps/
│   ├── test_*.py                            # Phase 2
│   └── conftest.py
├── reports/
│   ├── {issueKey}-test-report.md           # Phase 3
│   ├── {issueKey}-pipeline-summary.md      # Phase 4 (THIS SKILL)
│   ├── junit.xml
│   └── report.html
└── .pipeline-state.json                     # Resume state
```

## Anti-patterns (Tránh)

❌ **KHÔNG:**
- Chạy pipeline khi *-final.md chưa có
- Force proceed khi confidence < 70%
- Ignore blockers từ phase trước
- Skip validation phase
- Commit pipeline state files (.pipeline-state.json)

✅ **NÊN:**
- Pre-flight check đầy đủ
- Respect confidence gates
- Handle errors gracefully với recovery options
- Generate comprehensive summary
- Use --auto mode trong CI/CD

## Xem thêm

- `qa-test-design` — Phase 1 (test design)
- `qa-auto-design` — Phase 2 (automation)
- `qa-run-test` — Phase 3 (execution)
- `.claude/rules/confidence-level.md` — Confidence gating rules
- `e2e-delivery` — Full SDLC pipeline (BA → DEV → QA)
