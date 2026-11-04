import { geist, geistMono } from "@/app/siteFonts";

// خطوط لوحات الإدارة: Geist للحروف اللاتينية والأرقام، وGeist Mono للمعرّفات
// والعدّادات، ويبقى Cairo للعربية من خط الموقع. تُحمَّل في الصفحات التي تستعملها
// وحدها، لا في الموقع كله.

/** يوضع على غلاف الصفحة. */
export const consoleFontClass = `${geist.variable} ${geistMono.variable} [font-family:var(--font-geist),var(--font-cairo),sans-serif]`;
