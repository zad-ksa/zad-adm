const fs = require("fs");
const sb = fs.readFileSync("src/components/EmployeeSidebar.tsx", "utf8").split("\n");

// لكل push: المسار، ثم أقرب `if` مفتوح يحويه فعلاً.
// التوقف عند `  }` ضروري: بدونه يُنسب دفعٌ غير مشروط إلى شرط أُغلق قبله.
const out = [];
for (let i = 0; i < sb.length; i++) {
  const push = sb[i].match(/navItems\.push\(\{ label: .*?href: "([^"]+)"/);
  if (!push) continue;
  const href = push[1];
  let cond = null;
  for (let j = i - 1; j >= Math.max(0, i - 14); j--) {
    if (/^\s{2}\}\s*$/.test(sb[j])) break; // شرط سابق أُغلق — هذا الدفع خارجه
    if (/^\s{2}if \(/.test(sb[j])) {
      const block = sb.slice(j, i).join(" ");
      const ids = [...block.matchAll(/can\("([a-z_]+)"\)/g)].map((m) => m[1]);
      if (ids.length) cond = ids;
      break;
    }
  }
  out.push({ href, any: cond });
}
fs.writeFileSync(process.argv[2] + "/tabs.json", JSON.stringify(out, null, 1));
out.forEach((t) =>
  console.log("  " + t.href.padEnd(26), t.any ? t.any.join(" أو ") : "◀ بلا شرط (للجميع)")
);
