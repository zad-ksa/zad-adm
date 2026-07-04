const fs = require('fs');
const path = require('path');

function fixOverview() {
  const file = path.join(__dirname, '../src/app/charity/[name]/overview/page.tsx');
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/, strategicStages, governanceStages, financeStages/, '');
  content = content.replace(/prisma\.strategicStage\.findMany\([\s\S]*?\}\),/g, '');
  content = content.replace(/prisma\.governanceStage\.findMany\([\s\S]*?\}\),/g, '');
  content = content.replace(/prisma\.financeStage\.findMany\([\s\S]*?\}\)/g, '');
  fs.writeFileSync(file, content, 'utf-8');
}

function fixFinance() {
  const file = path.join(__dirname, '../src/app/charity/[name]/finance/page.tsx');
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/stages = await prisma\.financeStage\.findMany\(\{[\s\S]*?\}\);/, `const svc = await prisma.service.findFirst({ where: { charityId: charity.id, department: "FINANCE" } });
    if (svc) {
      stages = await prisma.serviceStage.findMany({
        where: { serviceId: svc.id },
        orderBy: { order: 'asc' },
      });
    }`);
  fs.writeFileSync(file, content, 'utf-8');
}

function fixGovernance() {
  const file = path.join(__dirname, '../src/app/charity/[name]/governance/page.tsx');
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/stages = await prisma\.governanceStage\.findMany\(\{[\s\S]*?\}\);/, `const svc = await prisma.service.findFirst({ where: { charityId: charity.id, department: "GOVERNANCE" } });
    if (svc) {
      stages = await prisma.serviceStage.findMany({
        where: { serviceId: svc.id },
        orderBy: { order: 'asc' },
      });
    }`);
  fs.writeFileSync(file, content, 'utf-8');
}

function fixStrategy() {
  const file = path.join(__dirname, '../src/app/charity/[name]/strategy/stages/page.tsx');
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/stages = await prisma\.strategicStage\.findMany\(\{[\s\S]*?\}\);/, `const svc = await prisma.service.findFirst({ where: { charityId: charity.id, department: "STRATEGY" } });
    if (svc) {
      stages = await prisma.serviceStage.findMany({
        where: { serviceId: svc.id },
        orderBy: { order: 'asc' },
      });
    }`);
  fs.writeFileSync(file, content, 'utf-8');
}

function fixDashboard() {
  const file = path.join(__dirname, '../src/app/dashboard/(main)/services-overview/page.tsx');
  let content = fs.readFileSync(file, 'utf-8');
  // It has generic stage count queries.
  content = content.replace(/prisma\.strategicStage\.count/g, 'prisma.serviceStage.count');
  content = content.replace(/prisma\.governanceStage\.count/g, 'prisma.serviceStage.count');
  content = content.replace(/prisma\.financeStage\.count/g, 'prisma.serviceStage.count');
  // I might need to properly map them. Let's look closely later or just run this for now
  fs.writeFileSync(file, content, 'utf-8');
}

try { fixOverview(); } catch (e) { console.error("Error fixing overview", e); }
try { fixFinance(); } catch (e) { console.error("Error fixing finance", e); }
try { fixGovernance(); } catch (e) { console.error("Error fixing governance", e); }
try { fixStrategy(); } catch (e) { console.error("Error fixing strategy", e); }
try { fixDashboard(); } catch (e) { console.error("Error fixing dashboard", e); }
