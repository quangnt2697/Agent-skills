import fs from 'fs';
import path from 'path';

// Parse arguments
const args = process.argv.slice(2);
let checklistPath = '';
let featurePath = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--checklist') {
    checklistPath = args[i + 1];
    i++;
  } else {
    featurePath = args[i];
  }
}

if (!checklistPath || !featurePath) {
  console.error("Usage: node qa-validate.js --checklist <checklist.md> <feature-file>");
  process.exit(1);
}

const report = {
  status: "pass",
  failures: [],
  warnings: []
};

try {
  const checklistContent = fs.readFileSync(checklistPath, 'utf8');
  const featureContent = fs.readFileSync(featurePath, 'utf8');
  
  // --- Traceability Check ---
  const clMatches = checklistContent.match(/CL-\d+/g) || [];
  const checklistSet = new Set(clMatches);
  
  const featureClMatches = featureContent.match(/@CL-\d+/g) || [];
  const featureSet = new Set(featureClMatches.map(t => t.substring(1)));
  
  for (const cl of featureSet) {
    if (!checklistSet.has(cl)) {
      report.failures.push({ rule: "traceability", message: `Tag @${cl} found in feature but not in checklist` });
    }
  }
  
  // --- Data Grounding Rules (G1 & G2) ---
  const featureDir = path.dirname(featurePath);
  const groundingPath = path.join(featureDir, 'fixtures', 'data-grounding.json');
  
  let groundingData = null;
  if (fs.existsSync(groundingPath)) {
    try {
      groundingData = JSON.parse(fs.readFileSync(groundingPath, 'utf8'));
    } catch (e) {
      report.failures.push({ rule: "G1", message: `Invalid JSON in ${groundingPath}` });
    }
  }

  // Parse Scenarios manually
  const lines = featureContent.split('\n');
  let currentScenario = null;
  const scenarios = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Scenario:') || line.startsWith('Scenario Outline:')) {
      let j = i - 1;
      let tags = [];
      let hasDataAssumed = false;
      
      // Look back for tags and comments
      while (j >= 0) {
        const prevLine = lines[j].trim();
        if (prevLine.startsWith('@')) {
          tags.push(prevLine);
        } else if (prevLine.startsWith('#')) {
          if (prevLine.includes('[DATA-ASSUMED]')) hasDataAssumed = true;
        } else if (prevLine !== '') {
          break; // Stop looking back on normal text
        }
        j--;
      }
      
      currentScenario = {
        name: line,
        tags: tags.join(' '),
        hasDataAssumed: hasDataAssumed,
        text: line + '\n'
      };
      scenarios.push(currentScenario);
    } else if (currentScenario) {
      if (line.startsWith('#') && line.includes('[DATA-ASSUMED]')) {
        currentScenario.hasDataAssumed = true;
      }
      currentScenario.text += line + '\n';
    }
  }
  
  // Check G1
  for (const scenario of scenarios) {
    const isHappyPath = scenario.tags.includes('@happy-path');
    
    if (isHappyPath && !scenario.hasDataAssumed) {
      if (!groundingData) {
        report.failures.push({ 
          rule: "G1", 
          message: `Missing data-grounding.json and no [DATA-ASSUMED] comment for happy-path scenario: '${scenario.name}'` 
        });
      } else {
        const preconditions = groundingData.items?.filter(item => item.kind === 'precondition' && item.verified === true) || [];
        const hasVerifiedData = preconditions.some(item => scenario.text.includes(item.value));
        
        if (!hasVerifiedData && preconditions.length > 0) {
          report.failures.push({ 
            rule: "G1", 
            message: `Scenario '${scenario.name}' does not contain any verified precondition from data-grounding.json and missing [DATA-ASSUMED] comment.` 
          });
        }
      }
    }
  }
  
  // Check G2 (Warning)
  if (groundingData) {
    const expectedItems = groundingData.items?.filter(item => item.kind === 'expected') || [];
    if (expectedItems.length === 0) {
      const thenSteps = featureContent.match(/^\s*Then.*?\d+.*?$/gm) || [];
      if (thenSteps.length > 0) {
        report.warnings.push({ 
          rule: "G2", 
          message: `Then steps contain numbers but data-grounding.json has no 'expected' items.` 
        });
      }
    }
  } else {
     const thenSteps = featureContent.match(/^\s*Then.*?\d+.*?$/gm) || [];
     if (thenSteps.length > 0) {
       report.warnings.push({ 
         rule: "G2", 
         message: `Then steps contain numbers but data-grounding.json is missing.` 
       });
     }
  }

} catch (err) {
  report.failures.push({ rule: "system", message: err.message });
}

if (report.failures.length > 0) {
  report.status = "fail";
}

console.log(JSON.stringify(report, null, 2));
if (report.status === "fail") {
  process.exit(1);
}
