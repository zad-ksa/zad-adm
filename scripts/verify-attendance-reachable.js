/**
 * Can a person actually get to each attendance screen by clicking?
 *
 * Twice now a screen has existed, compiled, and been unreachable — once
 * because the sidebar drops labels it was not told to render, once because the
 * tab strip was mounted on the destinations but not the entry point. Neither
 * failure is a type error, so nothing but this check would catch it.
 */
const fs = require("fs");

const read = (f) => fs.readFileSync(f, "utf8");
const DIR = "src/app/(dashboard)/main/(main)/attendance";

const steps = [];
const step = (name, pass, detail) => {
  steps.push(pass);
  console.log(`  ${pass ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
};

// Step 1: the sidebar offers the entry route, and to everyone.
const sidebar = read("src/components/EmployeeSidebar.tsx");
const pushedUnconditionally =
  /\n  navItems\.push\(\{ label: "التحضير", href: "\/main\/attendance"/.test(sidebar);
const listedInGroup = /renderGroup\(\s*"زاد",\s*\[[^\]]*"التحضير"/.test(sidebar);
step("القائمة الجانبية تدفع «التحضير» خارج أي شرط صلاحية", pushedUnconditionally,
     "بمسافة بادئة من مستوى الدالة لا داخل if");
step("و«التحضير» مذكور في مجموعة «زاد» فيُعرض فعلاً", listedInGroup);
step("والمجموعة تنفتح تلقائياً على المسار",
     /path\.startsWith\("\/main\/attendance"\)\)\s*newGroup = "زاد"/.test(sidebar));

// Step 2: the entry page carries the strip that leads onward.
const entry = read(`${DIR}/page.tsx`);
step("صفحة الدخول تعرض شريط التبويبات", entry.includes("<AttendanceTabs"),
     "وإلا فالوجهتان بلا رابط يصل إليهما");
step("وتمرّر الصلاحيتين لا قيمتين ثابتتين",
     entry.includes('"manage_zad_attendance"') && entry.includes('"view_zad_attendance_reports"'));

// Step 3: the strip links to both destinations.
const tabs = read(`${DIR}/AttendanceTabs.tsx`);
step("الشريط يربط إلى الإعدادات", tabs.includes('href: "/main/attendance/settings"'));
step("والشريط يربط إلى التقارير", tabs.includes('href: "/main/attendance/reports"'));

// Step 4: each destination still closes its own door on the server.
for (const [screen, perm] of [["settings", "manage_zad_attendance"],
                              ["reports", "view_zad_attendance_reports"]]) {
  const src = read(`${DIR}/${screen}/page.tsx`);
  step(`صفحة ${screen} تتحقق من ${perm} على الخادم`,
       src.includes(`"${perm}"`) && src.includes("redirect(\"/main/attendance\")"));
}

// Step 5: the routes exist on disk at all.
for (const f of ["page.tsx", "settings/page.tsx", "reports/page.tsx"]) {
  step(`الملف موجود: ${f}`, fs.existsSync(`${DIR}/${f}`));
}

// Step 6: the settings hub leads to each of its five sub-screens, and each
// one leads back. A card that links nowhere and a page with no way out are the
// same bug wearing different clothes.
const hub = read(`${DIR}/settings/page.tsx`);
const shell = read(`${DIR}/settings/SettingsShell.tsx`);
step("صفحة الإعدادات ترجع بالزر إلى مركزها",
     shell.includes('href="/main/attendance/settings"'), "من SettingsShell");

for (const sub of ["sites", "groups", "calendar", "leaves", "network", "records"]) {
  const href = `/main/attendance/settings/${sub}`;
  const linked = hub.includes(`"${href}"`);
  const exists = fs.existsSync(`${DIR}/settings/${sub}/page.tsx`);
  const guarded =
    exists &&
    read(`${DIR}/settings/${sub}/page.tsx`).includes('"manage_zad_attendance"');
  const framed = exists && read(`${DIR}/settings/${sub}/page.tsx`).includes("<SettingsShell");
  step(`بطاقة ${sub}: مربوطة · موجودة · محميّة · داخل الإطار`,
       linked && exists && guarded && framed,
       [linked ? "" : "بلا رابط", exists ? "" : "بلا صفحة",
        guarded ? "" : "بلا تحقق", framed ? "" : "بلا إطار"].filter(Boolean).join(" و ") || href);
}

const failed = steps.filter((x) => !x).length;
console.log(`\n${steps.length - failed}/${steps.length} اجتازت.`);
process.exitCode = failed ? 1 : 0;
