const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const casesDir = './evals/cases';
const pluginsDir = './plugins';

const files = fs.readdirSync(casesDir);
for (const file of files) {
  if (!file.endsWith('.json')) continue;
  const content = JSON.parse(fs.readFileSync(path.join(casesDir, file), 'utf-8'));
  const skillName = content.skill_name;
  if (!skillName) continue;
  
  let skillFilePath;
  try {
    const cmd = `find ${pluginsDir} -name SKILL.md | grep ${skillName}/SKILL.md`;
    skillFilePath = execSync(cmd).toString().trim();
  } catch(e) {
    continue;
  }
  
  if (!skillFilePath) continue;
  
  let posPrompts = content.trigger.positive.map(p => p.prompt).join('. ');
  let negPrompts = content.trigger.negative ? content.trigger.negative.map(p => p.prompt).join('. KHÔNG ') : '';
  
  let newDesc = posPrompts + ".";
  if (negPrompts) {
    newDesc += " KHÔNG " + negPrompts + ".";
  }
  
  // Read and replace
  let mdContent = fs.readFileSync(skillFilePath, 'utf-8');
  mdContent = mdContent.replace(/^description:\s*(?:'|")?(.*?)(?:'|")?$/m, `description: '${newDesc}'`);
  fs.writeFileSync(skillFilePath, mdContent);
  console.log(`Updated ${skillName}`);
}
