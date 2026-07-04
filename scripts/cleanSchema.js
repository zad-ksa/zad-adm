const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../prisma/schema.prisma');
let content = fs.readFileSync(filePath, 'utf-8');

const modelsToRemove = [
  'StrategicStage',
  'StrategicStageStep',
  'GovernanceStage',
  'GovernanceStageStep',
  'FinanceStage',
  'FinanceStageStep'
];

for (const model of modelsToRemove) {
  const pattern = new RegExp(`model\\s+${model}\\s+\\{[^\\}]+\\}`, 'g');
  content = content.replace(pattern, '');
}

content = content.replace(/^\s*strategicStage\s+Int.*?$/gm, '');
content = content.replace(/^\s*strategicStages\s+StrategicStage\[\].*?$/gm, '');
content = content.replace(/^\s*governanceStages\s+GovernanceStage\[\].*?$/gm, '');
content = content.replace(/^\s*financeStages\s+FinanceStage\[\].*?$/gm, '');

content = content.replace(/\n{3,}/g, '\n\n');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Schema updated successfully');
